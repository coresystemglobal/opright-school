import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { idParamSchema, optionalStringSchema } from "../../utils/validation";
import { NoticesService } from "./service";

const service = new NoticesService(prisma);

const roleEnum = z.enum([
  "ADMIN",
  "PRINCIPAL",
  "TEACHER",
  "STAFF",
  "PARENT",
  "STUDENT",
]);

const noticeSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  targetRoles: z.array(roleEnum).optional(),
});

const noticeQuerySchema = z.object({
  role: optionalStringSchema,
});

function respondWithError(res: Response, error: unknown, status = 400) {
  if (error instanceof Error && error.message === "Notice not found") {
    return res.status(404).json({ error: error.message });
  }

  return res.status(status).json({
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

export const noticesController = {
  async create(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      if (!req.user?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = noticeSchema.parse(req.body);
      const notice = await service.create(req.tenantId, req.user.userId, data);
      res.status(201).json(notice);
    } catch (error) {
      respondWithError(res, error);
    }
  },

  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const userRole = req.user?.role;
      if (!userRole) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { role } = noticeQuerySchema.parse(req.query);
      const notices = await service.list(req.tenantId, role ?? userRole);
      res.json(notices);
    } catch (error) {
      respondWithError(res, error, 500);
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { id } = idParamSchema.parse(req.params);
      const data = noticeSchema.parse(req.body);
      const notice = await service.update(req.tenantId, id, data);
      res.json(notice);
    } catch (error) {
      respondWithError(res, error);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { id } = idParamSchema.parse(req.params);
      await service.remove(req.tenantId, id);
      res.status(204).send();
    } catch (error) {
      respondWithError(res, error, 500);
    }
  },
};
