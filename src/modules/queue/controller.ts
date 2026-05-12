import { NextFunction, Request, Response } from "express";
import { Receiver } from "@upstash/qstash";
import { z } from "zod";
import { QueueService } from "./service";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

const service = new QueueService(receiver);

const queueHeaderSchema = z.object({
  "upstash-signature": z.string().min(1),
});

const queueBodySchema = z.object({
  tenantId: z.string().uuid(),
  payload: z.object({
    type: z.enum(["attendance_report", "grade_report", "report_card"]),
    studentId: z.string().uuid().optional(),
    termId: z.string().uuid().optional(),
    userId: z.string().optional(),
  }).passthrough(),
});

export const queueController = {
  async processReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { ["upstash-signature"]: signature } = queueHeaderSchema.parse(req.headers);
      const body = JSON.stringify(req.body);
      const { tenantId, payload } = queueBodySchema.parse(req.body);
      const result = await service.processReport(signature, body, tenantId, payload);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async requestReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { ReportQueue } = await import("../../workers/reportWorker");
      const { type, studentId, termId } = z.object({
        type: z.enum(["attendance_report", "grade_report", "report_card"]),
        studentId: z.string().uuid(),
        termId: z.string().uuid().optional(),
      }).parse(req.body);

      const tenantId = req.tenantId ?? req.body.tenantId;
      const userId = req.user?.userId;

      await ReportQueue.publish(tenantId, { type, studentId, termId, userId });
      res.json({ queued: true, message: "Report generation started. You'll be notified when it's ready." });
    } catch (error) {
      next(error);
    }
  },
};
