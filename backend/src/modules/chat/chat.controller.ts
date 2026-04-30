import { Request, Response } from "express";

import {
  adminReplySchema,
  createComplaintSchema,
  conversationParamsSchema,
  listConversationsQuerySchema,
  sendMessageSchema,
} from "./chat.schema";
import * as chatService from "./chat.service";

// Returns the authenticated student's conversation list for AI and support threads.
export const listConversations = async (req: Request, res: Response) => {
  const studentId = (req as any).student?.studentId as string;
  const query = listConversationsQuerySchema.parse(req.query);
  const conversations = await chatService.listStudentConversations(
    studentId,
    query.type
  );

  res.status(200).json({
    success: true,
    data: conversations,
  });
};

// Returns one conversation plus its message history for the authenticated student.
export const getConversation = async (req: Request, res: Response) => {
  const studentId = (req as any).student?.studentId as string;
  const params = conversationParamsSchema.parse(req.params);
  const conversation = await chatService.getStudentConversation(studentId, params.id);

  res.status(200).json({
    success: true,
    data: conversation,
  });
};

// Persists a student message and triggers an assistant reply for AI chats.
export const sendMessage = async (req: Request, res: Response) => {
  const studentId = (req as any).student?.studentId as string;
  const payload = sendMessageSchema.parse(req.body);
  const result = await chatService.sendStudentMessage(studentId, payload);

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: result,
  });
};

// Creates a new School Admin complaint thread for the authenticated student.
export const createComplaintConversation = async (req: Request, res: Response) => {
  const studentId = (req as any).student?.studentId as string;
  const payload = createComplaintSchema.parse(req.body);
  const result = await chatService.createSupportConversation(studentId, payload);

  res.status(201).json({
    success: true,
    message: "Complaint submitted successfully",
    data: result,
  });
};

// Persists a School Admin reply and triggers a push notification to the student.
export const sendAdminReply = async (req: Request, res: Response) => {
  const actingStudentId = (req as any).student?.studentId as string;
  const params = conversationParamsSchema.parse(req.params);
  const payload = adminReplySchema.parse(req.body);
  const result = await chatService.sendAdminReply(
    actingStudentId,
    params.id,
    payload
  );

  res.status(201).json({
    success: true,
    message: "Admin reply sent successfully",
    data: result,
  });
};

// Deletes a conversation so the mobile app can return to a draft state.
export const deleteConversation = async (req: Request, res: Response) => {
  const studentId = (req as any).student?.studentId as string;
  const params = conversationParamsSchema.parse(req.params);
  await chatService.deleteStudentConversation(studentId, params.id);

  res.status(200).json({
    success: true,
    message: "Conversation deleted successfully",
  });
};
