import { Router } from 'express';
import { HealthService } from '../services/healthService';

const router = Router();

router.post('/records', async (req, res) => {
  try {
    const record = await HealthService.createHealthRecord(req.tenantId!, req.body);
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/records/:studentId', async (req, res) => {
  try {
    const record = await HealthService.getHealthRecord(req.tenantId!, req.params.studentId);
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/records/:studentId', async (req, res) => {
  try {
    const record = await HealthService.updateHealthRecord(req.tenantId!, req.params.studentId, req.body);
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/incidents', async (req, res) => {
  try {
    const incident = await HealthService.recordIncident(req.tenantId!, req.body);
    res.json(incident);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/incidents/:healthRecordId', async (req, res) => {
  try {
    const incidents = await HealthService.getIncidents(req.tenantId!, req.params.healthRecordId);
    res.json(incidents);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/vaccinations', async (req, res) => {
  try {
    const vaccination = await HealthService.recordVaccination(req.tenantId!, req.body);
    res.json(vaccination);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/vaccinations/:healthRecordId', async (req, res) => {
  try {
    const vaccinations = await HealthService.getVaccinations(req.tenantId!, req.params.healthRecordId);
    res.json(vaccinations);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
