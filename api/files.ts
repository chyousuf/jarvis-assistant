import { validateAccess } from './authService.js';

interface WorkspaceFile {
  name: string;
  size: number;
  updated_at: string;
  is_directory: boolean;
}

const storedFiles: WorkspaceFile[] = [
  {
    name: 'strategy_review.md',
    size: 1420,
    updated_at: new Date().toISOString(),
    is_directory: false
  },
  {
    name: 'architecture_spec.md',
    size: 2840,
    updated_at: new Date().toISOString(),
    is_directory: false
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

  res.status(200).json({ success: true, files: storedFiles });
}
