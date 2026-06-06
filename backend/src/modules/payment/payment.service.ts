import { prisma } from "../../database/prisma";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "../../utils/api-error";
import axios from "axios";
import { env } from "../../config/env";
import { createStudentNotification } from "../notification/notification.service";
import type { CampayWebhookPayload } from "./campay-webhook";

interface InitiatePaymentInput {
  studentId: string;
  paymentType: string;
  amount: number;
  academicYear: string;
  paymentMethod: string;
  phoneNumber: string;
  feeInstallment?: string;
}

const PAID_FEE_STATUS = "PAID";
const PARTIAL_FEE_STATUS = "PARTIAL";
const PROVIDER_STATUS_CHECK_COOLDOWN_MS = 30_000;
const PENDING_RECONCILE_MIN_AGE_MS = 90_000;
const PENDING_RECONCILE_BATCH_SIZE = 50;

const providerStatusCheckCache = new Map<string, number>();

interface PaymentStatusOptions {
  verifyProvider?: boolean;
  forceProviderCheck?: boolean;
}

interface TriggerPaymentOptions {
  signal?: AbortSignal;
  isClientConnected?: () => boolean;
}

const CAMPAY_COLLECT_TIMEOUT_MS = 18_000;
const PAYMENT_TRIGGER_CLIENT_CLOSED_STATUS = 499;
const PAYMENT_TRIGGER_CLIENT_CLOSED_MESSAGE =
  "Payment start cancelled because the app connection was interrupted. Please check your internet connection and try again.";
const DEFAULT_PAYMENT_FAILURE_REASON =
  "The payment provider marked this transaction as failed. No money was received.";

const studentReceiptSelect = {
  full_name: true,
  matricule: true,
  faculty: true,
  level: true,
};

const adminPaymentStudentSelect = {
  id: true,
  full_name: true,
  matricule: true,
  phone_number: true,
  faculty: true,
  department: true,
  level: true,
  fee_status: true,
  is_active: true,
};

const shouldCheckProviderStatus = (reference: string, force = false) => {
  if (force) {
    providerStatusCheckCache.set(reference, Date.now());
    return true;
  }

  const lastCheckedAt = providerStatusCheckCache.get(reference) ?? 0;
  const canCheck =
    Date.now() - lastCheckedAt >= PROVIDER_STATUS_CHECK_COOLDOWN_MS;

  if (canCheck) {
    providerStatusCheckCache.set(reference, Date.now());
  }

  return canCheck;
};

const toPaymentStatus = (providerStatus?: string) => {
  if (providerStatus === "SUCCESSFUL") {
    return "successful";
  }

  if (providerStatus === "FAILED") {
    return "failed";
  }

  return "pending";
};

const extractPaymentFailureReason = (source: any) => {
  const candidates = [
    source?.failure_reason,
    source?.reason,
    source?.message,
    source?.status_reason,
    source?.status_description,
    source?.operator_message,
    source?.error_message,
    source?.error,
  ];

  const reason = candidates.find(
    (candidate) =>
      typeof candidate === "string" &&
      candidate.trim() &&
      candidate.trim().toUpperCase() !== "FAILED"
  );

  return reason ? reason.trim() : DEFAULT_PAYMENT_FAILURE_REASON;
};

const getPaymentTitle = (payment: {
  payment_type: string;
  fee_installment?: string | null;
}) => {
  if (payment.payment_type === "subscription") {
    return "Subscription";
  }

  if (payment.fee_installment === "half") {
    return "Half fees";
  }

  if (payment.fee_installment === "full") {
    return "Complete fees";
  }

  return "School fees";
};

const formatPaymentAmount = (amount: any) =>
  `${Number(amount).toLocaleString("en-US").replace(/,/g, " ")} XAF`;

const getPaymentApprovalCode = (paymentMethod?: string | null) => {
  const normalizedMethod = paymentMethod?.toLowerCase() ?? "";

  if (normalizedMethod.includes("orange")) {
    return "#150#";
  }

  return "*126#";
};

