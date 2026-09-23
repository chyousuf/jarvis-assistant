import React, { useState } from 'react';
import { Task } from '../services/api.js';
import { CheckCircle2, XCircle, Clock, RefreshCw, Ban, AlertCircle, ArrowUpRight, Search, FileCode } from 'lucide-react';

interface TaskDashboardProps {
  tasks: Task[];
  onCancelTask: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ tasks, onCancelTask, onRefresh }) => {
  const [filter, setFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/40">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            Task Activity Dashboard
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
              {tasks.length} total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status, progress tracking, and verification log for background executions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['all', 'running', 'pending', 'completed', 'failed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={onRefresh}
            title="Refresh tasks"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Grid & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium">No tasks found matching filter "{filter}".</p>
              <p className="text-xs text-slate-500 mt-1">Dispatch a command in Chat to initiate an automated task.</p>
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTask?.id === t.id
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-jarvis-glow'
                    : 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {t.description || 'No description'}
                    </p>
                  </div>
                  {getStatusBadge(t.status)}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden my-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      t.status === 'failed' ? 'bg-rose-500' : t.status === 'completed' ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${t.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{t.steps.length} steps</span>
                  <span>{new Date(t.created_at).toLocaleTimeString()}</span>
                  {t.status === 'running' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelTask(t.id);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 underline font-sans"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Task Inspector Panel (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sticky top-24 h-fit">
          {selectedTask ? (
            <div>
              <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase text-cyan-400">
                    ID: {selectedTask.id}
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-1">
                    {selectedTask.title}
                  </h3>
                </div>
                {getStatusBadge(selectedTask.status)}
              </div>

              {/* Steps Detailed View */}
              <div className="py-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                  Execution Steps ({selectedTask.steps.length})
                </h4>
                <div className="space-y-2">
                  {selectedTask.steps.map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-slate-200">
                          {idx + 1}. {s.name}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          s.status === 'failed' ? 'bg-rose-500/20 text-rose-300' :
                          s.status === 'running' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {s.status}
                        </span>
                      </div>

                      {s.evidence && (
                        <div className="mt-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-950/20 p-1.5 rounded border border-emerald-900/40">
                          ✓ Evidence: {s.evidence}
                        </div>
                      )}

                      {s.error && (
                        <div className="mt-1.5 text-[11px] text-rose-400 font-mono bg-rose-950/20 p-1.5 rounded border border-rose-900/40">
                          ✕ Error: {s.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Result / Outcome */}
              {selectedTask.result && (
                <div className="mt-2 pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Verified Outcome
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    {selectedTask.result}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedTask.status === 'running' && (
                <button
                  onClick={() => onCancelTask(selectedTask.id)}
                  className="w-full mt-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-medium transition-all"
                >
                  Cancel Execution
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">Select any task to inspect step telemetry and verified outcome evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
