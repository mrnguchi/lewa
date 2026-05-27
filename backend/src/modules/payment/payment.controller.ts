import { Request, Response } from "express";
import * as paymentService from "./payment.service";

const createPaymentRequestGuard = (req: Request, res: Response) => {
  const abortController = new AbortController();

  const abortIfResponseIsStillPending = () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  };

  req.on("aborted", abortIfResponseIsStillPending);
  res.on("close", abortIfResponseIsStillPending);

  return {
    signal: abortController.signal,
    isClientConnected: () =>
      !abortController.signal.aborted && !req.destroyed && !res.destroyed,
    cleanup: () => {
      req.off("aborted", abortIfResponseIsStillPending);
      res.off("close", abortIfResponseIsStillPending);
    },
  };
};

/**
 * Get all payments
 */
export const getPayments = async (_req: Request, res: Response) => {
  const payments = await paymentService.getPayments();

  res.status(200).json({
    success: true,
    data: payments,
  });
};

/**
 * Create a new payment record
 */
export const initiatePayment = async (req: Request, res: Response) => {
  const payment = await paymentService.initiatePayment(req.body);

  res.status(201).json({
    success: true,
    data: payment,
  });
};

/**
 * Trigger payment with provider (Campay)
 */
export const triggerPayment = async (req: Request, res: Response) => {
  const reference = req.params.reference as string;
  const requestGuard = createPaymentRequestGuard(req, res);

  try {
    const result = await paymentService.triggerPayment(reference, {
      signal: requestGuard.signal,
      isClientConnected: requestGuard.isClientConnected,
    });

    if (!requestGuard.isClientConnected()) {
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } finally {
    requestGuard.cleanup();
  }
};

/**
 * Delete a pending untriggered payment or a confirmed failed payment
 */
export const deleteDisposablePayment = async (req: Request, res: Response) => {
  const reference = req.params.reference as string;
  const studentId = (req as any).student.studentId;

  const result = await paymentService.deleteDisposablePayment(reference, studentId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

/**
 * Campay webhook
 */
export const campayWebhook = async (req: Request, res: Response) => {
  try {

    const payload = req.method === "GET" ? req.query : req.body;

    console.log("---- CAM PAY WEBHOOK ----");
    console.log(payload);

    await paymentService.handleCampayWebhook(payload);

    res.status(200).json({
      success: true,
    });

  } catch (error) {

    console.error("Webhook error:", error);

    res.status(200).json({
      success: false
    });
  }
};


/**
 * Get payment status by reference
 */
export const getPaymentStatus = async (req: Request, res: Response) => {

  const reference = req.params.reference as string;
  const verifyProvider =
    req.query.verifyProvider !== "false" && req.query.verify !== "false";
  const forceProviderCheck =
    req.query.forceProviderCheck === "true" || req.query.force === "true";

  const payment = await paymentService.getPaymentByReference(reference, {
    verifyProvider,
    forceProviderCheck,
  });

  res.status(200).json({
    success: true,
    data: payment,
  });

};

/**
 * Reconcile older triggered pending payments with Campay
 */
export const reconcilePendingPayments = async (_req: Request, res: Response) => {
  const result = await paymentService.reconcilePendingPayments();

  res.status(200).json({
    success: true,
    data: result,
  });
};

/**
 * Get all payments for a student
 */
export const getStudentPayments = async (req: Request, res: Response) => {

  const studentId = (req as any).student.studentId;

  const payments = await paymentService.getStudentPayments(studentId);

  res.status(200).json({
    success: true,
    data: payments,
  });

};

/**
 * Get receipt by payment reference
 */
export const getReceipt = async (req: Request, res: Response) => {

  const reference = req.params.reference as string;

  const receipt = await paymentService.getReceiptByReference(reference);

  res.status(200).json({
    success: true,
    data: receipt,
  });

};

/**
 * Update expired subscriptions
 * This endpoint can be called by a cron job
 */
export const updateExpiredSubscriptions = async (_req: Request, res: Response) => {
  const result = await paymentService.updateExpiredSubscriptions();

  res.status(200).json({
    success: true,
    message: `Updated ${result.updated} expired subscriptions`,
    data: result,
  });
};
