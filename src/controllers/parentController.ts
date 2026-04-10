import { Request, Response } from "express";
import { ParentService } from "../services/parentService";
import { validate } from "../middleware/validate";
import { parentSchema } from "../utils/schemas";
import prisma from "../prisma/client";

export class ParentController {
  static async getChildren(req: Request, res: Response) {
    try {
      const students = await ParentService.getChildren(req.tenantId!, req.user!.userId);
      res.json(students);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getChildAttendance(req: Request, res: Response) {
    try {
      const attendance = await ParentService.getChildAttendance(req.tenantId!, req.params.studentId);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getChildGrades(req: Request, res: Response) {
    try {
      const grades = await ParentService.getChildGrades(req.tenantId!, req.params.studentId);
      res.json(grades);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getChildPayments(req: Request, res: Response) {
    try {
      const payments = await ParentService.getChildPayments(req.tenantId!, req.params.studentId);
      res.json(payments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createParent(req: Request, res: Response) {
    try {
      const parsed = parentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const parent = await ParentService.createParent(req.tenantId!, parsed.data, prisma);
      res.status(201).json(parent);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
