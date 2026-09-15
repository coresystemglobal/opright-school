import { Router } from "express";
import express from "express";
import { paymentController } from './controller';

const router = Router();

// Paystack webhook — raw body for HMAC verification
router.post(
  "/webhook",
  express.raw({ type: 'application/json' }),
  paymentController.paystackWebhook
);

router.get("/", paymentController.listPayments);
router.get("/student/:studentId", paymentController.listStudentPayments);
router.post("/initiate", paymentController.initiatePayment);
router.get("/invoices/:id", paymentController.getInvoice);
router.get("/student/:studentId/invoices", paymentController.getStudentInvoices);

export default router;
