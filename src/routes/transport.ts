import { Router } from 'express';
import { TransportService } from '../services/transportService';

const router = Router();

router.post('/buses', async (req, res) => {
  try {
    const bus = await TransportService.createBus(req.tenantId!, req.body);
    res.json(bus);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/buses', async (req, res) => {
  try {
    const buses = await TransportService.getBuses(req.tenantId!);
    res.json(buses);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/routes', async (req, res) => {
  try {
    const route = await TransportService.createRoute(req.tenantId!, req.body);
    res.json(route);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/routes', async (req, res) => {
  try {
    const routes = await TransportService.getRoutes(req.tenantId!, req.query.busId as string);
    res.json(routes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const assignment = await TransportService.assignStudent(req.tenantId!, req.body);
    res.json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const assignments = await TransportService.getAssignments(req.tenantId!, req.query.studentId as string);
    res.json(assignments);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
