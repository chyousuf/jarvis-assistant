import React, { useState, useEffect } from 'react';
import { EmailRecord, api } from '../services/api.js';
import { Mail, Send, Paperclip, Clock, CheckCircle2, AlertTriangle, Search, Plus, RefreshCw } from 'lucide-react';

export const EmailDashboard: React.FC = () => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const data = await api.getEmails();
      setEmails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) return;
    try {
      const atts = attachments.split(',').map(s => s.trim()).filter(Boolean);
      await api.createDraft(to, subject, body, atts);
      setTo('');
      setSubject('');
      setBody('');
      setAttachments('');
      fetchEmails();
    } catch (err: any) {
      alert(`Error creating draft: ${err.message}`);
    }
  };

  const handleSend = async (draftId: string) => {
    if (!confirm('Authorize sending this email? Provider confirmation will be verified.')) return;
    try {
      await api.sendEmail(draftId);
      fetchEmails();
    } catch (err: any) {
      alert(`Error sending email: ${err.message}`);
    }
  };

  const filtered = emails.filter(e =>
    e.to_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            Email Communications & Drafts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Connected via OAuth 2.0. Immediate drafting with strict confirmation gates before outbound dispatch.
          </p>
        </div>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose / Draft Card (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 h-fit">
          <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Compose or Draft Email
          </h3>
          <form onSubmit={handleDraft} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Recipient (Contact or Email)</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="e.g. Ali or colleague@domain.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Body Text</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email content..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Workspace Attachments</label>
              <input
                type="text"
                value={attachments}
                onChange={(e) => setAttachments(e.target.value)}
                placeholder="notes.md, quantum_report.md"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!to || !subject || !body}
              className="w-full py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all disabled:opacity-40"
            >
              Save Draft
            </button>
          </form>
        </div>

        {/* Email & Drafts List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drafts or sent emails by recipient or subject..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/40 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No emails or drafts found.</p>
              <p className="text-xs text-slate-500 mt-1">Say: "Draft an email to Ali about tomorrow's meeting"</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400">
                      ID: {item.id} • To: {item.to_address}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100 mt-0.5">
                      {item.subject}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${
                    item.status === 'sent'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 mb-3 whitespace-pre-wrap">
                  {item.body}
                </p>

                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.attachments.map((att) => (
                      <span
                        key={att}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3 text-cyan-400" />
                        {att}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                  <span>Provider: {item.provider.toUpperCase()}</span>
                  {item.status === 'draft' && (
                    <button
                      onClick={() => handleSend(item.id)}
                      className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <Send className="w-3 h-3" />
                      Authorize & Send
                    </button>
                  )}
                  {item.status === 'sent' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Confirmed Dispatched ({item.provider_message_id})
                    </span>
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
