import { Router } from "express";
import { disciplinaryController } from './controller';
import { authMiddleware } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(authMiddleware);

router.post("/records", authorize("disciplinary", "create"), disciplinaryController.createRecord);
router.get("/records", authorize("disciplinary", "read"), disciplinaryController.getRecords);
router.patch("/records/:id", authorize("disciplinary", "update"), disciplinaryController.updateRecord);
router.get("/stats", authorize("disciplinary", "read"), disciplinaryController.getStats);

export default router;
