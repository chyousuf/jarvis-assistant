import { Router, Request, Response } from 'express';
import { listCalendarEvents, checkAvailability, createCalendarEvent, confirmEventInvitations } from '../tools/calendarService.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const events = listCalendarEvents();
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'date query parameter is required' });
      return;
    }
    const availability = await checkAvailability(date);
    res.json({ success: true, availability });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { title, startTime, endTime, attendees, description, timezone } = req.body;
    if (!title || !startTime) {
      res.status(400).json({ error: 'title and startTime are required' });
      return;
    }
    const result = await createCalendarEvent(title, startTime, endTime, attendees || [], description, timezone);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:id/confirm', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = confirmEventInvitations(id);
    res.json({ success: ok, message: ok ? 'Invitations confirmed' : 'Event not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
