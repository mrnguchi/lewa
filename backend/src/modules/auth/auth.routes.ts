import { Router } from "express";
import { registerStudent, loginStudent } from "./auth.controller";

const router = Router();

router.post("/register", registerStudent);
router.post("/login", loginStudent);

export default router;