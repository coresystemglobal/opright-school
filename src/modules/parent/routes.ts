import { Router } from "express";
import { parentController } from "./controller";

const router = Router();

router.get("/children", parentController.getChildren);
router.get("/children/:studentId/attendance", parentController.getChildAttendance);
router.get("/children/:studentId/grades", parentController.getChildGrades);
router.get("/children/:studentId/payments", parentController.getChildPayments);

// Fees — parent self-service
router.get("/fees", parentController.getFeeSummaries);
router.get("/fees/:studentId", parentController.getChildFeeDetails);
router.post("/fees/pay", parentController.initiatePayment);
router.get("/fees/:studentId/opt-in", parentController.listOptInTemplates);
router.post("/fees/:studentId/opt-in", parentController.optIn);

// Admin: create a parent + linked User account
router.post("/", parentController.createParent);

export default router;
