import { Request, Response } from "express";

import * as adminService from "./admin.service";
import {
  adminScopeQuerySchema,
  adminLoginSchema,
  listSchoolPaymentsQuerySchema,
  listSchoolReceiptsQuerySchema,
  listStudentsQuerySchema,
  listSupportConversationsQuerySchema,
  schoolPaymentParamsSchema,
  studentDistributionQuerySchema,
} from "./admin.schema";
import { createNewsSchema, getNewsQuerySchema } from "../news/news.schema";
import * as newsService from "../news/news.service";
import {
  createResourceSchema,
  getResourcesQuerySchema,
} from "../resource/resource.schema";
import * as resourceService from "../resource/resource.service";
import {
  createCalendarEntrySchema,
  getCalendarEntriesQuerySchema,
  importCalendarEntriesSchema,
} from "../calendar/calender.schema";
import * as calendarService from "../calendar/calendar.service";
import { adminReplySchema, conversationParamsSchema } from "../chat/chat.schema";
import * as chatService from "../chat/chat.service";
import {
  createNewsPosterSignatureSchema,
  createResourceFileSignatureSchema,
} from "../upload/upload.schema";
import * as uploadService from "../upload/upload.service";

const getRequestAdmin = (req: Request) =>
  (req as any).currentAdmin as adminService.AdminAccessScope;

export const loginAdmin = async (req: Request, res: Response) => {
  const payload = adminLoginSchema.parse(req.body);
  const result = await adminService.loginAdmin(payload);

  res.status(200).json({
    success: true,
    message: "Admin login successful",
    data: result,
  });
};

export const getCurrentAdmin = async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: (req as any).currentAdmin,
  });
};

export const getOverview = async (req: Request, res: Response) => {
  const query = adminScopeQuerySchema.parse(req.query);
  const overview = await adminService.getOverview(getRequestAdmin(req), query);

  res.status(200).json({
    success: true,
    data: overview,
  });
};

export const listStudents = async (req: Request, res: Response) => {
  const query = listStudentsQuerySchema.parse(req.query);
  const students = await adminService.listStudents(query, getRequestAdmin(req));

  res.status(200).json({
    success: true,
    data: students,
  });
};

export const getStudentDistribution = async (req: Request, res: Response) => {
  const query = studentDistributionQuerySchema.parse(req.query);
  const distribution = await adminService.getStudentDistribution(
    query,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    data: distribution,
  });
};

export const listSchoolPayments = async (req: Request, res: Response) => {
  const query = listSchoolPaymentsQuerySchema.parse(req.query);
  const payments = await adminService.listSchoolPayments(
    query,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    data: payments,
  });
};

export const listSchoolPaymentsMissingReceipts = async (
  req: Request,
  res: Response
) => {
  const query = listSchoolPaymentsQuerySchema.parse(req.query);
  const payments = await adminService.listSchoolPaymentsMissingReceipts(
    query,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    data: payments,
  });
};

export const syncSchoolPaymentWithProvider = async (
  req: Request,
  res: Response
) => {
  const params = schoolPaymentParamsSchema.parse(req.params);
  const payment = await adminService.syncSchoolPaymentWithProvider(
    params.id,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    message: "Payment status checked successfully",
    data: payment,
  });
};

export const generateSchoolPaymentReceipt = async (
  req: Request,
  res: Response
) => {
  const params = schoolPaymentParamsSchema.parse(req.params);
  const result = await adminService.generateSchoolPaymentReceipt(
    params.id,
    getRequestAdmin(req)
  );

  res.status(201).json({
    success: true,
    message: "Receipt generated successfully",
    data: result,
  });
};

export const deleteSchoolPayment = async (req: Request, res: Response) => {
  const params = schoolPaymentParamsSchema.parse(req.params);
  const result = await adminService.deleteSchoolPayment(
    params.id,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    message: "Payment record deleted successfully",
    data: result,
  });
};

export const listSchoolReceipts = async (req: Request, res: Response) => {
  const query = listSchoolReceiptsQuerySchema.parse(req.query);
  const receipts = await adminService.listSchoolReceipts(
    query,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    data: receipts,
  });
};

