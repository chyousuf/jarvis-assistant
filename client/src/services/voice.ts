import { normalizeTranscript, parseCorrection, DEFAULT_VOCABULARY, VocabularyContext } from './speechNormalizer.js';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
  SpeechGrammarList?: any;
  webkitSpeechGrammarList?: any;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'ready' | 'speaking';
export type LanguageMode = 'auto' | 'en-US' | 'ur-PK';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface TranscriptResult {
  raw: string;
  text: string;
  isFinal: boolean;
  isCorrection?: boolean;
  confidence?: number;
}

export class VoiceService {
  private recognition: any = null;
  private isSpeaking = false;
  private isMuted = false;
  private isWakeWordEnabled = false;
  private languageMode: LanguageMode = 'auto';
  private selectedDeviceId: string = '';
  private state: VoiceState = 'idle';

  // Web Audio API Pipeline & Level Meter
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioMeterInterval: any = null;
  private currentAudioLevel: number = 0;

  // VAD & Timing
  private silenceTimer: any = null;
  private silenceHangoverMs: number = 1200; // 1.2s natural pause threshold
  private speechDetected: boolean = false;
  private lastInterimText: string = '';

  // Diagnostic Test Recording (In-Memory Only)
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private diagnosticAudioUrl: string | null = null;

  // Vocabulary
  private vocabulary: VocabularyContext = DEFAULT_VOCABULARY;

  // Callbacks
  private onTranscriptCallback: ((result: TranscriptResult) => void) | null = null;
  private onStateChangeCallback: ((state: VoiceState) => void) | null = null;
  private onAudioLevelCallback: ((level: number) => void) | null = null;

  constructor() {
    this.selectedDeviceId = localStorage.getItem('jarvis_mic_device') || '';
    const savedLang = localStorage.getItem('jarvis_voice_lang') as LanguageMode;
    if (savedLang) {
      this.languageMode = savedLang;
    }
    this.initRecognition();
  }

  private initRecognition() {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('Browser does not support SpeechRecognition API.');
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    // Attach Pakistani vocabulary and common desktop app grammar hints if supported
    try {
      const GrammarList = win.SpeechGrammarList || win.webkitSpeechGrammarList;
      if (GrammarList) {
        const speechGrammars = new GrammarList();
        const terms = [
          'WhatsApp', 'Chrome', 'TextEdit', 'Word', 'YouTube', 'Notes',
          'Ali', 'Ahmed', 'Yousaf', 'Usman', 'Bilal', 'Fatima', 'Ayesha', 'Hassan', 'Raza', 'Khan',
          'kholo', 'bhejo', 'likho', 'parho', 'ruko', 'theek hai', 'salam'
        ];
        const grammar = `#JSGF V1.0; grammar jarvisVocab; public <term> = ${terms.join(' | ')} ;`;
        speechGrammars.addFromString(grammar, 1);
        this.recognition.grammars = speechGrammars;
      }
    } catch {
      // SpeechGrammarList not supported on this browser engine; fall back to normalizer
    }

    this.updateRecognitionLanguage();

    this.recognition.onresult = (event: any) => {
      // Loopback prevention: Ignore input if assistant is currently speaking aloud
      if (this.isSpeaking) {
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';
      let itemConfidence: number | undefined = undefined;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item[0]?.confidence !== undefined && item[0]?.confidence > 0) {
          itemConfidence = item[0].confidence;
        }
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      // Voice Activity Detection / Natural Pause handling
      if (interimTranscript) {
        this.speechDetected = true;
        this.lastInterimText = interimTranscript;
        this.setState('listening');

        // Apply phonetic normalization for live interim view
        const normalized = normalizeTranscript(interimTranscript, this.vocabulary);
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback({
            raw: interimTranscript,
            text: normalized.normalized,
            isFinal: false,
            confidence: itemConfidence
          });
        }

        // Reset silence timer on interim speech
        this.resetSilenceTimer();
      }

      if (finalTranscript) {
        this.speechDetected = true;
        this.lastInterimText = '';
        this.handleFinalTranscript(finalTranscript.trim(), itemConfidence);
      }
    };

