import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { StudentService } from './service';
import { idParamSchema } from "../../utils/validation";
import { parseCsv, buildCsv } from "../../utils/csv";

const service = new StudentService(prisma);

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.coerce.date().optional(),
  guardian: z.record(z.unknown()).optional(),
  classId: z.string().uuid().optional(),
});

const updateSchema = createSchema.partial();

export const studentController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const includeArchived = req.query.includeArchived === "true";
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = req.query.search as string | undefined;
      const result = await service.list(req.tenantId, { includeArchived, page, limit, search });
      res.json(result);
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
      const student = await service.create(req.tenantId, data);
      res.status(201).json(student);
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
      const student = await service.getById(req.tenantId, id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      res.json(student);
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
      const student = await service.update(req.tenantId, id, data);
      res.json(student);
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

        const dobStr = row.date_of_birth || row.dob || '';
        const dob = dobStr ? new Date(dobStr) : undefined;
        if (dobStr && isNaN(dob!.getTime())) { errors.push(`Row ${ln}: invalid date_of_birth`); continue; }

        try {
          const student = await service.create(req.tenantId, {
            firstName, lastName, dob,
            guardian: row.guardian_name ? { name: row.guardian_name, phone: row.guardian_phone || '', email: row.guardian_email || '' } : undefined,
          });
          created.push(student);
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
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const headers = ['first_name', 'last_name', 'date_of_birth', 'guardian_name', 'guardian_phone', 'guardian_email'];
      const rows = [
        ['Ada', 'Nwosu', '2013-05-20', 'Mrs. Nwosu', '+2348012345678', 'nwosu@email.com'],
        ['Emeka', 'Obi', '2012-11-15', 'Mr. Obi', '+2348087654321', ''],
      ];
      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=students-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
