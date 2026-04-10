import { Request, Response } from "express";
import { z } from "zod";
import { ParentService } from "../services/parentService";
import { parentSchema } from "../utils/schemas";
import prisma from "../prisma/client";
import { uuidSchema } from "../utils/validation";

const studentIdParamSchema = z.object({
  studentId: uuidSchema,
});

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
      const { studentId } = studentIdParamSchema.parse(req.params);
      const attendance = await ParentService.getChildAttendance(req.tenantId!, studentId);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getChildGrades(req: Request, res: Response) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const grades = await ParentService.getChildGrades(req.tenantId!, studentId);
      res.json(grades);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getChildPayments(req: Request, res: Response) {
    try {
      const { studentId } = studentIdParamSchema.parse(req.params);
      const payments = await ParentService.getChildPayments(req.tenantId!, studentId);
      res.json(payments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createParent(req: Request, res: Response) {
    try {
      const data = parentSchema.parse(req.body);
      const parent = await ParentService.createParent(req.tenantId!, data, prisma);
      res.status(201).json(parent);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
