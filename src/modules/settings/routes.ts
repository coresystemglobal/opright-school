import { Router } from "express";
import { requireRole } from "../../middleware/auth";
import { settingsController } from "./controller";

const router = Router();

router.get("/", settingsController.get);
router.put("/", requireRole("ADMIN"), settingsController.update);

export default router;
