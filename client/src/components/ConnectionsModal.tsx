import React, { useState, useEffect } from 'react';
import { Integration, api } from '../services/api.js';
import { Shield, Key, Lock, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Unplug, Info } from 'lucide-react';

export const ConnectionsModal: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

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
            <CheckCircle2 className="w-3.5 h-3.5" /> LIVE / CONNECTED
          </span>
        );
      case 'demo':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3.5 h-3.5" /> DEMO SIMULATION (SAFE MOCK)
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
            Service Connections & Granted Permissions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real connection state, scoped OAuth permissions, disconnect controls, and setup instructions. Credentials remain strictly server-side.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4 mb-8">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  {item.name}
                </h3>
                {getStatusBadge(item.status)}
              </div>

              {/* Granted Scopes */}
              {item.permissions && item.permissions.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Granted Permissions / Scopes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.permissions.map(perm => (
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
                {item.capabilities.map(cap => (
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

      {/* Precise Setup Instructions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-xs text-slate-300 space-y-4">
        <h3 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Precise Setup Guide for Real-World External Accounts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
              1. Google Gmail OAuth 2.0
            </h4>
            <p className="text-slate-400 leading-relaxed">
              1. Open <strong>Google Cloud Console</strong> &rarr; Create Project.<br/>
              2. Enable <strong>Gmail API</strong> in APIs & Services.<br/>
              3. Configure OAuth Consent Screen and add redirect URI: <code className="text-cyan-400 font-mono">http://localhost:4001/api/oauth/google/callback</code>.<br/>
              4. Add client credentials in <code>server/.env</code>:<br/>
              <code className="text-slate-300 font-mono block p-1.5 mt-1 bg-slate-900 rounded">
                GOOGLE_CLIENT_ID=your_id<br/>
                GOOGLE_CLIENT_SECRET=your_secret
              </code>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
              2. WhatsApp Business Platform (Meta Cloud API)
            </h4>
            <p className="text-slate-400 leading-relaxed">
              1. Go to <strong>developers.facebook.com</strong> &rarr; Create App (Business type).<br/>
              2. Add <strong>WhatsApp</strong> product to your app.<br/>
              3. Copy your <strong>Phone Number ID</strong> and <strong>System User Access Token</strong>.<br/>
              4. Add in <code>server/.env</code>:<br/>
              <code className="text-slate-300 font-mono block p-1.5 mt-1 bg-slate-900 rounded">
                WHATSAPP_PHONE_NUMBER_ID=your_phone_id<br/>
                WHATSAPP_ACCESS_TOKEN=your_permanent_token
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
