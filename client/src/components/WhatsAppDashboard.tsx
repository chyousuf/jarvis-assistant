import React, { useState, useEffect } from 'react';
import { WhatsAppRecord, api } from '../services/api.js';
import { MessageSquare, ExternalLink, Send, CheckCheck, Clock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const WhatsAppDashboard: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [text, setText] = useState('');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getWhatsAppMessages();
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handlePrepare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !text) return;
    try {
      await api.prepareWhatsApp(recipient, text);
      setRecipient('');
      setText('');
      fetchMessages();
    } catch (err: any) {
      alert(`Error preparing message: ${err.message}`);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await api.sendWhatsApp(id);
      if (res.handoffUrl) {
        window.open(res.handoffUrl, '_blank');
      }
      fetchMessages();
    } catch (err: any) {
      alert(`Dispatch error: ${err.message}`);
    }
  };

  const getDeliveryBadge = (status: WhatsAppRecord['status']) => {
    switch (status) {
      case 'read':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" /> Read
          </span>
        );
      case 'delivered':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Carrier Delivered
          </span>
        );
      case 'sent':
      case 'accepted':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Clock className="w-3.5 h-3.5" /> Gateway Accepted (Pending Delivery)
          </span>
        );
      case 'handoff_prepared':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ExternalLink className="w-3.5 h-3.5" /> Supported Handoff (wa.me)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-3.5 h-3.5" /> Pending Confirmation
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            WhatsApp Business Platform
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Meta Cloud API compliant. Contact resolution, template eligibility checking, delivery tracking, and supported handoff.
          </p>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Meta Policy & Limitation Notice */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Meta WhatsApp Business Platform & Policy Notice</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          • <strong>Supported Messaging:</strong> Direct API messages require a Meta Developer account with an active WhatsApp Business Cloud API Phone Number ID.
        </p>
        <p className="text-slate-400 leading-relaxed">
          • <strong>24-Hour Customer Care Window:</strong> Free-form text can only be sent within 24 hours of customer initiation. Business-initiated messages outside this window require pre-approved Meta message templates.
        </p>
        <p className="text-slate-400 leading-relaxed">
          • <strong>Personal Account Safety:</strong> JARVIS does not automate or risk personal WhatsApp accounts with unofficial scrapers. If Cloud API credentials are not yet configured, messages are automatically prepared with a supported <code>wa.me</code> direct handoff link for instant user transmission.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 h-fit">
          <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-3">
            Prepare WhatsApp Message
          </h3>
          <form onSubmit={handlePrepare} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Recipient (Contact Name or Phone)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Ahmed Raza, Ali, or +923001234567"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Message Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="I will be 10 minutes late..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={!recipient || !text}
              className="w-full py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all disabled:opacity-40"
            >
              Prepare Message
            </button>
          </form>
        </div>

        {/* Message Log */}
        <div className="lg:col-span-2 space-y-3">
          {messages.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No WhatsApp messages registered.</p>
              <p className="text-xs text-slate-500 mt-1">
                Say: "Send a WhatsApp message to Ahmed saying I will be 10 minutes late."
              </p>
            </div>
          ) : (
            messages.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      {item.recipient_name}
                      <span className="text-[11px] font-mono text-slate-400">
                        ({item.recipient_phone})
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {getDeliveryBadge(item.status)}
                </div>

                <p className="text-xs text-slate-200 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 mb-3">
                  "{item.message_text}"
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono">
                  {item.handoff_url ? (
                    <a
                      href={item.handoff_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Transmit via Supported Handoff (wa.me)</span>
                    </a>
                  ) : (
                    <span className="text-slate-500">
                      ID: {item.provider_message_id || item.id}
                    </span>
                  )}

                  {item.status === 'pending_approval' && (
                    <button
                      onClick={() => handleSend(item.id)}
                      className="px-3 py-1 rounded bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-cyan-400 transition-all"
                    >
                      <Send className="w-3 h-3" /> Confirm & Send
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
