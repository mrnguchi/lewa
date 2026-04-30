import { Request, Response } from "express";
import * as calendarService from "./calendar.service";
import {
  createCalendarEntrySchema,
  getCalendarEntriesQuerySchema,
  importCalendarEntriesSchema,
} from "./calender.schema";

/**
 * Returns available academic years for the calendar module.
 */
export const getCalendarAcademicYears = async (_req: Request, res: Response) => {
  const academicYears = await calendarService.getCalendarAcademicYears();

  res.status(200).json({
    success: true,
    data: academicYears,
  });
};

/**
 * Returns calendar entries for the mobile app and future admin dashboard.
 */
export const getCalendarEntries = async (req: Request, res: Response) => {
  const query = getCalendarEntriesQuerySchema.parse(req.query);
  const entries = await calendarService.getCalendarEntries(query);

  res.status(200).json({
    success: true,
    data: entries,
  });
};

/**
 * Returns a single calendar entry by id.
 */
export const getCalendarEntryById = async (req: Request, res: Response) => {
  const entry = await calendarService.getCalendarEntryById(req.params.id as string);

  res.status(200).json({
    success: true,
    data: entry,
  });
};

/**
 * Creates one calendar entry for manual privileged workflows.
 */
export const createCalendarEntry = async (req: Request, res: Response) => {
  const payload = createCalendarEntrySchema.parse(req.body);
  const entry = await calendarService.createCalendarEntry(payload);

  res.status(201).json({
    success: true,
    message: "Calendar entry created successfully",
    data: entry,
  });
};

/**
 * Imports a complete academic-year calendar payload in bulk.
 */
export const importCalendarEntries = async (req: Request, res: Response) => {
  const payload = importCalendarEntriesSchema.parse(req.body);
  const result = await calendarService.importCalendarEntries(payload);

  res.status(201).json({
    success: true,
    message: "Calendar entries imported successfully",
    data: result,
  });
};
