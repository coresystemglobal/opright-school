import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { PaymentService } from './service';
import { uuidSchema, idParamSchema } from "../../utils/validation";

const service = new PaymentService(prisma);

const initiateSchema = z.object({
  feeAssignmentId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  payerEmail: z.string().email(),
  payerUserId: z.string().uuid(),
  currency: z.string().optional(),
});

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

export const paymentController = {
  async initiatePayment(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const data = initiateSchema.parse(req.body);
      const result = await service.initiatePayment(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getInvoice(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const invoice = await service.getInvoice(req.tenantId, id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getStudentInvoices(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const invoices = await service.getStudentInvoices(req.tenantId, studentId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async paystackWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      if (!signature) return res.status(400).json({ error: "Missing Paystack signature" });
      const rawBody = req.body as Buffer;
      const result = await service.handlePaystackWebhook(rawBody, signature);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
