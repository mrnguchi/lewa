import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";

const studentPublicSelect = {
  id: true,
  full_name: true,
  matricule: true,
  phone_number: true,
  faculty: true,
  department: true,
  level: true,
  profile_image_url: true,
  notifications_enabled: true,
  is_active: true,
  fee_status: true,
  subscribed: true,
  role: true,
} as const;

/**
 * Get all students
 */
export const getStudents = async () => {
  return prisma.students.findMany({
    select: studentPublicSelect,
    orderBy: {
      created_at: "desc",
    },
  });
};

/**
 * Get a student by ID
 */
export const getStudentById = async (id: string) => {
  const student = await prisma.students.findUnique({
    where: { id },
    select: studentPublicSelect,
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return student;
};

/**
 * Get student by matricule
 */
export const getStudentByMatricule = async (matricule: string) => {
  const student = await prisma.students.findUnique({
    where: { matricule },
    select: studentPublicSelect,
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return student;
};

/**
 * Updates whether a student wants to receive app notifications.
 */
export const updateStudentNotifications = async (
  studentId: string,
  notificationsEnabled: boolean
) => {
  const student = await prisma.students.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return prisma.students.update({
    where: { id: studentId },
    data: {
      notifications_enabled: notificationsEnabled,
    },
    select: {
      id: true,
      notifications_enabled: true,
    },
  });
};

/**
 * Stores the latest Expo push token for the student's active device.
 */
export const updateStudentPushToken = async (
  studentId: string,
  expoPushToken: string
) => {
  const student = await prisma.students.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return prisma.students.update({
    where: { id: studentId },
    data: {
      expo_push_token: expoPushToken,
    },
    select: {
      id: true,
      expo_push_token: true,
    },
  });
};
