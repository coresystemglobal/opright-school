import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { DisciplinaryService } from './service';
import {
  idParamSchema,
  optionalStringSchema,
  optionalUuidSchema,
} from "../../utils/validation";

const service = new DisciplinaryService(prisma);

const createRecordSchema = z.object({
  studentId: z.string().uuid(),
  incidentDate: z.coerce.date(),
  description: z.string().min(1),
  severity: z.string().min(1),
  actionTaken: z.string().optional(),
  reportedBy: z.string().optional(),
  status: z.string().optional(),
});

const updateRecordSchema = createRecordSchema.partial();

const recordsQuerySchema = z.object({
  studentId: optionalUuidSchema,
  status: optionalStringSchema,
});

export const disciplinaryController = {
  async createRecord(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createRecordSchema.parse(req.body);
      const record = await service.createRecord(req.tenantId, data);
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getRecords(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { studentId, status } = recordsQuerySchema.parse(req.query);
      const records = await service.getRecords(req.tenantId, studentId, status);
      res.json(records);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateRecord(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = updateRecordSchema.parse(req.body);
      const { id } = idParamSchema.parse(req.params);
      const record = await service.updateRecord(req.tenantId, id, data);
      res.json(record);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const stats = await service.getStats(req.tenantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
