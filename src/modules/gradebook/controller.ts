import { Request, Response } from 'express';
import { z } from 'zod';
import { GradebookService } from './service';
import prisma from '../../prisma/client';
import { parseCsv, buildCsv } from '../../utils/csv';
import { optionalUuidSchema, uuidSchema } from '../../utils/validation';

const service = new GradebookService(prisma);

const assignmentSchema = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  maxScore: z.number().positive(),
  weight: z.number().positive().optional(),
  dueDate: z.string().transform(s => new Date(s)).optional()
});

const gradeSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
  score: z.number().min(0),
  maxScore: z.number().positive(),
  remarks: z.string().optional(),
  gradedBy: z.string().optional()
});

const bulkGradeSchema = z.array(gradeSchema);

const examinationSchema = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  subjectId: z.string().uuid(),
  name: z.string().min(1),
  examDate: z.string().transform(s => new Date(s)),
  duration: z.number().positive().optional(),
  maxScore: z.number().positive(),
  passingScore: z.number().positive().optional(),
  room: z.string().optional()
});

const examResultSchema = z.object({
  examinationId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.number().min(0),
  grade: z.string().optional(),
  remarks: z.string().optional()
});

const listAssignmentsQuerySchema = z.object({
  subjectId: optionalUuidSchema,
  termId: optionalUuidSchema,
});

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

const studentGradesQuerySchema = z.object({
  subjectId: optionalUuidSchema,
  assignmentId: optionalUuidSchema,
});

const subjectAverageParamsSchema = z.object({
  studentId: uuidSchema,
  subjectId: uuidSchema,
});

const reportCardParamsSchema = z.object({
  studentId: uuidSchema,
  termId: uuidSchema,
});

const examResultsQuerySchema = z.object({
  examinationId: optionalUuidSchema,
  studentId: optionalUuidSchema,
});

