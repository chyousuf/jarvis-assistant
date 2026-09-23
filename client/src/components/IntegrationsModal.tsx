import React, { useState, useEffect } from 'react';
import { Integration, api } from '../services/api.js';
import { ShieldCheck, Mail, Calendar, Search, HardDrive, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export const IntegrationsModal: React.FC = () => {
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-5 h-5 text-cyan-400" />;
      case 'calendar': return <Calendar className="w-5 h-5 text-cyan-400" />;
      case 'search': return <Search className="w-5 h-5 text-cyan-400" />;
      default: return <HardDrive className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> WORKING / CONNECTED
          </span>
        );
      case 'demo':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertCircle className="w-3 h-3" /> DEMO SIMULATION (SAFE MOCK)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Connected Services & Tool Integrations
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Every tool is labeled with its exact execution level. Sensitive capabilities always trigger confirmation gates.
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                {getIcon(item.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">
                    {item.name}
                  </h3>
                  {getStatusBadge(item.status)}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              {item.status === 'connected' ? (
                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Live & Isolated
                </div>
              ) : (
                <div className="text-[11px] text-amber-400/80 font-mono">
                  Safe Mock Mode
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
