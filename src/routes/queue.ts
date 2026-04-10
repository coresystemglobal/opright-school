import { Router } from 'express';
import { Receiver } from '@upstash/qstash';
import { z } from 'zod';
import { handleReportJob } from '../workers/reportWorker';

const router = Router();

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

const queueHeaderSchema = z.object({
  'upstash-signature': z.string().min(1),
});

const queueBodySchema = z.object({
  tenantId: z.string().uuid(),
  payload: z.object({
    type: z.enum(['attendance_report', 'grade_report']),
    studentId: z.string().uuid().optional(),
  }).passthrough(),
});

router.post('/reports', async (req, res, next) => {
  try {
    const { ['upstash-signature']: signature } = queueHeaderSchema.parse(req.headers);
    const body = JSON.stringify(req.body);

    await receiver.verify({ signature, body });

    const { tenantId, payload } = queueBodySchema.parse(req.body);
    await handleReportJob(tenantId, payload);

    res.status(200).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
