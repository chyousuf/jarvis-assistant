import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatInterface } from './components/ChatInterface.js';
import { TaskDashboard } from './components/TaskDashboard.js';
import { EmailDashboard } from './components/EmailDashboard.js';
import { WhatsAppDashboard } from './components/WhatsAppDashboard.js';
import { CalendarDashboard } from './components/CalendarDashboard.js';
import { WorkspaceModal } from './components/WorkspaceModal.js';
import { RemindersModal } from './components/RemindersModal.js';
import { ConnectionsModal } from './components/ConnectionsModal.js';
import { ActivityLogModal } from './components/ActivityLogModal.js';
import { ComputerControlModal } from './components/ComputerControlModal.js';
import { AudioDiagnosticsModal } from './components/AudioDiagnosticsModal.js';
import { VoiceReviewBar } from './components/VoiceReviewBar.js';
import { api, Message, Task, Approval } from './services/api.js';
import { voiceService, VoiceState, LanguageMode, TranscriptResult } from './services/voice.js';
import { Bell, X } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [companionConnected, setCompanionConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [language, setLanguage] = useState<LanguageMode>(() => voiceService.getLanguage());
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [reviewTranscript, setReviewTranscript] = useState<string | null>(null);
  const [reviewConfidence, setReviewConfidence] = useState<number | undefined>(undefined);
  const [reviewIsCorrection, setReviewIsCorrection] = useState(false);
  const [reviewBeforeExecuting, setReviewBeforeExecuting] = useState(true);

  // Active reminder alert banner
  const [activeAlert, setActiveAlert] = useState<{ id: string; title: string; due_at: string } | null>(null);

  // Check companion status periodically
  useEffect(() => {
    const checkCompanion = async () => {
      try {
        const status = await api.getComputerStatus();
        setCompanionConnected(!!status.companionConnected);
      } catch {
        setCompanionConnected(false);
      }
    };
    checkCompanion();
    const interval = setInterval(checkCompanion, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  useEffect(() => {
    api.getHistory().then(setMessages).catch(() => setServerOnline(false));
    api.getTasks().then(setTasks).catch(() => {});
    api.getPendingApprovals().then(setPendingApprovals).catch(() => {});

    // Setup Voice Callbacks with VAD and Review Gate
    voiceService.setCallbacks(
      (result: TranscriptResult) => {
        setVoiceTranscript(result.text);
        if (result.isFinal && result.text.trim()) {
          if (reviewBeforeExecuting) {
            setReviewTranscript(result.text.trim());
            setReviewConfidence(result.confidence);
            setReviewIsCorrection(!!result.isCorrection);
          } else {
            handleSendMessage(result.text.trim());
            setVoiceTranscript('');
          }
          if (!wakeWordEnabled) {
            voiceService.stopListening();
            setIsListening(false);
          }
        }
      },
      (state: VoiceState) => {
        setVoiceState(state);
        setIsListening(state === 'listening');
      },
      (level: number) => {
        setAudioLevel(level);
      }
    );

    // Setup SSE Real-Time Event Stream
    let eventSource: EventSource | null = null;
    try {
      const eventsUrl = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/events`;
      eventSource = new EventSource(eventsUrl);

      eventSource.onopen = () => setServerOnline(true);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'task:created' || payload.type === 'task:updated' || payload.type === 'task:completed') {
            const updatedTask = payload.data as Task;
            setTasks((prev) => {
              const existingIdx = prev.findIndex((t) => t.id === updatedTask.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = updatedTask;
                return next;
              }
              return [updatedTask, ...prev];
            });

            if (updatedTask.status === 'running') {
              setActiveTask(updatedTask);
            } else if (activeTask?.id === updatedTask.id) {
              setActiveTask(updatedTask);
            }
          } else if (payload.type === 'approval:required') {
            api.getPendingApprovals().then(setPendingApprovals);
          } else if (payload.type === 'reminder:due') {
            const rem = payload.data;
            setActiveAlert(rem);
            if (!isMuted) {
              voiceService.speak(`Attention sir, your scheduled reminder is due: ${rem.title}`);
            }
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore
    }

    return () => {
      eventSource?.close();
    };
  }, [wakeWordEnabled, isMuted, activeTask?.id]);

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `usr-${Date.now().toString(36)}`,
      conversation_id: 'default',
      sender: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(text);

      const assistantMessage: Message = {
        id: response.messageId || `jarvis-${Date.now().toString(36)}`,
        conversation_id: 'default',
        sender: 'jarvis',
        content: response.reply,
        tool_calls: response.task ? [response.task] : undefined,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.task) {
        setActiveTask(response.task);
        api.getTasks().then(setTasks);
      }

      // Spoken response
      if (!isMuted && response.audioText) {
        voiceService.speak(response.audioText);
      }

      api.getPendingApprovals().then(setPendingApprovals);
    } catch (err: any) {
      console.error('Send message error:', err);
      const errorMessage: Message = {
        id: `err-${Date.now().toString(36)}`,
        conversation_id: 'default',
        sender: 'system',
        content: `Operational notice: ${err?.message || 'Failed to communicate with JARVIS engine.'}`,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Review handlers
  const handleExecuteReview = (finalText: string) => {
    setReviewTranscript(null);
    setVoiceTranscript('');
    handleSendMessage(finalText);
  };

  const handleTryAgainReview = () => {
    setReviewTranscript(null);
    setVoiceTranscript('');
    handleToggleListening();
  };

  const handleCancelReview = () => {
    setReviewTranscript(null);
    setVoiceTranscript('');
  };

  // Approval handler
  const handleResolveApproval = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await api.resolveApproval(id, decision);
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
      api.getTasks().then(setTasks);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  // Cancel Task
  const handleCancelTask = async (id: string) => {
    try {
      await api.cancelTask(id);
      if (activeTask?.id === id) {
        setActiveTask(null);
      }
      api.getTasks().then(setTasks);
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  // Voice Controls
  const handleToggleListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      voiceService.startListening();
      setIsListening(true);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
  };

  const handleToggleWakeWord = () => {
    const nextState = !wakeWordEnabled;
    setWakeWordEnabled(nextState);
    if (nextState) {
      voiceService.startListening();
      setIsListening(true);
    } else {
      voiceService.stopListening();
      setIsListening(false);
    }
  };

  const handleToggleLanguage = () => {
    const nextLang: LanguageMode = language === 'auto' ? 'en-US' : language === 'en-US' ? 'ur-PK' : 'auto';
    handleLanguageChange(nextLang);
  };

  const handleLanguageChange = (newLang: LanguageMode) => {
    setLanguage(newLang);
    voiceService.setLanguage(newLang);
  };

  const runningTasksCount = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        voiceState={voiceState}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onStopSpeaking={handleStopSpeaking}
        onEmergencyStop={async () => {
          voiceService.stopSpeaking();
          await api.emergencyStop();
        }}
        wakeWordEnabled={wakeWordEnabled}
        onToggleWakeWord={handleToggleWakeWord}
        isListening={isListening}
        onToggleListening={handleToggleListening}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        audioLevel={audioLevel}
        serverOnline={serverOnline}
        activeTaskCount={runningTasksCount}
        companionConnected={companionConnected}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {activeAlert && (
        <div className="bg-cyan-500/20 border-b border-cyan-500/50 px-4 py-2 flex items-center justify-between shadow-jarvis-glow">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <Bell className="w-4 h-4 text-cyan-300 animate-bounce" />
            <div className="text-xs">
              <span className="font-bold text-cyan-200">Scheduled Reminder Due: </span>
              <span className="text-slate-100 font-medium">{activeAlert.title}</span>
            </div>
            <button
              onClick={() => setActiveAlert(null)}
              className="ml-auto p-1 rounded hover:bg-cyan-500/20 text-cyan-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeTaskCount={runningTasksCount}
          companionConnected={companionConnected}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950">
          {activeTab === 'chat' && (
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              activeTask={activeTask}
              pendingApprovals={pendingApprovals}
              onResolveApproval={handleResolveApproval}
              onCancelTask={handleCancelTask}
              voiceState={voiceState}
              isListening={isListening}
              onToggleListening={handleToggleListening}
              voiceTranscript={voiceTranscript}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskDashboard
              tasks={tasks}
              onCancelTask={handleCancelTask}
              onRefresh={() => api.getTasks().then(setTasks)}
            />
          )}

          {activeTab === 'computer' && <ComputerControlModal />}
          {activeTab === 'emails' && <EmailDashboard />}
          {activeTab === 'whatsapp' && <WhatsAppDashboard />}
          {activeTab === 'calendar' && <CalendarDashboard />}
          {activeTab === 'workspace' && <WorkspaceModal />}
          {activeTab === 'reminders' && <RemindersModal />}
          {activeTab === 'connections' && <ConnectionsModal />}
          {activeTab === 'activity' && <ActivityLogModal />}
        </main>
      </div>

      <AudioDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      {reviewTranscript && (
        <VoiceReviewBar
          transcript={reviewTranscript}
          confidence={reviewConfidence}
          isCorrection={reviewIsCorrection}
          onExecute={handleExecuteReview}
          onTryAgain={handleTryAgainReview}
          onCancel={handleCancelReview}
        />
      )}
    </div>
  );
};

export default App;