    this.recognition.onerror = (e: any) => {
      // Don't flip to idle on normal 'no-speech' pauses
      if (e.error !== 'no-speech') {
        console.warn('Speech recognition warning:', e.error);
        if (this.state === 'listening' && !this.speechDetected) {
          this.setState('idle');
        }
      }
    };

    this.recognition.onend = () => {
      // If still in listening mode (e.g. continuous listening), restart gracefully unless stopped
      if (this.state === 'listening' && (this.isWakeWordEnabled || this.speechDetected)) {
        try {
          this.recognition.start();
        } catch {
          this.setState('idle');
        }
      } else if (this.state !== 'speaking' && this.state !== 'processing') {
        this.setState('idle');
      }
    };
  }

  private handleFinalTranscript(rawText: string, confidence?: number) {
    if (!rawText || !rawText.trim()) return;

    // Echo & loopback defense: If assistant was speaking recently, ignore
    if (this.isSpeaking) return;

    // Normalize phonetics, Urdu script, and approved vocabulary
    const normalized = normalizeTranscript(rawText, this.vocabulary);
    const correction = parseCorrection(normalized.normalized);

    // Wake word check if wake word mode is active
    let textToDispatch = normalized.normalized;
    if (this.isWakeWordEnabled) {
      const lower = textToDispatch.toLowerCase();
      if (!lower.includes('jarvis') && !lower.includes('hey jarvis')) {
        return; // Wake word not uttered
      }
      textToDispatch = textToDispatch.replace(/hey\s+jarvis/i, '').replace(/jarvis/i, '').trim();
      if (!textToDispatch) return;
    }

    this.setState('processing');

    if (this.onTranscriptCallback) {
      this.onTranscriptCallback({
        raw: rawText,
        text: correction.isCorrection ? correction.correctedCommand : textToDispatch,
        isFinal: true,
        isCorrection: correction.isCorrection,
        confidence
      });
    }

    // Clear speech detection flag
    this.speechDetected = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    // Allow natural pause (1200ms) before committing if recognizer hasn't emitted isFinal
    this.silenceTimer = setTimeout(() => {
      if (this.speechDetected && this.lastInterimText && this.state === 'listening') {
        this.handleFinalTranscript(this.lastInterimText);
        this.lastInterimText = '';
      }
    }, this.silenceHangoverMs);
  }

  private updateRecognitionLanguage() {
    if (!this.recognition) return;
    if (this.languageMode === 'auto') {
      // In auto mode, default to 'en-US' with multi-language normalization
      this.recognition.lang = 'en-US';
    } else {
      this.recognition.lang = this.languageMode;
    }
  }

  public setVocabulary(vocab: Partial<VocabularyContext>) {
    this.vocabulary = {
      ...this.vocabulary,
      ...vocab
    };
  }

  // --- Audio Pipeline & Microphone Selection ---

  public async getAudioInputDevices(): Promise<AudioDevice[]> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.substring(0, 5)}...`
        }));
    } catch (err) {
      console.warn('Could not enumerate audio devices:', err);
      return [];
    }
  }

  public setSelectedAudioDevice(deviceId: string) {
    this.selectedDeviceId = deviceId;
    localStorage.setItem('jarvis_mic_device', deviceId);
    if (this.state === 'listening') {
      this.stopListening();
      this.startListening();
    }
  }

  public getSelectedAudioDevice(): string {
    return this.selectedDeviceId;
  }

  public async startAudioPipeline(): Promise<void> {
    try {
      if (this.mediaStream) {
        this.stopAudioPipeline();
      }

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1
      };

      if (this.selectedDeviceId) {
        audioConstraints.deviceId = { exact: this.selectedDeviceId };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        // Start VU meter polling
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.audioMeterInterval = setInterval(() => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalize to 0-100%
          const level = Math.min(100, Math.round((avg / 128) * 100));
          this.currentAudioLevel = level;
          if (this.onAudioLevelCallback) {
            this.onAudioLevelCallback(level);
          }
        }, 60);
      }
    } catch (err) {
      console.warn('[VoiceService] Could not initialize Web Audio Pipeline:', err);
    }
  }

  public stopAudioPipeline(): void {
    if (this.audioMeterInterval) {
      clearInterval(this.audioMeterInterval);
      this.audioMeterInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.currentAudioLevel = 0;
    if (this.onAudioLevelCallback) {
      this.onAudioLevelCallback(0);
    }
  }

  // --- Diagnostic Playback Recording ---

  public async startDiagnosticRecording(): Promise<void> {
    if (this.diagnosticAudioUrl) {
      URL.revokeObjectURL(this.diagnosticAudioUrl);
      this.diagnosticAudioUrl = null;
    }
    this.recordedChunks = [];

    const stream = this.mediaStream || await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined
      }
    });

    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };
    this.mediaRecorder.start(100);
  }

  public stopDiagnosticRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve('');
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.diagnosticAudioUrl = URL.createObjectURL(blob);
        resolve(this.diagnosticAudioUrl);
      };

      this.mediaRecorder.stop();
    });
  }

  // --- Recognition Control ---

  public isSupported(): boolean {
    return !!this.recognition && 'speechSynthesis' in window;
  }

  public setLanguage(mode: LanguageMode) {
    this.languageMode = mode;
    localStorage.setItem('jarvis_voice_lang', mode);
    this.updateRecognitionLanguage();
  }

  public getLanguage(): LanguageMode {
    return this.languageMode;
  }

  public setCallbacks(
    onTranscript: (result: TranscriptResult) => void,
    onStateChange: (state: VoiceState) => void,
    onAudioLevel?: (level: number) => void
  ) {
    this.onTranscriptCallback = onTranscript;
    this.onStateChangeCallback = onStateChange;
    if (onAudioLevel) {
      this.onAudioLevelCallback = onAudioLevel;
    }
  }

  public setState(newState: VoiceState) {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  public getState(): VoiceState {
    return this.state;
  }

  public async startListening() {
    this.stopSpeaking();
    await this.startAudioPipeline();

    if (!this.recognition) return;
    try {
      this.updateRecognitionLanguage();
      this.speechDetected = false;
      this.lastInterimText = '';
      this.recognition.start();
      this.setState('listening');
    } catch {
      this.setState('listening');
    }
  }

  public stopListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }

    this.stopAudioPipeline();
    this.speechDetected = false;
    this.setState('idle');
  }

  public setWakeWordEnabled(enabled: boolean) {
    this.isWakeWordEnabled = enabled;
    if (enabled) {
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  public getWakeWordEnabled(): boolean {
    return this.isWakeWordEnabled;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopSpeaking();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- TTS Speech Synthesis with Assistant Loopback Prevention ---

  public speak(text: string) {
    if (this.isMuted || !('speechSynthesis' in window)) return;

    this.stopSpeaking();

    // Echo prevention: mute recognizer while assistant speaks
    this.isSpeaking = true;
    this.setState('speaking');

    const cleanSpeech = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`~]/g, '')
      .replace(/<<<[^>]+>>>/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .substring(0, 300);

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      (v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('George') || v.name.includes('Google UK English Male')) &&
      v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.setState('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      // Delay unmuting recognizer by 300ms to allow room reverb to decay
      setTimeout(() => {
        if (!this.isSpeaking && this.state === 'speaking') {
          this.setState('idle');
        }
      }, 300);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.setState('idle');
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    if (this.state === 'speaking') {
      this.setState('idle');
    }
  }
}

export const voiceService = new VoiceService();
