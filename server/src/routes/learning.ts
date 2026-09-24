import { Router, Request, Response } from 'express';
import { DEFAULT_PREFERENCES, UserPreference, UserCorrection, DocumentKnowledge } from '../ai/learningService.js';

const router = Router();

// In-memory runtime cache (backed by default preferences)
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

export function getLearningStore() {
  return {
    preferences: preferencesStore,
    corrections: correctionsStore,
    documents: documentsStore
  };
}

// GET /api/learning
router.get('/', (req: Request, res: Response) => {
  const { tab = 'all' } = req.query;

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

  res.json({
    success: true,
    preferences: preferencesStore,
    corrections: correctionsStore,
    documents: documentsStore
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
      created_at: new Date().toISOString()
    };
    correctionsStore.push(newCorr);
    res.json({ success: true, item: newCorr });
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
    res.json({ success: true, item: newDoc });
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

  if (type === 'document') {
    const idx = documentsStore.findIndex(d => d.id === itemId);
    if (idx >= 0) {
      documentsStore[idx] = {
        ...documentsStore[idx],
        ...data,
        updated_at: new Date().toISOString()
      };
      res.json({ success: true, item: documentsStore[idx] });
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

  res.status(400).json({ success: false, error: 'Invalid delete request' });
});

export const learningRouter = router;
