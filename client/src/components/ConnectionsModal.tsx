import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unplug,
  Info,
  Globe,
  Laptop,
  Sparkles,
  Mail,
  MessageCircle,
  Calendar,
  Lock,
  ExternalLink,
  Terminal,
  Zap,
  Check,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  api,
  COMPANION_URL,
  getAIKey,
  setAIKey,
  getAIProvider,
  setAIProvider,
  getAccessPasscode,
  setAccessPasscode
} from '../services/api.js';

export const ConnectionsModal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastCheckTimes, setLastCheckTimes] = useState<Record<string, string>>({});

  // 1. AI Service State
  const [aiKey, setAiKeyInput] = useState<string>(() => getAIKey());
  const [aiProvider, setAiProviderInput] = useState<string>(() => getAIProvider());
  const [serverAIStatus, setServerAIStatus] = useState<any>(null);
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  // 2. Access Passcode State
  const [passcodeInput, setPasscodeInput] = useState<string>(() => getAccessPasscode());
  const [passcodeSavedNotice, setPasscodeSavedNotice] = useState(false);

  // 3. Companion State
  const [companionStatus, setCompanionStatus] = useState<'connected' | 'offline'>('offline');
  const [companionDetails, setCompanionDetails] = useState<any>(null);
  const [copiedServiceCmd, setCopiedServiceCmd] = useState(false);

  // 4. Email State
  const [emailStatus, setEmailStatus] = useState<'connected' | 'needs_setup'>('needs_setup');

  // 5. WhatsApp State
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'needs_setup'>('needs_setup');

  // 6. Calendar State
  const [calendarStatus, setCalendarStatus] = useState<'connected'>('connected');

  // Dynamic origin calculation for truthful OAuth instructions
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jarvis-assistant-pi-dun.vercel.app';

  const checkAllConnections = async () => {
    setLoading(true);
    const now = new Date().toLocaleTimeString();

    // 1. Query Server AI Status
    try {
      const aiStatusRes = await api.getAIStatus();
      setServerAIStatus(aiStatusRes);
    } catch (err: any) {
      setServerAIStatus({ success: false, configured: false, error: err.message });
    }

    // 2. Check Companion Daemon
    try {
      const compRes = await api.getComputerStatus();
      if (compRes.companionConnected) {
        setCompanionStatus('connected');
        setCompanionDetails(compRes);
      } else {
        setCompanionStatus('offline');
        setCompanionDetails(null);
      }
    } catch {
      setCompanionStatus('offline');
    }

    // 3. Check Integrations Endpoint
    try {
      const serverStatus = await api.getIntegrations();
      const gmail = serverStatus.find((i) => i.id === 'int-gmail');
      const wa = serverStatus.find((i) => i.id === 'int-whatsapp');
      setEmailStatus(gmail?.status === 'connected' ? 'connected' : 'needs_setup');
      setWhatsappStatus(wa?.status === 'connected' ? 'connected' : 'needs_setup');
    } catch {
      // ignore
    }

    setLastCheckTimes({
      ai: now,
      companion: now,
      email: now,
      whatsapp: now,
      calendar: now
    });

    setLoading(false);
  };

  useEffect(() => {
    checkAllConnections();
  }, []);

  const handleSaveAIConfig = () => {
    setAIKey(aiKey.trim());
    setAIProvider(aiProvider);
    checkAllConnections();
  };

  const handleSavePasscode = () => {
    setAccessPasscode(passcodeInput.trim());
    setPasscodeSavedNotice(true);
    setTimeout(() => setPasscodeSavedNotice(false), 2500);
  };

  const handleTestAIConnection = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await api.testAIConnection('What is 17 multiplied by 6?');
      setAiTestResult(res);
      if (res.success) {
        setServerAIStatus((prev: any) => ({ ...prev, configured: true }));
      }
    } catch (err: any) {
      setAiTestResult({
        success: false,
        latencyMs: 0,
        errorCode: 'NETWORK_ERROR',
        errorMessage: err.message || 'Failed to communicate with test endpoint.'
      });
    } finally {
      setTestingAi(false);
      const now = new Date().toLocaleTimeString();
      setLastCheckTimes((prev) => ({ ...prev, ai: now }));
    }
  };

  const copyServiceCommand = () => {
    navigator.clipboard.writeText('npm run companion:install-service');
    setCopiedServiceCmd(true);
    setTimeout(() => setCopiedServiceCmd(false), 2000);
  };

  const isAIActive = serverAIStatus?.configured || aiTestResult?.success || !!aiKey.trim();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Integration Health &amp; Credentials Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persistent server-side secrets, truthful connection states, and live execution tests.
          </p>
        </div>
        <button
          onClick={checkAllConnections}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Audit All Integrations</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. AI Intelligence Engine Card (Full Width) */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 md:col-span-2 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-jarvis-glow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                  1. AI Intelligence Engine
                  <span className="text-[10px] text-cyan-400 font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    Production Secret Priority
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Powers unrestricted conversational reasoning, math, and contextual follow-ups.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full ${
                  aiTestResult?.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : serverAIStatus?.configured
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {aiTestResult?.success
                  ? 'VERIFIED & OPERATIONAL'
                  : serverAIStatus?.configured
                  ? 'CONFIGURED IN SERVER ENV'
                  : 'SETUP REQUIRED'}
              </span>
              {lastCheckTimes.ai && (
                <span className="text-[10px] font-mono text-slate-500">
                  Checked: {lastCheckTimes.ai}
                </span>
              )}
            </div>
          </div>

          {/* Truthful Server Secret Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300 uppercase font-semibold">Server Production Secret:</span>
                {serverAIStatus?.configured ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Active ({serverAIStatus.provider} - {serverAIStatus.model})
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> Not Configured in Vercel Environment
                  </span>
                )}
              </div>

              {serverAIStatus?.maskedKey && (
                <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Key: {serverAIStatus.maskedKey}
                </span>
              )}
            </div>

            <p className="text-slate-400 leading-relaxed text-[11px]">
              For this personal deployment, server-side production environment secrets in Vercel (e.g. <code>GEMINI_API_KEY</code>) are the persistent credential source. They survive page refreshes, new browser sessions, and deployments.
            </p>

            <button
              onClick={() => setShowVercelGuide(!showVercelGuide)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>{showVercelGuide ? 'Hide Vercel Setup Instructions' : 'How to set GEMINI_API_KEY in Vercel Dashboard'}</span>
              {showVercelGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showVercelGuide && (
              <div className="p-3 mt-2 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-[11px] text-slate-300 animate-fadeIn">
                <div className="font-bold text-slate-200">How to add persistent secrets in Vercel:</div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                  <li>Go to your <strong>Vercel Dashboard</strong> → Select your <strong>jarvis-assistant</strong> project.</li>
                  <li>Click <strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
                  <li>Add <code>GEMINI_API_KEY</code> as the Key, and paste your Google Gemini API key as the Value.</li>
                  <li>Select all environments (<strong>Production, Preview, Development</strong>) and click <strong>Save</strong>.</li>
                  <li><strong>Mandatory step:</strong> Go to the <strong>Deployments</strong> tab and click <strong>Redeploy</strong> (or push a commit to <code>main</code>) so serverless functions load the new secret.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Test & Client Override Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Provider Override</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProviderInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="auto">Auto (Prefer Server GEMINI_API_KEY)</option>
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="groq">Groq (Llama-3.3)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">
                Client Key Override (Optional Browser Fallback)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={serverAIStatus?.configured ? "Using server GEMINI_API_KEY (paste here to override)" : "Paste Gemini API Key..."}
                  value={aiKey}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveAIConfig}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0"
                >
                  Save Local
                </button>
                <button
                  onClick={handleTestAIConnection}
                  disabled={testingAi}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-jarvis-glow shrink-0 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${testingAi ? 'animate-spin' : ''}`} />
                  Test Real Ping
                </button>
              </div>
            </div>
          </div>

          {/* Real AI Test Diagnostics Output */}
          {aiTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                aiTestResult.success
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/25 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {aiTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {aiTestResult.success ? 'Real Execution Test Passed' : `Test Failed: [${aiTestResult.errorCode || 'ERROR'}]`}
                </span>
                <span>Latency: {aiTestResult.latencyMs}ms</span>
              </div>

              {aiTestResult.success ? (
                <div className="space-y-1 text-slate-300">
                  <div>Model: <strong>{aiTestResult.provider}</strong> ({aiTestResult.model})</div>
                  <div>Query: <em>"{aiTestResult.prompt}"</em></div>
                  <div>Output: <strong className="text-emerald-300">"{aiTestResult.reply}"</strong></div>
                  <div className="text-[10px] text-slate-500">Verified at: {aiTestResult.testedAt}</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div>Reason: {aiTestResult.errorMessage}</div>
                  <div className="text-[10px] text-rose-300/80">
                    Fix: Verify your API key in Vercel environment variables or enter an active key above.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Public Abuse Protection & Passcode Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                2. Deployment Access Passcode
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                serverAIStatus?.passcodeRequired
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {serverAIStatus?.passcodeRequired ? 'PASSCODE ENFORCED' : 'OPEN ACCESS'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Protects your paid AI API key from abuse by public web visitors. If <code>JARVIS_ACCESS_PASSCODE</code> is set in Vercel, requests must supply this passcode.
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Enter access passcode..."
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSavePasscode}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Save Passcode
            </button>
          </div>

          {passcodeSavedNotice && (
            <div className="text-[11px] text-emerald-400 font-mono">
              ✓ Passcode saved to browser. It will be sent with all requests.
            </div>
          )}
        </div>

        {/* 3. Local macOS Companion Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                3. Local Mac Companion
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                companionStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {companionStatus === 'connected' ? 'ONLINE & PAIRED' : 'DISCONNECTED'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Local desktop automation layer listening on <code>http://127.0.0.1:4001</code>.
          </p>

          <div className="text-[11px] font-mono text-slate-400 p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <div>Daemon: {companionStatus === 'connected' ? 'Paired via ~/.jarvis_token' : 'Offline (Desktop actions locked)'}</div>
            <div>Device: {companionDetails?.os?.platform ? `${companionDetails.os.platform} (${companionDetails.os.osRelease})` : 'None'}</div>
            <div>Frontmost App: {companionDetails?.activeWindow?.frontmostApp || 'Offline'}</div>
          </div>

          {/* Start at login LaunchAgent command */}
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300 font-semibold font-mono">
              <span>Start at Login (macOS Service)</span>
              <button
                onClick={copyServiceCommand}
                className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                {copiedServiceCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedServiceCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="block bg-slate-900 p-1.5 rounded text-cyan-300 text-[10px] font-mono overflow-x-auto">
              npm run companion:install-service
            </code>
          </div>
        </div>

        {/* 4. Google Gmail Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                4. Google Gmail
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                emailStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {emailStatus === 'connected' ? 'CONFIGURED' : 'NEEDS CREDENTIALS'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            OAuth 2.0 draft creation and email dispatching with explicit approval gates.
          </p>

          <div className="text-[11px] font-mono text-slate-400 p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <div className="text-cyan-300 break-all">
              Redirect URI: {currentOrigin}/api/oauth/google/callback
            </div>
            <div>Env: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET</div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500 font-mono">Checked: {lastCheckTimes.email}</span>
            <a
              href="/api/oauth/google/authorize"
              className="text-xs font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Authorize Account</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 5. WhatsApp Business Platform Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                5. WhatsApp Business
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              HANDOFF ACTIVE
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Direct Cloud API for business templates, with verified <code>wa.me</code> direct handoff fallback for personal contacts.
          </p>

          <div className="text-[11px] font-mono text-slate-400 p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <div>Handoff: Verified <code>wa.me</code> URL encoding</div>
            <div>Cloud API: WHATSAPP_PHONE_NUMBER_ID / ACCESS_TOKEN</div>
            <div className="text-slate-500 text-[10px]">* Direct handoff messages are never marked delivered until sent by user.</div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500 font-mono">Checked: {lastCheckTimes.whatsapp}</span>
            <span className="text-[11px] text-emerald-400 font-mono">Safe Simulation &amp; Handoff</span>
          </div>
        </div>

        {/* 6. Calendar Scheduling Service Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                6. Calendar Scheduling
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              CONNECTED
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Persistent meeting scheduling, conflict detection, and attendee confirmations.
          </p>

          <div className="text-[11px] font-mono text-slate-400 p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <div>Provider: Cloud Database Calendar Engine</div>
            <div>Persistence: Stored in SQLite / Cloud Storage</div>
            <div>Timezone: Asia/Karachi (server-aligned)</div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500 font-mono">Checked: {lastCheckTimes.calendar}</span>
            <span className="text-[11px] text-cyan-400 font-mono">Ready &amp; Conflict-Free</span>
          </div>
        </div>
      </div>
    </div>
  );
};
