import { Router } from 'express';
import { DisciplinaryService } from '../services/disciplinaryService';

const router = Router();

router.post('/records', async (req, res) => {
  try {
    const record = await DisciplinaryService.createRecord(req.tenantId!, req.body);
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const records = await DisciplinaryService.getRecords(
      req.tenantId!,
      req.query.studentId as string,
      req.query.status as string
    );
    res.json(records);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/records/:id', async (req, res) => {
  try {
    const record = await DisciplinaryService.updateRecord(req.tenantId!, req.params.id, req.body);
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await DisciplinaryService.getStats(req.tenantId!);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
