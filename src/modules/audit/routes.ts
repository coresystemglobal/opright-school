import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { auditController } from "./controller";

const router = Router();

router.get("/", requireRole("ADMIN"), auditController.list);

export default router;
