import { z } from "zod";

const isoDateTimeMessage = "published_at must be a valid ISO datetime";
export const NEWS_CATEGORIES = [
  "Tech",
  "Business",
  "Sports",
  "Events",
  "Announcement",
  "Lost & Found",
] as const;

export const createNewsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title is too long"),
  intro: z.string().trim().min(1, "Intro is required"),
  description: z.string().trim().min(1, "Description is required"),
  category: z.enum(NEWS_CATEGORIES),
  image_url: z.url("Image URL must be a valid URL"),
  lewa_logo_url: z.url("Lewa logo URL must be a valid URL").optional(),
  published_at: z.iso.datetime({ message: isoDateTimeMessage }).optional(),
});

export const getNewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  category: z.enum(NEWS_CATEGORIES).optional(),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type GetNewsQueryInput = z.infer<typeof getNewsQuerySchema>;
