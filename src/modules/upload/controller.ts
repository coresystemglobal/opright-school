import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "../../utils/errors";
import { UPLOAD_DOMAINS, UploadService } from "./service";

const service = new UploadService();
const multipartPartNumberSchema = z.coerce.number().int().min(1).max(10_000);

const keyParamSchema = z.object({
  key: z.string().min(1),
});

const uploadBodySchema = z.object({
  domain: z.enum(UPLOAD_DOMAINS),
  entityId: z.string().trim().min(1),
});

const largeVideoUploadBodySchema = uploadBodySchema.extend({
  fileName: z.string().trim().min(1),
  contentType: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.toLowerCase().startsWith("video/"), "Only video uploads are supported"),
  fileSize: z.coerce.number().int().positive().optional(),
});

const largeVideoUploadPartQuerySchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().trim().min(1),
  partNumber: multipartPartNumberSchema,
});

const largeVideoUploadPartSchema = z.object({
  etag: z.string().trim().min(1),
  partNumber: multipartPartNumberSchema,
});

const completeLargeVideoUploadBodySchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().trim().min(1),
  parts: z.array(largeVideoUploadPartSchema).min(1),
});

const abortLargeVideoUploadBodySchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().trim().min(1),
});

export const uploadController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ValidationError("No file uploaded");
      }

      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const { domain, entityId } = uploadBodySchema.parse(req.body);
      const result = await service.uploadFile(req.tenantId, req.file, domain, entityId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const { key } = keyParamSchema.parse({
        key: req.query.key ?? req.params.key,
      });
      const result = await service.getSignedUrl(req.tenantId, key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async createLargeVideoUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const payload = largeVideoUploadBodySchema.parse(req.body);
      const result = await service.createLargeVideoUpload(req.tenantId, payload);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getLargeVideoUploadPartUrl(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const { key, uploadId, partNumber } = largeVideoUploadPartQuerySchema.parse(req.query);
      const result = await service.getLargeVideoUploadPartUrl(
        req.tenantId,
        key,
        uploadId,
        partNumber
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async completeLargeVideoUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const payload = completeLargeVideoUploadBodySchema.parse(req.body);
      const result = await service.completeLargeVideoUpload(req.tenantId, payload);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async abortLargeVideoUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const { key, uploadId } = abortLargeVideoUploadBodySchema.parse(req.body);
      const result = await service.abortLargeVideoUpload(req.tenantId, key, uploadId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new ValidationError("School(Tenant) ID required");
      }

      const { key } = keyParamSchema.parse({
        key: req.query.key ?? req.params.key,
      });
      const result = await service.deleteFile(req.tenantId, key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