export const listNews = async (req: Request, res: Response) => {
  const query = getNewsQuerySchema.parse(req.query);
  const news = await adminService.listNewsForAdmin(
    query.limit,
    query.offset,
    query.category
  );

  res.status(200).json({
    success: true,
    data: news,
  });
};

export const createNews = async (req: Request, res: Response) => {
  const payload = createNewsSchema.parse(req.body);
  const news = await newsService.createNews(payload);

  res.status(201).json({
    success: true,
    message: "News published successfully",
    data: news,
  });
};

export const listResources = async (req: Request, res: Response) => {
  const query = getResourcesQuerySchema.parse(req.query);
  const resources = await resourceService.getResources(query);

  res.status(200).json({
    success: true,
    data: resources,
  });
};

export const createResource = async (req: Request, res: Response) => {
  const payload = createResourceSchema.parse(req.body);
  const resource = await resourceService.createResource(payload);

  res.status(201).json({
    success: true,
    message: "Resource created successfully",
    data: resource,
  });
};

export const getCalendarAcademicYears = async (
  _req: Request,
  res: Response
) => {
  const years = await calendarService.getCalendarAcademicYears();

  res.status(200).json({
    success: true,
    data: years,
  });
};

export const listCalendarEntries = async (req: Request, res: Response) => {
  const query = getCalendarEntriesQuerySchema.parse(req.query);
  const entries = await calendarService.getCalendarEntries(query);

  res.status(200).json({
    success: true,
    data: entries,
  });
};

export const createCalendarEntry = async (req: Request, res: Response) => {
  const payload = createCalendarEntrySchema.parse(req.body);
  const entry = await calendarService.createCalendarEntry(payload);

  res.status(201).json({
    success: true,
    message: "Calendar entry created successfully",
    data: entry,
  });
};

export const importCalendarEntries = async (req: Request, res: Response) => {
  const payload = importCalendarEntriesSchema.parse(req.body);
  const entries = await calendarService.importCalendarEntries(payload);

  res.status(201).json({
    success: true,
    message: "Calendar entries imported successfully",
    data: entries,
  });
};

export const listSupportConversations = async (
  req: Request,
  res: Response
) => {
  const query = listSupportConversationsQuerySchema.parse(req.query);
  const conversations = await adminService.listSupportConversations(
    query,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    data: conversations,
  });
};

export const getSupportConversation = async (req: Request, res: Response) => {
  const params = conversationParamsSchema.parse(req.params);
  const conversation = await adminService.getSupportConversationById(
    params.id,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    data: conversation,
  });
};

export const replyToSupportConversation = async (
  req: Request,
  res: Response
) => {
  const adminId = (req as any).admin?.adminId as string;
  const params = conversationParamsSchema.parse(req.params);
  const payload = adminReplySchema.parse(req.body);
  await adminService.getSupportConversationById(params.id, getRequestAdmin(req));
  await chatService.sendDashboardAdminReply(
    adminId,
    params.id,
    payload
  );
  const conversation = await adminService.getSupportConversationById(
    params.id,
    getRequestAdmin(req)
  );

  res.status(201).json({
    success: true,
    message: "Reply sent successfully",
    data: conversation,
  });
};

export const deleteSupportConversation = async (
  req: Request,
  res: Response
) => {
  const params = conversationParamsSchema.parse(req.params);
  const result = await adminService.deleteSupportConversation(
    params.id,
    getRequestAdmin(req)
  );

  res.status(200).json({
    success: true,
    message: "Support record deleted successfully",
    data: result,
  });
};

export const getNewsPosterUploadSignature = async (
  req: Request,
  res: Response
) => {
  const payload = createNewsPosterSignatureSchema.parse(req.body);
  const signature = uploadService.createNewsPosterUploadSignature(payload);

  res.status(200).json({
    success: true,
    data: signature,
  });
};

export const getResourceFileUploadSignature = async (
  req: Request,
  res: Response
) => {
  const payload = createResourceFileSignatureSchema.parse(req.body);
  const signature = uploadService.createResourceFileUploadSignature(payload);

  res.status(200).json({
    success: true,
    data: signature,
  });
};
