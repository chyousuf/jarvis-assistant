import React from 'react';
import {
  MessageSquare,
  CheckSquare,
  Monitor,
  Mail,
  MessageCircle,
  Calendar,
  FolderGit2,
  Bell,
  Shield,
  Activity,
  Laptop,
  BookOpen
} from 'lucide-react';
import { ActiveTab } from './Header.js';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeTaskCount: number;
  companionConnected: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeTaskCount,
  companionConnected,
  isOpen = true,
  onClose
}) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    indicator?: 'companion' | 'none';
  }> = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: activeTaskCount > 0 ? activeTaskCount : undefined },
    { id: 'learning', label: 'Learning & Memory', icon: BookOpen },
    { id: 'computer', label: 'Computer Control', icon: Monitor, indicator: 'companion' },
    { id: 'emails', label: 'Email', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'workspace', label: 'Workspace Files', icon: FolderGit2 },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'connections', label: 'Connections & OAuth', icon: Shield },
    { id: 'activity', label: 'Audit Log', icon: Activity }
  ];

  return (
    <aside
      className={`w-64 bg-slate-950/95 border-r border-slate-800 flex flex-col justify-between p-3 select-none z-30 transition-all ${
        isOpen ? 'block' : 'hidden md:block'
      }`}
    >
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Navigation &amp; Workflows
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.indicator === 'companion' && (
                    <span
                      title={companionConnected ? 'Local Mac Companion Paired' : 'Companion Disconnected'}
                      className={`w-2 h-2 rounded-full ${
                        companionConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                  )}

                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500 text-slate-950 shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Telemetry & Companion Card */}
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 mt-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-cyan-400" /> Mac Companion:
          </span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              companionConnected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {companionConnected ? 'PAIRED' : 'OFFLINE'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-snug font-sans">
          {companionConnected
            ? 'Desktop automation active via local daemon.'
            : 'Run `npm run companion` on Mac to link desktop control.'}
        </p>
      </div>
    </aside>
  );
};
