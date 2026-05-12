import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { UnauthorizedError, ValidationError } from "../../utils/errors";
import { parentSchema } from "../../utils/schemas";
import { uuidSchema } from "../../utils/validation";
import { ParentService } from "./service";
import { ParentFeeService } from "../fees/parentFeeService";

const service = new ParentService(prisma);
const feeService = new ParentFeeService(prisma);

const studentIdParamSchema = z.object({ studentId: uuidSchema });

function requireTenantId(req: Request) {
  if (!req.tenantId) throw new ValidationError("Tenant ID required");
  return req.tenantId;
}

function requireUserId(req: Request) {
  if (!req.user?.userId) throw new UnauthorizedError();
  return req.user.userId;
}

export const parentController = {
  async getChildren(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.getChildren(requireTenantId(req), requireUserId(req)));
    } catch (error) { next(error); }
  },

  async getChildAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      res.json(await service.getChildAttendance(requireTenantId(req), studentId));
    } catch (error) { next(error); }
  },

  async getChildGrades(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      res.json(await service.getChildGrades(requireTenantId(req), studentId));
    } catch (error) { next(error); }
  },

  async getChildPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      res.json(await service.getChildPayments(requireTenantId(req), studentId));
    } catch (error) { next(error); }
  },

  async createParent(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await service.createParent(requireTenantId(req), parentSchema.parse(req.body)));
    } catch (error) { next(error); }
  },

  async getFeeSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await feeService.getChildrenFeeSummaries(requireTenantId(req), requireUserId(req)));
    } catch (error) { next(error); }
  },

  async getChildFeeDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      res.json(await feeService.getChildFeeDetails(requireTenantId(req), requireUserId(req), studentId));
    } catch (error) { next(error); }
  },

  async initiatePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { feeAssignmentId, amount, payerEmail } = z.object({
        feeAssignmentId: uuidSchema,
        amount: z.number().positive(),
        payerEmail: z.string().email(),
      }).parse(req.body);
      const invoice = await feeService.initiatePayment(
        requireTenantId(req), requireUserId(req), feeAssignmentId, amount, payerEmail
      );
      res.status(201).json(invoice);
    } catch (error) { next(error); }
  },

  async listOptInTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      res.json(await feeService.listOptInTemplates(requireTenantId(req), requireUserId(req), studentId));
    } catch (error) { next(error); }
  },

  async optIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const { feeTemplateId } = z.object({ feeTemplateId: uuidSchema }).parse(req.body);
      res.status(201).json(
        await feeService.optIn(requireTenantId(req), requireUserId(req), studentId, feeTemplateId)
      );
    } catch (error) { next(error); }
  },
};
