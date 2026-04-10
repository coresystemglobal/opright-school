import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { HealthService } from "../services/healthService";

const service = new HealthService(prisma);

const createHealthRecordSchema = z.object({
  studentId: z.string().uuid(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  conditions: z.string().optional(),
  emergencyContact: z.record(z.unknown()).optional(),
});

const updateHealthRecordSchema = createHealthRecordSchema
  .omit({ studentId: true })
  .partial();

const recordIncidentSchema = z.object({
  healthRecordId: z.string().uuid(),
  date: z.coerce.date().optional(),
  description: z.string().min(1),
  treatment: z.string().optional(),
  treatedBy: z.string().optional(),
});

const recordVaccinationSchema = z.object({
  healthRecordId: z.string().uuid(),
  vaccineName: z.string().min(1),
  date: z.coerce.date(),
  nextDue: z.coerce.date().optional(),
});

export const healthController = {
  async createHealthRecord(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createHealthRecordSchema.parse(req.body);
      const record = await service.createHealthRecord(req.tenantId, data);
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getHealthRecord(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const record = await service.getHealthRecord(req.tenantId, req.params.studentId);
      res.json(record);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async updateHealthRecord(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = updateHealthRecordSchema.parse(req.body);
      const record = await service.updateHealthRecord(
        req.tenantId,
        req.params.studentId,
        data
      );
      res.json(record);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async recordIncident(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = recordIncidentSchema.parse(req.body);
      const incident = await service.recordIncident(req.tenantId, data);
      res.status(201).json(incident);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getIncidents(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const incidents = await service.getIncidents(
        req.tenantId,
        req.params.healthRecordId
      );
      res.json(incidents);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async recordVaccination(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = recordVaccinationSchema.parse(req.body);
      const vaccination = await service.recordVaccination(req.tenantId, data);
      res.status(201).json(vaccination);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getVaccinations(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const vaccinations = await service.getVaccinations(
        req.tenantId,
        req.params.healthRecordId
      );
      res.json(vaccinations);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
