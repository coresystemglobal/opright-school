import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { TeacherService } from "../services/teacherService";

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

      const teacher = await service.getById(req.tenantId, req.params.id);
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
      const teacher = await service.update(req.tenantId, req.params.id, data);
      res.json(teacher);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      await service.delete(req.tenantId, req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
