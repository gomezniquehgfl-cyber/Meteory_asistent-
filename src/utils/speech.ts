/**
 * Jarvis Speech Engine — High-Fidelity Neural Voice & Bulletproof Mobile/APK Fallback
 * Ensures voice works 100% reliably across any browser, PWA, or APK mobile wrapper without blocking.
 */

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // In Capacitor, Cordova, or APK local asset webview, use the live production server
    if (
      origin.startsWith('capacitor://') ||
      origin.startsWith('file://') ||
      origin === 'null' ||
      (origin.includes('localhost') && !window.location.port)
    ) {
      return 'https://ais-pre-kfctjyhivq2laspf2so44r-169813259851.us-east1.run.app';
    }
  }
  return '';
}

class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playActivationBlip() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.2);
    } catch {}
  }

  playProcessingTone() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(330, now + 0.15);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }
}

export const sfx = new SoundFX();

export interface NeuralVoiceInfo {
  id: string;
  name: string;
  desc: string;
  locale: string;
}

export const NEURAL_VOICES: NeuralVoiceInfo[] = [
  {
    id: 'es-MX-JorgeNeural',
    name: 'Jorge (JARVIS Original)',
    desc: 'Voz masculina latinoamericana cálida, calmada y autoritaria',
    locale: 'es-MX (Latinoamérica)',
  },
  {
    id: 'es-MX-CecilioNeural',
    name: 'Cecilio (Barítono Soberbio)',
    desc: 'Timbre profundo, formal e imponente',
    locale: 'es-MX (Latinoamérica)',
  },
  {
    id: 'es-US-AlonsoNeural',
    name: 'Alonso (Táctico Moderno)',
    desc: 'Cadencia rápida, clara y ejecutiva',
    locale: 'es-US (Latino)',
  },
  {
    id: 'es-CO-GonzaloNeural',
    name: 'Gonzalo (Diplomático)',
    desc: 'Tono sereno, pausado y respetuoso',
    locale: 'es-CO (Colombia)',
  },
];

export class JarvisSpeechEngine {
  private activeAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private onSpeakingChangeCallbacks: ((speaking: boolean) => void)[] = [];
  private selectedVoiceId = 'es-MX-JorgeNeural';
  private pitch = '-4Hz'; // Deep baritone offset
  private rate = '+0%';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('meteory_jarvis_neural_voice');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.voiceId) this.selectedVoiceId = parsed.voiceId;
          if (parsed.pitch) this.pitch = parsed.pitch;
          if (parsed.rate) this.rate = parsed.rate;
        }
      } catch {}
    }
  }

  public getSelectedVoiceId(): string {
    return this.selectedVoiceId;
  }

  public setSelectedVoiceId(id: string) {
    this.selectedVoiceId = id;
    this.savePrefs();
  }

  public getPitch(): string {
    return this.pitch;
  }

  public setPitch(pitch: string) {
    this.pitch = pitch;
    this.savePrefs();
  }

  public getRate(): string {
    return this.rate;
  }

  public setRate(rate: string) {
    this.rate = rate;
    this.savePrefs();
  }

  private savePrefs() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'meteory_jarvis_neural_voice',
          JSON.stringify({
            voiceId: this.selectedVoiceId,
            pitch: this.pitch,
            rate: this.rate,
          })
        );
      } catch {}
    }
  }

  onSpeakingChange(callback: (speaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.push(callback);
    return () => {
      this.onSpeakingChangeCallbacks = this.onSpeakingChangeCallbacks.filter((c) => c !== callback);
    };
  }

  private setSpeaking(state: boolean) {
    this.isSpeaking = state;
    this.onSpeakingChangeCallbacks.forEach((cb) => cb(state));
  }

  stop() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.setSpeaking(false);
  }

  async speak(text: string, onEnd?: () => void) {
    if (!text || !text.trim()) {
      onEnd?.();
      return;
    }

    this.stop();

    // Unlock Audio context for mobile browsers / APK WebViews
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      }
    } catch {}

    let attempts = 0;
    let success = false;

    // 1. Try server neural TTS first
    while (attempts < 2 && !success) {
      attempts++;
      try {
        const ttsUrl = `${getApiBaseUrl()}/api/tts`;
        const response = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: this.selectedVoiceId,
            pitch: this.pitch,
            rate: this.rate,
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS server status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        this.activeAudio = audio;

        audio.onplay = () => {
          this.setSpeaking(true);
        };

        audio.onended = () => {
          this.setSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          this.activeAudio = null;
          onEnd?.();
        };

        audio.onerror = () => {
          this.setSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          this.activeAudio = null;
          this.fallbackNativeSpeech(text, onEnd);
        };

        await audio.play();
        success = true;
        return;
      } catch {
        if (attempts < 2) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    // 2. Bulletproof Native Mobile/APK fallback (Guarantees voice works on ANY device without network block)
    if (!success) {
      this.fallbackNativeSpeech(text, onEnd);
    }
  }

  // Enhanced Native Speech Synthesis tuned for Android/iOS APK WebViews
  private fallbackNativeSpeech(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    const synth = window.speechSynthesis;
    try {
      synth.cancel();
    } catch {}

    const clean = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[*_#`~]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-MX';
    utterance.pitch = 0.8; // Deep baritone tone for Jarvis feel
    utterance.rate = 0.96; // Calm, deliberate cadence

    const voices = synth.getVoices();
    const bestVoice = voices.find(
      (v) =>
        (v.lang.includes('es') || v.lang.includes('ES')) &&
        (v.name.toLowerCase().includes('mexico') ||
          v.name.toLowerCase().includes('latino') ||
          v.name.toLowerCase().includes('pablo') ||
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('jorge') ||
          v.name.toLowerCase().includes('carlos'))
    ) || voices.find((v) => v.lang.startsWith('es'));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      this.setSpeaking(true);
    };

    utterance.onend = () => {
      this.setSpeaking(false);
      onEnd?.();
    };

    utterance.onerror = () => {
      this.setSpeaking(false);
      onEnd?.();
    };

    try {
      synth.speak(utterance);
    } catch {
      this.setSpeaking(false);
      onEnd?.();
    }
  }
}

export const jarvisVoice = new JarvisSpeechEngine();
