import { Router, Request, Response } from 'express';
import { listWhatsAppMessages, prepareWhatsAppMessage, sendWhatsAppMessage, updateWhatsAppDeliveryStatus } from '../tools/whatsappService.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const messages = listWhatsAppMessages(status as string);
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prepare', async (req: Request, res: Response) => {
  try {
    const { recipient, message, templateName } = req.body;
    if (!recipient || !message) {
      res.status(400).json({ error: 'recipient and message are required.' });
      return;
    }
    const result = await prepareWhatsAppMessage(recipient, message, templateName);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await sendWhatsAppMessage(id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Meta Webhook Verification (GET)
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === 'jarvis_meta_secret') {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Meta Webhook Delivery Events (POST)
router.post('/webhook', (req: Request, res: Response) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const statuses = changes?.value?.statuses;

    if (statuses && statuses.length > 0) {
      const statusObj = statuses[0];
      const wamid = statusObj.id;
      const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
      updateWhatsAppDeliveryStatus(wamid, status);
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch {
    res.sendStatus(500);
  }
});

export default router;
