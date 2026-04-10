import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ValidationError } from "../../utils/errors";
import { UploadService } from "./service";

const service = new UploadService();

const keyParamSchema = z.object({
  key: z.string().min(1),
});

export const uploadController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ValidationError("No file uploaded");
      }

      if (!req.tenantId) {
        throw new ValidationError("Tenant ID required");
      }

      const result = await service.uploadFile(req.tenantId, req.file);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = keyParamSchema.parse(req.params);
      const result = await service.getSignedUrl(key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = keyParamSchema.parse(req.params);
      const result = await service.deleteFile(key);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
