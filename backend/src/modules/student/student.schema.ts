import { z } from "zod";

/**
 * Validates notification preference updates for a student.
 */
export const updateStudentNotificationsSchema = z.object({
  notifications_enabled: z.boolean(),
});

/**
 * Validates Expo push token registration for a student device.
 */
export const updateStudentPushTokenSchema = z.object({
  expo_push_token: z
    .string()
    .trim()
    .min(1, "Expo push token is required")
    .max(255, "Expo push token is too long"),
});

export type UpdateStudentNotificationsInput = z.infer<typeof updateStudentNotificationsSchema>;
export type UpdateStudentPushTokenInput = z.infer<typeof updateStudentPushTokenSchema>;
