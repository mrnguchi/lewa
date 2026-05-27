import axios from "axios";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "../../database/prisma";
import { emitStudentNotificationsChanged } from "../../realtime/socket.service";
import { ApiError } from "../../utils/api-error";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type StudentNotificationType =
  | "chat_message"
  | "payment_success"
  | "payment_failed"
  | "news_article";

type CreateStudentNotificationInput = {
  studentId: string;
  type: StudentNotificationType;
  title: string;
  body: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  sendPush?: boolean;
};

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  target_type: true,
  target_id: true,
  metadata: true,
  read_at: true,
  created_at: true,
} as const;

type NotificationRecord = Prisma.notificationsGetPayload<{
  select: typeof notificationSelect;
}>;

const mapNotification = (notification: NotificationRecord) => ({
  id: notification.id,
  type: notification.type as StudentNotificationType,
  title: notification.title,
  body: notification.body,
  targetType: notification.target_type,
  targetId: notification.target_id,
  metadata: notification.metadata,
  readAt: notification.read_at,
  createdAt: notification.created_at,
});

const getPushDataForNotification = (notification: NotificationRecord) => {
  const metadata =
    notification.metadata && typeof notification.metadata === "object"
      ? (notification.metadata as Record<string, unknown>)
      : {};

  return {
    type: notification.type,
    notificationId: notification.id,
    targetType: notification.target_type,
    targetId: notification.target_id,
    ...metadata,
  };
};

// I keep push delivery best-effort because the database notification is the reliable source.
async function sendStudentPushNotification(notification: NotificationRecord) {
  const student = await prisma.students.findUnique({
    where: {
      id: (notification as any).student_id,
    },
    select: {
      expo_push_token: true,
      notifications_enabled: true,
    },
  });

  if (!student?.notifications_enabled || !student.expo_push_token) {
    return;
  }

  await axios.post(
    EXPO_PUSH_URL,
    [
      {
        to: student.expo_push_token,
        title: notification.title,
        body: notification.body,
        data: getPushDataForNotification(notification),
        sound: "default",
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
}

// I save every important event first, then optionally push it to the phone.
export async function createStudentNotification(input: CreateStudentNotificationInput) {
  let notification: NotificationRecord & { student_id?: string };

  try {
    notification = await prisma.notifications.create({
      select: {
        ...notificationSelect,
        student_id: true,
      },
      data: {
        id: randomUUID(),
        student_id: input.studentId,
        type: input.type,
        title: input.title.trim(),
        body: input.body.trim(),
        target_type: input.targetType,
        target_id: input.targetId,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.targetId
    ) {
      const existingNotification = await prisma.notifications.findFirst({
        select: {
          ...notificationSelect,
          student_id: true,
        },
        where: {
          student_id: input.studentId,
          type: input.type,
          target_id: input.targetId,
        },
      });

      if (!existingNotification) {
        throw error;
      }

      notification = existingNotification;
    } else {
      throw error;
    }
  }

  if (input.sendPush !== false) {
    try {
      await sendStudentPushNotification(notification);
    } catch (error) {
      console.error("Failed to send push notification", error);
    }
  }

  emitStudentNotificationsChanged(input.studentId);

  return mapNotification(notification);
}

// I create in-app news notifications for every active student, even if push is off.
export async function createNewsNotifications(params: {
  newsId: string;
  title: string;
  body: string;
  category: string;
  imageUrl?: string;
  authorStudentId?: string;
  sendPush?: boolean;
}) {
  const recipients = await prisma.students.findMany({
    where: {
      is_active: true,
      ...(params.authorStudentId
        ? {
            id: {
              not: params.authorStudentId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  for (const recipient of recipients) {
    await createStudentNotification({
      studentId: recipient.id,
      type: "news_article",
      title: "Lewa News",
      body: params.body,
      targetType: "news",
      targetId: params.newsId,
      metadata: {
        newsId: params.newsId,
        category: params.category,
        imageUrl: params.imageUrl,
        articleTitle: params.title,
      },
      sendPush: params.sendPush,
    });
  }

  return {
    recipients: recipients.length,
  };
}

export async function listStudentNotifications(studentId: string, limit = 20) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const notifications = await prisma.notifications.findMany({
    select: notificationSelect,
    where: {
      student_id: studentId,
    },
    orderBy: {
      created_at: "desc",
    },
    take: safeLimit,
  });

  return notifications.map(mapNotification);
}

export async function getUnreadNotificationCount(studentId: string) {
  return prisma.notifications.count({
    where: {
      student_id: studentId,
      read_at: null,
    },
  });
}

export async function markNotificationRead(studentId: string, notificationId: string) {
  const notification = await prisma.notifications.findFirst({
    where: {
      id: notificationId,
      student_id: studentId,
    },
    select: {
      id: true,
      read_at: true,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (!notification.read_at) {
    await prisma.notifications.update({
      where: {
        id: notificationId,
      },
      data: {
        read_at: new Date(),
      },
    });
  }

  emitStudentNotificationsChanged(studentId);

  const refreshedNotification = await prisma.notifications.findUniqueOrThrow({
    where: {
      id: notificationId,
    },
    select: notificationSelect,
  });

  return mapNotification(refreshedNotification);
}

export async function markAllNotificationsRead(studentId: string) {
  await prisma.notifications.updateMany({
    where: {
      student_id: studentId,
      read_at: null,
    },
    data: {
      read_at: new Date(),
    },
  });

  emitStudentNotificationsChanged(studentId);

  return {
    success: true,
  };
}

export async function deleteStudentNotification(studentId: string, notificationId: string) {
  const notification = await prisma.notifications.findFirst({
    where: {
      id: notificationId,
      student_id: studentId,
    },
    select: {
      id: true,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  await prisma.notifications.delete({
    where: {
      id: notificationId,
    },
  });

  emitStudentNotificationsChanged(studentId);

  return {
    success: true,
  };
}
