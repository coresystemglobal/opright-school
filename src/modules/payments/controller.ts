import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { PaymentService } from './service';
import { uuidSchema, idParamSchema } from "../../utils/validation";

const service = new PaymentService(prisma);

const feeSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
});

const paymentSchema = z.object({
  feeId: z.string().uuid(),
  studentId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.string().min(1),
});

const onlinePaymentSchema = z.object({
  feeId: z.string().uuid(),
  studentId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  email: z.string().email(),
});

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

export const paymentController = {
  async createFee(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = feeSchema.parse(req.body);
      const fee = await service.createFee(req.tenantId, data);
      res.status(201).json(fee);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async createPayment(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = paymentSchema.parse(req.body);
      const payment = await service.createPayment(req.tenantId, data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async initializeOnlinePayment(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = onlinePaymentSchema.parse(req.body);
      const result = await service.initializeOnlinePayment(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async paystackWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      if (!signature) {
        return res.status(400).json({ error: "Missing Paystack signature" });
      }

      // req.body is a Buffer when express.raw() middleware is used on this route
      const rawBody = req.body as Buffer;
      const result = await service.handlePaystackWebhook(rawBody, signature);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async confirmPayment(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      const { id } = idParamSchema.parse(req.params);
      const payment = await service.confirmPayment(req.tenantId, id);
      res.json(payment);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getStudentPayments(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { studentId } = studentIdParamSchema.parse(req.params);
      const payments = await service.getStudentPayments(req.tenantId, studentId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
