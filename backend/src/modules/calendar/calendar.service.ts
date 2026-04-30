import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";
import {
  CreateCalendarEntryInput,
  GetCalendarEntriesQueryInput,
  ImportCalendarEntriesInput,
} from "./calender.schema";

/**
 * Returns the distinct academic years that already exist in the calendar table.
 */
export const getCalendarAcademicYears = async () => {
  const entries = await prisma.calendar_entries.findMany({
    where: {
      status: "published",
    },
    distinct: ["academic_year"],
    select: {
      academic_year: true,
    },
    orderBy: {
      academic_year: "desc",
    },
  });

  return entries.map((entry) => entry.academic_year);
};

/**
 * Returns calendar entries filtered for the mobile calendar experience.
 */
export const getCalendarEntries = async (query: GetCalendarEntriesQueryInput) => {
  const effectiveStatus = query.status ?? "published";
  const monthStart =
    query.month && query.year
      ? new Date(Date.UTC(query.year, query.month - 1, 1))
      : null;
  const monthEnd =
    query.month && query.year
      ? new Date(Date.UTC(query.year, query.month, 0))
      : null;

  return prisma.calendar_entries.findMany({
    where: {
      ...(query.academic_year ? { academic_year: query.academic_year } : {}),
      ...(query.entry_type ? { entry_type: query.entry_type } : {}),
      status: effectiveStatus,
      ...(monthStart && monthEnd
        ? {
            AND: [
              {
                start_date: {
                  lte: monthEnd,
                },
              },
              {
                OR: [
                  {
                    end_date: null,
                    start_date: {
                      gte: monthStart,
                    },
                  },
                  {
                    end_date: {
                      gte: monthStart,
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: [{ start_date: "asc" }, { created_at: "asc" }],
    take: query.limit,
  });
};

/**
 * Returns one calendar entry by id.
 */
export const getCalendarEntryById = async (id: string) => {
  const entry = await prisma.calendar_entries.findFirst({
    where: {
      id,
      status: "published",
    },
  });

  if (!entry) {
    throw new ApiError(404, "Calendar entry not found");
  }

  return entry;
};

/**
 * Creates one calendar entry for manual admin workflows.
 */
export const createCalendarEntry = async (data: CreateCalendarEntryInput) => {
  return prisma.calendar_entries.create({
    data: {
      id: crypto.randomUUID(),
      academic_year: data.academic_year,
      entry_type: data.entry_type,
      title: data.title.trim(),
      summary: data.summary.trim(),
      full_text: data.full_text?.trim() || null,
      start_date: new Date(data.start_date),
      end_date: data.end_date ? new Date(data.end_date) : null,
      event_time: data.event_time?.trim() || null,
      status: data.status ?? "published",
    },
  });
};

/**
 * Imports a full academic-year calendar payload in one transaction.
 */
export const importCalendarEntries = async (payload: ImportCalendarEntriesInput) => {
  return prisma.$transaction(async (transaction) => {
    const existingEntriesCount = await transaction.calendar_entries.count({
      where: {
        academic_year: payload.academic_year,
      },
    });

    if (existingEntriesCount > 0 && !payload.replace_existing) {
      throw new ApiError(
        409,
        `Calendar entries for ${payload.academic_year} already exist. Use replace_existing to overwrite them.`
      );
    }

    if (payload.replace_existing) {
      await transaction.calendar_entries.deleteMany({
        where: {
          academic_year: payload.academic_year,
        },
      });
    }

    const createdEntries = await transaction.calendar_entries.createMany({
      data: payload.entries.map((entry) => ({
        id: crypto.randomUUID(),
        academic_year: payload.academic_year,
        entry_type: entry.entry_type,
        title: entry.title.trim(),
        summary: entry.summary.trim(),
        full_text: entry.full_text?.trim() || null,
        start_date: new Date(entry.start_date),
        end_date: entry.end_date ? new Date(entry.end_date) : null,
        event_time: entry.event_time?.trim() || null,
        status: entry.status ?? "published",
      })),
    });

    return {
      academic_year: payload.academic_year,
      imported_count: createdEntries.count,
      replaced_existing: Boolean(payload.replace_existing),
    };
  });
};
