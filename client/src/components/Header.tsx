import React from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Square,
  Radio,
  Sparkles,
  Languages,
  Sliders,
  Menu
} from 'lucide-react';
import { VoiceState, LanguageMode } from '../services/voice.js';

export type ActiveTab =
  | 'chat'
  | 'tasks'
  | 'computer'
  | 'emails'
  | 'whatsapp'
  | 'calendar'
  | 'workspace'
  | 'reminders'
  | 'connections'
  | 'activity';

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
  companionConnected?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
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
  companionConnected = false,
  onToggleSidebar
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title="Toggle Navigation Menu"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-all md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

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
                  v1.2
                </span>
              </h1>
              <span
                title={serverOnline ? 'Cloud Serverless Engine Online' : 'Connecting to Server...'}
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  serverOnline ? 'bg-emerald-400 ring-2 ring-emerald-400/20 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Autonomous Assistant •{' '}
              <span className={companionConnected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {companionConnected ? 'Mac Companion Linked' : 'Companion Standby'}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Voice HUD & Emergency Controls */}
        <div className="flex items-center gap-2">
          {/* Universal Emergency Stop (RUKO) - Highly Visible Red Button */}
          {onEmergencyStop && (
            <button
              onClick={onEmergencyStop}
              title="Emergency Stop: Halt speech & computer actions immediately (Say 'Stop' or 'Ruko')"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold tracking-wide transition-all shadow-md shadow-rose-900/40"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>STOP</span>
            </button>
          )}

          {/* Stop Audio Speaking */}
          {voiceState === 'speaking' && (
            <button
              onClick={onStopSpeaking}
              title="Stop speaking"
              className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" />
            </button>
          )}

          {/* Push-to-Talk / Listening Toggle */}
          <button
            onClick={onToggleListening}
            title={isListening ? 'Listening... Click to stop' : 'Click to push-to-talk voice command'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isListening
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-lg shadow-rose-500/20 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
            {isListening && audioLevel > 0 && (
              <span
                className="w-1.5 h-3 bg-emerald-400 rounded-sm animate-pulse ml-0.5"
                style={{ height: `${Math.max(4, Math.min(16, audioLevel / 6))}px` }}
              />
            )}
          </button>

          {/* Language Toggle (Auto vs English vs Urdu) */}
          <button
            onClick={onToggleLanguage}
            title="Toggle Voice Recognition Language (Auto / English / Urdu)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-slate-200 hover:text-cyan-400 text-xs font-mono border border-slate-700 transition-all"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'auto' ? 'AUTO' : language === 'en-US' ? 'EN' : 'UR'}</span>
          </button>

          {/* Microphone Diagnostics / Audio Settings */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              title="Microphone Selector & Audio Diagnostics"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mute Voice Replies Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute spoken replies' : 'Mute spoken replies'}
            className={`p-1.5 rounded-lg border transition-all ${
              isMuted
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-cyan-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Wake Word Listening (Off by default) */}
          <button
            onClick={onToggleWakeWord}
            title="Wake word ('Hey Jarvis') - Optional, off by default"
            className={`px-2 py-1.5 rounded-lg text-xs border font-mono hidden md:flex items-center gap-1 transition-all ${
              wakeWordEnabled
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300'
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
