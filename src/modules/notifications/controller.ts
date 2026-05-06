import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/client";
import { NotificationModuleService } from "./service";

const service = new NotificationModuleService(prisma);

const idsSchema = z.object({ ids: z.array(z.string().uuid()) });

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const notificationController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const unreadOnly = req.query.unread === "true";
      const notifications = await service.list(req.tenantId, req.user.userId, { unreadOnly });
      res.json(notifications);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async unreadCount(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const count = await service.unreadCount(req.tenantId, req.user.userId);
      res.json({ count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async markRead(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const { ids } = idsSchema.parse(req.body);
      await service.markRead(req.tenantId, req.user.userId, ids);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async markAllRead(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      await service.markAllRead(req.tenantId, req.user.userId);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async subscribe(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const sub = subscribeSchema.parse(req.body);
      await service.subscribe(req.tenantId, req.user.userId, sub);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async unsubscribe(req: Request, res: Response) {
    try {
      if (!req.tenantId || !req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
      const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
      await service.unsubscribe(req.tenantId, req.user.userId, endpoint);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async vapidPublicKey(_req: Request, res: Response) {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || "" });
  },
};
