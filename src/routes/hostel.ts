import { Router } from 'express';
import { HostelService } from '../services/hostelService';

const router = Router();

router.post('/rooms', async (req, res) => {
  try {
    const room = await HostelService.createRoom(req.tenantId!, req.body);
    res.json(room);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await HostelService.getRooms(req.tenantId!);
    res.json(rooms);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const assignment = await HostelService.assignStudent(req.tenantId!, req.body);
    res.json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/meal-plans', async (req, res) => {
  try {
    const plan = await HostelService.createMealPlan(req.tenantId!, req.body);
    res.json(plan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/visitors', async (req, res) => {
  try {
    const log = await HostelService.logVisitor(req.tenantId!, req.body);
    res.json(log);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/visitors/:id/checkout', async (req, res) => {
  try {
    const log = await HostelService.checkoutVisitor(req.tenantId!, req.params.id);
    res.json(log);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/visitors', async (req, res) => {
  try {
    const logs = await HostelService.getVisitors(req.tenantId!, req.query.studentId as string);
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const assignments = await HostelService.getAssignments(req.tenantId!, req.query.studentId as string);
    res.json(assignments);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/meal-plans', async (req, res) => {
  try {
    const plans = await HostelService.getMealPlans(req.tenantId!, req.query.studentId as string);
    res.json(plans);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
