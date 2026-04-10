import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { TransportService } from "../services/transportService";

const service = new TransportService(prisma);

const createBusSchema = z.object({
  busNumber: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
  driverName: z.string().min(1),
  driverPhone: z.string().min(1).optional(),
});

const createRouteSchema = z.object({
  busId: z.string().uuid(),
  routeName: z.string().min(1),
  stops: z.unknown(),
});

const assignStudentSchema = z.object({
  routeId: z.string().uuid(),
  studentId: z.string().uuid(),
  pickupStop: z.string().min(1),
  dropStop: z.string().min(1),
});

export const transportController = {
  async createBus(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createBusSchema.parse(req.body);
      const bus = await service.createBus(req.tenantId, data);
      res.status(201).json(bus);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getBuses(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const buses = await service.getBuses(req.tenantId);
      res.json(buses);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async createRoute(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createRouteSchema.parse(req.body);
      const route = await service.createRoute(req.tenantId, {
        ...data,
        stops: data.stops as Prisma.InputJsonValue,
      });
      res.status(201).json(route);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getRoutes(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const busId = typeof req.query.busId === "string" ? req.query.busId : undefined;
      const routes = await service.getRoutes(req.tenantId, busId);
      res.json(routes);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async assignStudent(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = assignStudentSchema.parse(req.body);
      const assignment = await service.assignStudent(req.tenantId, data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getAssignments(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const studentId =
        typeof req.query.studentId === "string" ? req.query.studentId : undefined;
      const assignments = await service.getAssignments(req.tenantId, studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
