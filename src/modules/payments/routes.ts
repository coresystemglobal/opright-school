import { Router } from "express";
import { paymentController } from './controller';

const router = Router();

router.post("/fees", paymentController.createFee);
router.post("/", paymentController.createPayment);
router.get("/student/:studentId", paymentController.getStudentPayments);

export default router;
