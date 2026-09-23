import React, { useState, useEffect } from 'react';
import { Integration, api } from '../services/api.js';
import {
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unplug,
  Info,
  Globe,
  ExternalLink,
  Laptop
} from 'lucide-react';

export const ConnectionsModal: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  // Dynamic origin calculation for truthful OAuth instructions
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jarvis-assistant-pi-dun.vercel.app';
  const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const data = await api.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;
    try {
      await api.disconnectIntegration(provider);
      fetchIntegrations();
    } catch (err: any) {
      alert(`Error disconnecting: ${err.message}`);
    }
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" /> LIVE / CONFIGURED
          </span>
        );
      case 'demo':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3.5 h-3.5" /> SETUP REQUIRED (SAFE FALLBACK)
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400">
            NOT CONFIGURED
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Service Connections &amp; Granted Permissions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Truthful connection state, verified OAuth credentials, and production/local setup guidelines.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4 mb-8">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-100">{item.name}</h3>
                {getStatusBadge(item.status)}
              </div>

              {/* Granted Scopes */}
              {item.permissions && item.permissions.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Granted Permissions / Scopes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 text-slate-400"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-2">
              {item.type === 'email' && item.status !== 'connected' && (
                <a
                  href={`/api/oauth/${item.id === 'int-gmail' ? 'google' : 'microsoft'}/authorize`}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1.5 shadow"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Connect OAuth 2.0</span>
                </a>
              )}

              {item.status === 'connected' && item.type === 'email' && (
                <button
                  onClick={() => handleDisconnect(item.id === 'int-gmail' ? 'google' : 'microsoft')}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Precise Setup Instructions (Local vs Production Separation) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-xs text-slate-300 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Precise Setup Guide &amp; Environment Configuration
          </h3>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700 text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-cyan-400" />
            Detected Host: {currentOrigin}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google OAuth */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
              1. Google Gmail OAuth 2.0
            </h4>
            <div className="text-slate-400 space-y-1.5 leading-relaxed">
              <p>1. Open <strong>Google Cloud Console</strong> &rarr; Create or select Project.</p>
              <p>2. Enable <strong>Gmail API</strong> in APIs &amp; Services.</p>
              <p>3. Configure OAuth Consent Screen and add the exact Authorized Redirect URI for your current environment:</p>
              
              <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1 my-1">
                <div className="text-[10px] text-slate-400 font-mono">
                  {isLocalhost ? 'Local Development URI:' : 'Production Vercel URI (Active):'}
                </div>
                <code className="text-cyan-300 font-mono select-all block text-[11px]">
                  {currentOrigin}/api/oauth/google/callback
                </code>
              </div>

              {!isLocalhost && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Local Dev URI: <code className="text-slate-400">http://localhost:4001/api/oauth/google/callback</code>
                </div>
              )}

              <p>4. Add credentials to environment variables (Vercel Project Settings or <code>server/.env</code>):</p>
              <code className="text-slate-300 font-mono block p-2 bg-slate-900 rounded border border-slate-800">
                GOOGLE_CLIENT_ID=your_client_id<br />
                GOOGLE_CLIENT_SECRET=your_client_secret
              </code>
            </div>
          </div>

          {/* WhatsApp Cloud API */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
              2. Meta WhatsApp Business Cloud API
            </h4>
            <div className="text-slate-400 space-y-1.5 leading-relaxed">
              <p>1. Open <strong>developers.facebook.com</strong> &rarr; Create App (Business type).</p>
              <p>2. Add <strong>WhatsApp</strong> product to your application.</p>
              <p>3. Note: Personal WhatsApp numbers cannot be queried without Cloud API registration. JARVIS automatically prepares verified direct handoffs (<code>wa.me</code>) if Cloud API keys are omitted.</p>
              <p>4. To activate direct API messaging, set:</p>
              <code className="text-slate-300 font-mono block p-2 bg-slate-900 rounded border border-slate-800">
                WHATSAPP_PHONE_NUMBER_ID=your_number_id<br />
                WHATSAPP_ACCESS_TOKEN=your_system_user_token<br />
                WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
