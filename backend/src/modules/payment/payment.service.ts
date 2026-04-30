import { prisma } from "../../database/prisma";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "../../utils/api-error";
import axios from "axios";
import { env } from "../../config/env";

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

const studentReceiptSelect = {
  full_name: true,
  matricule: true,
  faculty: true,
  level: true,
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
  description: string
) => {
  try {
    const response = await axios.post(
      `${process.env.CAMPAY_BASE_URL}/collect/`,
      {
        amount: amount,
        from: phoneNumber,
        description: description,
        external_reference: referenceId,
      },
      {
        headers: {
          Authorization: `Token ${process.env.CAMPAY_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Campay error:", error.response?.data);

    throw new ApiError(
      500,
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
export const triggerPayment = async (reference: string) => {
  const payment = await prisma.payments.findUnique({
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

  console.log(`Triggering Campay payment for reference: ${reference}`);

  /**
   * Trigger Campay MoMo request
   */
  const campayResponse = await requestCampayPayment(
    Number(payment.amount),
    payment.phone_number,
    reference,
    payment.payment_type
  );

  /**
   * Save Campay provider reference
   */
  await prisma.payments.update({
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

export const handleCampayWebhook = async (payload: any) => {
  console.log("Received Campay webhook payload:", JSON.stringify(payload, null, 2));

  const reference = payload.external_reference as string;
  const status = payload.status as string;
  const operatorReference = payload.operator_reference as string | undefined;

  console.log("Extracted data:", { reference, status, operatorReference });

  if (!reference) {
    console.error("Invalid webhook payload - missing reference");
    throw new ApiError(400, "Invalid webhook payload");
  }

  const paymentStatus = toPaymentStatus(status);

  if (paymentStatus === "successful") {
    console.log("Payment status: SUCCESSFUL");
  } else if (paymentStatus === "failed") {
    console.log("Payment status: FAILED");
  } else {
    console.log("Payment status: PENDING or UNKNOWN");
  }

  console.log(`Updating payment ${reference} to status: ${paymentStatus}`);

  const payment = await prisma.payments.update({
    where: { reference_id: reference },
    data: {
      status: paymentStatus,
      provider_reference: operatorReference ?? undefined,
      paid_at: status === "SUCCESSFUL" ? new Date() : null,
    },
  });

  console.log("Payment updated:", payment.id);

  if (paymentStatus === "successful") {
    providerStatusCheckCache.delete(reference);
    console.log("Payment successful - generating receipt...");
    await generateReceipt(payment);
    await updateStudentFeeStatus(payment);
  } else if (paymentStatus === "failed") {
    providerStatusCheckCache.delete(reference);
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

  const campayStatus = await checkCampayTransactionStatus(payment.reference_id);

  if (!campayStatus) {
    return payment;
  }

  const updatedStatus = toPaymentStatus(campayStatus.status);

  if (updatedStatus === "pending" || updatedStatus === payment.status) {
    return payment;
  }

  providerStatusCheckCache.delete(payment.reference_id);

  const updatedPayment = await prisma.payments.update({
    where: { reference_id: payment.reference_id },
    data: {
      status: updatedStatus,
      paid_at: updatedStatus === "successful" ? new Date() : null,
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
    await generateReceipt(updatedPayment);
    await updateStudentFeeStatus(updatedPayment);
  }

  return updatedPayment;
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
      return;
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
 * This should be called periodically (e.g., daily cron job)
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
