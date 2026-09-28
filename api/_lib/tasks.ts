import { validateAccess } from './authService.js';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  created_at: string;
}

const storedTasks: Task[] = [
  {
    id: 'task-init',
    title: 'JARVIS Core Diagnostics',
    description: 'Bilingual engine, context memory, and communication integrations verified.',
    status: 'completed',
    progress: 100,
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token, x-jarvis-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const auth = validateAccess(req);
  if (!auth.authorized) {
    res.status(auth.status || 401).json({ success: false, error: auth.error, message: auth.message });
    return;
  }

  const url = req.url || '';
  const path = url.split('?')[0].replace(/^\/api\/tasks\/?/, '');

  if (path.startsWith('approvals/pending')) {
    res.status(200).json({ success: true, approvals: [] });
    return;
  }

  res.status(200).json({ success: true, tasks: storedTasks });
}
