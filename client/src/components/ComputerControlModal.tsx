import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Shield,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Type,
  Volume2,
  Camera,
  Square,
  RefreshCw,
  FileText,
  Youtube,
  Laptop,
  KeyRound,
  Unplug
} from 'lucide-react';
import { api, ComputerStatus, getCompanionToken, setCompanionToken } from '../services/api.js';

export const ComputerControlModal: React.FC = () => {
  const [status, setStatus] = useState<ComputerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState(() => getCompanionToken());
  const [showTokenInput, setShowTokenInput] = useState(false);

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

  const handleSaveToken = () => {
    setCompanionToken(tokenInput);
    setShowTokenInput(false);
    fetchStatus();
    setActionFeedback('Companion pairing token saved.');
  };

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
      setActionFeedback('⚠️ Companion offline: Please start `npm run companion` on your Mac to launch desktop apps.');
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
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700 transition-all"
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            Pairing Token
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

      {/* Pairing Token Modal/Bar */}
      {showTokenInput && (
        <div className="p-4 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-2 font-mono">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              Local Companion Security Pairing Token
            </span>
            <button onClick={() => setShowTokenInput(false)} className="text-slate-400 hover:text-slate-200 text-xs">
              Close
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The JARVIS Companion daemon running on your Mac (`http://127.0.0.1:4001`) verifies this token before executing system-level actions like keystrokes or app launching.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Paste security token (or leave empty for default local pairing)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSaveToken}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-all"
            >
              Save Token
            </button>
          </div>
        </div>
      )}

      {/* Status Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-center justify-between animate-fadeIn">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-200 ml-4 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Truthful Connection Status Banner */}
      {!isConnected ? (
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Local Mac Companion Disconnected
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Direct macOS control requires the companion daemon to be running on your Mac. To enable app switching, keystrokes, and screen reading from this browser session:
              </p>
              <code className="text-cyan-300 font-mono block mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-xs">
                npm run companion
              </code>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-mono font-bold transition-all shrink-0"
          >
            Check Connection
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>macOS Companion Linked &amp; Authenticated (127.0.0.1:4001)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            LIVE DESKTOP SYNC
          </span>
        </div>
      )}

      {/* Grid: OS Status & Active Window (TRUTHFUL REPORTING) */}
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
              <span className="text-slate-300">Screen Capture (`screencapture` Primitive)</span>
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

          <p className="text-[10px] text-slate-400 font-mono">
            * Note: If system prompts appear, grant permissions in System Settings &gt; Privacy &amp; Security &gt; Accessibility.
          </p>
        </div>

        {/* Live Active Window Card (Truthful: Never permanently "Detecting...") */}
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

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleReadActive}
              disabled={actionLoading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              Read Active Text
            </button>
            <button
              onClick={async () => {
                if (!isConnected) {
                  setActionFeedback('⚠️ Companion offline: Screen capture requires the Mac companion.');
                  return;
                }
                setActionLoading(true);
                try {
                  const res = await api.computerCaptureScreen();
                  setActionFeedback(`Screen captured to ${res.imagePath} (${res.width}x${res.height})`);
                } catch (err: any) {
                  setActionFeedback(`Screen capture failed: ${err.message}`);
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Capture Screen
            </button>
          </div>
        </div>
      </div>

      {/* Control Execution Panels */}
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
                disabled={actionLoading}
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSearch('youtube', searchQuery)}
                disabled={actionLoading || !searchQuery}
                className="flex-1 p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-rose-400 flex items-center justify-center gap-1 transition-all"
              >
                <Youtube className="w-3.5 h-3.5 text-rose-500" /> YouTube
              </button>
              <button
                onClick={() => handleSearch('google', searchQuery)}
                disabled={actionLoading || !searchQuery}
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleType}
              disabled={actionLoading || !typeInput}
              className="w-full p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Type className="w-3.5 h-3.5" /> Type Text Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
