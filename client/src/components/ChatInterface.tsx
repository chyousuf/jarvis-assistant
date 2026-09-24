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
  PlusCircle
} from 'lucide-react';
import { Message, Task, Approval } from '../services/api.js';
import { VoiceState } from '../services/voice.js';
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
  onNavigateTab
}) => {
  const [inputText, setInputText] = useState('');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const samplePrompts = [
    "Send a WhatsApp message to Ahmed saying I will be 10 minutes late.",
    "Draft an email to Ali about tomorrow's meeting.",
    "Research quantum computing, create a report, then draft an email with the report attached.",
    "Check my schedule for tomorrow and find free availability slots.",
    "Schedule a meeting with Ali tomorrow at 10 AM.",
    "Ahmed ko WhatsApp message bhejo keh mein 10 minute late hunga"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-5xl mx-auto px-4 py-3">
      {/* Session Toolbar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Active Context Session</span>
        </div>
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
              Accepting English, Urdu, and mixed-language commands. Equipped with WhatsApp Business messaging, OAuth email drafting, calendar scheduling, and sandboxed storage.
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
                <MarkdownRenderer content={msg.content} />

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
                      {onCorrectMessage && (
                        <button
                          onClick={() => {
                            const prevUserMsg = messages
                              .slice(0, msgIdx)
                              .reverse()
                              .find(m => m.sender === 'user');
                            onCorrectMessage(prevUserMsg?.content || '', msg.content);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 text-[10px] font-mono text-cyan-400 border border-slate-700/60 transition-colors ml-1"
                          title="Register this as a correction in the Learning Center"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Correct this</span>
                        </button>
                      )}
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
            className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/50 shadow-lg shadow-amber-950/20 my-2"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold">
                <Shield className="w-4 h-4" />
                <span>EXPLICIT AUTHORIZATION REQUIRED (ID: {appr.id})</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                You can say "Approve" or "Cancel"
              </span>
            </div>
            <p className="text-xs text-amber-200 mb-2 leading-relaxed">
              {appr.description}
            </p>
            <pre className="text-[11px] font-mono bg-slate-950/80 p-2.5 rounded border border-amber-900/60 text-slate-300 mb-3 overflow-x-auto">
              {JSON.stringify(appr.payload, null, 2)}
            </pre>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onResolveApproval(appr.id, 'approved')}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                Authorize Action
              </button>
              <button
                onClick={() => onResolveApproval(appr.id, 'rejected')}
                className="px-4 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-medium text-xs hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Deny & Abort
              </button>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono">JARVIS is synthesizing response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar & Voice Controls */}
      <div className="pt-2 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Push-to-Talk Microphone Button */}
          <button
            type="button"
            onClick={onToggleListening}
            title={isListening ? "Listening... Click to send" : "Click for voice input"}
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              isListening
                ? 'bg-rose-500/30 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening in selected language..." : "Type command or say 'Reply with only: Hello'..."}
              disabled={isLoading}
              className="w-full bg-slate-900 border-2 border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition-all shadow-inner font-sans"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 transition-all shadow-jarvis-glow shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1.5 px-1">
          <div className="flex items-center gap-2">
            <span>Voice: {voiceState.toUpperCase()}</span>
            <span>•</span>
            <span>Say "Confirm" / "Theek hai" for pending authorizations</span>
          </div>
          <div>Press Enter ↵ to dispatch</div>
        </div>
      </div>
    </div>
  );
};
