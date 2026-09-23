import { Router, Request, Response } from 'express';
import { listContacts, addContact, resolveContact } from '../tools/contacts.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const contacts = listContacts();
    res.json({ success: true, contacts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, email, phone, company } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const contact = addContact(name, email, phone, company);
    res.json({ success: true, contact });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/resolve', (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }
    const resolution = resolveContact(q);
    res.json({ success: true, resolution });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
