import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { MasterAuthService } from "./masterAuthService";
import { ServiceDenialQueue, runServiceDenialSweep } from "../../workers/serviceDenialWorker";

const service = new MasterAuthService(prisma);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

const updateTenantSchema = z.object({
  collectionEnabled: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

export const platformController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await service.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : "Login failed" });
    }
  },

  async listTenants(req: Request, res: Response) {
    try {
      const tenants = await service.listTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async updateTenant(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const data = updateTenantSchema.parse(req.body);
      const tenant = await service.updateTenant(tenantId, data);
      res.json(tenant);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async listBankAccountRequests(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const requests = await service.listBankAccountRequests(status);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async reviewBankAccountRequest(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { id } = req.params;
      const { decision, reviewNote } = reviewSchema.parse(req.body);
      const result = await service.reviewBankAccountRequest(id, req.user.userId, decision, reviewNote);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async triggerServiceDenial(req: Request, res: Response) {
    try {
      const mode = (req.query.mode as string) ?? "queue";
      if (mode === "direct") {
        const result = await runServiceDenialSweep(prisma);
        return res.json({ ok: true, mode: "direct", ...result });
      }
      await ServiceDenialQueue.publish();
      res.json({ ok: true, mode: "queued", message: "Service denial sweep queued via QStash" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },

  async scheduleServiceDenialCron(req: Request, res: Response) {
    try {
      const schedule = await ServiceDenialQueue.scheduleCron();
      res.status(201).json({ ok: true, schedule });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  },
};
