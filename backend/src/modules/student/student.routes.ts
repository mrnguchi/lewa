import { Router } from "express";
import {
  getStudents,
  getStudentById,
  getStudentByMatricule,
  updateStudentProfileImage,
  updateStudentNotifications,
  updateStudentPushToken,
} from "./student.controller";
import { authenticateStudent } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", getStudents);
router.patch("/:id/profile-image", authenticateStudent, updateStudentProfileImage);
router.patch("/:id/notifications", authenticateStudent, updateStudentNotifications);
router.put("/:id/push-token", authenticateStudent, updateStudentPushToken);
router.get("/:id", getStudentById);
router.get("/matricule/:matricule", getStudentByMatricule);

export default router;
