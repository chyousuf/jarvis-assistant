import { Router, Request, Response } from 'express';
import { listWorkspaceFiles, readWorkspaceFile, createWorkspaceFile, deleteWorkspaceFile } from '../tools/workspaceFiles.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { subDir = '' } = req.query;
    const files = await listWorkspaceFiles(subDir as string);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/content', async (req: Request, res: Response) => {
  try {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'File path query parameter is required.' });
      return;
    }

    const file = await readWorkspaceFile(path);
    res.json({ success: true, file });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { relativePath, content } = req.body;
    if (!relativePath || content === undefined) {
      res.status(400).json({ error: 'relativePath and content are required.' });
      return;
    }

    const result = await createWorkspaceFile(relativePath, content);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    const { relativePath } = req.body;
    if (!relativePath) {
      res.status(400).json({ error: 'relativePath is required.' });
      return;
    }

    const result = await deleteWorkspaceFile(relativePath);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
