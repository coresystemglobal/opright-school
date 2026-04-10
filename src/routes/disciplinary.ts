import { Router } from "express";
import { disciplinaryController } from "../controllers/disciplinaryController";

const router = Router();

router.post("/records", disciplinaryController.createRecord);
router.get("/records", disciplinaryController.getRecords);
router.patch("/records/:id", disciplinaryController.updateRecord);
router.get("/stats", disciplinaryController.getStats);

export default router;
