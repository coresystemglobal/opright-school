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
    type: z.enum(["attendance_report", "grade_report"]),
    studentId: z.string().uuid().optional(),
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
};
