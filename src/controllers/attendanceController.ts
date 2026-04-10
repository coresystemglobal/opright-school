import { Request, Response } from 'express';
import { z } from 'zod';
import { AttendanceService } from '../services/attendanceService';
import { AttendanceStatus } from '@prisma/client';
import prisma from '../prisma/client';
import {
  optionalDateSchema,
  optionalUuidSchema,
  uuidSchema,
} from '../utils/validation';

const service = new AttendanceService(prisma);

const markSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().transform(s => new Date(s)),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  remarks: z.string().optional()
});

const bulkMarkSchema = z.array(markSchema);

const attendanceQuerySchema = z.object({
  studentId: optionalUuidSchema,
  classId: optionalUuidSchema,
  date: optionalDateSchema,
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
});

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

const attendanceStatsQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const classReportParamsSchema = z.object({
  classId: uuidSchema,
});

const classReportQuerySchema = z.object({
  date: z.coerce.date(),
});

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
      const filters = attendanceQuerySchema.parse(req.query);
      const result = await service.getAttendance(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getStudentAttendance(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const result = await service.getStudentAttendance(req.tenantId, studentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getAttendanceStats(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const { startDate, endDate } = attendanceStatsQuerySchema.parse(req.query);
      const result = await service.getAttendanceStats(req.tenantId, studentId, startDate, endDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getClassAttendanceReport(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { classId } = classReportParamsSchema.parse(req.params);
      const { date } = classReportQuerySchema.parse(req.query);
      const result = await service.getClassAttendanceReport(req.tenantId, classId, date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
