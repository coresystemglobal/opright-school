import { Router } from "express";
import { hostelController } from './controller';

const router = Router();

router.post("/rooms", hostelController.createRoom);
router.get("/rooms", hostelController.getRooms);
router.post("/assignments", hostelController.assignStudent);
router.post("/meal-plans", hostelController.createMealPlan);
router.post("/visitors", hostelController.logVisitor);
router.post("/visitors/:id/checkout", hostelController.checkoutVisitor);
router.get("/visitors", hostelController.getVisitors);
router.get("/assignments", hostelController.getAssignments);
router.get("/meal-plans", hostelController.getMealPlans);

export default router;
