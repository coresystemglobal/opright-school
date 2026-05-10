import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma/client';
import { TeacherSelfService } from './service';

const service = new TeacherSelfService(prisma);

const timetableQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
});

const subjectsQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  dob: z.string().datetime().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  address: z.string().min(1).nullable().optional(),
  qualification: z.string().min(1).nullable().optional(),
  bio: z.string().min(1).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
});

export const teacherSelfController = {
  async getProfile(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const profile = await service.getProfile(req.tenantId, req.user.userId);
      res.json(profile);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const data = updateProfileSchema.parse(req.body);
      const teacher = await service.updateProfile(req.tenantId, req.user.userId, data);
      res.json(teacher);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getTimetable(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { academicYearId } = timetableQuerySchema.parse(req.query);
      const result = await service.getTimetable(req.tenantId, req.user.userId, academicYearId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getClasses(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await service.getClasses(req.tenantId, req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getSubjects(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { academicYearId } = subjectsQuerySchema.parse(req.query);
      const result = await service.getSubjects(req.tenantId, req.user.userId, academicYearId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
