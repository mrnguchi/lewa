import { Request, Response } from "express";
import * as authService from "./auth.service";

/**
 * Register student
 */
export const registerStudent = async (req: Request, res: Response) => {

  const student = await authService.registerStudent(req.body);

  res.status(201).json({
    success: true,
    data: student,
  });

};


/**
 * Login student
 */
export const loginStudent = async (req: Request, res: Response) => {

  const student = await authService.loginStudent(req.body);

  res.status(200).json({
    success: true,
    data: student,
  });

};