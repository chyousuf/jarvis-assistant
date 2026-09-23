import React, { useState, useEffect } from 'react';
import { ActivityLog, api } from '../services/api.js';
import { ListFilter, RefreshCw, Shield, ShieldCheck } from 'lucide-react';

export const ActivityLogModal: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-cyan-400" />
            Security & Activity Audit Log
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit record of all automated actions. Sensitive tokens, passwords, and secrets are strictly redacted.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
            <Shield className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] uppercase">
                  {log.category}
                </span>
                <span className="font-semibold text-slate-200">{log.action}</span>
                {log.details && (
                  <span className="text-[11px] text-slate-400 font-sans truncate max-w-md">
                    {log.details}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
