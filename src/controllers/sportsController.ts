import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { SportsService } from "../services/sportsService";

const service = new SportsService(prisma);

const createActivitySchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  instructor: z.string().optional(),
  schedule: z.unknown().optional(),
  maxCapacity: z.coerce.number().int().positive().optional(),
});

const enrollStudentSchema = z.object({
  activityId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.string().optional(),
});

const createCompetitionSchema = z.object({
  activityId: z.string().uuid(),
  name: z.string().min(1),
  date: z.coerce.date(),
  venue: z.string().optional(),
  participants: z.unknown().optional(),
  results: z.unknown().optional(),
});

export const sportsController = {
  async createActivity(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createActivitySchema.parse(req.body);
      const activity = await service.createActivity(req.tenantId, {
        ...data,
        schedule: data.schedule as Prisma.InputJsonValue | undefined,
      });
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getActivities(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const activities = await service.getActivities(req.tenantId, type);
      res.json(activities);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async enrollStudent(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = enrollStudentSchema.parse(req.body);
      const enrollment = await service.enrollStudent(req.tenantId, data);
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async createCompetition(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createCompetitionSchema.parse(req.body);
      const competition = await service.createCompetition(req.tenantId, {
        ...data,
        participants: data.participants as Prisma.InputJsonValue | undefined,
        results: data.results as Prisma.InputJsonValue | undefined,
      });
      res.status(201).json(competition);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getCompetitions(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const activityId =
        typeof req.query.activityId === "string" ? req.query.activityId : undefined;
      const competitions = await service.getCompetitions(req.tenantId, activityId);
      res.json(competitions);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
