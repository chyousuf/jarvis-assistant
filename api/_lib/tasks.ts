import { validateAccess } from './authService.js';

interface TaskStep {
  id: string;
  name: string;
  toolName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  evidence?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  steps: TaskStep[];
  created_at: string;
  updated_at?: string;
}

const storedTasks: Task[] = [
  {
    id: 'task-init',
    title: 'JARVIS Core Diagnostics',
    description: 'Bilingual engine, context memory, and communication integrations verified.',
    status: 'completed',
    progress: 100,
    steps: [
      { id: 'stp-1', name: 'Verify Bilingual Audio Pipeline', status: 'completed', evidence: 'Urdu & English models operational' },
      { id: 'stp-2', name: 'Initialize Sandboxed Context Memory', status: 'completed', evidence: 'HMAC session boundaries enforced' },
      { id: 'stp-3', name: 'Connect Communication Engine', status: 'completed', evidence: 'Direct WhatsApp and email draft routes online' }
    ],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
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
