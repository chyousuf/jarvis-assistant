import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Settings,
  Languages,
  ShieldCheck
} from 'lucide-react';
import { voiceService, AudioDevice, LanguageMode } from '../services/voice.js';

interface AudioDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
}

export const AudioDiagnosticsModal: React.FC<AudioDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange
}) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isRecordingTest, setIsRecordingTest] = useState<boolean>(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load available input devices
  const loadDevices = async () => {
    const list = await voiceService.getAudioInputDevices();
    setDevices(list);
    const active = voiceService.getSelectedAudioDevice();
    if (active) {
      setSelectedDevice(active);
    } else if (list.length > 0) {
      setSelectedDevice(list[0].deviceId);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      voiceService.startAudioPipeline();

      // Listen to live audio levels
      voiceService.setCallbacks(
        () => {},
        () => {},
        (level) => setAudioLevel(level)
      );
    } else {
      setPlaybackUrl(null);
      setIsRecordingTest(false);
    }
  }, [isOpen]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    voiceService.setSelectedAudioDevice(deviceId);
    voiceService.startAudioPipeline();
  };

  const startPlaybackTest = async () => {
    setIsRecordingTest(true);
    setPlaybackUrl(null);
    setTestStatus('Recording 3 seconds... speak into your microphone now.');
    setCountdown(3);

    await voiceService.startDiagnosticRecording();

    let timeLeft = 3;
    const timer = setInterval(async () => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timer);
        const url = await voiceService.stopDiagnosticRecording();
        setPlaybackUrl(url);
        setIsRecordingTest(false);
        setTestStatus('Recording completed! Click play below to verify your microphone capture.');
      }
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0b1220] border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">Microphone &amp; Audio Pipeline</h3>
              <p className="text-xs text-slate-400">Hardware input, VAD sensitivity, and acoustic feedback defense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Microphone Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                Active Microphone Device
              </label>
              <button
                onClick={loadDevices}
                className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
            >
              {devices.length === 0 ? (
                <option value="">Default System Microphone</option>
              ) : (
                devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Live Volume Meter */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Live Input Level (RMS):</span>
              <span className={`font-bold ${audioLevel > 50 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {audioLevel}% {audioLevel > 0 ? '(Signal Active)' : '(Silence)'}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  audioLevel > 70
                    ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-rose-400'
                    : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(4, audioLevel))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              * Speak normally. If the bar moves into green/cyan, your microphone is capturing cleanly.
            </p>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              Recognition Language Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onLanguageChange('auto')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all ${
                  language === 'auto'
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Auto (EN + UR)
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en-US')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all ${
                  language === 'en-US'
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                English (US / PK)
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ur-PK')}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all ${
                  language === 'ur-PK'
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Urdu (اردو)
              </button>
            </div>
          </div>

          {/* 3-Second Playback Test */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Microphone Playback Test
            </span>
            <p className="text-[11px] text-slate-400">
              Record a 3-second sample to hear what the assistant actually hears. Verifies gain, clipping, and room acoustics.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={startPlaybackTest}
                disabled={isRecordingTest}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                  isRecordingTest
                    ? 'bg-rose-500/20 border border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
                }`}
              >
                {isRecordingTest ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-rose-400" />
                    Recording ({countdown}s)...
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    Record 3-Sec Sample
                  </>
                )}
              </button>

              {playbackUrl && (
                <audio ref={audioRef} controls src={playbackUrl} className="h-8 flex-1" />
              )}
            </div>

            {testStatus && (
              <p className="text-[11px] font-mono text-emerald-400 animate-fadeIn">
                ✓ {testStatus}
              </p>
            )}
          </div>

          {/* Acoustic & Privacy Features */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Echo &amp; Assistant TTS Loopback Gating Active</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>1200ms Natural Pause Hangover (VAD)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
