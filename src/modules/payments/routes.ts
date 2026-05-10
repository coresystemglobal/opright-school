import { Router } from "express";
import express from "express";
import { paymentController } from './controller';

const router = Router();

// Paystack webhook: must use raw body parser so the HMAC signature can be verified
router.post(
  "/webhook",
  express.raw({ type: 'application/json' }),
  paymentController.paystackWebhook
);

router.post("/fees", paymentController.createFee);
router.post("/online/initialize", paymentController.initializeOnlinePayment);
router.post("/", paymentController.createPayment);
router.put("/:id/confirm", paymentController.confirmPayment);
router.get("/student/:studentId", paymentController.getStudentPayments);

export default router;
