interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export class VoiceService {
  private recognition: any = null;
  private isSpeaking = false;
  private isMuted = false;
  private isWakeWordEnabled = false; // OFF BY DEFAULT
  private language: 'en-US' | 'ur-PK' = 'en-US';
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onStateChangeCallback: ((state: VoiceState) => void) | null = null;
  private state: VoiceState = 'idle';

  constructor() {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (finalTranscript && this.onTranscriptCallback) {
          if (this.isWakeWordEnabled) {
            const lower = finalTranscript.toLowerCase();
            if (lower.includes('jarvis') || lower.includes('hey jarvis')) {
              const cleaned = finalTranscript.replace(/hey\s+jarvis/i, '').replace(/jarvis/i, '').trim();
              if (cleaned) {
                this.onTranscriptCallback(cleaned, true);
              }
            }
          } else {
            this.onTranscriptCallback(finalTranscript.trim(), true);
          }
        } else if (interimTranscript && this.onTranscriptCallback) {
          this.onTranscriptCallback(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        if (e.error !== 'no-speech') {
          this.setState('idle');
        }
      };

      this.recognition.onend = () => {
        if (this.state === 'listening' && !this.isWakeWordEnabled) {
          this.setState('idle');
        }
      };
    }
  }

  public isSupported(): boolean {
    return !!this.recognition && 'speechSynthesis' in window;
  }

  public setLanguage(lang: 'en-US' | 'ur-PK') {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getLanguage(): 'en-US' | 'ur-PK' {
    return this.language;
  }

  public setCallbacks(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange: (state: VoiceState) => void
  ) {
    this.onTranscriptCallback = onTranscript;
    this.onStateChangeCallback = onStateChange;
  }

  private setState(newState: VoiceState) {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  public getState(): VoiceState {
    return this.state;
  }

  public startListening() {
    if (!this.recognition) return;
    try {
      this.stopSpeaking();
      this.recognition.lang = this.language;
      this.recognition.start();
      this.setState('listening');
    } catch {
      this.setState('listening');
    }
  }

  public stopListening() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {
      // Ignore
    }
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

  public speak(text: string) {
    if (this.isMuted || !('speechSynthesis' in window)) return;

    this.stopSpeaking();

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
      this.setState('idle');
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
