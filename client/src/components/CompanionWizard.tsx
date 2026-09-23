import React, { useState, useEffect } from 'react';
import {
  Laptop,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  KeyRound,
  Shield,
  RefreshCw,
  Terminal,
  Unplug,
  Info,
  ExternalLink,
  Lock,
  Cpu,
  HelpCircle
} from 'lucide-react';
import { api, COMPANION_URL, getCompanionToken, setCompanionToken } from '../services/api.js';

interface CompanionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const CompanionWizard: React.FC<CompanionWizardProps> = ({
  isOpen,
  onClose,
  onConnectionChange
}) => {
  const [detectedOS, setDetectedOS] = useState<string>('macOS');
  const [tokenInput, setTokenInput] = useState<string>(() => getCompanionToken());
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [showPnaHelp, setShowPnaHelp] = useState<boolean>(false);

  // Detect OS from userAgent
  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) {
      setDetectedOS('macOS (Apple Silicon / Intel)');
    } else if (ua.includes('Windows')) {
      setDetectedOS('Windows');
    } else if (ua.includes('Linux')) {
      setDetectedOS('Linux');
    } else {
      setDetectedOS('Unknown OS');
    }
  }, []);

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    setErrorMsg(null);
    const start = performance.now();

    const token = tokenInput.trim();
    setCompanionToken(token);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${COMPANION_URL}/api/companion/verify`, {
        signal: controller.signal,
        headers
      });
      clearTimeout(timeoutId);

      const end = performance.now();
      setLatencyMs(Math.round(end - start));

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Verification failed`);
      }

      setVerifyResult(data);
      if (onConnectionChange) onConnectionChange(true);
    } catch (err: any) {
      setVerifyResult(null);
      if (err.name === 'AbortError') {
        setErrorMsg('Connection timed out. Ensure `npm run companion` is actively running in your local terminal.');
      } else if (err.message.includes('Failed to fetch')) {
        setErrorMsg(
          'Browser blocked connection to http://127.0.0.1:4001. This is typically due to browser Private Network Access or Mixed Content restrictions when visiting via HTTPS.'
        );
        setShowPnaHelp(true);
      } else {
        setErrorMsg(err.message || 'Unable to verify connection.');
      }
      if (onConnectionChange) onConnectionChange(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${COMPANION_URL}/api/companion/disconnect`, { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }
    setCompanionToken('');
    setTokenInput('');
    setVerifyResult(null);
    setLatencyMs(null);
    setErrorMsg(null);
    if (onConnectionChange) onConnectionChange(false);
  };

  useEffect(() => {
    if (isOpen) {
      handleVerifyConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = !!verifyResult?.verified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
                Connect My Computer
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {isConnected ? 'PAIRED & ONLINE' : 'OFFLINE'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Secure local daemon setup for direct desktop application control and keystroke typing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Step 1: OS Detection */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Operating System Check
            </span>
            <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              Detected: {detectedOS}
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Full native computer automation (AppleScript UI scripting, active window reading, TextEdit saving) is optimized for <strong>macOS</strong>.
          </p>
        </div>

        {/* Step 2: Startup Command */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Start Local Companion Daemon
          </span>
          <p className="text-slate-400">
            Open your local Mac terminal in the project directory and run:
          </p>
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-cyan-300">
            <code>npm run companion</code>
            <button
              onClick={() => navigator.clipboard.writeText('npm run companion')}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Copy
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            * The daemon listens on <code>http://127.0.0.1:4001</code> and generates a pairing token in <code>~/.jarvis_token</code>.
          </p>
        </div>

        {/* Step 3: Security Pairing Token */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Authentication &amp; Pairing Token
            </span>
            <span className="text-[11px] text-slate-500 font-mono">From ~/.jarvis_token</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Paste pairing token from terminal output or ~/.jarvis_token..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
            />
            <button
              onClick={handleVerifyConnection}
              disabled={isVerifying}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              Verify &amp; Pair
            </button>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/50 text-xs text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Connection Error
            </div>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Browser PNA / Mixed Content Help Box */}
        {showPnaHelp && (
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold font-mono text-amber-300">
              <HelpCircle className="w-4 h-4" /> Browser Mixed Content / Private Network Notice
            </div>
            <p className="text-slate-300 leading-relaxed">
              When accessing this web app via HTTPS (<code>https://jarvis-assistant-pi-dun.vercel.app</code>), browsers may block direct HTTP requests to <code>http://127.0.0.1:4001</code>:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <strong>In Chrome:</strong> If prompted to "Allow site to access devices on your local network", click <strong>Allow</strong>.
              </li>
              <li>
                <strong>Local Development Alternative:</strong> Run <code>npm run dev</code> on your Mac to run both frontend and backend locally at <code>http://localhost:5174</code> with zero cross-origin restrictions.
              </li>
            </ul>
          </div>
        )}

        {/* Step 4: Individual Permission Audit (Active when connected) */}
        {isConnected && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> macOS Permissions Verification
              </span>
              <span className="text-emerald-400 font-mono text-[11px]">
                Latency: {latencyMs}ms • Host: {verifyResult.device?.hostname}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Accessibility (UI Scripting)</span>
                {verifyResult.permissions?.hasAccessibility ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Needed
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Automation (AppleScript)</span>
                {verifyResult.permissions?.hasAutomation ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Disabled
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Screen Capture Primitive</span>
                {verifyResult.permissions?.hasScreenCapture ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono text-[11px]">Disabled</span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>Speech Synthesis (`say`)</span>
                {verifyResult.permissions?.hasSpeechSynthesis ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono text-[11px]">Disabled</span>
                )}
              </div>
            </div>

            {/* Connected Host Details */}
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Device: {verifyResult.device?.hostname} ({verifyResult.device?.platform} {verifyResult.device?.arch})</div>
              <div>Active App: {verifyResult.activeWindow?.frontmostApp || 'Desktop'}</div>
              <div>Window Title: {verifyResult.activeWindow?.windowTitle || 'None'}</div>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect &amp; Revoke
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-mono">
              Controls will remain locked until paired.
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            Close Wizard
          </button>
        </div>
      </div>
    </div>
  );
};
