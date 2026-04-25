import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { BillingService } from './service';
import { getPricingComparison } from './pricing';
import prisma from '../../prisma/client';

const service = new BillingService(prisma);

const initializeSchema = z.object({
  studentCount: z.number().int().min(1).max(100_000),
  billingCycle: z.enum(['per_term', 'per_session']),
  email: z.string().email(),
});

const verifySchema = z.object({
  reference: z.string().min(1),
});

export const billingController = {
  async getPricing(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ pricing: getPricingComparison() });
    } catch (error) {
      next(error);
    }
  },

  async initializePayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'tenantId required' });
      const { studentCount, billingCycle, email } = initializeSchema.parse(req.body);
      const result = await service.initializePayment(req.tenantId, studentCount, billingCycle, email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'tenantId required' });
      const { reference } = verifySchema.parse(req.body);
      const subscription = await service.verifyAndActivate(reference, req.tenantId);
      res.json({ subscription });
    } catch (error) {
      next(error);
    }
  },

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'tenantId required' });
      const subscription = await service.getSubscription(req.tenantId);
      res.json({ subscription });
    } catch (error) {
      next(error);
    }
  },
};
