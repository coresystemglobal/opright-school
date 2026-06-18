import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { TeacherService } from './service';
import { idParamSchema } from "../../utils/validation";
import { parseCsv, buildCsv } from "../../utils/csv";

const service = new TeacherService(prisma);

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  subject: z.string().min(1).nullable().optional(),
  userId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  bio: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  employmentDate: z.string().datetime().nullable().optional().transform((v) => v ? new Date(v) : undefined),
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  subject: z.string().min(1).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  bio: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  employmentDate: z.string().datetime().nullable().optional().transform((v) => v ? new Date(v) : undefined),
});

export const teacherController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const teachers = await service.list(req.tenantId);
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const data = createSchema.parse(req.body);
      const teacher = await service.create(req.tenantId, data);
      res.status(201).json(teacher);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const teacher = await service.getById(req.tenantId, id);
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const teacher = await service.getProfile(req.tenantId, id);
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getMe(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.user?.userId) return res.status(401).json({ error: "Unauthorized" });

      const teacher = await service.getByUserId(req.tenantId, req.user.userId);
      if (!teacher) return res.status(404).json({ error: "Teacher profile not found for this user" });
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updateMe(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.user?.userId) return res.status(401).json({ error: "Unauthorized" });

      const teacher = await service.getByUserId(req.tenantId, req.user.userId);
      if (!teacher) return res.status(404).json({ error: "Teacher profile not found for this user" });

      const data = updateSchema.parse(req.body);
      const updated = await service.update(req.tenantId, teacher.id, data);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const data = updateSchema.parse(req.body);
      const { id } = idParamSchema.parse(req.params);
      const teacher = await service.update(req.tenantId, id, data);
      res.json(teacher);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      await service.delete(req.tenantId, id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getSubjects(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;

      const teacher = await service.getById(req.tenantId, id);
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const subjects = await service.getSubjects(req.tenantId, id, academicYearId);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getTimetable(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;

      const teacher = await service.getById(req.tenantId, id);
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const timetable = await service.getTimetable(req.tenantId, id, academicYearId);
      res.json(timetable);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getStudents(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);

      const teacher = await service.getById(req.tenantId, id);
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const students = await service.getStudents(req.tenantId, id);
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getCourses(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);

      const teacher = await service.getById(req.tenantId, id);
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const courses = await service.getCourses(req.tenantId, id);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async uploadCsv(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) return res.status(400).json({ error: "CSV is empty" });

      const errors: string[] = [];
      const created: unknown[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ln = i + 2;
        const firstName = (row.first_name || row.firstname || '').trim();
        const lastName = (row.last_name || row.lastname || '').trim();
        if (!firstName || !lastName) { errors.push(`Row ${ln}: missing name`); continue; }

        try {
          const teacher = await service.create(req.tenantId, {
            firstName,
            lastName,
            subject: (row.subject || '').trim() || null,
            phone: (row.phone || '').trim() || null,
            email: (row.email || '').trim() || null,
            qualification: (row.qualification || '').trim() || null,
          });
          created.push(teacher);
        } catch (e: unknown) {
          errors.push(`Row ${ln}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      res.status(201).json({ imported: created.length, errors });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async downloadCsvTemplate(req: Request, res: Response) {
    try {
      const headers = ['first_name', 'last_name', 'subject', 'phone', 'email', 'qualification'];
      const rows = [
        ['Chidi', 'Eze', 'Mathematics', '+2348012345678', 'chidi.eze@school.edu', 'B.Sc. Mathematics'],
        ['Amaka', 'Nwosu', 'English Language', '+2348087654321', 'amaka.nwosu@school.edu', 'B.A. English'],
      ];
      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=teachers-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
