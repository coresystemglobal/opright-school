import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { FeeAccountService } from "./accountService";
import { PaystackSubaccountService } from "./paystackSubaccountService";
import { AppError } from "../../utils/errors";

const accountService = new FeeAccountService(prisma);
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
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const data = setupAccountSchema.parse(req.body);

      const account = await accountService.setupAccount(req.tenantId, { ...data });

      res.status(201).json(account);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async getAccount(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const account = await accountService.getAccount(req.tenantId);
      res.json(account);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async requestAccountChange(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const data = changeRequestSchema.parse(req.body);
      const request = await accountService.requestAccountChange(
        req.tenantId,
        req.user.userId,
        data
      );
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
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
};
