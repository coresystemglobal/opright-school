import { Request, Response } from "express";
import { AuditService } from "./service";

const service = new AuditService();

export const auditController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) return res.status(400).json({ error: "Tenant ID required" });

      const { userId, action, entity, from, to, page, limit } = req.query;
      const result = await service.list(req.tenantId, {
        userId: userId as string | undefined,
        action: action as string | undefined,
        entity: entity as string | undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
};
