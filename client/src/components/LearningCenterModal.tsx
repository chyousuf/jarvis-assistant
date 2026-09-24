import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sliders,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  Tag,
  ShieldCheck,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import {
  api,
  UserPreference,
  UserCorrection,
  DocumentKnowledge,
  getStoredPreferences,
  saveStoredPreferences,
  getStoredCorrections,
  saveStoredCorrections,
  getStoredDocuments,
  saveStoredDocuments
} from '../services/api.js';

interface LearningCenterModalProps {
  initialTab?: 'preferences' | 'corrections' | 'documents';
  prefilledCorrection?: {
    originalRequest: string;
    incorrectInterpretation: string;
  } | null;
  onClose?: () => void;
}

export const LearningCenterModal: React.FC<LearningCenterModalProps> = ({
  initialTab = 'preferences',
  prefilledCorrection,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'corrections' | 'documents'>(initialTab);
  const [loading, setLoading] = useState(false);

  // 1. Preferences State
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [editingPref, setEditingPref] = useState<UserPreference | null>(null);
  const [newPrefKey, setNewPrefKey] = useState('');
  const [newPrefValue, setNewPrefValue] = useState('');
  const [newPrefCategory, setNewPrefCategory] = useState<UserPreference['category']>('style');

  // 2. Corrections State
  const [corrections, setCorrections] = useState<UserCorrection[]>([]);
  const [newOriginalReq, setNewOriginalReq] = useState(prefilledCorrection?.originalRequest || '');
  const [newIncorrectInterp, setNewIncorrectInterp] = useState(prefilledCorrection?.incorrectInterpretation || '');
  const [newApprovedCorr, setNewApprovedCorr] = useState('');

  // 3. Documents State
  const [documents, setDocuments] = useState<DocumentKnowledge[]>([]);
  const [docSearch, setDocSearch] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocTags, setNewDocTags] = useState('');

  // Notification banners
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prefs, corrs, docs] = await Promise.all([
        api.getPreferences(),
        api.getCorrections(),
        api.getDocuments()
      ]);
      setPreferences(prefs);
      setCorrections(corrs);
      setDocuments(docs);
    } catch {
      setPreferences(getStoredPreferences());
      setCorrections(getStoredCorrections());
      setDocuments(getStoredDocuments());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (prefilledCorrection) {
      setActiveTab('corrections');
      setNewOriginalReq(prefilledCorrection.originalRequest);
      setNewIncorrectInterp(prefilledCorrection.incorrectInterpretation);
    }
  }, [prefilledCorrection]);

  // Preference Handlers
  const handleTogglePreference = async (pref: UserPreference) => {
    await api.updatePreference(pref.id, { enabled: !pref.enabled });
    setPreferences(prev => prev.map(p => p.id === pref.id ? { ...p, enabled: !p.enabled } : p));
    showNotice(`Preference "${pref.key}" ${!pref.enabled ? 'enabled' : 'disabled'}.`);
  };

  const handleSavePreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefKey.trim() || !newPrefValue.trim()) return;

    if (editingPref) {
      await api.updatePreference(editingPref.id, {
        key: newPrefKey.trim(),
        value: newPrefValue.trim(),
        category: newPrefCategory
      });
      setPreferences(prev => prev.map(p => p.id === editingPref.id ? {
        ...p,
        key: newPrefKey.trim(),
        value: newPrefValue.trim(),
        category: newPrefCategory,
        updated_at: new Date().toISOString()
      } : p));
      setEditingPref(null);
      showNotice(`Preference "${newPrefKey}" updated.`);
    } else {
      const created = await api.savePreference({
        key: newPrefKey.trim(),
        value: newPrefValue.trim(),
        category: newPrefCategory,
        enabled: true,
        origin: 'User Added'
      });
      setPreferences(prev => [...prev, created]);
      showNotice(`Preference "${newPrefKey}" saved.`);
    }

    setNewPrefKey('');
    setNewPrefValue('');
  };

  const handleDeletePreference = async (id: string) => {
    await api.deletePreference(id);
    setPreferences(prev => prev.filter(p => p.id !== id));
    showNotice('Preference removed.');
  };

  // Correction Handlers
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOriginalReq.trim() || !newApprovedCorr.trim()) return;

    const created = await api.addCorrection({
      originalRequest: newOriginalReq.trim(),
      incorrectInterpretation: newIncorrectInterp.trim() || 'Misinterpreted user intent',
      approvedCorrection: newApprovedCorr.trim()
    });

    setCorrections(prev => [...prev, created]);
    setNewOriginalReq('');
    setNewIncorrectInterp('');
    setNewApprovedCorr('');
    showNotice('Correction registered successfully. JARVIS will use this rule in future sessions.');
  };

  const handleDeleteCorrection = async (id: string) => {
    await api.deleteCorrection(id);
    setCorrections(prev => prev.filter(c => c.id !== id));
    showNotice('Correction removed.');
  };

  // Document Handlers
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const tags = newDocTags.split(',').map(t => t.trim()).filter(Boolean);
    const created = await api.saveDocument({
      title: newDocTitle.trim(),
      content: newDocContent.trim(),
      tags
    });

    setDocuments(prev => [...prev, created]);
    setNewDocTitle('');
    setNewDocContent('');
    setNewDocTags('');
    showNotice(`Document "${created.title}" added to Knowledge Library.`);
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    showNotice('Document removed from Knowledge Library.');
  };

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.content.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(docSearch.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Learning &amp; Memory Personalization Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize JARVIS via approved memory, correction examples, and reference document grounding.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Sync Memory</span>
        </button>
      </div>

      {/* Notice Banner */}
      {savedNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition-all ${
            activeTab === 'preferences'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>1. User Preferences ({preferences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition-all ${
            activeTab === 'corrections'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>2. Corrections &amp; Guidance ({corrections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition-all ${
            activeTab === 'documents'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. Document Knowledge Library ({documents.length})</span>
        </button>
      </div>

      {/* TAB 1: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-cyan-400 flex items-center gap-1.5 font-mono">
              <Info className="w-3.5 h-3.5" />
              <span>Instruction Precedence Rule</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Approved preferences define default language, style, timezone, and output formatting. <strong>Current user prompt instructions always take immediate precedence</strong> over general preferences.
            </p>
          </div>

          {/* Add / Edit Form */}
          <form onSubmit={handleSavePreference} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-200 uppercase">
              {editingPref ? `Edit Preference: ${editingPref.key}` : 'Add Approved Preference'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Category</label>
                <select
                  value={newPrefCategory}
                  onChange={(e) => setNewPrefCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                >
                  <option value="style">Style &amp; Tone</option>
                  <option value="language">Language Support</option>
                  <option value="timezone">Timezone</option>
                  <option value="output_format">Output Format</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Preference Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tone & Address"
                  value={newPrefKey}
                  onChange={(e) => setNewPrefKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Instruction / Value</label>
                <input
                  type="text"
                  placeholder="e.g. Address user as Sir; concise responses"
                  value={newPrefValue}
                  onChange={(e) => setNewPrefValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingPref && (
                <button
                  type="button"
                  onClick={() => { setEditingPref(null); setNewPrefKey(''); setNewPrefValue(''); }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono shadow-sm"
              >
                {editingPref ? 'Update Preference' : 'Add Preference'}
              </button>
            </div>
          </form>

          {/* List of Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {preferences.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all ${
                  p.enabled
                    ? 'bg-slate-900/90 border-slate-800 shadow-sm'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-200">{p.key}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        {p.category}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                        {p.origin}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed font-sans">{p.value}</p>
                    <div className="text-[10px] text-slate-500 font-mono mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated: {new Date(p.updated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePreference(p)}
                      title={p.enabled ? 'Disable' : 'Enable'}
                      className={`p-1.5 rounded-lg border text-xs ${
                        p.enabled
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {p.enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPref(p);
                        setNewPrefKey(p.key);
                        setNewPrefValue(p.value);
                        setNewPrefCategory(p.category);
                      }}
                      title="Edit"
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePreference(p.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CORRECTIONS */}
      {activeTab === 'corrections' && (
        <div className="space-y-6">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-cyan-400 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Targeted Correction Memory</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When JARVIS misinterprets a command or repeats an erroneous response, save a correction here or click <strong>"Correct this"</strong> on any chat response. JARVIS will retrieve relevant corrections for similar future requests without treating casual chat turns as permanent rules.
            </p>
          </div>

          {/* Add Correction Form */}
          <form onSubmit={handleSaveCorrection} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-200 uppercase">Register New Correction</h4>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Original User Request</label>
                <input
                  type="text"
                  placeholder='e.g. "Add 9 to your previous answer"'
                  value={newOriginalReq}
                  onChange={(e) => setNewOriginalReq(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Incorrect Interpretation / What Went Wrong</label>
                <input
                  type="text"
                  placeholder='e.g. "Calculated 111 because it used a static example instead of preceding message 161"'
                  value={newIncorrectInterp}
                  onChange={(e) => setNewIncorrectInterp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Approved Correction / Expected Behavior</label>
                <textarea
                  rows={2}
                  placeholder='e.g. "Extract the numerical value from the immediate preceding assistant answer (161) and calculate 161 + 9 = 170"'
                  value={newApprovedCorr}
                  onChange={(e) => setNewApprovedCorr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono shadow-sm"
              >
                Save Correction
              </button>
            </div>
          </form>

          {/* List of Corrections */}
          <div className="space-y-3">
            {corrections.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No past corrections recorded yet. Click "Correct this" on assistant responses to register misinterpretations.
              </div>
            ) : (
              corrections.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1">
                      <div className="text-xs font-bold font-mono text-slate-200">
                        Request: <span className="text-cyan-300">"{c.originalRequest}"</span>
                      </div>
                      <div className="text-xs text-rose-300 font-mono flex items-start gap-1">
                        <span className="font-bold text-rose-400">Avoid:</span>
                        <span>{c.incorrectInterpretation}</span>
                      </div>
                      <div className="text-xs text-emerald-300 font-mono flex items-start gap-1">
                        <span className="font-bold text-emerald-400">Approved Rule:</span>
                        <span>{c.approvedCorrection}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono pt-1">
                        Recorded: {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCorrection(c.id)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400"
                      title="Delete correction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENT KNOWLEDGE LIBRARY */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Containment & Disclaimer Banner */}
          <div className="p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Prompt Containment &amp; Model Grounding Guarantee</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Documents added here are retrieved dynamically to ground answers with source citations (e.g. <code>[Source: Document Title]</code>).
            </p>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>• <strong>Untrusted Containment</strong>: All document content is wrapped in <code>&lt;untrusted_document_knowledge&gt;</code> tags to isolate untrusted text and neutralize prompt-injection attempts.</div>
              <div>• <strong>No Weight Retraining</strong>: Document retrieval personalizes responses through contextual in-prompt grounding <em>without retraining the underlying foundation model weights</em>.</div>
            </div>
          </div>

          {/* Add Document Form */}
          <form onSubmit={handleSaveDocument} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-200 uppercase">Add Reference Document</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Project Apollo Requirements"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. apollo, specs, roadmap"
                    value={newDocTags}
                    onChange={(e) => setNewDocTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Document Text / Reference Passage</label>
                <textarea
                  rows={4}
                  placeholder="Paste reference text, specifications, FAQs, or factual notes here..."
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono shadow-sm"
              >
                Upload to Library
              </button>
            </div>
          </form>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference documents by title, tag, or content..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
            />
          </div>

          {/* Documents List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>{doc.title}</span>
                    </h5>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-4 leading-relaxed font-sans">
                    {doc.content}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-2.5 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((t, idx) => (
                      <span key={idx} className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {doc.content.length} characters • Updated: {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
