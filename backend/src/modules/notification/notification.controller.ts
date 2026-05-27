import { Request, Response } from "express";

import * as notificationService from "./notification.service";

const getAuthenticatedStudentId = (req: Request) =>
  (req as any).student?.studentId as string;

export const listMyNotifications = async (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req);
  const limit = Number(req.query.limit ?? 20);

  const notifications = await notificationService.listStudentNotifications(
    studentId,
    Number.isFinite(limit) ? limit : 20
  );

  res.status(200).json({
    success: true,
    data: notifications,
  });
};

export const getMyUnreadNotificationCount = async (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req);
  const count = await notificationService.getUnreadNotificationCount(studentId);

  res.status(200).json({
    success: true,
    data: {
      count,
    },
  });
};

export const markMyNotificationRead = async (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req);
  const notificationId = String(req.params.id);
  const notification = await notificationService.markNotificationRead(
    studentId,
    notificationId
  );

  res.status(200).json({
    success: true,
    data: notification,
  });
};

export const markAllMyNotificationsRead = async (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req);
  const result = await notificationService.markAllNotificationsRead(studentId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const deleteMyNotification = async (req: Request, res: Response) => {
  const studentId = getAuthenticatedStudentId(req);
  const notificationId = String(req.params.id);
  const result = await notificationService.deleteStudentNotification(
    studentId,
    notificationId
  );

  res.status(200).json({
    success: true,
    data: result,
  });
};
