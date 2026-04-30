import { Router } from "express";
import {
  getNewsPosterUploadSignature,
  getResourceFileUploadSignature,
} from "./upload.controller";
import { authenticateStudent, requirePresident } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/news-poster-signature", authenticateStudent, requirePresident, getNewsPosterUploadSignature);
router.post("/resource-file-signature", authenticateStudent, getResourceFileUploadSignature);

export default router;
