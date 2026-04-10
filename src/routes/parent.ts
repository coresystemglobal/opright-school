import { Router } from "express";
import { ParentController } from "../controllers/parentController";

const router = Router();

// Parent viewing their own children
router.get("/children", ParentController.getChildren);
router.get("/children/:studentId/attendance", ParentController.getChildAttendance);
router.get("/children/:studentId/grades", ParentController.getChildGrades);
router.get("/children/:studentId/payments", ParentController.getChildPayments);

// Admin: create a parent + linked User account
router.post("/", ParentController.createParent);

export default router;
