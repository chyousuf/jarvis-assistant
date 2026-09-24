import { Router, Request, Response } from 'express';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_ROUTINES,
  UserPreference,
  UserCorrection,
  DocumentKnowledge,
  ReusableRoutine,
  chunkDocument
} from '../ai/learningService.js';

const router = Router();

// In-memory runtime cache (backed by default preferences & routines)
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

export function getLearningStore() {
  return {
    preferences: preferencesStore,
    corrections: correctionsStore,
    documents: documentsStore,
    routines: routinesStore
  };
}

// GET /api/learning
router.get('/', (req: Request, res: Response) => {
  const { tab = 'all', export: exportFlag } = req.query;

  if (exportFlag === 'json' || tab === 'export') {
    res.json({
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
    res.json({ success: true, preferences: preferencesStore });
    return;
  }
  if (tab === 'corrections') {
    res.json({ success: true, corrections: correctionsStore });
    return;
  }
  if (tab === 'documents') {
    res.json({ success: true, documents: documentsStore });
    return;
  }
  if (tab === 'routines') {
    res.json({ success: true, routines: routinesStore });
    return;
  }

  res.json({
    success: true,
    preferences: preferencesStore,
    corrections: correctionsStore,
    documents: documentsStore,
    routines: routinesStore
  });
});

// POST /api/learning
router.post('/', (req: Request, res: Response) => {
  const { type, data } = req.body || {};

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
    res.json({ success: true, item: newPref });
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
    res.json({ success: true, item: newCorr });
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
    res.json({ success: true, item: newDoc });
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
    res.json({ success: true, item: newRoutine });
    return;
  }

  res.status(400).json({ success: false, error: 'Invalid item type' });
});

// PUT /api/learning
router.put('/', (req: Request, res: Response) => {
  const { type, id: itemId, data } = req.body || {};

  if (type === 'preference') {
    const idx = preferencesStore.findIndex(p => p.id === itemId);
    if (idx >= 0) {
      preferencesStore[idx] = {
        ...preferencesStore[idx],
        ...data,
        updated_at: new Date().toISOString()
      };
      res.json({ success: true, item: preferencesStore[idx] });
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
      res.json({ success: true, item: correctionsStore[idx] });
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
      res.json({ success: true, item: documentsStore[idx] });
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
      res.json({ success: true, item: routinesStore[idx] });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Item not found' });
});

// DELETE /api/learning
router.delete('/', (req: Request, res: Response) => {
  const targetId = (req.query.id as string) || req.body?.id;
  const itemType = (req.query.tab as string) || req.body?.type;

  if (itemType === 'preferences' || itemType === 'preference') {
    preferencesStore = preferencesStore.filter(p => p.id !== targetId);
    res.json({ success: true, message: 'Preference deleted' });
    return;
  }

  if (itemType === 'corrections' || itemType === 'correction') {
    correctionsStore = correctionsStore.filter(c => c.id !== targetId);
    res.json({ success: true, message: 'Correction deleted' });
    return;
  }

  if (itemType === 'documents' || itemType === 'document') {
    documentsStore = documentsStore.filter(d => d.id !== targetId);
    res.json({ success: true, message: 'Document deleted' });
    return;
  }

  if (itemType === 'routines' || itemType === 'routine') {
    routinesStore = routinesStore.filter(r => r.id !== targetId);
    res.json({ success: true, message: 'Routine deleted' });
    return;
  }

  res.status(400).json({ success: false, error: 'Invalid delete request' });
});

export const learningRouter = router;
