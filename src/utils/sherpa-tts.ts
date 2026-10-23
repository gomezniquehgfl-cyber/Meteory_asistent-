/**
 * SherpaTTS v3.4 Integration Module
 * Full Name: SherpaTTS (Text-to-Speech engine based on Next-gen Kaldi)
 * Android Package: org.woheller69.ttsengine
 * Models: Piper low / x_low (ultra-lightweight, efficient offline neural models)
 *
 * 100% Offline, Local, Unlimited & Free speech synthesis fallback
 * when ElevenLabs credits are exhausted or when local offline mode is selected.
 */

import { getApiBaseUrl } from './speech.ts';

export const SHERPA_PACKAGE_NAME = 'org.woheller69.ttsengine';
export const SHERPA_ENGINE_NAME = 'SherpaTTS v3.4';
export const SHERPA_PIPER_MODELS = [
  'es_ES-carlfm-x_low',
  'es_ES-davefx-low',
  'es_MX-ald-low',
];

export class SherpaTTSEngine {
  /**
   * Scans available browser/device synthesis voices for SherpaTTS / Piper engine
   */
  static findSherpaVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Search for org.woheller69.ttsengine or Sherpa/Piper signatures
    const match = voices.find((v) => {
      const uri = (v.voiceURI || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      return (
        uri.includes('org.woheller69.ttsengine') ||
        uri.includes('sherpa') ||
        name.includes('sherpatts') ||
        name.includes('sherpa') ||
        name.includes('woheller') ||
        name.includes('piper') ||
        name.includes('carlfm') ||
        name.includes('davefx')
      );
    });

    if (match) return match;

    // If not found by exact package, find the best Spanish offline voice
    return (
      voices.find((v) => v.lang.startsWith('es') && v.localService) ||
      voices.find((v) => v.lang.startsWith('es')) ||
      null
    );
  }

  /**
   * Synthesize and speak text via SherpaTTS (org.woheller69.ttsengine)
   * Returns true if successfully spoken, false if fallback is required.
   */
  static async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<boolean> {
    if (!text || !text.trim()) {
      onEnd?.();
      return true;
    }

    const clean = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[*_#`~]/g, '')
      .trim();

    // 1. Try Termux/Local OS bridge if available on Android with package org.woheller69.ttsengine
    try {
      const baseUrl = getApiBaseUrl();
      const termuxCmd = `termux-tts-speak -e ${SHERPA_PACKAGE_NAME} -r 0.9 -p 0.85 "${clean.replace(/"/g, '\\"')}"`;
      const res = await fetch(`${baseUrl}/api/os-exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom_exec',
          customCommand: termuxCmd,
          timeoutMs: 4000,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.exitCode === 0) {
          onStart?.();
          // Estimate reading time based on word count
          const words = clean.split(/\s+/).length;
          const readDurationMs = Math.max(1200, words * 280);
          setTimeout(() => {
            onEnd?.();
          }, readDurationMs);
          return true;
        }
      }
    } catch {
      // Fall through to Web Speech API SherpaTTS voice
    }

    // 2. Try window.speechSynthesis utilizing the registered Android TTS engine
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const synth = window.speechSynthesis;
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'es-MX';
        utterance.pitch = 0.55; // Deep authoritative baritone Jarvis resonance
        utterance.rate = 0.80; // Calm, measured deliberate cadence

        const voice = this.findSherpaVoice();
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          onStart?.();
        };

        utterance.onend = () => {
          onEnd?.();
        };

        utterance.onerror = () => {
          onEnd?.();
        };

        synth.speak(utterance);
        return true;
      } catch (e) {
        console.warn('SherpaTTS synthesis exception:', e);
      }
    }

    return false;
  }
}
