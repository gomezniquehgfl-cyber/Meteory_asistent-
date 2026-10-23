import dotenv from 'dotenv';
dotenv.config();

export interface ElevenLabsRequestBody {
  text: string;
  apiKey?: string;
  voiceId?: string;
}

// Deep Baritone Latino/Multilingual voice presets for Jarvis:
// Default: Brian ("nPczCjzI2devNBz1zQrb") or Antoni ("ErXwobaYiN019PkySvjV") or George ("JBFqnCBsd6RMkjVDRZzb")
const DEFAULT_JARVIS_VOICE_ID = 'nPczCjzI2devNBz1zQrb'; 

export async function handleElevenLabsTTS(body: ElevenLabsRequestBody): Promise<Buffer> {
  const { text, apiKey: customKey, voiceId = DEFAULT_JARVIS_VOICE_ID } = body;
  const apiKey = customKey?.trim() || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('No se encontró una clave API de ElevenLabs configurada.');
  }

  // Sanitize text for speech
  const cleanText = (text || 'Señor, sistemas operativos.')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_#`~]/g, '')
    .trim();

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.85,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
