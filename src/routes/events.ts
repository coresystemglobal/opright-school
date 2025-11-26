import { Router } from 'express';
import { EventService } from '../services/eventService';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const event = await EventService.createEvent(req.tenantId!, req.body);
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const events = await EventService.getEvents(req.tenantId!, req.query);
    res.json(events);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const events = await EventService.getUpcoming(req.tenantId!);
    res.json(events);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/participants', async (req, res) => {
  try {
    const participant = await EventService.addParticipant(req.tenantId!, { ...req.body, eventId: req.params.id });
    res.json(participant);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/participants', async (req, res) => {
  try {
    const participants = await EventService.getParticipants(req.tenantId!, req.params.id);
    res.json(participants);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
