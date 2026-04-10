import { Request, Response } from 'express';
import { z } from 'zod';
import { TimetableService } from '../services/timetableService';
import prisma from '../prisma/client';
import { idParamSchema, optionalUuidSchema, uuidSchema } from '../utils/validation';

const service = new TimetableService(prisma);

const createSchema = z.object({
  academicYearId: z.string().uuid(),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().optional()
});

const updateSchema = createSchema.omit({ academicYearId: true, subjectId: true, classId: true, teacherId: true }).partial();

const classIdParamSchema = z.object({
  classId: uuidSchema,
});

const teacherIdParamSchema = z.object({
  teacherId: uuidSchema,
});

const listQuerySchema = z.object({
  academicYearId: optionalUuidSchema,
});

export const timetableController = {
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

  async listByClass(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { classId } = classIdParamSchema.parse(req.params);
      const { academicYearId } = listQuerySchema.parse(req.query);
      const result = await service.listByClass(req.tenantId, classId, academicYearId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async listByTeacher(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { teacherId } = teacherIdParamSchema.parse(req.params);
      const { academicYearId } = listQuerySchema.parse(req.query);
      const result = await service.listByTeacher(req.tenantId, teacherId, academicYearId);
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
