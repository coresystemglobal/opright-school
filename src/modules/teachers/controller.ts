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
});

const updateSchema = createSchema.partial();

export const teacherController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const teachers = await service.list(req.tenantId);
      res.json(teachers);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createSchema.parse(req.body);
      const teacher = await service.create(req.tenantId, data);
      res.status(201).json(teacher);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { id } = idParamSchema.parse(req.params);
      const teacher = await service.getById(req.tenantId, id);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      res.json(teacher);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = updateSchema.parse(req.body);
      const { id } = idParamSchema.parse(req.params);
      const teacher = await service.update(req.tenantId, id, data);
      res.json(teacher);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
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
            firstName, lastName,
            subject: (row.subject || '').trim() || null,
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
      const headers = ['first_name', 'last_name', 'subject'];
      const rows = [
        ['Chidi', 'Eze', 'Mathematics'],
        ['Amaka', 'Nwosu', 'English Language'],
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
