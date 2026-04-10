import { Request, Response } from 'express';
import { z } from 'zod';
import { TermService } from '../services/termService';
import prisma from '../prisma/client';
import { idParamSchema, optionalUuidSchema } from '../utils/validation';

const service = new TermService(prisma);

const createSchema = z.object({
  name: z.string().min(1),
  academicYearId: z.string().uuid(),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s)),
  isCurrent: z.boolean().optional()
});

const updateSchema = createSchema.omit({ academicYearId: true }).partial();

const listQuerySchema = z.object({
  academicYearId: optionalUuidSchema,
});

export const termController = {
  async create(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = createSchema.parse(req.body);
      const result = await service.create(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { academicYearId } = listQuerySchema.parse(req.query);
      const result = await service.list(req.tenantId, academicYearId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getCurrent(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const result = await service.getCurrent(req.tenantId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = updateSchema.parse(req.body);
      const { id } = idParamSchema.parse(req.params);
      const result = await service.update(req.tenantId, id, data);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      await service.delete(req.tenantId, id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
