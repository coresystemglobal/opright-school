import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { CandidateService } from "../services/candidateService";

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

      const candidate = await service.getById(req.tenantId, req.params.id);
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
      const candidate = await service.update(req.tenantId, req.params.id, data);
      res.json(candidate);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async admit(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const student = await service.admit(req.tenantId, req.params.id);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
