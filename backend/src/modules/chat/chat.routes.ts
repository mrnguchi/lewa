import { Router } from "express";

import {
  authenticateStudent,
  requirePresident,
} from "../../middlewares/auth.middleware";
import {
  createComplaintConversation,
  deleteConversation,
  getConversation,
  getUnreadChatCount,
  listConversations,
  sendAdminReply,
  sendMessage,
} from "./chat.controller";

const router = Router();

router.use(authenticateStudent);

router.get("/unread-count", getUnreadChatCount);
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.post("/messages", sendMessage);
router.post("/support/complaints", createComplaintConversation);
router.post("/admin/conversations/:id/replies", requirePresident, sendAdminReply);
router.delete("/conversations/:id", deleteConversation);

export default router;
