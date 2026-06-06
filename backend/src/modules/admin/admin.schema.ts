import { z } from "zod";

const limitSchema = z.coerce.number().int().min(1).max(200).optional();
const offsetSchema = z.coerce.number().int().min(0).optional();
const adminScopeQueryShape = {
  faculty: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
};

export const adminLoginSchema = z.object({
  email: z.email("A valid email is required").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
  centralAdministration: z.boolean().optional().default(false),
  faculty: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
});

export const listStudentsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  ...adminScopeQueryShape,
  level: z.coerce.number().int().optional(),
  fee_status: z.string().trim().min(1).optional(),
  is_active: z.coerce.boolean().optional(),
  limit: limitSchema,
  offset: offsetSchema,
});

export const adminScopeQuerySchema = z.object(adminScopeQueryShape);

export const adminFeeInsightSchema = z.object({
  ...adminScopeQueryShape,
  period: z.enum(["daily", "weekly", "monthly", "yearly"]),
});

export const studentDistributionQuerySchema = z.object(adminScopeQueryShape);

export const listSchoolPaymentsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  ...adminScopeQueryShape,
  academic_year: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  payment_method: z.string().trim().min(1).optional(),
  limit: limitSchema,
  offset: offsetSchema,
});

export const listSchoolReceiptsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  ...adminScopeQueryShape,
  student_id: z.uuid("student_id must be a valid UUID").optional(),
  academic_year: z.string().trim().min(1).optional(),
  limit: limitSchema,
  offset: offsetSchema,
});

export const schoolPaymentParamsSchema = z.object({
  id: z.uuid("Payment id must be a valid UUID"),
});

export const listSupportConversationsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  ...adminScopeQueryShape,
  status: z.string().trim().min(1).optional(),
  assigned_admin_id: z.uuid("assigned_admin_id must be a valid UUID").optional(),
  limit: limitSchema,
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminScopeQuery = z.infer<typeof adminScopeQuerySchema>;
export type AdminFeeInsightInput = z.infer<typeof adminFeeInsightSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
export type StudentDistributionQuery = z.infer<typeof studentDistributionQuerySchema>;
export type ListSchoolPaymentsQuery = z.infer<typeof listSchoolPaymentsQuerySchema>;
export type ListSchoolReceiptsQuery = z.infer<typeof listSchoolReceiptsQuerySchema>;
export type ListSupportConversationsQuery = z.infer<typeof listSupportConversationsQuerySchema>;
export type SchoolPaymentParams = z.infer<typeof schoolPaymentParamsSchema>;
