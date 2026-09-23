import { Router, Request, Response } from 'express';
import { listMemories, saveMemory, deleteMemory } from '../tools/memoryTool.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const memories = await listMemories();
    res.json({ success: true, memories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { key, value, category } = req.body;
    if (!key || !value) {
      res.status(400).json({ error: 'Both key and value are required.' });
      return;
    }

    const memory = await saveMemory(key, value, category);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:idOrKey', async (req: Request, res: Response) => {
  try {
    const ok = await deleteMemory(req.params.idOrKey);
    res.json({ success: ok, message: ok ? 'Memory deleted' : 'Memory not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
