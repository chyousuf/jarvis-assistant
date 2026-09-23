import React, { useState, useEffect } from 'react';
import { Reminder, api } from '../services/api.js';
import { Bell, Clock, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const RemindersModal: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('in 10 minutes');
  const [loading, setLoading] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const data = await api.getReminders();
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createReminder(title, dueAt);
      setTitle('');
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelReminder(id);
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Persistent Reminders
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persisted in SQLite database. The server background worker monitors due times and dispatches audio/visual notifications.
          </p>
        </div>
        <button
          onClick={fetchReminders}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Creation Card */}
      <form onSubmit={handleCreate} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder title (e.g., Check deployment health, Take a break)..."
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
        />
        <input
          type="text"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          placeholder="When? e.g. in 5 minutes, in 1 hour"
          className="w-full sm:w-48 bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule</span>
        </button>
      </form>

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
            <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm">No scheduled reminders found.</p>
          </div>
        ) : (
          reminders.map((rem) => (
            <div
              key={rem.id}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  rem.status === 'fired' ? 'bg-emerald-500/20 text-emerald-400' :
                  rem.status === 'cancelled' ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    {rem.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Due: {new Date(rem.due_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${
                  rem.status === 'fired' ? 'bg-emerald-500/20 text-emerald-300' :
                  rem.status === 'cancelled' ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {rem.status}
                </span>

                {rem.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(rem.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                    title="Cancel reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] text-slate-500 font-mono leading-relaxed">
        ℹ Operational Limitation Note: Persistent reminders are safely written to SQLite storage. Live notification delivery requires the JARVIS server process to remain active.
      </div>
    </div>
  );
};
