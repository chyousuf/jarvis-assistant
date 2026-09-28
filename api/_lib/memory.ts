import { validateAccess } from './authService.js';

interface Memory {
  id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
}

const storedMemories: Memory[] = [
  {
    id: 'mem-1',
    key: 'preferred_language',
    value: 'Urdu and English bilingual support',
    category: 'preference',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'mem-2',
    key: 'assistant_role',
    value: 'Tony Stark inspired JARVIS with high precision and speed',
    category: 'preference',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
  const path = url.split('?')[0].replace(/^\/api\/memory\/?/, '');

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const { key, value, category } = body || {};
    if (!key || !value) {
      res.status(400).json({ success: false, error: 'key and value are required' });
      return;
    }
    const id = `mem-${Date.now().toString(36)}`;
    const newMem: Memory = {
      id,
      key,
      value,
      category: category || 'preference',
      created_at: new Date().toISOString()
    };
    storedMemories.push(newMem);
    res.status(200).json({ success: true, memory: newMem });
    return;
  }

  if (req.method === 'DELETE') {
    const idOrKey = decodeURIComponent(path);
    const idx = storedMemories.findIndex(m => m.id === idOrKey || m.key === idOrKey);
    if (idx !== -1) {
      storedMemories.splice(idx, 1);
    }
    res.status(200).json({ success: true, message: 'Memory removed.' });
    return;
  }

  res.status(200).json({ success: true, memories: storedMemories });
}
