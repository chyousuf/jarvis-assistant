import {
  DEFAULT_PREFERENCES,
  DEFAULT_ROUTINES,
  UserPreference,
  UserCorrection,
  DocumentKnowledge,
  ReusableRoutine,
  chunkDocument
} from './learningService.js';
import { validateAccess } from './authService.js';

interface UserLearningStore {
  preferences: UserPreference[];
  corrections: UserCorrection[];
  routines: ReusableRoutine[];
  documents: DocumentKnowledge[];
}

// User-isolated memory partitions
const userLearningStores = new Map<string, UserLearningStore>();

export function getUserLearningStore(userId = 'owner'): UserLearningStore {
  const normalizedId = userId.trim() || 'owner';
  if (!userLearningStores.has(normalizedId)) {
    userLearningStores.set(normalizedId, {
      preferences: JSON.parse(JSON.stringify(DEFAULT_PREFERENCES)),
      corrections: [],
      routines: JSON.parse(JSON.stringify(DEFAULT_ROUTINES)),
      documents: normalizedId === 'owner' ? [
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
      ] : []
    });
  }
  return userLearningStores.get(normalizedId)!;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token, x-jarvis-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validate Access & Determine User Partition
  const auth = validateAccess(req);
  if (!auth.authorized) {
    res.status(auth.status || 401).json({
      success: false,
      error: auth.error,
      message: auth.message
    });
    return;
  }

  const store = getUserLearningStore(auth.userId);
  const { tab = 'all', id, export: exportFlag } = req.query;

  // GET: Retrieve preferences, corrections, documents, routines, or export
  if (req.method === 'GET') {
    if (exportFlag === 'json' || tab === 'export') {
      res.status(200).json({
        success: true,
        version: '1.2.0',
        userId: auth.userId,
        exportedAt: new Date().toISOString(),
        data: {
          preferences: store.preferences,
          corrections: store.corrections,
          documents: store.documents,
          routines: store.routines
        }
      });
      return;
    }

    if (tab === 'preferences') {
      res.status(200).json({ success: true, userId: auth.userId, preferences: store.preferences });
      return;
    }
    if (tab === 'corrections') {
      res.status(200).json({ success: true, userId: auth.userId, corrections: store.corrections });
      return;
    }
    if (tab === 'documents') {
      res.status(200).json({ success: true, userId: auth.userId, documents: store.documents });
      return;
    }
    if (tab === 'routines') {
      res.status(200).json({ success: true, userId: auth.userId, routines: store.routines });
      return;
    }

    res.status(200).json({
      success: true,
      userId: auth.userId,
      preferences: store.preferences,
      corrections: store.corrections,
      documents: store.documents,
      routines: store.routines
    });
    return;
  }

  // POST: Add new preference, correction, document, or routine
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }

    const { type, data } = body || {};
    if (!type || !data) {
      res.status(400).json({ success: false, error: 'Missing type or data' });
      return;
    }

    if (type === 'preference') {
      const newPref: UserPreference = {
        id: `pref-${Date.now().toString(36)}`,
        category: data.category || 'general',
        key: data.key,
        value: data.value,
        enabled: data.enabled ?? true,
        origin: 'User Added',
        updated_at: new Date().toISOString()
      };
      store.preferences.push(newPref);
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
      store.corrections.push(newCorr);
      res.status(200).json({ success: true, item: newCorr });
      return;
    }

    if (type === 'document') {
      const docContent = data.content || '';
      // Enforce 5MB limit
      if (typeof docContent === 'string' && docContent.length > 5 * 1024 * 1024) {
        res.status(400).json({ success: false, error: 'Document content exceeds 5MB size limit.' });
        return;
      }

      const docId = `doc-${Date.now().toString(36)}`;
      const docTitle = data.title || 'Untitled Document';
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
      store.documents.push(newDoc);
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
      store.routines.push(newRoutine);
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
      const idx = store.preferences.findIndex(p => p.id === itemId);
      if (idx >= 0) {
        store.preferences[idx] = {
          ...store.preferences[idx],
          ...data,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: store.preferences[idx] });
        return;
      }
    }

    if (type === 'correction') {
      const idx = store.corrections.findIndex(c => c.id === itemId);
      if (idx >= 0) {
        store.corrections[idx] = {
          ...store.corrections[idx],
          ...data
        };
        res.status(200).json({ success: true, item: store.corrections[idx] });
        return;
      }
    }

    if (type === 'document') {
      const idx = store.documents.findIndex(d => d.id === itemId);
      if (idx >= 0) {
        const updatedTitle = data.title ?? store.documents[idx].title;
        const updatedContent = data.content ?? store.documents[idx].content;
        if (typeof updatedContent === 'string' && updatedContent.length > 5 * 1024 * 1024) {
          res.status(400).json({ success: false, error: 'Document content exceeds 5MB size limit.' });
          return;
        }

        const updatedChunks = chunkDocument(itemId, updatedTitle, updatedContent);

        store.documents[idx] = {
          ...store.documents[idx],
          ...data,
          chunks: updatedChunks,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: store.documents[idx] });
        return;
      }
    }

    if (type === 'routine') {
      const idx = store.routines.findIndex(r => r.id === itemId);
      if (idx >= 0) {
        store.routines[idx] = {
          ...store.routines[idx],
          ...data,
          updated_at: new Date().toISOString()
        };
        res.status(200).json({ success: true, item: store.routines[idx] });
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
      store.preferences = store.preferences.filter(p => p.id !== targetId);
      res.status(200).json({ success: true, message: 'Preference deleted' });
      return;
    }

    if (itemType === 'corrections' || itemType === 'correction') {
      store.corrections = store.corrections.filter(c => c.id !== targetId);
      res.status(200).json({ success: true, message: 'Correction deleted' });
      return;
    }

    if (itemType === 'documents' || itemType === 'document') {
      store.documents = store.documents.filter(d => d.id !== targetId);
      res.status(200).json({ success: true, message: 'Document deleted' });
      return;
    }

    if (itemType === 'routines' || itemType === 'routine') {
      store.routines = store.routines.filter(r => r.id !== targetId);
      res.status(200).json({ success: true, message: 'Routine deleted' });
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid delete request' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
