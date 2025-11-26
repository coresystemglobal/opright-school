import { Router } from 'express';
import { SportsService } from '../services/sportsService';

const router = Router();

router.post('/activities', async (req, res) => {
  try {
    const activity = await SportsService.createActivity(req.tenantId!, req.body);
    res.json(activity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/activities', async (req, res) => {
  try {
    const activities = await SportsService.getActivities(req.tenantId!, req.query.type as string);
    res.json(activities);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/enrollments', async (req, res) => {
  try {
    const enrollment = await SportsService.enrollStudent(req.tenantId!, req.body);
    res.json(enrollment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/competitions', async (req, res) => {
  try {
    const competition = await SportsService.createCompetition(req.tenantId!, req.body);
    res.json(competition);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/competitions', async (req, res) => {
  try {
    const competitions = await SportsService.getCompetitions(req.tenantId!, req.query.activityId as string);
    res.json(competitions);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
