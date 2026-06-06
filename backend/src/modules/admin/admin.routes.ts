import { Router } from "express";

import { authenticateAdmin } from "../../middlewares/auth.middleware";
import {
  createCalendarEntry,
  createNews,
  createResource,
  deleteSchoolPayment,
  deleteSupportConversation,
  getCalendarAcademicYears,
  getCurrentAdmin,
  getNewsPosterUploadSignature,
  getOverview,
  getResourceFileUploadSignature,
  generateSchoolPaymentReceipt,
  generateFeeInsight,
  getStudentDistribution,
  getSupportConversation,
  importCalendarEntries,
  listCalendarEntries,
  listNews,
  listResources,
  listSchoolPayments,
  listSchoolPaymentsMissingReceipts,
  listSchoolReceipts,
  listStudents,
  listSupportConversations,
  loginAdmin,
  replyToSupportConversation,
  syncSchoolPaymentWithProvider,
} from "./admin.controller";

const router = Router();

router.post("/auth/login", loginAdmin);

router.use(authenticateAdmin);

router.get("/auth/me", getCurrentAdmin);
router.get("/overview", getOverview);
router.post("/insights/fees", generateFeeInsight);

router.get("/students", listStudents);
router.get("/students/distribution", getStudentDistribution);
router.get("/payments", listSchoolPayments);
router.get("/payments/missing-receipts", listSchoolPaymentsMissingReceipts);
router.post("/payments/:id/sync-provider", syncSchoolPaymentWithProvider);
router.post("/payments/:id/receipt", generateSchoolPaymentReceipt);
router.delete("/payments/:id", deleteSchoolPayment);
router.get("/receipts", listSchoolReceipts);

router.get("/news", listNews);
router.post("/news", createNews);

router.get("/resources", listResources);
router.post("/resources", createResource);

router.get("/calendar/academic-years", getCalendarAcademicYears);
router.get("/calendar", listCalendarEntries);
router.post("/calendar", createCalendarEntry);
router.post("/calendar/import", importCalendarEntries);

router.get("/support/conversations", listSupportConversations);
router.get("/support/conversations/:id", getSupportConversation);
router.post("/support/conversations/:id/replies", replyToSupportConversation);
router.delete("/support/conversations/:id", deleteSupportConversation);

router.post("/uploads/news-poster-signature", getNewsPosterUploadSignature);
router.post("/uploads/resource-file-signature", getResourceFileUploadSignature);

export default router;
