import {
  DEFAULT_PREFERENCES,
  DEFAULT_ROUTINES,
  UserPreference,
  UserCorrection,
  DocumentKnowledge,
  ReusableRoutine,
  chunkDocument
} from './learningService.js';

// In-memory fallback storage for serverless runtime
let preferencesStore: UserPreference[] = [...DEFAULT_PREFERENCES];
let correctionsStore: UserCorrection[] = [];
let routinesStore: ReusableRoutine[] = [...DEFAULT_ROUTINES];
let documentsStore: DocumentKnowledge[] = [
  {
    id: 'doc-welcome',
    title: 'JARVIS System Architecture & Directives',
    content: 'J.A.R.V.I.S. (Just A Rather Very Intelligent System) is engineered for autonomous desktop automation, context-aware reasoning, and personal productivity. Built with privacy-first principles and bounded tool execution.\n\nAll tools require verified user consent for external communications and destructive local changes. Grounded knowledge retrieval enforces strict untrusted evidence boundaries.',
    fileType: 'md',
    tags: ['system', 'architecture', 'directives'],
    chunks: chunkDocument(
      'doc-welcome',
      'JARVIS System Architecture & Directives',
      'J.A.R.V.I.S. (Just A Rather Very Intelligent System) is engineered for autonomous desktop automation, context-aware reasoning, and personal productivity. Built with privacy-first principles and bounded tool execution.\n\nAll tools require verified user consent for external communications and destructive local changes. Grounded knowledge retrieval enforces strict untrusted evidence boundaries.'
    ),
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

  const { tab = 'all', id, export: exportFlag } = req.query;

  // GET: Retrieve preferences, corrections, documents, routines, or export
  if (req.method === 'GET') {
    if (exportFlag === 'json' || tab === 'export') {
      res.status(200).json({
        success: true,
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        data: {
          preferences: preferencesStore,
          corrections: correctionsStore,
          documents: documentsStore,
          routines: routinesStore
        }
      });
      return;
    }

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
    if (tab === 'routines') {
      res.status(200).json({ success: true, routines: routinesStore });
      return;
    }

    res.status(200).json({
      success: true,
      preferences: preferencesStore,
      corrections: correctionsStore,
      documents: documentsStore,
      routines: routinesStore
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
        scope: data.scope || 'reusable',
        conversationId: data.conversationId,
        tags: Array.isArray(data.tags) ? data.tags : [],
        created_at: new Date().toISOString()
      };
      correctionsStore.push(newCorr);
      res.status(200).json({ success: true, item: newCorr });
      return;
    }

    if (type === 'document') {
      const docId = `doc-${Date.now().toString(36)}`;
      const docTitle = data.title || 'Untitled Document';
      const docContent = data.content || '';
      const chunks = chunkDocument(docId, docTitle, docContent);

      const newDoc: DocumentKnowledge = {
        id: docId,
        title: docTitle,
        content: docContent,
        fileType: data.fileType || 'txt',
        fileSize: data.fileSize || docContent.length,
        tags: Array.isArray(data.tags) ? data.tags : [],
        chunks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      documentsStore.push(newDoc);
      res.status(200).json({ success: true, item: newDoc });
      return;
    }

    if (type === 'routine') {
      const newRoutine: ReusableRoutine = {
        id: `routine-${Date.now().toString(36)}`,
        name: data.name,
        description: data.description || '',
        inputs: data.inputs || {},
        steps: Array.isArray(data.steps) ? data.steps : [],
        requiredConnections: Array.isArray(data.requiredConnections) ? data.requiredConnections : [],
        requiredPermissions: Array.isArray(data.requiredPermissions) ? data.requiredPermissions : [],
        schedule: data.schedule || { enabled: false, timezone: 'Asia/Karachi' },
        enabled: data.enabled ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      routinesStore.push(newRoutine);
      res.status(200).json({ success: true, item: newRoutine });
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

    if (type === 'correction') {
      const idx = correctionsStore.findIndex(c => c.id === itemId);
      if (idx >= 0) {
        correctionsStore[idx] = {
          ...correctionsStore[idx],
          ...data
        };
        res.status(200).json({ success: true, item: correctionsStore[idx] });
        return;
      }
    }

    if (type === 'document') {
      const idx = documentsStore.findIndex(d => d.id === itemId);
      if (idx >= 0) {
        const updatedTitle = data.title ?? documentsStore[idx].title;
        const updatedContent = data.content ?? documentsStore[idx].content;
        const updatedChunks = chunkDocument(itemId, updatedTitle, updatedContent);

        documentsStore[idx] = {
          ...documentsStore[idx],
          ...data,
          chunks: updatedChunks,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: documentsStore[idx] });
        return;
      }
    }

    if (type === 'routine') {
      const idx = routinesStore.findIndex(r => r.id === itemId);
      if (idx >= 0) {
        routinesStore[idx] = {
          ...routinesStore[idx],
          ...data,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: routinesStore[idx] });
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

    if (itemType === 'routines' || itemType === 'routine') {
      routinesStore = routinesStore.filter(r => r.id !== targetId);
      res.status(200).json({ success: true, message: 'Routine deleted' });
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid delete request' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
