import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { StudentService } from "../services/studentService";
import { idParamSchema } from "../utils/validation";

const service = new StudentService(prisma);

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.coerce.date().optional(),
  guardian: z.record(z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

export const studentController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const students = await service.list(req.tenantId);
      res.json(students);
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
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { id } = idParamSchema.parse(req.params);
      await service.delete(req.tenantId, id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
