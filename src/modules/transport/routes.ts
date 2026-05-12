import { Router } from "express";
import { transportController } from './controller';
import { authMiddleware } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(authMiddleware);

router.post("/buses", authorize("transport", "create"), transportController.createBus);
router.get("/buses", authorize("transport", "read"), transportController.getBuses);
router.post("/routes", authorize("transport", "create"), transportController.createRoute);
router.get("/routes", authorize("transport", "read"), transportController.getRoutes);
router.post("/assignments", authorize("transport", "create"), transportController.assignStudent);
router.get("/assignments", authorize("transport", "read"), transportController.getAssignments);

export default router;
