import { Router, Request, Response } from 'express';
import { computerTools } from '../tools/computerTools.js';
import { AUTHORIZED_FOLDERS } from '../computer/macOSController.js';

const router = Router();

// OS & Live System Status
router.get('/status', (_req: Request, res: Response) => {
  try {
    const osStatus = computerTools.getOSStatus();
    const activeWindow = computerTools.inspectWindow();
    res.json({
      success: true,
      os: osStatus,
      activeWindow,
      authorizedFolders: AUTHORIZED_FOLDERS
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Launch Application
router.post('/open-app', async (req: Request, res: Response) => {
  try {
    const { appName } = req.body;
    if (!appName) {
      res.status(400).json({ error: 'appName is required' });
      return;
    }
    const result = await computerTools.openApp(appName);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Browser Search (YouTube, Google)
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, engine = 'google' } = req.body;
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }
    const result = await computerTools.openSearch(query, engine);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Type text into active window
router.post('/type', async (req: Request, res: Response) => {
  try {
    const { text, replace, submitWithReturn } = req.body;
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const result = await computerTools.typeText(text, { replace, submitWithReturn });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Read active content
router.get('/read', async (_req: Request, res: Response) => {
  try {
    const result = await computerTools.readActive();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Find and open file in authorized folders
router.post('/find-file', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }
    const result = await computerTools.findFile(query);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Capture Screen
router.post('/screen', (_req: Request, res: Response) => {
  try {
    const result = computerTools.captureScreen();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emergency Stop
router.post('/stop', (_req: Request, res: Response) => {
  try {
    const result = computerTools.stop();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
// Create and Save Document Workflow
router.post('/create-document', async (req: Request, res: Response) => {
  try {
    const { appName = 'TextEdit', content, filename } = req.body;
    if (!content || !filename) {
      res.status(400).json({ error: 'content and filename are required' });
      return;
    }
    const result = await computerTools.createDocument(appName, content, filename);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
