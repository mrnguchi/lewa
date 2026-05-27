import { Router } from "express";

import { authenticateStudent } from "../../middlewares/auth.middleware";
import {
  deleteMyNotification,
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "./notification.controller";

const router = Router();

router.use(authenticateStudent);

router.get("/my", listMyNotifications);
router.get("/unread-count", getMyUnreadNotificationCount);
router.patch("/read-all", markAllMyNotificationsRead);
router.patch("/:id/read", markMyNotificationRead);
router.delete("/:id", deleteMyNotification);

export default router;
