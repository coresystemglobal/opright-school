import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { PlatformService } from "./service";

const service = new PlatformService(prisma);

export const platformController = {
  async listTenants(req: Request, res: Response) {
    try {
      const { page, limit, search } = req.query;
      const result = await service.listTenants({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string | undefined,
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async getTenant(req: Request, res: Response) {
    try {
      const tenant = await service.getTenant(req.params.id);
      res.json(tenant);
    } catch (e: any) {
      res.status(404).json({ error: e.message });
    }
  },

  async stats(req: Request, res: Response) {
    try {
      const stats = await service.platformStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
};
