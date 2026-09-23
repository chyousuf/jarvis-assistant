import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Shield,
  CheckCircle2,
  AlertCircle,
  FolderCheck,
  Search,
  ExternalLink,
  Type,
  Volume2,
  Camera,
  Square,
  RefreshCw,
  FileText,
  Youtube,
  MessageSquare
} from 'lucide-react';
import { api, ComputerStatus } from '../services/api.js';

export const ComputerControlModal: React.FC = () => {
  const [status, setStatus] = useState<ComputerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [typeInput, setTypeInput] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    const interval = setInterval(fetchStatus, 5000);
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
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerReadActive();
      setActionFeedback(`Read from ${res.source}:\n"${res.content.substring(0, 180)}..."`);
    } catch (err: any) {
      setActionFeedback(`Read failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleType = async () => {
    if (!typeInput) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerTypeText(typeInput);
      setActionFeedback(`Typed "${typeInput}" into ${res.targetApp} (${res.charCount} characters).`);
      setTypeInput('');
    } catch (err: any) {
      setActionFeedback(`Typing failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFindFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setActionLoading(true);
    setSearchResult(null);
    try {
      const res = await api.computerFindFile(searchQuery);
      setSearchResult(res);
      if (res.found) {
        setActionFeedback(`Found file: ${res.fileName} (${res.filePath})`);
      } else {
        setActionFeedback(`No matching file found for "${searchQuery}" in authorized folders.`);
      }
    } catch (err: any) {
      setActionFeedback(`Search error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCaptureScreen = async () => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.computerCaptureScreen();
      setActionFeedback(`Screen captured: ${res.fileName} (${Math.round(res.size / 1024)} KB)`);
    } catch (err: any) {
      setActionFeedback(`Screenshot failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
            <Monitor className="w-5 h-5 text-cyan-400" />
            Computer Control & macOS Automation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real system execution layer: Application activation, browser automation, screen inspection, and cursor typing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleEmergencyStop}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-lg shadow-rose-500/20 text-xs font-bold transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-rose-400" />
            EMERGENCY STOP (RUKO)
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-center justify-between animate-fadeIn">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-200 ml-4 font-bold">×</button>
        </div>
      )}

      {/* Grid: OS Status & Active Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System & Permissions Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              macOS System & Permissions
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {status?.os.platform || 'darwin'} ({status?.os.osRelease || 'macOS'})
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80">
              <span className="text-slate-300">Accessibility (System Events / UI Scripting)</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enabled
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80">
              <span className="text-slate-300">Automation (AppleScript Engine)</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80">
              <span className="text-slate-300">Screen Capture (`screencapture` primitive)</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Available
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80">
              <span className="text-slate-300">Speech Synthesis (`say` CLI)</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono">
            * Note: If system prompts appear, grant permissions in System Settings &gt; Privacy &amp; Security &gt; Accessibility.
          </p>
        </div>

        {/* Live Active Window Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-cyan-400" />
              Frontmost Active Window
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live Polling
            </span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Application:</span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {status?.activeWindow.frontmostApp || 'Detecting...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Window Title:</span>
              <span className="text-xs font-mono text-slate-200 truncate max-w-[260px]" title={status?.activeWindow.windowTitle}>
                {status?.activeWindow.windowTitle || '(No title reported)'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono">Category:</span>
              {status?.activeWindow.isBrowser && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">Web Browser</span>
              )}
              {status?.activeWindow.isEditor && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">Document Editor</span>
              )}
              {status?.activeWindow.isCommunication && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Messaging / Chat</span>
              )}
              {!status?.activeWindow.isBrowser && !status?.activeWindow.isEditor && !status?.activeWindow.isCommunication && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">General Utility</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReadActive}
              disabled={actionLoading}
              className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Read Active Content
            </button>
            <button
              onClick={handleCaptureScreen}
              disabled={actionLoading}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Capture Screen
            </button>
          </div>
        </div>
      </div>

      {/* Authorized Folders & File Finder */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FolderCheck className="w-4 h-4 text-cyan-400" />
            Authorized Folder Search &amp; Safety Boundary
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Scoped &amp; Sandboxed</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {status?.authorizedFolders.map((folder, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-xs font-mono text-slate-300 truncate" title={folder}>
              📁 {folder.split('/').slice(-2).join('/')}
            </div>
          ))}
        </div>

        {/* Find file form */}
        <form onSubmit={handleFindFile} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Find downloaded file (e.g. invoice, resume, report)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading || !searchQuery}
            className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-medium transition-all"
          >
            Find &amp; Open
          </button>
        </form>

        {searchResult && (
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between">
            {searchResult.found ? (
              <span className="text-emerald-400">
                ✓ Opened: {searchResult.fileName} ({searchResult.filePath})
              </span>
            ) : (
              <span className="text-amber-400">
                ⚠ No file matching &ldquo;{searchQuery}&rdquo; found in authorized folders.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Direct Typing & Quick Workflow Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Active Field Typing */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-4 h-4 text-cyan-400" />
            Type Directly Into Cursor Position
          </span>
          <p className="text-[11px] text-slate-400">
            Sends text directly into whatever text field or document cursor is currently selected on your screen.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Hello from Jarvis..."
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleType()}
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
            <button
              onClick={handleType}
              disabled={actionLoading || !typeInput}
              className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-medium transition-all"
            >
              Type Now
            </button>
          </div>
        </div>

        {/* Quick Launch & Workflow Triggers */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            Quick Application &amp; Browser Triggers
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleOpenApp('WhatsApp')}
              className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left flex items-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Open WhatsApp</span>
            </button>
            <button
              onClick={() => handleSearch('youtube', 'cooking videos')}
              className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left flex items-center gap-2 transition-all"
            >
              <Youtube className="w-4 h-4 text-rose-400" />
              <span>Search YouTube</span>
            </button>
            <button
              onClick={() => handleOpenApp('TextEdit')}
              className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left flex items-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Open TextEdit</span>
            </button>
            <button
              onClick={() => handleSearch('google', 'macOS automation best practices')}
              className="p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left flex items-center gap-2 transition-all"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Search Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
