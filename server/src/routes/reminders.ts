import { Router, Request, Response } from 'express';
import { createReminder, listReminders, cancelReminder } from '../tools/reminders.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const reminders = await listReminders(status as any);
    res.json({ success: true, reminders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, dueAt } = req.body;
    if (!title || !dueAt) {
      res.status(400).json({ error: 'Title and dueAt are required.' });
      return;
    }

    const reminder = await createReminder(title, dueAt);
    res.json({ success: true, reminder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ok = await cancelReminder(req.params.id);
    res.json({ success: ok, message: ok ? 'Reminder cancelled' : 'Reminder not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
