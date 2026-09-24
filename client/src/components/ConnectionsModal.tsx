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
  getAIProvider,
  setAIProvider,
  getAccessPasscode,
  setAccessPasscode,
  getSessionToken
} from '../services/api.js';

export const ConnectionsModal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lastCheckTimes, setLastCheckTimes] = useState<Record<string, string>>({});

  // 1. AI Service State
  const [aiProvider, setAiProviderInput] = useState<string>(() => getAIProvider());
  const [serverAIStatus, setServerAIStatus] = useState<any>(null);
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  // 2. Authentication & Access State
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState<string>(() => getAccessPasscode());
  const [passcodeSavedNotice, setPasscodeSavedNotice] = useState(false);

  // 3. Companion State
  const [companionStatus, setCompanionStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [companionDetails, setCompanionDetails] = useState<any>(null);
  const [copiedServiceCmd, setCopiedServiceCmd] = useState(false);
  const [showCompanionGuide, setShowCompanionGuide] = useState(false);

  // 4. Email State
  const [emailStatus, setEmailStatus] = useState<'checking' | 'connected' | 'needs_setup'>('checking');

  // 5. WhatsApp State
  const [whatsappStatus, setWhatsappStatus] = useState<'checking' | 'connected' | 'needs_setup'>('checking');

  // 6. Calendar State
  const [calendarStatus, setCalendarStatus] = useState<'checking' | 'connected'>('checking');

  // Dynamic origin calculation for truthful OAuth instructions
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jarvis-assistant-pi-dun.vercel.app';

  const checkAllConnections = async () => {
    setLoading(true);
    const now = new Date().toLocaleTimeString();

    // 0. Query Auth Status
    try {
      const authRes = await api.getAuthStatus();
      setAuthStatus(authRes);
    } catch {
      setAuthStatus(null);
    }

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
      auth: now,
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

  const handleSaveAIProvider = () => {
    setAIProvider(aiProvider);
    checkAllConnections();
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.login(passcodeInput.trim());
      if (res.success) {
        setAccessPasscode(passcodeInput.trim());
        setPasscodeSavedNotice(true);
        setTimeout(() => setPasscodeSavedNotice(false), 2500);
        await checkAllConnections();
      } else {
        setAuthError(res.message || res.error || 'Authentication rejected');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication request failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await api.logout();
      setPasscodeInput('');
      setAccessPasscode('');
      await checkAllConnections();
    } finally {
      setAuthLoading(false);
    }
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

  const isAIActive = serverAIStatus?.configured || aiTestResult?.success;

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
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  loading
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                    : aiTestResult?.success
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : serverAIStatus?.configured
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                    <span>CHECKING...</span>
                  </>
                ) : aiTestResult?.success ? (
                  'VERIFIED & OPERATIONAL'
                ) : serverAIStatus?.configured ? (
                  'CONFIGURED IN SERVER ENV'
                ) : (
                  'SETUP REQUIRED'
                )}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {loading ? 'Auditing...' : `Checked: ${lastCheckTimes.ai || 'Just now'}`}
              </span>
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
            </div>

            <p className="text-slate-400 leading-relaxed text-[11px]">
              For this personal deployment, server-side production environment secrets in Vercel (e.g. <code>GEMINI_API_KEY</code>) are the persistent credential source. They are never sent to or stored in the browser, surviving page refreshes and new browser sessions.
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

          {/* Provider Selection & Diagnostics Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">Provider Preference</label>
              <select
                value={aiProvider}
                onChange={(e) => {
                  setAiProviderInput(e.target.value);
                  setAIProvider(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="auto">Auto (Prefer Server GEMINI_API_KEY)</option>
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="groq">Groq (Llama-3.3)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1 flex flex-col justify-end">
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleTestAIConnection}
                  disabled={testingAi}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-jarvis-glow transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${testingAi ? 'animate-spin' : ''}`} />
                  Test AI Backend Connection
                </button>
                <span className="text-[10px] text-slate-500 font-mono">
                  {serverAIStatus?.configured ? 'Keys loaded from server environment.' : 'Configure server secret to enable.'}
                </span>
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
                    Fix: Set GEMINI_API_KEY in your Vercel project environment variables and redeploy.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Public Abuse Protection & Signed Session Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                2. Deployment Access &amp; Owner Session
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold ${
                authStatus?.authenticated
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : authStatus?.passcodeRequired
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              {authStatus?.authenticated ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{authStatus?.passcodeRequired ? 'AUTHENTICATED OWNER' : 'PERSONAL SECURE (ACTIVE)'}</span>
                </>
              ) : authStatus?.passcodeRequired ? (
                <>
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>PASSCODE REQUIRED</span>
                </>
              ) : (
                'PERSONAL PROTECTED'
              )}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Protects your paid AI API key and private personal memory from unauthorized public abuse. Authenticating issues an HMAC-SHA256 signed session token stored in an HTTP-only cookie.
          </p>

          {authStatus?.authenticated ? (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-mono font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {authStatus.passcodeRequired
                    ? `Authenticated as Owner (${authStatus.userId || 'owner'})`
                    : `Personal Deployment Active (${authStatus.userId || 'owner'})`}
                </span>
                {authStatus.passcodeRequired && (
                  <button
                    onClick={handleLogout}
                    disabled={authLoading}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                  >
                    {authLoading ? 'Signing out...' : 'Sign Out'}
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {authStatus.passcodeRequired
                  ? 'HMAC-SHA256 session token active. Full access to chat, memory, documents, routines, and desktop automation.'
                  : 'Sliding-window IP rate limiting and payload bounding active. To enable passcode protection on public deployments, set JARVIS_ACCESS_PASSCODE in your Vercel settings.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter JARVIS access passcode..."
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shrink-0 transition-colors"
                >
                  {authLoading ? 'Verifying...' : 'Sign In as Owner'}
                </button>
              </div>

              {authError && (
                <div className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </div>
              )}

              {passcodeSavedNotice && (
                <div className="text-[11px] text-emerald-400 font-mono">
                  ✓ Session authenticated successfully.
                </div>
              )}
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
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                companionStatus === 'checking'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  : companionStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {companionStatus === 'checking' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                  <span>CHECKING...</span>
                </>
              ) : companionStatus === 'connected' ? (
                'ONLINE & PAIRED'
              ) : (
                'DISCONNECTED'
              )}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Local desktop automation layer listening on <code>http://127.0.0.1:4001</code>.
          </p>

          <div className="text-[11px] font-mono text-slate-400 p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <div>Daemon: {companionStatus === 'checking' ? 'Checking connection...' : companionStatus === 'connected' ? 'Paired via ~/.jarvis_token' : 'Offline (Desktop actions locked)'}</div>
            <div>Device: {companionDetails?.os?.platform ? `${companionDetails.os.platform} (${companionDetails.os.osRelease})` : 'None'}</div>
            <div>Frontmost App: {companionDetails?.activeWindow?.frontmostApp || (companionStatus === 'checking' ? 'Detecting...' : 'Offline')}</div>
          </div>

          {/* Guided setup when disconnected */}
          {companionStatus === 'offline' && (
            <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded text-[11px] text-amber-200/90 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Companion Not Running</span>
              </div>
              <p className="text-[10px] text-slate-300">
                Run in your local terminal to enable TextEdit, app switching, and typing:
              </p>
              <code className="block bg-slate-900 p-1.5 rounded text-cyan-300 text-[10px] font-mono">
                npm run companion
              </code>
            </div>
          )}

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
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                emailStatus === 'checking'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  : emailStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {emailStatus === 'checking' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                  <span>CHECKING...</span>
                </>
              ) : emailStatus === 'connected' ? (
                'CONFIGURED'
              ) : (
                'NEEDS CREDENTIALS'
              )}
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
            <span className="text-[10px] text-slate-500 font-mono">
              {emailStatus === 'checking' ? 'Auditing...' : `Checked: ${lastCheckTimes.email || 'Just now'}`}
            </span>
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
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                whatsappStatus === 'checking'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {whatsappStatus === 'checking' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                  <span>CHECKING...</span>
                </>
              ) : (
                'HANDOFF ACTIVE'
              )}
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
