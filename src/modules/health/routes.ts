import { Router } from "express";
import { healthController } from './controller';

const router = Router();

router.post("/records", healthController.createHealthRecord);
router.get("/records/:studentId", healthController.getHealthRecord);
router.patch("/records/:studentId", healthController.updateHealthRecord);
router.post("/incidents", healthController.recordIncident);
router.get("/incidents/:healthRecordId", healthController.getIncidents);
router.post("/vaccinations", healthController.recordVaccination);
router.get("/vaccinations/:healthRecordId", healthController.getVaccinations);

export default router;