export const gradebookController = {
  async createAssignment(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = assignmentSchema.parse(req.body);
      const result = await service.createAssignment(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async listAssignments(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const filters = listAssignmentsQuerySchema.parse(req.query);
      const result = await service.listAssignments(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async recordGrade(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = gradeSchema.parse(req.body);
      const result = await service.recordGrade(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async bulkRecordGrades(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = bulkGradeSchema.parse(req.body);
      const result = await service.bulkRecordGrades(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getStudentGrades(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId } = studentIdParamSchema.parse(req.params);
      const filters = studentGradesQuerySchema.parse(req.query);
      const result = await service.getStudentGrades(req.tenantId, studentId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async calculateSubjectAverage(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId, subjectId } = subjectAverageParamsSchema.parse(req.params);
      const result = await service.calculateSubjectAverage(req.tenantId, studentId, subjectId);
      res.json({ average: result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getStudentReportCard(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId, termId } = reportCardParamsSchema.parse(req.params);
      const result = await service.getStudentReportCard(req.tenantId, studentId, termId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async createExamination(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = examinationSchema.parse(req.body);
      const result = await service.createExamination(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async recordExamResult(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const data = examResultSchema.parse(req.body);
      const result = await service.recordExamResult(req.tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getExamResults(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const filters = examResultsQuerySchema.parse(req.query);
      const result = await service.getExamResults(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async uploadGradesCsv(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

      const students = await prisma.student.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
      });
      const byName = new Map(students.map(s => [`${s.firstName} ${s.lastName}`.toLowerCase(), s.id]));
      const byCode = new Map(students.filter(s => s.studentCode).map(s => [s.studentCode!.toUpperCase(), s.id]));

      const subjects = await prisma.subject.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, name: true },
      });
      const subjectByName = new Map(subjects.map(s => [s.name.toLowerCase(), s.id]));

      const errors: string[] = [];
      const grades: { studentId: string; subjectId: string; assignmentId?: string; score: number; maxScore: number; remarks?: string; gradedBy?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ln = i + 2;

        let studentId = row.student_id || row.studentid || '';
        if (!studentId) {
          const name = (row.student_name || row.name || '').toLowerCase();
          const code = (row.student_code || '').toUpperCase();
          if (code && byCode.has(code)) studentId = byCode.get(code)!;
          else if (name && byName.has(name)) studentId = byName.get(name)!;
        }
        if (!studentId) { errors.push(`Row ${ln}: cannot resolve student`); continue; }

        let subjectId = row.subject_id || row.subjectid || '';
        if (!subjectId) {
          const sn = (row.subject_name || row.subject || '').toLowerCase();
          if (sn && subjectByName.has(sn)) subjectId = subjectByName.get(sn)!;
        }
        if (!subjectId) { errors.push(`Row ${ln}: cannot resolve subject`); continue; }

        const score = parseFloat(row.score || '');
        const maxScore = parseFloat(row.max_score || row.maxscore || '100');
        if (isNaN(score)) { errors.push(`Row ${ln}: invalid score`); continue; }
        if (isNaN(maxScore) || maxScore <= 0) { errors.push(`Row ${ln}: invalid max_score`); continue; }

        grades.push({
          studentId, subjectId,
          assignmentId: row.assignment_id || row.assignmentid || undefined,
          score, maxScore,
          remarks: row.remarks || undefined,
          gradedBy: row.graded_by || undefined,
        });
      }

      if (!grades.length) return res.status(400).json({ error: 'No valid records', details: errors });

      const result = await service.bulkRecordGrades(req.tenantId, grades);
      res.status(201).json({ imported: grades.length, errors, result });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async downloadGradesCsvTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      const students = await prisma.student.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
        orderBy: [{ lastName: 'asc' }],
      });
      const subjects = await prisma.subject.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, name: true },
        take: 1,
      });

      const headers = ['student_id', 'student_name', 'student_code', 'subject_id', 'subject_name', 'assignment_id', 'score', 'max_score', 'remarks', 'graded_by'];
      const subj = subjects[0];
      const rows = students.map(s => [
        s.id,
        `${s.firstName} ${s.lastName}`,
        s.studentCode || '',
        subj?.id || '',
        subj?.name || '',
        '',
        String(Math.floor(60 + Math.random() * 40)),
        '100',
        '',
        '',
      ]);

      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=grades-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async uploadExamResultsCsv(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

      const students = await prisma.student.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
      });
      const byName = new Map(students.map(s => [`${s.firstName} ${s.lastName}`.toLowerCase(), s.id]));
      const byCode = new Map(students.filter(s => s.studentCode).map(s => [s.studentCode!.toUpperCase(), s.id]));

      const errors: string[] = [];
      const results: { examinationId: string; studentId: string; score: number; grade?: string; remarks?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ln = i + 2;

        const examId = row.examination_id || row.examinationid || row.exam_id || '';
        if (!examId) { errors.push(`Row ${ln}: missing examination_id`); continue; }

        let studentId = row.student_id || row.studentid || '';
        if (!studentId) {
          const name = (row.student_name || row.name || '').toLowerCase();
          const code = (row.student_code || '').toUpperCase();
          if (code && byCode.has(code)) studentId = byCode.get(code)!;
          else if (name && byName.has(name)) studentId = byName.get(name)!;
        }
        if (!studentId) { errors.push(`Row ${ln}: cannot resolve student`); continue; }

        const score = parseFloat(row.score || '');
        if (isNaN(score)) { errors.push(`Row ${ln}: invalid score`); continue; }

        results.push({ examinationId: examId, studentId, score, grade: row.grade || undefined, remarks: row.remarks || undefined });
      }

      if (!results.length) return res.status(400).json({ error: 'No valid records', details: errors });

      const imported = [];
      for (const r of results) {
        imported.push(await service.recordExamResult(req.tenantId, r));
      }
      res.status(201).json({ imported: imported.length, errors });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async downloadExamResultsCsvTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      const students = await prisma.student.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, firstName: true, lastName: true, studentCode: true },
        orderBy: [{ lastName: 'asc' }],
      });
      const exams = await prisma.examination.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, name: true },
        take: 1,
      });

      const headers = ['examination_id', 'exam_name', 'student_id', 'student_name', 'student_code', 'score', 'grade', 'remarks'];
      const exam = exams[0];
      const rows = students.map(s => [
        exam?.id || '',
        exam?.name || '',
        s.id,
        `${s.firstName} ${s.lastName}`,
        s.studentCode || '',
        '',
        '',
        '',
      ]);

      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=exam-results-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
