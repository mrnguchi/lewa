import { Router } from "express"
import studentRoutes from "../modules/student/student.routes"
import paymentRoutes from "../modules/payment/payment.routes"
import authRoutes from "../modules/auth/auth.routes"
import receiptRoutes from "../modules/receipt/receipt.routes"
import newsRoutes from "../modules/news/news.routes"
import calendarRoutes from "../modules/calendar/calender.routes"
import resourceRoutes from "../modules/resource/resource.routes"
import uploadRoutes from "../modules/upload/upload.routes"
import chatRoutes from "../modules/chat/chat.routes"
import adminRoutes from "../modules/admin/admin.routes"
import notificationRoutes from "../modules/notification/notification.routes"

const router = Router();

router.use("/students", studentRoutes);
router.use("/payments", paymentRoutes);
router.use("/auth", authRoutes);
router.use("/receipts", receiptRoutes);
router.use("/news", newsRoutes);
router.use("/calendar", calendarRoutes);
router.use("/resources", resourceRoutes);
router.use("/uploads", uploadRoutes);
router.use("/chat", chatRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
export default router
