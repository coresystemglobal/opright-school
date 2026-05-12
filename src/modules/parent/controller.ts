import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { UnauthorizedError, ValidationError } from "../../utils/errors";
import { parentSchema } from "../../utils/schemas";
import { uuidSchema } from "../../utils/validation";
import { ParentService } from "./service";

const service = new ParentService(prisma);

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

function requireTenantId(req: Request) {
  if (!req.tenantId) {
    throw new ValidationError("Tenant ID required");
  }

  return req.tenantId;
}

function requireUserId(req: Request) {
  if (!req.user?.userId) {
    throw new UnauthorizedError();
  }

  return req.user.userId;
}

export const parentController = {
  async getChildren(req: Request, res: Response, next: NextFunction) {
    try {
      const students = await service.getChildren(requireTenantId(req), requireUserId(req));
      res.json(students);
    } catch (error) {
      next(error);
    }
  },

  async getChildAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const attendance = await service.getChildAttendance(requireTenantId(req), studentId);
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  },

  async getChildGrades(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const grades = await service.getChildGrades(requireTenantId(req), studentId);
      res.json(grades);
    } catch (error) {
      next(error);
    }
  },

  async getChildPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const payments = await service.getChildPayments(requireTenantId(req), studentId);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  },

  async getChildTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const timetable = await service.getChildTimetable(requireTenantId(req), studentId);
      res.json(timetable);
    } catch (error) {
      next(error);
    }
  },

  async createParent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = parentSchema.parse(req.body);
      const parent = await service.createParent(requireTenantId(req), data);
      res.status(201).json(parent);
    } catch (error) {
      next(error);
    }
  },
};
