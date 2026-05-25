import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { SettingsService } from "./service";

const service = new SettingsService(prisma);

export const settingsController = {
  async get(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const settings = await service.get(req.tenantId);
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });
      const settings = await service.update(req.tenantId, req.body);
      res.json(settings);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },
};
