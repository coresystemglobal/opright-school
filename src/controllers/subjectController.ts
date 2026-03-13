import { Request, Response } from 'express';
import { z } from 'zod';
import { SubjectService } from '../services/subjectService';
import prisma from '../prisma/client';

const service = new SubjectService(prisma);

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  classId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  academicYearId: z.string().uuid()
});

const updateSchema = createSchema.omit({ classId: true, academicYearId: true }).partial();

export const subjectController = {
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
      const filters = {
        classId: req.query.classId as string | undefined,
        academicYearId: req.query.academicYearId as string | undefined,
        teacherId: req.query.teacherId as string | undefined
      };
      const result = await service.list(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const result = await service.getById(req.tenantId, req.params.id);
      if (!result) return res.status(404).json({ error: 'Subject not found' });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = updateSchema.parse(req.body);
      const result = await service.update(req.tenantId, req.params.id, data);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      await service.delete(req.tenantId, req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async assignTeacher(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { teacherId } = z.object({ teacherId: z.string().uuid() }).parse(req.body);
      const result = await service.assignTeacher(req.tenantId, req.params.id, teacherId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
