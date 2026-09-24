import { DEFAULT_PREFERENCES, UserPreference, UserCorrection, DocumentKnowledge } from './learningService.js';

// In-memory fallback storage for serverless runtime
let preferencesStore: UserPreference[] = [...DEFAULT_PREFERENCES];
let correctionsStore: UserCorrection[] = [];
let documentsStore: DocumentKnowledge[] = [
  {
    id: 'doc-welcome',
    title: 'JARVIS System Architecture & Directives',
    content: 'J.A.R.V.I.S. (Just A Rather Very Intelligent System) is engineered for autonomous desktop automation, context-aware reasoning, and personal productivity. Built with privacy-first principles and bounded tool execution.',
    tags: ['system', 'architecture', 'directives'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Passcode Protection if configured
  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
  if (serverPasscode) {
    const providedPasscode = req.headers['x-jarvis-passcode'] || req.query?.passcode;
    if (providedPasscode !== serverPasscode) {
      res.status(401).json({
        success: false,
        error: 'PASSCODE_REQUIRED',
        message: 'Access passcode required to access learning center.'
      });
      return;
    }
  }

  const { tab = 'all', id } = req.query;

  // GET: Retrieve preferences, corrections, or documents
  if (req.method === 'GET') {
    if (tab === 'preferences') {
      res.status(200).json({ success: true, preferences: preferencesStore });
      return;
    }
    if (tab === 'corrections') {
      res.status(200).json({ success: true, corrections: correctionsStore });
      return;
    }
    if (tab === 'documents') {
      res.status(200).json({ success: true, documents: documentsStore });
      return;
    }

    res.status(200).json({
      success: true,
      preferences: preferencesStore,
      corrections: correctionsStore,
      documents: documentsStore
    });
    return;
  }

  // POST: Add new item
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }

    const { type, data } = body || {};

    if (type === 'preference') {
      const newPref: UserPreference = {
        id: `pref-${Date.now().toString(36)}`,
        category: data.category || 'general',
        key: data.key,
        value: data.value,
        enabled: data.enabled ?? true,
        origin: data.origin || 'User Added',
        updated_at: new Date().toISOString()
      };
      preferencesStore.push(newPref);
      res.status(200).json({ success: true, item: newPref });
      return;
    }

    if (type === 'correction') {
      const newCorr: UserCorrection = {
        id: `corr-${Date.now().toString(36)}`,
        originalRequest: data.originalRequest,
        incorrectInterpretation: data.incorrectInterpretation,
        approvedCorrection: data.approvedCorrection,
        created_at: new Date().toISOString()
      };
      correctionsStore.push(newCorr);
      res.status(200).json({ success: true, item: newCorr });
      return;
    }

    if (type === 'document') {
      const newDoc: DocumentKnowledge = {
        id: `doc-${Date.now().toString(36)}`,
        title: data.title,
        content: data.content,
        tags: Array.isArray(data.tags) ? data.tags : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      documentsStore.push(newDoc);
      res.status(200).json({ success: true, item: newDoc });
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid item type' });
    return;
  }

  // PUT: Update an existing item (e.g. toggle enable/disable)
  if (req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }

    const { type, id: itemId, data } = body || {};

    if (type === 'preference') {
      const idx = preferencesStore.findIndex(p => p.id === itemId);
      if (idx >= 0) {
        preferencesStore[idx] = {
          ...preferencesStore[idx],
          ...data,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: preferencesStore[idx] });
        return;
      }
    }

    if (type === 'document') {
      const idx = documentsStore.findIndex(d => d.id === itemId);
      if (idx >= 0) {
        documentsStore[idx] = {
          ...documentsStore[idx],
          ...data,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: documentsStore[idx] });
        return;
      }
    }

    res.status(404).json({ success: false, error: 'Item not found' });
    return;
  }

  // DELETE: Delete an item
  if (req.method === 'DELETE') {
    const targetId = id || req.body?.id;
    const itemType = tab || req.body?.type;

    if (itemType === 'preferences' || itemType === 'preference') {
      preferencesStore = preferencesStore.filter(p => p.id !== targetId);
      res.status(200).json({ success: true, message: 'Preference deleted' });
      return;
    }

    if (itemType === 'corrections' || itemType === 'correction') {
      correctionsStore = correctionsStore.filter(c => c.id !== targetId);
      res.status(200).json({ success: true, message: 'Correction deleted' });
      return;
    }

    if (itemType === 'documents' || itemType === 'document') {
      documentsStore = documentsStore.filter(d => d.id !== targetId);
      res.status(200).json({ success: true, message: 'Document deleted' });
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid delete request' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
