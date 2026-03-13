import { Router } from 'express';
import { Receiver } from '@upstash/qstash';
import { handleReportJob } from '../workers/reportWorker';

const router = Router();

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

router.post('/reports', async (req, res, next) => {
  try {
    const signature = req.headers['upstash-signature'] as string;
    const body = JSON.stringify(req.body);

    await receiver.verify({ signature, body });

    const { tenantId, payload } = req.body;
    await handleReportJob(tenantId, payload);

    res.status(200).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
