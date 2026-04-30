import { Router } from "express";
import { createResource, getResourceById, getResources } from "./resource.controller";
import { authenticateStudent } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", getResources);
router.get("/:id", getResourceById);
router.post("/", authenticateStudent, createResource);

export default router;
