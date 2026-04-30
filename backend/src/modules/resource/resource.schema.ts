import { z } from "zod";

export const RESOURCE_TYPES = ["handout", "pastQuestion"] as const;

export const createResourceSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20, "Code is too long"),
  title: z.string().trim().min(1, "Title is required").max(255, "Title is too long"),
  level: z.number().int().min(100, "Level is required"),
  faculty: z.string().trim().min(1, "Faculty is required").max(150, "Faculty is too long").optional(),
  type: z.enum(RESOURCE_TYPES),
  file_url: z.url("File URL must be a valid URL"),
  description: z.string().trim().min(1, "Description is required").optional(),
});

export const getResourcesQuerySchema = z.object({
  type: z.enum(RESOURCE_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type GetResourcesQueryInput = z.infer<typeof getResourcesQuerySchema>;
