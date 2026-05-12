import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { CandidateService } from './service';
import { idParamSchema } from "../../utils/validation";
import { parseCsv, buildCsv } from "../../utils/csv";

const service = new CandidateService(prisma);

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.coerce.date().optional(),
  applicationData: z.record(z.unknown()).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["PENDING", "ADMITTED", "REJECTED"]).optional(),
});

export const candidateController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      res.json(await service.list(req.tenantId));
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
      const candidate = await service.create(req.tenantId, data);
      res.status(201).json(candidate);
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
      const candidate = await service.getById(req.tenantId, id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json(candidate);
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
      const candidate = await service.update(req.tenantId, id, data);
      res.json(candidate);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async admit(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const student = await service.admit(req.tenantId, id);
      res.status(201).json(student);
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
        if (dobStr && isNaN(dob!.getTime())) { errors.push(`Row ${ln}: invalid date`); continue; }

        try {
          const candidate = await service.create(req.tenantId, {
            firstName, lastName, dob,
            applicationData: {
              previousSchool: (row.previous_school || '').trim() || undefined,
              classAppliedFor: (row.class_applied_for || row.class || '').trim() || undefined,
              parentPhone: (row.parent_phone || row.phone || '').trim() || undefined,
            },
          });
          created.push(candidate);
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
      const headers = ['first_name', 'last_name', 'date_of_birth', 'class_applied_for', 'previous_school', 'parent_phone'];
      const rows = [
        ['Oluwaseun', 'Adeyinka', '2013-06-15', 'JSS 1', 'Lagos Model School', '+2348012345678'],
        ['Blessing', 'Okonkwo', '2014-03-22', 'Primary 1', 'Community Primary School', '+2348087654321'],
      ];
      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=candidates-template.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
