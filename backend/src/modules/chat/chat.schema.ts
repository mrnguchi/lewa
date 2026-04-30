import { z } from "zod";

export const CHAT_CONVERSATION_TYPES = ["school_admin", "lewa_ai"] as const;

export const listConversationsQuerySchema = z.object({
  type: z.enum(CHAT_CONVERSATION_TYPES).optional(),
});

export const conversationParamsSchema = z.object({
  id: z.uuid("Conversation id must be a valid UUID"),
});

export const createComplaintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Complaint title is required")
    .max(255, "Complaint title is too long")
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, "Complaint description is required")
    .max(4000, "Complaint description is too long"),
});

export const sendMessageSchema = z.object({
  conversation_id: z.uuid("conversation_id must be a valid UUID").optional(),
  conversation_type: z.enum(CHAT_CONVERSATION_TYPES).default("lewa_ai"),
  message_text: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(4000, "Message is too long"),
});

export const adminReplySchema = z.object({
  message_text: z
    .string()
    .trim()
    .min(1, "Reply message cannot be empty")
    .max(4000, "Reply message is too long"),
});

export type ChatConversationType = (typeof CHAT_CONVERSATION_TYPES)[number];
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AdminReplyInput = z.infer<typeof adminReplySchema>;
