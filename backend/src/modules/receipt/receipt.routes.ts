import { Router } from "express";
import { getStudentReceipts, getReceiptById } from "./receipt.controller";
import { authenticateStudent } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * Get all receipts for the authenticated student
 */
router.get("/my", authenticateStudent, getStudentReceipts);

/**
 * Get a single receipt by ID
 */
router.get("/:id", authenticateStudent, getReceiptById);

export default router;
