import { Request, Response } from 'express';
import { z } from 'zod';
import { AttendanceService } from '../services/attendanceService';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();
const service = new AttendanceService(prisma);

const markSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().transform(s => new Date(s)),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  remarks: z.string().optional()
});

const bulkMarkSchema = z.array(markSchema);

export const attendanceController = {
  async markAttendance(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = markSchema.parse(req.body);
      const result = await service.markAttendance(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async bulkMarkAttendance(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = bulkMarkSchema.parse(req.body);
      const result = await service.bulkMarkAttendance(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getAttendance(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const filters = {
        studentId: req.query.studentId as string | undefined,
        classId: req.query.classId as string | undefined,
        date: req.query.date ? new Date(req.query.date as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      const result = await service.getAttendance(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getAttendanceStats(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId } = req.params;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const result = await service.getAttendanceStats(req.tenantId, studentId, startDate, endDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getClassAttendanceReport(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { classId } = req.params;
      const date = new Date(req.query.date as string);
      const result = await service.getClassAttendanceReport(req.tenantId, classId, date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
