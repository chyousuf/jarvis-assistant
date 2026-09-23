import React, { useState, useEffect } from 'react';
import { Memory, api } from '../services/api.js';
import { Brain, Plus, Trash2, Tag, ShieldCheck, RefreshCw } from 'lucide-react';

export const MemoryModal: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<'preference' | 'personal' | 'project' | 'fact'>('preference');
  const [loading, setLoading] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const data = await api.getMemories();
      setMemories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    try {
      await api.saveMemory(key, value, category);
      setKey('');
      setValue('');
      fetchMemories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      fetchMemories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            User-Controlled Memory & Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            JARVIS injects these memories into orchestrator context. You have complete authority to view, add, or delete any record.
          </p>
        </div>
        <button
          onClick={fetchMemories}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Add Memory Form */}
      <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Topic Key (e.g. favorite_stack, coding_style)"
            className="bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none capitalize"
          >
            <option value="preference">Preference</option>
            <option value="personal">Personal</option>
            <option value="project">Project</option>
            <option value="fact">Fact</option>
          </select>
          <button
            type="submit"
            disabled={!key.trim() || !value.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Store Memory</span>
          </button>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Memory Detail (e.g., I always prefer TypeScript, Vite, and dark mode interfaces)..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
        />
      </form>

      {/* Memory Cards */}
      <div className="space-y-3">
        {memories.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
            <Brain className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm">No saved memories found.</p>
            <p className="text-xs text-slate-500 mt-1">Tell JARVIS: "Remember that I like TypeScript" or use the form above.</p>
          </div>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-cyan-300">
                    {mem.key}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {mem.category}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> User Approved
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {mem.value}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">
                  Updated: {new Date(mem.updated_at).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => handleDelete(mem.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                title="Delete this memory"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
