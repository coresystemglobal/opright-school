import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { EventService } from "../services/eventService";

const service = new EventService(prisma);

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  venue: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

const addParticipantSchema = z.object({
  participantId: z.string().uuid(),
  participantType: z.string().min(1),
  role: z.string().optional(),
});

export const eventController = {
  async create(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createEventSchema.parse(req.body);
      const event = await service.createEvent(req.tenantId, data);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async list(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const filters = {
        type: typeof req.query.type === "string" ? req.query.type : undefined,
        venue: typeof req.query.venue === "string" ? req.query.venue : undefined,
      };

      const events = await service.getEvents(req.tenantId, filters);
      res.json(events);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getUpcoming(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const events = await service.getUpcoming(req.tenantId);
      res.json(events);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async addParticipant(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = addParticipantSchema.parse(req.body);
      const participant = await service.addParticipant(req.tenantId, {
        ...data,
        eventId: req.params.id,
      });
      res.status(201).json(participant);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getParticipants(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const participants = await service.getParticipants(req.tenantId, req.params.id);
      res.json(participants);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
