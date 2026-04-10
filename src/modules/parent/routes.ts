import { Router } from "express";
import { parentController } from "./controller";

const router = Router();

// Parent viewing their own children
router.get("/children", parentController.getChildren);
router.get("/children/:studentId/attendance", parentController.getChildAttendance);
router.get("/children/:studentId/grades", parentController.getChildGrades);
router.get("/children/:studentId/payments", parentController.getChildPayments);

// Admin: create a parent + linked User account
router.post("/", parentController.createParent);

export default router;
