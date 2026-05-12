import { Request, Response } from 'express';
import { z } from 'zod';
import { SubjectService } from './service';
import prisma from '../../prisma/client';
import { idParamSchema, optionalUuidSchema } from '../../utils/validation';
import { parseCsv, buildCsv } from '../../utils/csv';

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

const listQuerySchema = z.object({
  classId: optionalUuidSchema,
  academicYearId: optionalUuidSchema,
  teacherId: optionalUuidSchema,
});

const assignTeacherSchema = z.object({
  teacherId: z.string().uuid(),
});

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
      const filters = listQuerySchema.parse(req.query);
      const result = await service.list(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      const result = await service.getById(req.tenantId, id);
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
  },

  async assignTeacher(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      const { id } = idParamSchema.parse(req.params);
      const { teacherId } = assignTeacherSchema.parse(req.body);
      const result = await service.assignTeacher(req.tenantId, id, teacherId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async uploadCsv(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

      const classes = await prisma.class.findMany({ where: { tenantId: req.tenantId }, select: { id: true, name: true } });
      const classByName = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));

      const teachers = await prisma.teacher.findMany({ where: { tenantId: req.tenantId }, select: { id: true, firstName: true, lastName: true } });
      const teacherByName = new Map(teachers.map(t => [`${t.firstName} ${t.lastName}`.toLowerCase(), t.id]));

      const academicYears = await prisma.academicYear.findMany({ where: { tenantId: req.tenantId, isCurrent: true }, select: { id: true } });
      const defaultAyId = academicYears[0]?.id;

      const errors: string[] = [];
      const created: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ln = i + 2;
        const name = (row.name || row.subject_name || '').trim();
        if (!name) { errors.push(`Row ${ln}: missing subject name`); continue; }

        let classId = row.class_id || '';
        if (!classId) {
          const cn = (row.class_name || row.class || '').toLowerCase();
          if (cn && classByName.has(cn)) classId = classByName.get(cn)!;
        }
        if (!classId) { errors.push(`Row ${ln}: cannot resolve class`); continue; }

        let teacherId = row.teacher_id || '';
        if (!teacherId) {
          const tn = (row.teacher_name || row.teacher || '').toLowerCase();
          if (tn && teacherByName.has(tn)) teacherId = teacherByName.get(tn)!;
        }

        const academicYearId = row.academic_year_id || defaultAyId;
        if (!academicYearId) { errors.push(`Row ${ln}: no academic year found`); continue; }

        try {
          const subject = await service.create(req.tenantId, {
            name,
            code: (row.code || row.subject_code || '').trim() || undefined,
            description: (row.description || '').trim() || undefined,
            classId,
            teacherId: teacherId || undefined,
            academicYearId,
          });
          created.push(subject);
        } catch (e: any) {
          errors.push(`Row ${ln}: ${e.message}`);
        }
      }

      res.status(201).json({ imported: created.length, errors });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async downloadCsvTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      const classes = await prisma.class.findMany({ where: { tenantId: req.tenantId }, select: { id: true, name: true } });
      const teachers = await prisma.teacher.findMany({ where: { tenantId: req.tenantId }, select: { id: true, firstName: true, lastName: true } });
      const ay = await prisma.academicYear.findFirst({ where: { tenantId: req.tenantId, isCurrent: true }, select: { id: true } });

      const headers = ['name', 'code', 'description', 'class_id', 'class_name', 'teacher_id', 'teacher_name', 'academic_year_id'];
      const sampleSubjects = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Physical Education'];
      const rows = sampleSubjects.map((subj, i) => [
        subj,
        subj.substring(0, 3).toUpperCase() + '101',
        '',
        classes[0]?.id || '',
        classes[0]?.name || '',
        teachers[i % teachers.length]?.id || '',
        teachers[i % teachers.length] ? `${teachers[i % teachers.length].firstName} ${teachers[i % teachers.length].lastName}` : '',
        ay?.id || '',
      ]);

      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=subjects-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
