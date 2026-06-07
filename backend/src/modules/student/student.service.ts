import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";
import { env } from "../../config/env";

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
 * Saves a profile image only when it came from this student's signed Cloudinary path.
 */
export const updateStudentProfileImage = async (
  studentId: string,
  profileImageUrl: string,
  publicId: string
) => {
  const expectedPublicIdPrefix = `lewa/profile-images/${studentId}/`;
  let parsedImageUrl: URL;

  try {
    parsedImageUrl = new URL(profileImageUrl);
  } catch {
    throw new ApiError(400, "Invalid profile image URL");
  }

  const expectedCloudPath = `/${env.cloudinaryCloudName}/image/upload/`;
  const isTrustedCloudinaryUrl =
    parsedImageUrl.protocol === "https:" &&
    parsedImageUrl.hostname === "res.cloudinary.com" &&
    parsedImageUrl.pathname.startsWith(expectedCloudPath);
  const belongsToStudent =
    publicId.startsWith(expectedPublicIdPrefix) &&
    parsedImageUrl.pathname.includes(`/${publicId}.`);

  if (!isTrustedCloudinaryUrl || !belongsToStudent) {
    throw new ApiError(400, "Profile image did not come from a valid Lewa upload");
  }

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
      profile_image_url: profileImageUrl,
      updated_at: new Date(),
    },
    select: studentPublicSelect,
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
