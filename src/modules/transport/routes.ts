import { Router } from "express";
import { transportController } from './controller';

const router = Router();

router.post("/buses", transportController.createBus);
router.get("/buses", transportController.getBuses);
router.post("/routes", transportController.createRoute);
router.get("/routes", transportController.getRoutes);
router.post("/assignments", transportController.assignStudent);
router.get("/assignments", transportController.getAssignments);

export default router;
