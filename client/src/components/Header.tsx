import { Mic, MicOff, Volume2, VolumeX, Square, Shield, Radio, Sparkles, Languages, Monitor, Sliders } from 'lucide-react';
import { VoiceState, LanguageMode } from '../services/voice.js';

export type ActiveTab = 'chat' | 'tasks' | 'computer' | 'emails' | 'whatsapp' | 'calendar' | 'workspace' | 'reminders' | 'connections' | 'activity';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  voiceState: VoiceState;
  isMuted: boolean;
  onToggleMute: () => void;
  onStopSpeaking: () => void;
  onEmergencyStop?: () => void;
  wakeWordEnabled: boolean;
  onToggleWakeWord: () => void;
  isListening: boolean;
  onToggleListening: () => void;
  language: LanguageMode;
  onToggleLanguage: () => void;
  onOpenDiagnostics?: () => void;
  audioLevel?: number;
  serverOnline: boolean;
  activeTaskCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  voiceState,
  isMuted,
  onToggleMute,
  onStopSpeaking,
  onEmergencyStop,
  wakeWordEnabled,
  onToggleWakeWord,
  isListening,
  onToggleListening,
  language,
  onToggleLanguage,
  onOpenDiagnostics,
  audioLevel = 0,
  serverOnline,
  activeTaskCount
}) => {
  return (
    <header className="border-b border-jarvis-border bg-jarvis-card/90 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-jarvis-glow">
            <Radio className={`w-4 h-4 ${voiceState === 'listening' ? 'animate-pulse text-cyan-300' : ''}`} />
            {voiceState === 'speaking' && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                J.A.R.V.I.S.
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                  v1.1
                </span>
              </h1>
              <span className={`inline-block w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 ring-2 ring-emerald-400/20 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Autonomous Multimodal Assistant • WhatsApp & Email Connected
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center justify-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              activeTab === 'tasks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tasks
            {activeTaskCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500 text-slate-950 font-bold">
                {activeTaskCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('computer')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'computer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            Computer
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'emails'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'workspace'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'reminders'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reminders
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'connections'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Connections
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'activity'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Log
          </button>
        </nav>

        {/* Voice and Audio HUD Controls */}
        <div className="flex items-center gap-2">
          {/* Language Toggle (Auto vs English vs Urdu) */}
          <button
            onClick={onToggleLanguage}
            title="Toggle Voice Recognition Language (Auto / English / Urdu)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 text-xs font-mono border border-slate-700 transition-all"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'auto' ? 'AUTO' : (language === 'en-US' ? 'EN' : 'UR')}</span>
          </button>

          {/* Microphone Diagnostics / Audio Settings */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              title="Microphone Selector & Audio Diagnostics"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Push-to-Talk / Listening Toggle */}
          <button
            onClick={onToggleListening}
            title={isListening ? "Listening... Click to stop" : "Click to push-to-talk voice command"}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              isListening
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-lg shadow-rose-500/20 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isListening ? 'Listening...' : 'Voice'}</span>
            {isListening && audioLevel > 0 && (
              <span className="w-1.5 h-3 bg-emerald-400 rounded-sm animate-pulse ml-0.5" style={{ height: `${Math.max(4, Math.min(16, audioLevel / 6))}px` }} />
            )}
          </button>

          {/* Universal Emergency Stop (RUKO) */}
          {onEmergencyStop && (
            <button
              onClick={onEmergencyStop}
              title="Emergency Stop: Halt speech & computer actions immediately (Say 'Stop' or 'Ruko')"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold transition-all shadow-sm"
            >
              <Square className="w-3 h-3 fill-rose-400" />
              <span>STOP</span>
            </button>
          )}

          {/* Stop Audio Output */}
          {voiceState === 'speaking' && (
            <button
              onClick={onStopSpeaking}
              title="Stop speaking"
              className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" />
            </button>
          )}

          {/* Mute Voice Replies Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? "Unmute spoken replies" : "Mute spoken replies"}
            className={`p-1.5 rounded-lg border transition-all ${
              isMuted
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-cyan-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Wake Word Listening (Off by default) */}
          <button
            onClick={onToggleWakeWord}
            title="Wake word ('Hey Jarvis') - Optional, off by default"
            className={`px-2 py-1 rounded-lg text-xs border font-mono flex items-center gap-1 transition-all ${
              wakeWordEnabled
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Wake: {wakeWordEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
