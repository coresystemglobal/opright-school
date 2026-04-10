import { NextFunction, Request, Response } from "express";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import { loginSchema, registerSchema, studentLoginSchema } from "../../utils/schemas";
import { AuthService } from "./service";

const service = new AuthService(prisma);

function requireTenantId(req: Request) {
  if (!req.tenantId) {
    throw new ValidationError("Tenant ID required");
  }

  return req.tenantId;
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const data = loginSchema.parse(req.body);
      const result = await service.login(tenantId, data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const data = registerSchema.parse(req.body);
      const result = await service.register(tenantId, data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async studentLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = studentLoginSchema.parse(req.body);
      const result = await service.studentLogin(data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
