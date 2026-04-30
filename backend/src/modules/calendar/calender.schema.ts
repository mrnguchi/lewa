import { z } from "zod";

export const CALENDAR_ENTRY_TYPES = ["period", "event"] as const;
export const CALENDAR_ENTRY_STATUSES = ["draft", "published", "archived"] as const;

const isoDateMessage = "Date must be a valid ISO date";

const baseCalendarEntrySchema = z.object({
  academic_year: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Academic year must look like 2024/2025"),
  entry_type: z.enum(CALENDAR_ENTRY_TYPES),
  title: z.string().trim().min(1, "Title is required").max(255, "Title is too long"),
  summary: z.string().trim().min(1, "Summary is required"),
  full_text: z.string().trim().min(1, "Full text cannot be empty").optional(),
  start_date: z.iso.date({ message: isoDateMessage }),
  end_date: z.iso.date({ message: isoDateMessage }).optional(),
  event_time: z.string().trim().min(1, "Event time cannot be empty").max(100).optional(),
  status: z.enum(CALENDAR_ENTRY_STATUSES).optional(),
});

/**
 * Enforces valid calendar date ranges for single-entry create flows.
 */
export const calendarEntrySchema = baseCalendarEntrySchema.refine(
  (value) => !value.end_date || value.end_date >= value.start_date,
  {
    message: "end_date cannot be before start_date",
    path: ["end_date"],
  }
);

export const createCalendarEntrySchema = calendarEntrySchema;

export const importCalendarEntriesSchema = z.object({
  academic_year: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Academic year must look like 2024/2025"),
  replace_existing: z.boolean().optional(),
  entries: z.array(
    baseCalendarEntrySchema
      .omit({
        academic_year: true,
      })
      .refine(
        (value) => !value.end_date || value.end_date >= value.start_date,
        {
          message: "end_date cannot be before start_date",
          path: ["end_date"],
        }
      )
  ).min(1, "At least one calendar entry is required"),
});

export const getCalendarEntriesQuerySchema = z.object({
  academic_year: z.string().trim().regex(/^\d{4}\/\d{4}$/).optional(),
  entry_type: z.enum(CALENDAR_ENTRY_TYPES).optional(),
  status: z.enum(CALENDAR_ENTRY_STATUSES).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
}).refine(
  (value) => (value.month === undefined) === (value.year === undefined),
  {
    message: "month and year must be provided together",
    path: ["month"],
  }
);

export type CreateCalendarEntryInput = z.infer<typeof createCalendarEntrySchema>;
export type ImportCalendarEntriesInput = z.infer<typeof importCalendarEntriesSchema>;
export type GetCalendarEntriesQueryInput = z.infer<typeof getCalendarEntriesQuerySchema>;
