import { Request, Response } from "express";
import * as receiptService from "./receipt.service";

/**
 * Get all receipts for a student
 */
export const getStudentReceipts = async (req: Request, res: Response) => {
  const studentId = (req as any).student.studentId;

  const receipts = await receiptService.getStudentReceipts(studentId);

  res.status(200).json({
    success: true,
    data: receipts,
  });
};

/**
 * Get a single receipt by ID
 */
export const getReceiptById = async (req: Request, res: Response) => {
  const receiptId = req.params.id as string;

  const receipt = await receiptService.getReceiptById(receiptId);

  res.status(200).json({
    success: true,
    data: receipt,
  });
};
