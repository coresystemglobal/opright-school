import { Request, Response } from 'express';
import { ParentService } from '../services/parentService';
import prisma from '../prisma/client';

export class ParentController {
  static async getChildren(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      const students = await ParentService.getChildren(req.tenantId!, user!.email);
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
}
