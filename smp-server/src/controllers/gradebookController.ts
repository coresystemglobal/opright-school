import { Request, Response } from 'express';
import { z } from 'zod';
import { GradebookService } from '../services/gradebookService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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
      const filters = {
        subjectId: req.query.subjectId as string | undefined,
        termId: req.query.termId as string | undefined
      };
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
      const { studentId } = req.params;
      const filters = {
        subjectId: req.query.subjectId as string | undefined,
        assignmentId: req.query.assignmentId as string | undefined
      };
      const result = await service.getStudentGrades(req.tenantId, studentId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async calculateSubjectAverage(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId, subjectId } = req.params;
      const result = await service.calculateSubjectAverage(req.tenantId, studentId, subjectId);
      res.json({ average: result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getStudentReportCard(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { studentId, termId } = req.params;
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
      const filters = {
        examinationId: req.query.examinationId as string | undefined,
        studentId: req.query.studentId as string | undefined
      };
      const result = await service.getExamResults(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
