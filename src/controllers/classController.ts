import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { ClassService } from "../services/classService";
import { idParamSchema, uuidSchema } from "../utils/validation";

const service = new ClassService(prisma);

const createSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1).nullable().optional(),
  teacherId: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.partial();

const enrollSchema = z.object({
  studentId: z.string().uuid(),
});

const classIdParamSchema = z.object({
  classId: uuidSchema,
});

export const classController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const classes = await service.list(req.tenantId);
      res.json(classes);
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
      const newClass = await service.create(req.tenantId, data);
      res.status(201).json(newClass);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async enrollStudent(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = enrollSchema.parse(req.body);
      const { classId } = classIdParamSchema.parse(req.params);
      const enrollment = await service.enrollStudent(
        req.tenantId,
        classId,
        data.studentId
      );
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(400).json({
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
      const updated = await service.update(req.tenantId, id, data);
      res.json(updated);
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
