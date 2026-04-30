import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";

/**
 * Get all receipts for a student
 */
export const getStudentReceipts = async (studentId: string) => {
  const receipts = await prisma.receipts.findMany({
    where: { student_id: studentId },
    include: {
      payments: {
        select: {
          reference_id: true,
          payment_type: true,
          payment_method: true,
          phone_number: true,
          fee_installment: true,
          paid_at: true,
        },
      },
      students: {
        select: {
          full_name: true,
          matricule: true,
          faculty: true,
          level: true,
        },
      },
    },
    orderBy: {
      issued_at: 'desc',
    },
  });

  return receipts.map((receipt) => ({
    id: receipt.id,
    receiptNumber: receipt.receipt_number,
    amount: receipt.amount,
    receiptType: receipt.receipt_type,
    paymentType: receipt.payments.payment_type,
    academicYear: receipt.academic_year,
    issuedAt: receipt.issued_at,
    paymentReference: receipt.payments.reference_id,
    paymentMethod: receipt.payments.payment_method,
    phoneNumber: receipt.payments.phone_number,
    feeInstallment: receipt.payments.fee_installment,
    paidAt: receipt.payments.paid_at,
    student: {
      name: receipt.students.full_name,
      matricule: receipt.students.matricule,
      faculty: receipt.students.faculty,
      level: receipt.students.level,
    },
  }));
};

/**
 * Get a single receipt by ID
 */
export const getReceiptById = async (receiptId: string) => {
  const receipt = await prisma.receipts.findUnique({
    where: { id: receiptId },
    include: {
      payments: {
        select: {
          reference_id: true,
          payment_type: true,
          payment_method: true,
          phone_number: true,
          fee_installment: true,
          paid_at: true,
        },
      },
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

  if (!receipt) {
    throw new ApiError(404, "Receipt not found");
  }

  return {
    id: receipt.id,
    receiptNumber: receipt.receipt_number,
    amount: receipt.amount,
    receiptType: receipt.receipt_type,
    paymentType: receipt.payments.payment_type,
    academicYear: receipt.academic_year,
    issuedAt: receipt.issued_at,
    paymentReference: receipt.payments.reference_id,
    paymentMethod: receipt.payments.payment_method,
    phoneNumber: receipt.payments.phone_number,
    feeInstallment: receipt.payments.fee_installment,
    paidAt: receipt.payments.paid_at,
    student: {
      name: receipt.students.full_name,
      matricule: receipt.students.matricule,
      faculty: receipt.students.faculty,
      level: receipt.students.level,
    },
  };
};
