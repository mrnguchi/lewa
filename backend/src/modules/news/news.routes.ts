import { Router } from "express";
import { createNews, getNews, getNewsById } from "./news.controller";
import { authenticateStudent, requirePresident } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", getNews);
router.get("/:id", getNewsById);
router.post("/", authenticateStudent, requirePresident, createNews);

export default router;
