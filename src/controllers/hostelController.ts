import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/client";
import { HostelService } from "../services/hostelService";
import {
  optionalUuidSchema,
  uuidSchema,
} from "../utils/validation";

const service = new HostelService(prisma);

const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  building: z.string().min(1),
  floor: z.coerce.number().int(),
  capacity: z.coerce.number().int().positive(),
  occupied: z.coerce.number().int().min(0).optional(),
  type: z.string().min(1),
});

const assignStudentSchema = z.object({
  roomId: z.string().uuid(),
  studentId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  bedNumber: z.string().optional(),
  status: z.string().optional(),
});

const createMealPlanSchema = z.object({
  studentId: z.string().uuid(),
  planType: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  specialDiet: z.string().optional(),
});

const logVisitorSchema = z.object({
  studentId: z.string().uuid(),
  visitorName: z.string().min(1),
  relation: z.string().min(1),
  phone: z.string().optional(),
  checkIn: z.coerce.date().optional(),
  purpose: z.string().optional(),
});

const visitorIdParamSchema = z.object({
  id: uuidSchema,
});

const studentQuerySchema = z.object({
  studentId: optionalUuidSchema,
});

export const hostelController = {
  async createRoom(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createRoomSchema.parse(req.body);
      const room = await service.createRoom(req.tenantId, data);
      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getRooms(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const rooms = await service.getRooms(req.tenantId);
      res.json(rooms);
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

  async createMealPlan(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = createMealPlanSchema.parse(req.body);
      const plan = await service.createMealPlan(req.tenantId, data);
      res.status(201).json(plan);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async logVisitor(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = logVisitorSchema.parse(req.body);
      const log = await service.logVisitor(req.tenantId, data);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async checkoutVisitor(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { id } = visitorIdParamSchema.parse(req.params);
      const log = await service.checkoutVisitor(req.tenantId, id);
      res.json(log);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getVisitors(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { studentId } = studentQuerySchema.parse(req.query);
      const logs = await service.getVisitors(req.tenantId, studentId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getAssignments(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { studentId } = studentQuerySchema.parse(req.query);
      const assignments = await service.getAssignments(req.tenantId, studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getMealPlans(req: Request, res: Response) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const { studentId } = studentQuerySchema.parse(req.query);
      const plans = await service.getMealPlans(req.tenantId, studentId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
