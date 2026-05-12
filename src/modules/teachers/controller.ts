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
  subject: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE"]).nullable().optional(),
  dob: z.coerce.date().nullable().optional(),
  address: z.string().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  employmentDate: z.coerce.date().nullable().optional(),
  employmentStatus: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]).optional(),
  userId: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.partial();

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

  async uploadCsv(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const rows = parseCsv(req.file.buffer);
      if (!rows.length) return res.status(400).json({ error: "CSV is empty" });

      const errors: string[] = [];
      const created: any[] = [];

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
            email: (row.email || '').trim() || null,
            phone: (row.phone || '').trim() || null,
            gender: row.gender === 'MALE' || row.gender === 'FEMALE' ? row.gender : null,
            qualification: (row.qualification || '').trim() || null,
            employeeId: (row.employee_id || row.employeeId || '').trim() || null,
            employmentStatus: (['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const).includes(row.employment_status as any) ? row.employment_status as "FULL_TIME" | "PART_TIME" | "CONTRACT" : undefined,
          });
          created.push(teacher);
        } catch (e: any) {
          errors.push(`Row ${ln}: ${e.message}`);
        }
      }

      res.status(201).json({ imported: created.length, errors });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async downloadCsvTemplate(req: Request, res: Response) {
    try {
      const headers = ['first_name', 'last_name', 'subject', 'email', 'phone', 'gender', 'qualification', 'employee_id', 'employment_status'];
      const rows = [
        ['Chidi', 'Eze', 'Mathematics', 'chidi@school.ng', '08012345678', 'MALE', 'B.Sc Mathematics', 'EMP001', 'FULL_TIME'],
        ['Amaka', 'Nwosu', 'English Language', 'amaka@school.ng', '08098765432', 'FEMALE', 'M.A English', 'EMP002', 'FULL_TIME'],
      ];
      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=teachers-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  // Teacher self-service (called by the teacher themselves)
  async getMyProfile(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const teacher = await service.getByUserId(req.tenantId, req.user.userId);
      if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updateMyProfile(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const teacher = await service.getByUserId(req.tenantId, req.user.userId);
      if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

      const allowed = updateSchema.pick({ phone: true, address: true, bio: true, photoUrl: true, qualification: true });
      const data = allowed.parse(req.body);
      const updated = await service.update(req.tenantId, teacher.id, data);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
