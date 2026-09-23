import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Shield,
  CheckCircle2,
  AlertCircle,
  Search,
  Type,
  Volume2,
  Camera,
  Square,
  RefreshCw,
  Laptop,
  KeyRound,
  Unplug,
  FileCheck2,
  Lock
} from 'lucide-react';
import { api, ComputerStatus } from '../services/api.js';
import { CompanionWizard } from './CompanionWizard.js';

export const ComputerControlModal: React.FC = () => {
  const [status, setStatus] = useState<ComputerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getComputerStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch computer status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleEmergencyStop = async () => {
    try {
      const res = await api.emergencyStop();
      setActionFeedback(`🛑 ${res.message}`);
    } catch (err: any) {
      setActionFeedback(`Error stopping actions: ${err.message}`);
    }
  };

  const handleOpenApp = async (appName: string) => {
    if (!status?.companionConnected) {
      setActionFeedback('⚠️ Companion offline: Click "Connect My Computer" to pair desktop automation.');
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerOpenApp(appName);
      setActionFeedback(`App Action: ${res.appName || appName} — ${res.isFallback ? 'Opened via Web Fallback' : 'Activated Desktop App'}`);
      fetchStatus();
    } catch (err: any) {
      setActionFeedback(`Failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = async (engine: 'youtube' | 'google', query: string) => {
    if (!query.trim()) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerSearch(query, engine);
      setActionFeedback(`Browser Search: Opened ${engine} search for "${query}"`);
    } catch (err: any) {
      setActionFeedback(`Failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReadActive = async () => {
    if (!status?.companionConnected) {
      setActionFeedback('⚠️ Companion offline: Local Mac companion is required to read active windows.');
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerReadActive();
      setActionFeedback(`Read from ${res.source}:\n"${(res.content || '').substring(0, 180)}..."`);
    } catch (err: any) {
      setActionFeedback(`Read failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleType = async () => {
    if (!typeInput) return;
    if (!status?.companionConnected) {
      setActionFeedback('⚠️ Companion offline: Local Mac companion is required to type into active fields.');
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerTypeText(typeInput);
      setActionFeedback(`Typed "${typeInput}" into active window (${res.targetApp}).`);
      setTypeInput('');
    } catch (err: any) {
      setActionFeedback(`Type error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Acceptance Workflow Test
  const handleAcceptanceWorkflow = async () => {
    if (!status?.companionConnected) {
      setActionFeedback('⚠️ Companion offline: Please pair your Mac companion to run the TextEdit workflow.');
      return;
    }
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.sendMessage(
        'Open TextEdit, write ‘This is a JARVIS test’, and save it as jarvis-test.txt in my approved workspace'
      );
      setActionFeedback(`✅ Workflow Result:\n${res.reply}`);
      fetchStatus();
    } catch (err: any) {
      setActionFeedback(`Workflow failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const isConnected = !!status?.companionConnected;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
            <Monitor className="w-5 h-5 text-cyan-400" />
            Computer Control &amp; macOS Automation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real system automation: Desktop app launch, screen inspection, active window reading, and cursor typing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-jarvis-glow"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {isConnected ? 'Manage Companion' : 'Connect My Computer'}
          </button>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleEmergencyStop}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md text-xs font-bold transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            STOP (RUKO)
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-center justify-between animate-fadeIn">
          <span className="whitespace-pre-wrap">{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-200 ml-4 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Truthful Connection Status Banner */}
      {!isConnected ? (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Mac Companion Disconnected (Controls Locked)
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Desktop actions (launching apps, typing keystrokes, reading active documents) are disabled until your local Mac companion daemon is paired.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shrink-0 shadow-jarvis-glow"
          >
            Connect My Computer Wizard
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>macOS Companion Authenticated &amp; Linked (127.0.0.1:4001)</span>
          </div>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="text-[11px] font-mono text-cyan-400 hover:underline"
          >
            Manage Link &amp; Permissions
          </button>
        </div>
      )}

      {/* Grid: OS Status & Active Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System & Permissions Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              macOS System &amp; Permissions
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                isConnected
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isConnected ? `${status?.os.platform} (${status?.os.osRelease})` : 'Companion Offline'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">Accessibility (UI Scripting / Keystrokes)</span>
              {isConnected && status?.os.hasAccessibility ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Unplug className="w-3.5 h-3.5" /> {isConnected ? 'Needs Permission' : 'Unavailable'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">Automation (AppleScript Engine)</span>
              {isConnected && status?.os.hasAutomation ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Unplug className="w-3.5 h-3.5" /> {isConnected ? 'Disabled' : 'Unavailable'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">Screen Capture Primitive</span>
              {isConnected && status?.os.hasScreenCapture ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Unplug className="w-3.5 h-3.5" /> {isConnected ? 'Disabled' : 'Unavailable'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">Speech Synthesis (`say` Native CLI)</span>
              {isConnected && status?.os.hasSpeechSynthesis ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Unplug className="w-3.5 h-3.5" /> {isConnected ? 'Disabled' : 'Unavailable'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Active Window Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-cyan-400" />
              Frontmost Active Window
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isConnected ? 'Live Telemetry' : 'Standby'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="text-xs text-slate-400 font-mono">Current Application:</div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>
                {isConnected
                  ? status?.activeWindow?.frontmostApp || 'Desktop / Finder'
                  : 'No Active Desktop Session (Companion Offline)'}
              </span>
            </div>
            {isConnected && status?.activeWindow?.windowTitle && (
              <div className="text-xs text-slate-300 font-sans truncate">
                Title: {status.activeWindow.windowTitle}
              </div>
            )}
          </div>

          {/* Quick Actions (Disabled when offline) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleReadActive}
              disabled={!isConnected || actionLoading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              Read Active Text
            </button>
            <button
              onClick={async () => {
                if (!isConnected) return;
                setActionLoading(true);
                try {
                  const res = await api.computerCaptureScreen();
                  setActionFeedback(`Screen captured to ${res.imagePath}`);
                } catch (err: any) {
                  setActionFeedback(`Screen capture failed: ${err.message}`);
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={!isConnected || actionLoading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Capture Screen
            </button>
          </div>
        </div>
      </div>

      {/* Acceptance Workflow Verification Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            Acceptance Workflow: TextEdit &amp; Workspace Test
          </div>
          <p className="text-xs text-slate-400">
            Executes: “Open TextEdit, write ‘This is a JARVIS test’, and save it as jarvis-test.txt in my approved workspace.”
          </p>
        </div>
        <button
          onClick={handleAcceptanceWorkflow}
          disabled={!isConnected || actionLoading}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-all shrink-0 shadow-jarvis-glow flex items-center gap-2"
        >
          {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
          Run Acceptance Test
        </button>
      </div>

      {/* Desktop Action Panels (Locked with Overlay when offline) */}
      <div className="relative">
        {!isConnected && (
          <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-slate-800">
            <Lock className="w-8 h-8 text-amber-400 mb-2" />
            <h4 className="text-sm font-bold font-mono text-slate-100">
              Desktop Automation Locked
            </h4>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
              To trigger app launches, browser searches, and keystroke injection, link your computer with the local companion daemon.
            </p>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-jarvis-glow"
            >
              Launch Companion Wizard
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* App Activation Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Desktop App Activation
            </span>
            <div className="grid grid-cols-2 gap-2">
              {['WhatsApp', 'Google Chrome', 'Microsoft Word', 'TextEdit', 'Safari', 'Terminal'].map((app) => (
                <button
                  key={app}
                  onClick={() => handleOpenApp(app)}
                  disabled={!isConnected || actionLoading}
                  className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-xs text-left truncate transition-all"
                >
                  {app}
                </button>
              ))}
            </div>
          </div>

          {/* Browser Search Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Automated Search
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="e.g. cooking videos or rust tutorials"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!isConnected}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSearch('youtube', searchQuery)}
                  disabled={!isConnected || actionLoading || !searchQuery}
                  className="flex-1 p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-rose-400 flex items-center justify-center gap-1 transition-all"
                >
                  YouTube
                </button>
                <button
                  onClick={() => handleSearch('google', searchQuery)}
                  disabled={!isConnected || actionLoading || !searchQuery}
                  className="flex-1 p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-cyan-400 flex items-center justify-center gap-1 transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400" /> Google
                </button>
              </div>
            </div>
          </div>

          {/* Keystroke Typing Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Type Into Cursor
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Text to type into active field..."
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleType()}
                disabled={!isConnected}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleType}
                disabled={!isConnected || actionLoading || !typeInput}
                className="w-full p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Type className="w-3.5 h-3.5" /> Type Text Here
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Companion Wizard Modal */}
      <CompanionWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          fetchStatus();
        }}
        onConnectionChange={(conn) => {
          fetchStatus();
        }}
      />
    </div>
  );
};
