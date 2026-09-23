import { Router, Request, Response } from 'express';
import { listTasks, getTask, cancelTask } from '../tasks/taskRunner.js';
import { listApprovals, resolveApproval } from '../tasks/approvalManager.js';

const router = Router();

/**
 * List tasks
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const tasks = listTasks(status as string);
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get single task
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const task = getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Cancel running or pending task
 */
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const ok = cancelTask(req.params.id);
    res.json({ success: ok, message: ok ? 'Task cancelled' : 'Task not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * List approvals
 */
router.get('/approvals/pending', (req: Request, res: Response) => {
  try {
    const pending = listApprovals('pending');
    res.json({ success: true, approvals: pending });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Resolve an approval (approve or reject)
 */
router.post('/approvals/:id/resolve', (req: Request, res: Response) => {
  try {
    const { decision } = req.body;
    if (decision !== 'approved' && decision !== 'rejected') {
      res.status(400).json({ error: 'Decision must be "approved" or "rejected".' });
      return;
    }

    const ok = resolveApproval(req.params.id, decision);
    res.json({ success: ok, message: `Approval marked as ${decision}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
