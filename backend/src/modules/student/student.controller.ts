import { Request, Response } from "express";
import * as studentService from "./student.service";
import {
  updateStudentNotificationsSchema,
  updateStudentPushTokenSchema,
} from "./student.schema";
import { ApiError } from "../../utils/api-error";

/**
 * Ensures a student can only update their own notification settings.
 */
function ensureStudentOwnsProfile(req: Request, studentId: string) {
  const authenticatedStudentId = (req as any).student?.studentId as string | undefined;

  if (!authenticatedStudentId) {
    throw new ApiError(401, "Authentication required");
  }

  if (authenticatedStudentId !== studentId) {
    throw new ApiError(403, "You do not have permission to update this student");
  }
}

/**
 * Get all students
 */
export const getStudents = async (req: Request, res: Response) => {
  const students = await studentService.getStudents();

  res.status(200).json({
    success: true,
    data: students,
  });
};

/**
 * Get a single student by ID
 */
export const getStudentById = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const student = await studentService.getStudentById(id);

  res.status(200).json({
    success: true,
    data: student,
  });
};

/**
 * Get student by matricule
 */
export const getStudentByMatricule = async (req: Request, res: Response) => {
  const matricule = req.params.matricule as string;

  const student = await studentService.getStudentByMatricule(matricule);

  res.status(200).json({
    success: true,
    data: student,
  });
};

/**
 * Updates whether the authenticated student wants to receive notifications.
 */
export const updateStudentNotifications = async (req: Request, res: Response) => {
  const studentId = req.params.id as string;
  ensureStudentOwnsProfile(req, studentId);

  const payload = updateStudentNotificationsSchema.parse(req.body);
  const student = await studentService.updateStudentNotifications(
    studentId,
    payload.notifications_enabled
  );

  res.status(200).json({
    success: true,
    message: "Notification settings updated successfully",
    data: student,
  });
};

/**
 * Saves the authenticated student's current Expo push token.
 */
export const updateStudentPushToken = async (req: Request, res: Response) => {
  const studentId = req.params.id as string;
  ensureStudentOwnsProfile(req, studentId);

  const payload = updateStudentPushTokenSchema.parse(req.body);
  const student = await studentService.updateStudentPushToken(
    studentId,
    payload.expo_push_token
  );

  res.status(200).json({
    success: true,
    message: "Push token saved successfully",
    data: student,
  });
};