const getPaymentMethodLabel = (paymentMethod?: string | null) => {
  const normalizedMethod = paymentMethod?.toLowerCase() ?? "";

  if (normalizedMethod.includes("orange")) {
    return "Orange Money";
  }

  if (normalizedMethod.includes("mtn")) {
    return "MTN MoMo";
  }

  return "Mobile Money";
};

// I remove the pending alert once Campay has given the payment a final state.
const clearPaymentPendingNotification = async (payment: any) => {
  await prisma.notifications.deleteMany({
    where: {
      student_id: payment.student_id,
      type: "payment_pending",
      target_id: payment.id,
    },
  });
};

// I notify after the receipt exists so tapping the alert always lands somewhere useful.
const notifyPaymentSucceeded = async (payment: any, receipt: any) => {
  await clearPaymentPendingNotification(payment);

  await createStudentNotification({
    studentId: payment.student_id,
    type: "payment_success",
    title: "Payment successful",
    body: `${getPaymentTitle(payment)} confirmed for ${formatPaymentAmount(payment.amount)}.`,
    targetType: "payment",
    targetId: payment.id,
    metadata: {
      paymentId: payment.id,
      paymentReference: payment.reference_id,
      receiptId: receipt.id,
      receiptNumber: receipt.receipt_number,
      paymentType: payment.payment_type,
      feeInstallment: payment.fee_installment,
      amount: String(payment.amount),
    },
  });
};

// I keep failed payments around long enough for the student to read the reason in the app.
const notifyPaymentFailed = async (payment: any, reason: string) => {
  await clearPaymentPendingNotification(payment);

  await createStudentNotification({
    studentId: payment.student_id,
    type: "payment_failed",
    title: "Payment failed",
    body: reason,
    targetType: "payment",
    targetId: payment.id,
    metadata: {
      paymentId: payment.id,
      paymentReference: payment.reference_id,
      paymentType: payment.payment_type,
      feeInstallment: payment.fee_installment,
      amount: String(payment.amount),
      reason,
    },
  });
};

const assertCanStartProviderPayment = (options: TriggerPaymentOptions = {}) => {
  if (options.signal?.aborted || options.isClientConnected?.() === false) {
    throw new ApiError(
      PAYMENT_TRIGGER_CLIENT_CLOSED_STATUS,
      PAYMENT_TRIGGER_CLIENT_CLOSED_MESSAGE
    );
  }
};

/**
 * Generate human readable payment reference
 * Example: LEWA-26-A9F3D
 */
function generatePaymentReference(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `LEWA-${year}-${random}`;
}

/**
 * Send payment request to Campay
 */
