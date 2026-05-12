import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { ValidationError } from "../../utils/errors";
import { loginSchema, registerSchema, studentLoginSchema } from "../../utils/schemas";
import { AuthService } from "./service";

const service = new AuthService(prisma);

const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain a number"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain a number"),
});

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
      const tenantId = requireTenantId(req);
      const data = studentLoginSchema.parse(req.body);
      const result = await service.studentLogin(tenantId, data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await service.refresh(tenantId, refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { refreshToken } = refreshSchema.parse(req.body);
      await service.logout(tenantId, refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      if (!req.user?.userId) return res.status(401).json({ error: 'Authentication required' });
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await service.changePassword(tenantId, req.user.userId, currentPassword, newPassword);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = z.object({ token: z.string().min(1) }).parse(req.query);
      const result = await service.verifyEmail(token);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await service.requestPasswordReset(tenantId, email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = requireTenantId(req);
      const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
      const result = await service.verifyOtpAndResetPassword(tenantId, email, otp, newPassword);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
