import { Router } from "express";
import {
  createCalendarEntry,
  getCalendarAcademicYears,
  getCalendarEntries,
  getCalendarEntryById,
  importCalendarEntries,
} from "./calendar.controller";
import { authenticateStudent, requirePresident } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/academic-years", getCalendarAcademicYears);
router.get("/", getCalendarEntries);
router.get("/:id", getCalendarEntryById);
router.post("/", authenticateStudent, requirePresident, createCalendarEntry);
router.post("/import", authenticateStudent, requirePresident, importCalendarEntries);

export default router;
