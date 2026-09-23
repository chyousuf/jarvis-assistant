import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header.js';
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
import { api, Message, Task, Approval } from './services/api.js';
import { voiceService, VoiceState } from './services/voice.js';
import { Bell, X } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'ur-PK'>('en-US');

  // Active reminder alert banner
  const [activeAlert, setActiveAlert] = useState<{ id: string; title: string; due_at: string } | null>(null);

  // Load initial data
  useEffect(() => {
    api.getHistory().then(setMessages).catch(() => setServerOnline(false));
    api.getTasks().then(setTasks).catch(() => {});
    api.getPendingApprovals().then(setPendingApprovals).catch(() => {});

    // Setup Voice Callbacks
    voiceService.setCallbacks(
      (text: string, isFinal: boolean) => {
        setVoiceTranscript(text);
        if (isFinal && text.trim()) {
          handleSendMessage(text.trim());
          setVoiceTranscript('');
          if (!wakeWordEnabled) {
            voiceService.stopListening();
            setIsListening(false);
          }
        }
      },
      (state: VoiceState) => {
        setVoiceState(state);
        setIsListening(state === 'listening');
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
    setIsLoading(true);
    try {
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: 'default',
        sender: 'user',
        content: text,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const response = await api.sendMessage(text);

      const jarvisMsg: Message = {
        id: response.messageId || `jarvis-${Date.now()}`,
        conversation_id: 'default',
        sender: 'jarvis',
        content: response.reply,
        tool_calls: response.task,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, jarvisMsg]);

      if (response.task) {
        setActiveTask(response.task);
        api.getTasks().then(setTasks);
      }

      if (!isMuted && response.audioText) {
        voiceService.speak(response.audioText);
      }

      api.getPendingApprovals().then(setPendingApprovals);

    } catch (err: any) {
      console.error(err);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        conversation_id: 'default',
        sender: 'jarvis',
        content: `Operational error: ${err.message || 'Could not communicate with JARVIS Core.'}`,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Handlers
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
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    voiceService.setMuted(nextMuted);
  };

  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
  };

  const handleToggleWakeWord = () => {
    const next = !wakeWordEnabled;
    setWakeWordEnabled(next);
    voiceService.setWakeWordEnabled(next);
  };

  const handleToggleLanguage = () => {
    const nextLang = language === 'en-US' ? 'ur-PK' : 'en-US';
    setLanguage(nextLang);
    voiceService.setLanguage(nextLang);
  };

  // Task & Approval Handlers
  const handleCancelTask = async (id: string) => {
    await api.cancelTask(id);
    const updated = await api.getTasks();
    setTasks(updated);
    if (activeTask?.id === id) {
      setActiveTask(null);
    }
  };

  const handleResolveApproval = async (id: string, decision: 'approved' | 'rejected') => {
    await api.resolveApproval(id, decision);
    const pending = await api.getPendingApprovals();
    setPendingApprovals(pending);
    const updated = await api.getTasks();
    setTasks(updated);
  };

  const runningTasksCount = tasks.filter((t) => t.status === 'running').length;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans">
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
        serverOnline={serverOnline}
        activeTaskCount={runningTasksCount}
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

      <main className="flex-1">
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
  );
};

export default App;
