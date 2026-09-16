import { Request, Response } from "express";
import { z } from "zod";
import { PaymentStatus } from "@prisma/client";
import prisma from "../../prisma/client";
import { PaymentService } from './service';
import { uuidSchema, idParamSchema } from "../../utils/validation";

const service = new PaymentService(prisma);

const recordPaymentSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.string().min(1),
  feeId: z.string().uuid().optional(),
  feeCategory: z.string().min(1).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: z.string().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
});

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
  async listPayments(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const payments = await prisma.payment.findMany({
        where: { tenantId: req.tenantId },
        include: { student: true, fee: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  // Record a manual payment (cash / bank transfer / POS). The Payment model
  // requires a Fee, so an explicit feeId is used when given, otherwise a Fee
  // is found-or-created by the fee-category name.
  async recordPayment(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const data = recordPaymentSchema.parse(req.body);

      let feeId = data.feeId;
      if (!feeId) {
        const name = data.feeCategory?.trim() || "General Fee";
        const existing = await prisma.fee.findFirst({ where: { tenantId: req.tenantId, name } });
        const fee = existing ?? await prisma.fee.create({
          data: { tenantId: req.tenantId, name, amount: data.amount, dueDate: new Date() },
        });
        feeId = fee.id;
      }

      const payment = await prisma.payment.create({
        data: {
          tenantId: req.tenantId,
          feeId,
          studentId: data.studentId,
          amount: data.amount,
          method: data.method,
          status: data.status ?? PaymentStatus.SUCCESS,
          ...(data.paymentDate ? { createdAt: new Date(data.paymentDate) } : {}),
        },
        include: { student: true, fee: true },
      });

      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async listStudentPayments(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const payments = await prisma.payment.findMany({
        where: { tenantId: req.tenantId, studentId },
        include: { fee: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

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
