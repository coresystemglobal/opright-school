import { Router } from "express";
import { hostelController } from './controller';
import { authMiddleware } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(authMiddleware);

router.post("/rooms", authorize("hostel", "create"), hostelController.createRoom);
router.get("/rooms", authorize("hostel", "read"), hostelController.getRooms);
router.post("/assignments", authorize("hostel", "create"), hostelController.assignStudent);
router.post("/meal-plans", authorize("hostel", "create"), hostelController.createMealPlan);
router.post("/visitors", authorize("hostel", "create"), hostelController.logVisitor);
router.post("/visitors/:id/checkout", authorize("hostel", "update"), hostelController.checkoutVisitor);
router.get("/visitors", authorize("hostel", "read"), hostelController.getVisitors);
router.get("/assignments", authorize("hostel", "read"), hostelController.getAssignments);
router.get("/meal-plans", authorize("hostel", "read"), hostelController.getMealPlans);

export default router;
