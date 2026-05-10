import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../prisma/client';
import { StudentSelfService } from './service';

const service = new StudentSelfService(prisma);

const attendanceQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const gradesQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
});

const reportCardQuerySchema = z.object({
  termId: z.string().uuid(),
});

const timetableQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
});

export const studentSelfController = {
  async getProfile(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const profile = await service.getProfile(req.tenantId, req.user.userId);
      res.json(profile);
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

  async getGrades(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { subjectId } = gradesQuerySchema.parse(req.query);
      const result = await service.getGrades(req.tenantId, req.user.userId, { subjectId });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getAttendance(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { startDate, endDate } = attendanceQuerySchema.parse(req.query);
      const result = await service.getAttendance(req.tenantId, req.user.userId, { startDate, endDate });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getFees(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await service.getFees(req.tenantId, req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getReportCard(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { termId } = reportCardQuerySchema.parse(req.query);
      const result = await service.getReportCard(req.tenantId, req.user.userId, termId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
