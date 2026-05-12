import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { FeeAccountService } from "./accountService";
import { FeeTemplateService } from "./templateService";
import { FeeAssignmentService } from "./assignmentService";
import { PaystackSubaccountService } from "./paystackSubaccountService";
import { AppError } from "../../utils/errors";
import { idParamSchema } from "../../utils/validation";

const accountService = new FeeAccountService(prisma);
const templateService = new FeeTemplateService(prisma);
const assignmentService = new FeeAssignmentService(prisma);
const subaccountSvc = new PaystackSubaccountService();

const setupAccountSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(10).max(10),
  commissionPercent: z.number().min(0).max(20),
  currency: z.string().length(3).optional(),
});

const changeRequestSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(10).max(10),
});

const categoryEnum = z.enum(["TUITION", "TRANSPORT", "EXAM", "LIBRARY", "SPORTS", "HOSTEL", "MEAL", "OTHER"]);
const targetTypeEnum = z.enum(["ALL", "CLASS", "TERM", "ACADEMIC_YEAR", "OPT_IN"]);

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: categoryEnum,
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  targetType: targetTypeEnum,
  targetIds: z.array(z.string().uuid()).optional(),
  isOptIn: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  allowInstallments: z.boolean().optional(),
  minimumInstallmentPercent: z.number().min(1).max(100).optional(),
  dueDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  gracePeriodDays: z.number().int().min(0).optional(),
  academicYearId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
});

const updateTemplateSchema = createTemplateSchema
  .omit({ category: true, targetType: true })
  .partial();

const waiveSchema = z.object({
  reason: z.string().min(1),
});

function handleError(res: Response, error: unknown) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }
  return res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
}

export const feesController = {
  async listBanks(req: Request, res: Response) {
    try {
      const currency = (req.query.currency as string) ?? "NGN";
      const banks = await subaccountSvc.listBanks(currency);
      res.json(banks);
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Failed to fetch banks" });
    }
  },

  async verifyAccount(req: Request, res: Response) {
    try {
      const accountNumber = req.query.accountNumber as string;
      const bankCode = req.query.bankCode as string;
      if (!accountNumber || !bankCode) {
        return res.status(400).json({ error: "accountNumber and bankCode are required" });
      }
      const result = await subaccountSvc.resolveAccount(accountNumber, bankCode);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Account verification failed" });
    }
  },

  async setupAccount(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const data = setupAccountSchema.parse(req.body);
      const account = await accountService.setupAccount(req.tenantId, { ...data });
      res.status(201).json(account);
    } catch (error) {
      handleError(res, error);
    }
  },

  async getAccount(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const account = await accountService.getAccount(req.tenantId);
      res.json(account);
    } catch (error) {
      handleError(res, error);
    }
  },

  async requestAccountChange(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const data = changeRequestSchema.parse(req.body);
      const request = await accountService.requestAccountChange(req.tenantId, req.user.userId, data);
      res.status(201).json(request);
    } catch (error) {
      handleError(res, error);
    }
  },

  async getChangeRequests(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const requests = await accountService.getChangeRequests(req.tenantId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async createTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const data = createTemplateSchema.parse(req.body);
      const template = await templateService.create(req.tenantId, data);
      res.status(201).json(template);
    } catch (error) {
      handleError(res, error);
    }
  },

  async listTemplates(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const templates = await templateService.list(req.tenantId, {
        category: req.query.category as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === "true" : undefined,
        academicYearId: req.query.academicYearId as string | undefined,
        termId: req.query.termId as string | undefined,
      });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const template = await templateService.getById(req.tenantId, id);
      res.json(template);
    } catch (error) {
      handleError(res, error);
    }
  },

  async updateTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const data = updateTemplateSchema.parse(req.body);
      const template = await templateService.update(req.tenantId, id, data);
      res.json(template);
    } catch (error) {
      handleError(res, error);
    }
  },

  async deactivateTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      await templateService.deactivate(req.tenantId, id);
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  },

  async assignTemplate(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { id } = idParamSchema.parse(req.params);
      const result = await assignmentService.generateAssignments(req.tenantId, id);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  },

  async listAssignments(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const assignments = await assignmentService.listAssignments(req.tenantId, {
        studentId: req.query.studentId as string | undefined,
        feeTemplateId: req.query.feeTemplateId as string | undefined,
        status: req.query.status as string | undefined,
        classId: req.query.classId as string | undefined,
      });
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async waiveAssignment(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      const { reason } = waiveSchema.parse(req.body);
      const assignment = await assignmentService.waiveAssignment(req.tenantId, id, req.user.userId, reason);
      res.json(assignment);
    } catch (error) {
      handleError(res, error);
    }
  },

  async getStudentFeeSummary(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const { studentId } = req.params;
      const summary = await assignmentService.getStudentSummary(req.tenantId, studentId);
      res.json(summary);
    } catch (error) {
      handleError(res, error);
    }
  },
};