const requestCampayPayment = async (
  amount: number,
  phoneNumber: string,
  referenceId: string,
  description: string,
  options: TriggerPaymentOptions = {}
) => {
  assertCanStartProviderPayment(options);

  try {
    const response = await axios.post(
      `${env.campayBaseUrl}/collect/`,
      {
        amount: amount,
        from: phoneNumber,
        description: description,
        external_reference: referenceId,
      },
      {
        timeout: CAMPAY_COLLECT_TIMEOUT_MS,
        headers: {
          Authorization: `Token ${env.campayToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Campay error:", error.response?.data ?? error.message);

    throw new ApiError(
      error.code === "ECONNABORTED" ? 504 : 500,
      error.response?.data?.message || "Campay payment request failed"
    );
  }
};

/**
 * Create a new payment record
 */
export const initiatePayment = async (data: InitiatePaymentInput) => {
  console.log('BACKEND RECEIVED PAYMENT DATA');
  const {
    studentId,
    paymentType,
    amount,
    academicYear,
    paymentMethod,
    phoneNumber,
    feeInstallment,
  } = data;

  // console.log('Extracted values:');
  // console.log('studentId:', studentId);
  // console.log('paymentType:', paymentType, '(type:', typeof paymentType, ')');
  // console.log('amount:', amount);
  // console.log('academicYear:', academicYear);
  // console.log('paymentMethod:', paymentMethod);
  // console.log('phoneNumber:', phoneNumber);
  // console.log('feeInstallment:', feeInstallment);

  const student = await prisma.students.findUnique({
    where: { id: studentId },
    select: {
      full_name: true,
      matricule: true,
      faculty: true,
      level: true,
      fee_status: true,
    },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  if (paymentType === "fee") {
    if (!feeInstallment || !["half", "full"].includes(feeInstallment)) {
      throw new ApiError(400, "Please select a valid fee payment option.");
    }

    const [successfulFullPayment, successfulHalfPayments] = await Promise.all([
      prisma.payments.findFirst({
        where: {
          student_id: studentId,
          payment_type: "fee",
          academic_year: academicYear,
          status: "successful",
          fee_installment: "full",
        },
        select: { id: true },
      }),
      prisma.payments.count({
        where: {
          student_id: studentId,
          payment_type: "fee",
          academic_year: academicYear,
          status: "successful",
          fee_installment: "half",
        },
      }),
    ]);

    const hasCompletedFees =
      student.fee_status === PAID_FEE_STATUS ||
      Boolean(successfulFullPayment) ||
      successfulHalfPayments >= 2;

    if (hasCompletedFees) {
      throw new ApiError(400, "You've completed fees for this school year.");
    }

    const hasPaidHalf =
      student.fee_status === PARTIAL_FEE_STATUS || successfulHalfPayments === 1;

    if (hasPaidHalf && feeInstallment === "full") {
      throw new ApiError(
        400,
        "You've already paid half. Please complete the remaining half payment."
      );
    }
  }

  await prisma.payments.deleteMany({
    where: {
      student_id: studentId,
      payment_type: paymentType,
      academic_year: academicYear,
      status: "pending",
      provider_reference: null,
      fee_installment: paymentType === "fee" ? feeInstallment ?? null : null,
    },
  });

  const referenceId = generatePaymentReference();

  console.log('About to create payment with:');
  console.log('payment_type:', paymentType, '(MUST be "fee" or "subscription")');
  console.log('fee_installment:', feeInstallment ?? null);

  const payment = await prisma.payments.create({
    data: {
      id: uuidv4(),
      student_id: studentId,
      payment_type: paymentType,
      amount,
      reference_id: referenceId,
      phone_number: phoneNumber,
      payment_method: paymentMethod,
      fee_installment: feeInstallment ?? null,
      academic_year: academicYear,
      status: "pending",
    },
  });

  console.log(`Payment record created: ${referenceId} (status: pending)`);

  return {
    reference: payment.reference_id,
    amount: payment.amount,
    status: payment.status,
    paymentMethod: payment.payment_method,
    phoneNumber: payment.phone_number,
    feeInstallment: payment.fee_installment,
    student: {
      name: student.full_name,
      matricule: student.matricule,
      faculty: student.faculty,
      level: student.level,
    },
  };
};

/**
 * Trigger payment with Campay (called when user clicks "Confirm and pay")
 */
export const triggerPayment = async (
  reference: string,
  options: TriggerPaymentOptions = {}
) => {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "public"."payments"
        WHERE "reference_id" = ${reference}
        FOR UPDATE
      `;

      const payment = await tx.payments.findUnique({
        where: { reference_id: reference },
      });

      if (!payment) {
        throw new ApiError(404, "Payment not found");
      }

      if (payment.status !== "pending") {
        throw new ApiError(400, `Payment already ${payment.status}`);
      }

      if (payment.provider_reference) {
        console.log(`Payment ${reference} was already triggered: ${payment.provider_reference}`);

        return {
          reference: payment.reference_id,
          status: payment.status,
          providerReference: payment.provider_reference,
          alreadyTriggered: true,
        };
      }

      assertCanStartProviderPayment(options);

      console.log(`Triggering Campay payment for reference: ${reference}`);

      // Once this provider request starts, I finish saving its reference even if the app disconnects.
      const campayResponse = await requestCampayPayment(
        Number(payment.amount),
        payment.phone_number,
        reference,
        payment.payment_type,
        options
      );

      await tx.payments.update({
        where: { id: payment.id },
        data: {
          provider_reference: campayResponse.reference,
        },
      });

      console.log(`Campay payment triggered successfully: ${campayResponse.reference}`);

      return {
        reference: payment.reference_id,
        status: payment.status,
        providerReference: campayResponse.reference,
        alreadyTriggered: false,
      };
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    }
  );
};

export const deleteDisposablePayment = async (reference: string, studentId: string) => {
  const payment = await prisma.payments.findUnique({
    where: { reference_id: reference },
    select: {
      id: true,
      student_id: true,
      status: true,
      provider_reference: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (payment.student_id !== studentId) {
    throw new ApiError(403, "You do not have permission to modify this payment.");
  }

  const isUntriggeredPending =
    payment.status === "pending" && !payment.provider_reference;
  const isFailed = payment.status === "failed";

  if (!isUntriggeredPending && !isFailed) {
    throw new ApiError(
      409,
      "This payment has already started and cannot be deleted right now."
    );
  }

  await prisma.payments.delete({
    where: { id: payment.id },
  });

  return {
    reference,
    deleted: true,
  };
};

// I save a pending reminder without pretending the payment has been cancelled.
export const createPendingPaymentReminder = async (
  reference: string,
  studentId: string
) => {
  let payment = await prisma.payments.findUnique({
    where: { reference_id: reference },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (payment.student_id !== studentId) {
    throw new ApiError(403, "You do not have permission to view this payment.");
  }

  if (payment.status === "pending" && payment.provider_reference) {
    payment = await syncPaymentWithProvider(payment, {
      forceProviderCheck: true,
    });
  }

  const currentPayment = payment as NonNullable<typeof payment>;

  if (currentPayment.status !== "pending") {
    return {
      payment: {
        reference: currentPayment.reference_id,
        status: currentPayment.status,
        failureReason: currentPayment.failure_reason,
      },
      notification: null,
    };
  }

  if (!currentPayment.provider_reference) {
    return {
      payment: {
        reference: currentPayment.reference_id,
        status: "not_started",
        failureReason: null,
      },
      notification: null,
    };
  }

  const approvalCode = getPaymentApprovalCode(currentPayment.payment_method);
  const methodLabel = getPaymentMethodLabel(currentPayment.payment_method);
  const notification = await createStudentNotification({
    studentId,
    type: "payment_pending",
    title: "Payment still pending",
    body: `Your ${methodLabel} payment is still pending. If you have not approved it yet, dial ${approvalCode}, confirm, then try again in Lewa.`,
    targetType: "payment",
    targetId: currentPayment.id,
    metadata: {
      paymentId: currentPayment.id,
      paymentReference: currentPayment.reference_id,
      paymentType: currentPayment.payment_type,
      paymentMethod: currentPayment.payment_method,
      feeInstallment: currentPayment.fee_installment,
      amount: String(currentPayment.amount),
      approvalCode,
      methodLabel,
    },
    sendPush: false,
  });

  return {
    payment: {
      reference: currentPayment.reference_id,
      status: currentPayment.status,
      failureReason: currentPayment.failure_reason,
    },
    notification,
  };
};

export const deleteAdminSchoolFeePayment = async (paymentId: string) => {
  const payment = await prisma.payments.findFirst({
    where: {
      id: paymentId,
      payment_type: "fee",
    },
    include: {
      receipts: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "School fee payment not found");
  }

  const isUntriggeredPending =
    payment.status === "pending" && !payment.provider_reference;
  const isFailed = payment.status === "failed";

  if ((!isUntriggeredPending && !isFailed) || payment.receipts.length > 0) {
    throw new ApiError(
      409,
      "Only failed or untriggered pending fee payments without receipts can be deleted."
    );
  }

  await prisma.payments.delete({
    where: {
      id: payment.id,
    },
  });

  return {
    id: payment.id,
    reference: payment.reference_id,
    deleted: true,
  };
};

/**
 * Get all payments
 */
export const getPayments = async () => {
  return prisma.payments.findMany({
    orderBy: {
      created_at: "desc",
    },
  });
};

/**
 * Get all payments for a student
 */
export const getStudentPayments = async (studentId: string) => {
  return prisma.payments.findMany({
    where: { student_id: studentId },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const handleCampayWebhook = async (payload: CampayWebhookPayload) => {
  console.log("Received verified Campay webhook:", {
    status: payload.status,
    reference: payload.reference,
    externalReference: payload.external_reference,
  });

  const reference = payload.external_reference as string;
  const providerReference = payload.reference as string;

  if (payload.endpoint && payload.endpoint !== "collect") {
    throw new ApiError(400, "Unsupported Campay webhook endpoint");
  }

  const payment = await prisma.payments.findUnique({
    where: { reference_id: reference },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (
    payment.provider_reference &&
    payment.provider_reference !== providerReference
  ) {
    throw new ApiError(409, "Campay payment reference does not match");
  }

  // The signed callback is only a signal; CamPay's API remains the source of truth.
  const providerPayment = await checkCampayTransactionStatus(providerReference);

  if (!providerPayment) {
    throw new ApiError(502, "Could not verify payment status with Campay");
  }

  if (
    providerPayment.external_reference &&
    providerPayment.external_reference !== reference
  ) {
    throw new ApiError(409, "Campay external reference does not match");
  }

  const paymentStatus = toPaymentStatus(providerPayment.status);
  const failureReason =
    paymentStatus === "failed"
      ? extractPaymentFailureReason(providerPayment)
      : null;

  const updatedPayment = await prisma.payments.update({
    where: { reference_id: reference },
    data: {
      status: paymentStatus,
      provider_reference: providerReference,
      paid_at: paymentStatus === "successful" ? new Date() : null,
      failure_reason: failureReason,
      failed_at: paymentStatus === "failed" ? new Date() : null,
    },
  });

  console.log("Payment updated:", updatedPayment.id);

  if (paymentStatus === "successful") {
    providerStatusCheckCache.delete(reference);
    console.log("Payment successful - generating receipt...");
    const receipt = await generateReceipt(updatedPayment);
    await updateStudentFeeStatus(updatedPayment);
    await notifyPaymentSucceeded(updatedPayment, receipt);
  } else if (paymentStatus === "failed") {
    providerStatusCheckCache.delete(reference);
    await notifyPaymentFailed(
      updatedPayment,
      failureReason || DEFAULT_PAYMENT_FAILURE_REASON
    );
  } else {
    console.log("Payment not successful - skipping receipt generation");
  }
};

/**
 * Get payment status by reference
 */
export const getPaymentByReference = async (
  reference: string,
  options: PaymentStatusOptions = {}
) => {
  let payment = await prisma.payments.findUnique({
    where: {
      reference_id: reference,
    },
    include: {
      students: {
        select: {
          full_name: true,
          matricule: true,
          faculty: true,
          level: true,
        },
      },
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (options.verifyProvider !== false) {
    payment = await syncPaymentWithProvider(payment, {
      forceProviderCheck: options.forceProviderCheck,
      includeStudent: true,
    });
  }

  const currentPayment = payment as NonNullable<typeof payment>;

  // Format response to match expected structure
  return {
    id: currentPayment.id,
    reference: currentPayment.reference_id,
    amount: currentPayment.amount,
    status: currentPayment.status,
    paymentType: currentPayment.payment_type,
    paymentMethod: currentPayment.payment_method,
    phoneNumber: currentPayment.phone_number,
    feeInstallment: currentPayment.fee_installment,
    academicYear: currentPayment.academic_year,
    providerReference: currentPayment.provider_reference,
    failureReason: currentPayment.failure_reason,
    failedAt: currentPayment.failed_at,
    paidAt: currentPayment.paid_at,
    createdAt: currentPayment.created_at,
    student: {
      name: currentPayment.students.full_name,
      matricule: currentPayment.students.matricule,
      faculty: currentPayment.students.faculty,
      level: currentPayment.students.level,
    },
  };
};

export const reconcilePendingPayments = async () => {
  const cutoff = new Date(Date.now() - PENDING_RECONCILE_MIN_AGE_MS);

  const pendingPayments = await prisma.payments.findMany({
    where: {
      status: "pending",
      provider_reference: {
        not: null,
      },
      created_at: {
        lte: cutoff,
      },
    },
    orderBy: {
      created_at: "asc",
    },
    take: PENDING_RECONCILE_BATCH_SIZE,
  });

  let checked = 0;
  let updated = 0;

  for (const payment of pendingPayments) {
    const syncedPayment = await syncPaymentWithProvider(payment, {
      forceProviderCheck: true,
    });

    checked++;

    if (syncedPayment.status !== payment.status) {
      updated++;
    }
  }

  return {
    checked,
    updated,
  };
};

/**
 * Query Campay for transaction status
 */
const checkCampayTransactionStatus = async (reference: string) => {
  try {
    const response = await axios.get(
      `${env.campayBaseUrl}/transaction/${reference}`,
      {
        headers: {
          Authorization: `Token ${env.campayToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Campay status check failed:", error);
    return null;
  }
};

const syncPaymentWithProvider = async (
  payment: any,
  options: { forceProviderCheck?: boolean; includeStudent?: boolean } = {}
) => {
  if (
    payment.status !== "pending" ||
    !payment.provider_reference ||
    !shouldCheckProviderStatus(payment.reference_id, options.forceProviderCheck)
  ) {
    return payment;
  }

  const campayStatus = await checkCampayTransactionStatus(
    payment.provider_reference
  );

  if (!campayStatus) {
    return payment;
  }

  const updatedStatus = toPaymentStatus(campayStatus.status);

  if (updatedStatus === "pending" || updatedStatus === payment.status) {
    return payment;
  }

  providerStatusCheckCache.delete(payment.reference_id);
  const failureReason =
    updatedStatus === "failed" ? extractPaymentFailureReason(campayStatus) : null;

  const updatedPayment = await prisma.payments.update({
    where: { reference_id: payment.reference_id },
    data: {
      status: updatedStatus,
      paid_at: updatedStatus === "successful" ? new Date() : null,
      failure_reason: failureReason,
      failed_at: updatedStatus === "failed" ? new Date() : null,
    },
    ...(options.includeStudent
      ? {
          include: {
            students: {
              select: studentReceiptSelect,
            },
          },
        }
      : {}),
  } as any);

  if (updatedStatus === "successful") {
    console.log("Payment successful - generating receipt and updating student status...");
    const receipt = await generateReceipt(updatedPayment);
    await updateStudentFeeStatus(updatedPayment);
    await notifyPaymentSucceeded(updatedPayment, receipt);
  } else if (updatedStatus === "failed") {
    await notifyPaymentFailed(
      updatedPayment,
      failureReason || DEFAULT_PAYMENT_FAILURE_REASON
    );
  }

  return updatedPayment;
};

const getSchoolFeePaymentForAdmin = async (paymentId: string) => {
  const payment = await prisma.payments.findFirst({
    where: {
      id: paymentId,
      payment_type: "fee",
    },
    include: {
      students: {
        select: adminPaymentStudentSelect,
      },
      receipts: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "School fee payment not found");
  }

  return payment;
};

export const syncSchoolFeePaymentWithProvider = async (paymentId: string) => {
  const payment = await getSchoolFeePaymentForAdmin(paymentId);

  if (payment.status !== "pending") {
    return payment;
  }

  await syncPaymentWithProvider(payment, {
    forceProviderCheck: true,
  });

  return getSchoolFeePaymentForAdmin(paymentId);
};



/**
 * Generate receipt for successful payment
 */
const generateReceipt = async (payment: any) => {
  try {
    console.log("Starting receipt generation for payment:", payment.id);

    const existingReceipt = await prisma.receipts.findFirst({
      where: { payment_id: payment.id },
    });

    if (existingReceipt) {
      console.log("Receipt already exists for payment:", payment.id);
      return existingReceipt;
    }

    const receiptNumber = `LEWA-RCPT-${Date.now()}`;

    // Map payment_type to receipt_type
    // Payments table uses: 'fee' or 'subscription'
    // Receipts table expects: 'school_fee' or 'subscription'
    const receiptType = payment.payment_type === 'fee' ? 'school_fee' : payment.payment_type;

    console.log(`Generating receipt ${receiptNumber} for payment ${payment.reference_id}`);
    console.log(`Payment type: ${payment.payment_type} → Receipt type: ${receiptType}`);
    console.log(`Data to insert:`, {
      payment_id: payment.id,
      student_id: payment.student_id,
      receipt_number: receiptNumber,
      receipt_type: receiptType,
      amount: payment.amount,
      academic_year: payment.academic_year,
    });

    const receipt = await prisma.receipts.create({
      data: {
        payment_id: payment.id,
        student_id: payment.student_id,
        receipt_number: receiptNumber,
        receipt_type: receiptType,
        amount: payment.amount,
        academic_year: payment.academic_year,
        file_url: null,
      },
    });

    console.log("Receipt created successfully:", receipt.receipt_number);
    return receipt;

  } catch (error: any) {
    console.error("Error generating receipt:", error);
    console.error("Error details:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.meta) {
      console.error(" Error meta:", error.meta);
    }
    throw error;
  }
};

export const generateSchoolFeeReceiptForPayment = async (paymentId: string) => {
  const payment = await getSchoolFeePaymentForAdmin(paymentId);

  if (payment.status !== "successful") {
    throw new ApiError(400, "Receipts can only be generated for successful fee payments");
  }

  const receipt = await generateReceipt(payment);
  await updateStudentFeeStatus(payment);
  await notifyPaymentSucceeded(payment, receipt);
  const updatedPayment = await getSchoolFeePaymentForAdmin(paymentId);

  return {
    payment: updatedPayment,
    receipt,
  };
};

/**
 * Get receipt by payment reference
 */
export const getReceiptByReference = async (reference: string) => {

  const payment = await prisma.payments.findUnique({
    where: { reference_id: reference },
    include: {
      students: {
        select: {
          full_name: true,
          matricule: true,
          faculty: true,
          level: true,
        },
      },
      receipts: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  const receipt = payment.receipts?.[0];

  if (!receipt) {
    throw new ApiError(404, "Receipt not found");
  }

  return {
    receiptNumber: receipt.receipt_number,
    amount: receipt.amount,
    receiptType: receipt.receipt_type,
    paymentType: payment.payment_type,
    academicYear: receipt.academic_year,
    createdAt: receipt.created_at,
    paymentReference: payment.reference_id,
    paymentMethod: payment.payment_method,
    phoneNumber: payment.phone_number,
    feeInstallment: payment.fee_installment,
    paidAt: payment.paid_at,
    student: {
      name: payment.students.full_name,
      matricule: payment.students.matricule,
      faculty: payment.students.faculty,
      level: payment.students.level,
    },
  };
};


/**
 * Check and update expired subscriptions
 * This should be called periodically (e.g., monthly cron job)
 */
export const updateExpiredSubscriptions = async () => {
  try {
    console.log('Checking for expired subscriptions...');

    const now = new Date();

    // Find all active subscriptions that have expired
    const expiredSubscriptions = await prisma.subscriptions.findMany({
      where: {
        status: 'ACTIVE',
        expiry_date: {
          lt: now, // less than current date
        },
      },
    });

    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

    if (expiredSubscriptions.length === 0) {
      console.log('No expired subscriptions to update');
      return { updated: 0 };
    }

    // Update each expired subscription
    for (const subscription of expiredSubscriptions) {
      // Update subscription status to EXPIRED
      await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });

      // Update student subscribed status to false
      await prisma.students.update({
        where: { id: subscription.student_id },
        data: { subscribed: false },
      });

      console.log(`Updated subscription ${subscription.id} and student ${subscription.student_id}`);
    }

    console.log(`Successfully updated ${expiredSubscriptions.length} expired subscriptions`);
    return { updated: expiredSubscriptions.length };

  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
    throw error;
  }
};

const updateStudentFeeStatus = async (payment: any) => {
  console.log(`🔍 Checking if fee/subscription status should be updated for payment ${payment.id}`);
  console.log(`   Payment type: ${payment.payment_type}`);
  console.log(`   Fee installment: ${payment.fee_installment}`);

  // Handle subscription payments
  if (payment.payment_type === "subscription") {
    console.log(`Processing subscription payment...`);

    try {
      // Check if subscription already exists for this payment
      const existingSubscription = await prisma.subscriptions.findUnique({
        where: { payment_id: payment.id },
      });

      if (existingSubscription) {
        console.log(`Subscription already exists for payment ${payment.id}`);
        return;
      }

      // Calculate subscription dates (1 year from now)
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      console.log(`Creating subscription:`, {
        student_id: payment.student_id,
        payment_id: payment.id,
        start_date: startDate,
        expiry_date: expiryDate,
        status: "ACTIVE",
      });

      // Create subscription record
      const subscription = await prisma.subscriptions.create({
        data: {
          id: uuidv4(),
          student_id: payment.student_id,
          payment_id: payment.id,
          start_date: startDate,
          expiry_date: expiryDate,
          status: "ACTIVE",
        },
      });

      console.log(`Subscription created:`, subscription.id);

      // Update student subscribed status
      await prisma.students.update({
        where: {
          id: payment.student_id,
        },
        data: {
          subscribed: true,
        },
      });

      console.log(` Student.subscribed set to true for student ${payment.student_id}`);
      return;

    } catch (error: any) {
      console.error(`Error creating subscription:`, error);
      console.error(`Error message:`, error.message);
      if (error.code) {
        console.error(`Error code:`, error.code);
      }
      if (error.meta) {
        console.error(`Error meta:`, error.meta);
      }
      throw error;
    }
  }

  // Handle school fee payments
  if (payment.payment_type !== "fee") {
    console.log(`Skipping fee status update - not a school fee payment`);
    return;
  }

  const successfulFeePayments = await prisma.payments.findMany({
    where: {
      student_id: payment.student_id,
      payment_type: "fee",
      academic_year: payment.academic_year,
      status: "successful",
    },
    select: {
      fee_installment: true,
    },
  });

  const hasFullPayment = successfulFeePayments.some(
    (feePayment) => feePayment.fee_installment === "full"
  );
  const halfPaymentCount = successfulFeePayments.filter(
    (feePayment) => feePayment.fee_installment === "half"
  ).length;

  let newStatus: string | null = null;

  if (hasFullPayment || halfPaymentCount >= 2) {
    newStatus = PAID_FEE_STATUS;
  } else if (halfPaymentCount === 1) {
    newStatus = PARTIAL_FEE_STATUS;
  }

  if (!newStatus) {
    console.log(`Could not determine fee status from installment: ${payment.fee_installment}`);
    return;
  }

  console.log(`Updating student ${payment.student_id} fee_status to ${newStatus}`);

  await prisma.students.update({
    where: {
      id: payment.student_id,
    },
    data: {
      fee_status: newStatus,
    },
  });

  console.log(`Student fee_status updated to ${newStatus}`);
};
