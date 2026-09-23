import { Router, Request, Response } from 'express';
import { listEmails, createEmailDraft, sendEmail, searchAndSummarizeEmails } from '../tools/emailService.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const emails = listEmails(status as string);
    res.json({ success: true, emails });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/draft', async (req: Request, res: Response) => {
  try {
    const { to, subject, body, attachments, threadId } = req.body;
    if (!to || !subject || !body) {
      res.status(400).json({ error: 'to, subject, and body are required.' });
      return;
    }
    const result = await createEmailDraft(to, subject, body, attachments || [], threadId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { idempotencyKey } = req.body;
    const result = await sendEmail(id, idempotencyKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }
    const result = await searchAndSummarizeEmails(q);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
