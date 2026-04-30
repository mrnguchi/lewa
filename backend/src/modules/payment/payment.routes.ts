import { Router } from "express";
import {
  initiatePayment,
  triggerPayment,
  deleteDisposablePayment,
  getStudentPayments,
  getPayments,
  campayWebhook,
  getPaymentStatus,
  getReceipt,
  reconcilePendingPayments,
  updateExpiredSubscriptions
} from "./payment.controller";
import { authenticateStudent } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * Get all payments
 */
router.get("/", authenticateStudent, getPayments);

/**
 * Create a new payment record (does NOT trigger payment)
 */
router.post("/", authenticateStudent, initiatePayment);

/**
 * Trigger payment with provider (Campay)
 */
router.post("/:reference/trigger", authenticateStudent, triggerPayment);

/**
 * Delete a payment that is safe to discard
 */
router.delete("/:reference", authenticateStudent, deleteDisposablePayment);

/**
 * Campay webhook
 */

router.get("/webhook", campayWebhook);
router.post("/webhook", campayWebhook);

/**
 * Get receipt by payment reference
 */
router.get("/receipt/:reference", authenticateStudent, getReceipt);

/**
 * Get payment status by reference
 */
router.get("/reference/:reference", authenticateStudent, getPaymentStatus);

/**
 * Reconcile older pending payments with provider status
 */
router.post("/reconcile-pending", reconcilePendingPayments);

/**
 * Get payments for a specific student
 */
router.get("/student/my", authenticateStudent, getStudentPayments);

/**
 * Update expired subscriptions
 * This endpoint can be called by a cron job or manually
 */
router.post("/subscriptions/check-expired", updateExpiredSubscriptions);

export default router;
