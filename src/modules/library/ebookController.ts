import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import { EBookService } from "./ebookService";
import { optionalStringSchema, optionalUuidSchema, uuidSchema } from "../../utils/validation";

const service = new EBookService(prisma);

const createSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  genre: z.string().optional(),
  isbn: z.string().optional(),
  bookId: uuidSchema.optional(),
  isDownloadable: z
    .union([z.boolean(), z.string().transform((v) => v === "true")])
    .optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  genre: optionalStringSchema,
  author: optionalStringSchema,
  search: optionalStringSchema,
});

const idParamSchema = z.object({ id: uuidSchema });

const progressSchema = z.object({
  currentPage: z.coerce.number().int().min(1),
  totalPages: z.coerce.number().int().min(1).optional(),
});

function requireTenantId(req: Request) {
  if (!req.tenantId) throw new ValidationError("Tenant ID required");
  return req.tenantId;
}

function requireUserId(req: Request) {
  if (!req.user?.userId) throw new ValidationError("Authenticated user required");
  return req.user.userId;
}

export const ebookController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      if (!req.file) throw new ValidationError("No file uploaded");
      const data = createSchema.parse(req.body);
      const ebook = await service.create(tenantId, req.file, data);
      res.status(201).json(ebook);
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const filters = listQuerySchema.parse(req.query);
      const ebooks = await service.list(tenantId, filters);
      res.json(ebooks);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const ebook = await service.getById(tenantId, id);
      res.json(ebook);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const data = updateSchema.parse(req.body);
      const ebook = await service.update(tenantId, id, data);
      res.json(ebook);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      await service.delete(tenantId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async replaceFile(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      if (!req.file) throw new ValidationError("No file uploaded");
      const ebook = await service.replaceFile(tenantId, id, req.file);
      res.json(ebook);
    } catch (error) {
      next(error);
    }
  },

  async getReadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const result = await service.getReadUrl(tenantId, id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);
      const result = await service.getDownloadUrl(tenantId, id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async saveProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      const { id } = idParamSchema.parse(req.params);
      const { currentPage, totalPages } = progressSchema.parse(req.body);
      const progress = await service.saveProgress(tenantId, id, userId, currentPage, totalPages);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  },

  async getProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      const { id } = idParamSchema.parse(req.params);
      const progress = await service.getProgress(tenantId, id, userId);
      res.json(progress || { currentPage: 1 });
    } catch (error) {
      next(error);
    }
  },

  async getGenres(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const genres = await service.getGenres(tenantId);
      res.json(genres);
    } catch (error) {
      next(error);
    }
  },
};
