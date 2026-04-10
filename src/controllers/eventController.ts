import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { EventService } from "../services/eventService";
import {
  optionalStringSchema,
  uuidSchema,
} from "../utils/validation";

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

const eventIdParamSchema = z.object({
  id: uuidSchema,
});

const listQuerySchema = z.object({
  type: optionalStringSchema,
  venue: optionalStringSchema,
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

      const filters = listQuerySchema.parse(req.query);

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
      const { id } = eventIdParamSchema.parse(req.params);
      const participant = await service.addParticipant(req.tenantId, {
        ...data,
        eventId: id,
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

      const { id } = eventIdParamSchema.parse(req.params);
      const participants = await service.getParticipants(req.tenantId, id);
      res.json(participants);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
