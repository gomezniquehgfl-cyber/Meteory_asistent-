import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TTSRequestBody {
  text: string;
  voice?: string;
  pitch?: string;
  rate?: string;
}

// In-memory LRU audio cache to guarantee instant response and avoid rate limits on repeated phrases
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 150;

// Map phonetic pronunciations for natural Jarvis delivery
function prepareJarvisText(text: string): string {
  return text
    .replace(/METEORY\s+ASISTEN/gi, 'Meteori Asisten')
    .replace(/METEORY/gi, 'Meteori')
    .replace(/ASISTEN/gi, 'Asisten')
    .replace(/\bNiquel\b/gi, 'Níquel')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_#`~]/g, '')
    .trim();
}

export async function handleNeuralTTS(body: TTSRequestBody): Promise<Buffer> {
  const {
    text,
    voice = 'es-MX-JorgeNeural',
    pitch = '-4Hz',
    rate = '-10%',
  } = body;

  const cleanText = prepareJarvisText(text || 'Señor, sistemas en línea.');
  const cacheKey = `${voice}_${pitch}_${rate}_${cleanText}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const tmpFile = path.join(os.tmpdir(), `jarvis_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

  let attempts = 0;
  let success = false;
  let lastError: any = null;

  while (attempts < 3 && !success) {
    attempts++;
    try {
      const tts = new EdgeTTS({
        voice: voice || 'es-MX-JorgeNeural',
        pitch: pitch || '-4Hz',
        rate: rate || '-10%',
      });

      await tts.ttsPromise(cleanText, tmpFile);
      if (fs.existsSync(tmpFile)) {
        const audioBuffer = fs.readFileSync(tmpFile);
        if (audioBuffer && audioBuffer.length > 100) {
          success = true;
          if (audioCache.size >= MAX_CACHE_SIZE) {
            const firstKey = audioCache.keys().next().value;
            if (firstKey) audioCache.delete(firstKey);
          }
          audioCache.set(cacheKey, audioBuffer);
          return audioBuffer;
        }
      }
    } catch (err) {
      lastError = err;
      // Wait with exponential backoff before retry
      await new Promise((resolve) => setTimeout(resolve, attempts * 400));
    } finally {
      if (fs.existsSync(tmpFile)) {
        try {
          fs.unlinkSync(tmpFile);
        } catch {}
      }
    }
  }

  throw lastError || new Error('No se pudo sintetizar la voz neural tras varios intentos.');
}
