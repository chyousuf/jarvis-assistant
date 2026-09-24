import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Mail,
  Calendar,
  ExternalLink,
  Key,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Edit3,
  PlusCircle,
  BookOpen,
  X,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Message, Task, Approval, Citation, api } from '../services/api.js';
import { VoiceState, LanguageMode } from '../services/voice.js';
import { ActiveTab } from './Header.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  onNewConversation?: () => void;
  onCorrectMessage?: (originalRequest: string, incorrectInterpretation: string) => void;
  isLoading: boolean;
  activeTask?: Task | null;
  pendingApprovals: Approval[];
  onResolveApproval: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
  onCancelTask: (id: string) => Promise<void>;
  voiceState: VoiceState;
  isListening: boolean;
  onToggleListening: () => void;
  voiceTranscript: string;
  language?: LanguageMode;
  onToggleLanguage?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onNewConversation,
  onCorrectMessage,
  isLoading,
  activeTask,
  pendingApprovals,
  onResolveApproval,
  onCancelTask,
  voiceState,
  isListening,
  onToggleListening,
  voiceTranscript,
  language = 'auto',
  onToggleLanguage,
  onNavigateTab
}) => {
  const [inputText, setInputText] = useState('');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCitationModal, setActiveCitationModal] = useState<Citation | null>(null);

  // Scoped Correction Modal
  const [scopedModal, setScopedModal] = useState<{
    open: boolean;
    originalRequest: string;
    incorrectInterpretation: string;
    approvedCorrection: string;
    scope: 'once' | 'conversation' | 'reusable';
  } | null>(null);
  const [correctionNotice, setCorrectionNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedbackMap(prev => ({ ...prev, [msgId]: prev[msgId] === type ? undefined as any : type }));
  };

  const handleCopy = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sync voice transcript to input if actively speaking
  useEffect(() => {
    if (voiceTranscript) {
      setInputText(voiceTranscript);
    }
  }, [voiceTranscript]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTask, pendingApprovals]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    onSendMessage(text);
  };

  const handleSaveScopedCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopedModal || !scopedModal.approvedCorrection.trim()) return;

    try {
      await api.addCorrection({
        originalRequest: scopedModal.originalRequest.trim(),
        incorrectInterpretation: scopedModal.incorrectInterpretation.trim(),
        approvedCorrection: scopedModal.approvedCorrection.trim(),
        scope: scopedModal.scope
      });

      setCorrectionNotice(`Rule saved (${scopedModal.scope} scope): JARVIS will follow this rule.`);
      setScopedModal(null);
      setTimeout(() => setCorrectionNotice(null), 4000);
    } catch (err: any) {
      alert(`Failed to save correction: ${err.message}`);
    }
  };

  const samplePrompts = [
    "Research a topic on quantum computing, cite sources, and save a report",
    "Read this approved document and answer my question with citations",
    "Open TextEdit, write 'Meeting notes on product design', and save it in my approved folder",
    "Draft an email to Ali with subject 'Project Update' saying 'Here is the summary.'",
    "Send a WhatsApp message to Ahmed saying I will be 10 minutes late.",
    "What is 31 multiplied by 8?",
    "Subtract 13 from your previous answer"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-5xl mx-auto px-4 py-3">
      {/* Session Toolbar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Active Context Session</span>
          {correctionNotice && (
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] animate-fadeIn">
              ✓ {correctionNotice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('learning')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 transition-all"
              title="Open Learning Center"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Learning Center</span>
            </button>
          )}
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 transition-all shadow-sm"
              title="Start new conversation with isolated context"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Conversation</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
        {messages.length === 0 && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-jarvis-glow">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold font-mono tracking-wide text-slate-100 mb-1">
              J.A.R.V.I.S. Core Online
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mb-5 leading-relaxed">
              Accepting English, Urdu, and mixed-language commands. Grounded document research, scoped learning corrections, desktop note-taking, and bounded tool gates.
            </p>

            {/* Quick Sample Prompts */}
            <div className="w-full max-w-2xl text-left">
              <p className="text-[11px] uppercase tracking-wider font-mono text-cyan-400/80 mb-2.5 text-center">
                Suggested Commands
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(prompt)}
                    className="p-2.5 text-left text-xs bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-slate-300 transition-all flex items-start gap-2 group"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 mt-0.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg, msgIdx) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                msg.sender === 'user' ? 'text-cyan-300' : 'text-slate-300'
              }`}>
                {msg.sender === 'user' ? 'You' : 'JARVIS'}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-950/80 text-cyan-100 border border-cyan-500/50 shadow-sm font-medium'
                  : 'bg-slate-900 text-slate-100 border border-slate-700 shadow-md font-sans'
              }`}
            >
              <div>
                {/* Applied Correction Notification Badge */}
                {msg.sender === 'jarvis' && msg.appliedCorrection && (
                  <div className="mb-2.5 py-1 px-2.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 flex items-center justify-between shadow-sm">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        <strong>Used approved correction</strong> ({msg.appliedCorrection.scope}): &ldquo;{msg.appliedCorrection.approvedCorrection}&rdquo;
                      </span>
                    </span>
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('learning')}
                        className="text-[10px] text-cyan-400 hover:text-cyan-200 underline ml-2 shrink-0"
                      >
                        View Rule
                      </button>
                    )}
                  </div>
                )}

                <MarkdownRenderer content={msg.content} />

                {/* Grounded Evidence Citations */}
                {msg.sender === 'jarvis' && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 mr-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-cyan-400" /> Grounded Evidence:
                    </span>
                    {msg.citations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCitationModal(c)}
                        className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-cyan-950 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-mono text-cyan-300 transition-colors flex items-center gap-1 shadow-sm"
                        title="Click to view full passage from approved document"
                      >
                        <span>[Source: {c.docTitle}, Section {c.sectionIndex + 1}]</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Assistant Message Actions & Feedback */}
                {msg.sender === 'jarvis' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleFeedback(msg.id, 'up')}
                        title="Good response"
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${feedbackMap[msg.id] === 'up' ? 'text-emerald-400' : 'text-slate-400'}`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'down')}
                        title="Needs improvement"
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${feedbackMap[msg.id] === 'down' ? 'text-rose-400' : 'text-slate-400'}`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const prevUserMsg = messages
                            .slice(0, msgIdx)
                            .reverse()
                            .find(m => m.sender === 'user');
                          setScopedModal({
                            open: true,
                            originalRequest: prevUserMsg?.content || '',
                            incorrectInterpretation: msg.content,
                            approvedCorrection: '',
                            scope: 'reusable'
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 text-[10px] font-mono text-cyan-400 border border-slate-700/60 transition-colors ml-1"
                        title="Open Scoped Correction Modal"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Correct this</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-[10px]"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {msg.sender === 'jarvis' && onNavigateTab && (msg.content.includes('Connections') || msg.content.includes('AI Service Unavailable')) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => onNavigateTab('connections')}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-all group shadow-sm"
                    >
                      <Key className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
                      <span>Open Connections &amp; Add AI Key &rarr;</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Inline Active Task Progress Card */}
        {activeTask && activeTask.status === 'running' && (
          <div className="my-2.5 p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-jarvis-glow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono font-semibold text-cyan-300">
                  {activeTask.title}
                </span>
              </div>
              <button
                onClick={() => onCancelTask(activeTask.id)}
                className="text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-mono transition-all"
              >
                Cancel Task
              </button>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_#00e5ff]"
                style={{ width: `${activeTask.progress}%` }}
              />
            </div>

            <div className="space-y-1">
              {activeTask.steps.map((step) => (
                <div key={step.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center gap-2">
                    {step.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {step.status === 'running' && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                    {step.status === 'pending' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                    {step.status === 'needs_approval' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                    {step.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                    <span className={step.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-300'}>
                      {step.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Approvals Banners */}
        {pendingApprovals.map((appr) => (
          <div
            key={appr.id}
            className="my-3 p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 animate-slideUp shadow-lg"
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 mb-1">
                  Authorization Required: {appr.action_type.replace('_', ' ')}
                </h4>
                <p className="text-xs text-slate-300 mb-3">{appr.description}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onResolveApproval(appr.id, 'approved')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize</span>
                  </button>
                  <button
                    onClick={() => onResolveApproval(appr.id, 'rejected')}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 text-xs font-mono text-cyan-400">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>JARVIS is evaluating context and resolving response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="mt-2 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Listening to speech... (Urdu, English, Roman-Urdu)'
                : 'Ask JARVIS, request calculations, research reports, or dictate a command...'
            }
            disabled={isLoading}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 pr-24 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                title={`Speech Language: ${language === 'auto' ? 'Auto (EN+UR)' : language === 'en-US' ? 'English (PK/US)' : 'Urdu (اردو)'}. Click to switch.`}
                className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-cyan-300 font-bold transition-all"
              >
                {language === 'auto' ? 'AUTO' : language === 'en-US' ? 'EN' : 'UR'}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleListening}
              title={isListening ? 'Stop listening' : 'Start voice input (English / Urdu)'}
              className={`p-2 rounded-lg transition-all ${
                isListening
                  ? 'bg-rose-500/30 text-rose-400 border border-rose-500/60 animate-pulse'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-40 disabled:hover:bg-cyan-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Scoped Correction Modal */}
      {scopedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wide">
                  Scoped Correction Rule
                </h3>
              </div>
              <button
                onClick={() => setScopedModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScopedCorrection} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  1. When I ask / User Request:
                </label>
                <input
                  type="text"
                  value={scopedModal.originalRequest}
                  onChange={(e) => setScopedModal({ ...scopedModal, originalRequest: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  2. What JARVIS did wrong (Incorrect interpretation):
                </label>
                <textarea
                  rows={2}
                  value={scopedModal.incorrectInterpretation}
                  onChange={(e) => setScopedModal({ ...scopedModal, incorrectInterpretation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-cyan-400 mb-1">
                  3. Approved Correction / What JARVIS should do instead:
                </label>
                <textarea
                  rows={3}
                  value={scopedModal.approvedCorrection}
                  onChange={(e) => setScopedModal({ ...scopedModal, approvedCorrection: e.target.value })}
                  placeholder="e.g. Always provide exact numbers without rounding, or format greeting politely..."
                  className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/40 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
                  4. Scope of this Correction:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'once', label: 'Once (Single turn)', desc: 'Next turn only' },
                    { id: 'conversation', label: 'Conversation', desc: 'Current session' },
                    { id: 'reusable', label: 'Reusable Rule', desc: 'Permanent memory' }
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setScopedModal({ ...scopedModal, scope: s.id as any })}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        scopedModal.scope === s.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">{s.label}</div>
                      <div className="text-[10px] text-slate-400">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setScopedModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-md"
                >
                  Save &amp; Apply Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cited Passage Modal */}
      {activeCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-cyan-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-100">
                    {activeCitationModal.docTitle}
                  </h3>
                  <p className="text-[10px] font-mono text-cyan-400">
                    Section {activeCitationModal.sectionIndex + 1} &bull; Grounded Passage
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCitationModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed max-h-80 overflow-y-auto font-sans whitespace-pre-wrap">
              {activeCitationModal.fullContent}
            </div>

            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2 text-[11px] text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Untrusted Evidence Boundary</strong>: This passage is external reference evidence provided for truthful fact extraction. Tool permissions and code executions are strictly quarantined outside the model.
              </span>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveCitationModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
