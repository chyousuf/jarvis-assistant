import { Router, Request, Response } from 'express';
import { getIntegrationsList } from '../tools/integrations.js';
import { getDatabase } from '../db/database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const integrations = getIntegrationsList();
    res.json({ success: true, integrations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'connected' | 'demo' | 'unavailable'

    const db = getDatabase();
    db.prepare('UPDATE integrations SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);

    res.json({ success: true, message: `Integration ${id} updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
