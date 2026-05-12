import { Request, Response } from 'express';
import { z } from 'zod';
import { AttendanceService } from './service';
import { AttendanceStatus } from '@prisma/client';
import prisma from '../../prisma/client';
import { parseCsv, buildCsv } from '../../utils/csv';
import {
  optionalDateSchema,
  optionalUuidSchema,
  uuidSchema,
} from '../../utils/validation';

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
  },

  async uploadCsv(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) return res.status(400).json({ error: 'CSV is empty or has no data rows' });

      const validStatuses = new Set(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
      const errors: string[] = [];
      const records: { studentId: string; date: Date; status: AttendanceStatus; remarks?: string }[] = [];

      // Resolve student IDs by name or student code
      const students = await prisma.student.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
      });
      const byName = new Map(students.map(s => [`${s.firstName} ${s.lastName}`.toLowerCase(), s.id]));
      const byCode = new Map(students.filter(s => s.studentCode).map(s => [s.studentCode!.toUpperCase(), s.id]));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2;

        // Resolve student
        let studentId = row.student_id || row.studentid || '';
        if (!studentId) {
          const name = (row.student_name || row.studentname || row.name || '').toLowerCase();
          const code = (row.student_code || row.studentcode || '').toUpperCase();
          if (code && byCode.has(code)) studentId = byCode.get(code)!;
          else if (name && byName.has(name)) studentId = byName.get(name)!;
        }
        if (!studentId) { errors.push(`Row ${lineNum}: cannot resolve student`); continue; }

        const dateStr = row.date || '';
        if (!dateStr) { errors.push(`Row ${lineNum}: missing date`); continue; }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) { errors.push(`Row ${lineNum}: invalid date "${dateStr}"`); continue; }

        const status = (row.status || '').toUpperCase();
        if (!validStatuses.has(status)) { errors.push(`Row ${lineNum}: invalid status "${row.status}"`); continue; }

        records.push({ studentId, date, status: status as AttendanceStatus, remarks: row.remarks || undefined });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'No valid records found', details: errors });
      }

      const result = await service.bulkMarkAttendance(req.tenantId, records);
      res.status(201).json({ imported: records.length, errors, result });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async downloadCsvTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      const students = await prisma.student.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });

      const today = new Date().toISOString().split('T')[0];
      const headers = ['student_id', 'student_name', 'student_code', 'date', 'status', 'remarks'];
      const rows = students.map(s => [
        s.id,
        `${s.firstName} ${s.lastName}`,
        s.studentCode || '',
        today,
        'PRESENT',
        '',
      ]);

      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-template-${today}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
