import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

export interface ChatRequestBody {
  message: string;
  userName?: string;
  customApiKey?: string;
  model?: string;
  telemetry?: {
    batteryLevel?: number;
    isCharging?: boolean;
    memoryRAM_GB?: number;
    cpuCores?: number;
    networkType?: string;
    isOnline?: boolean;
    exactLocalTime?: string;
    exactLocalDate?: string;
    timezone?: string;
  };
}

export async function handleGeminiChat(body: ChatRequestBody): Promise<{ reply: string }> {
  const { message, userName = 'Comandante', customApiKey, model = 'gemini-3.1-flash-lite', telemetry } = body;
  
  // Use user's personal API key if provided; otherwise fallback to environment key
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No se encontró una clave API de Gemini activa. Por favor introduce tu clave API en la configuración del motor o usa el modo Local.');
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Construct silent background telemetry context
  const batteryStr = telemetry?.batteryLevel !== undefined
    ? `Batería del dispositivo: ${telemetry.batteryLevel}% (${telemetry.isCharging ? 'Conectado al cargador' : 'Descargando'})`
    : 'Batería: En parámetros estables';
  const timeStr = telemetry?.exactLocalTime || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = telemetry?.exactLocalDate || new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const tzStr = telemetry?.timezone || 'UTC';
  const hwStr = `Hardware: ${telemetry?.cpuCores || 4} núcleos CPU, RAM: ${telemetry?.memoryRAM_GB ? telemetry.memoryRAM_GB + 'GB' : 'disponible'}, Red: ${telemetry?.networkType || 'conectado'}`;

  const systemInstruction = `Eres METEORY ASISTEN, un asistente cibernético de inteligencia artificial de máxima precisión y lealtad con estilo JARVIS.
Tu usuario se llama Señor ${userName}.
TELEMETRÍA EN TIEMPO REAL EJECUTADA EN SEGUNDO PLANO POR EL SISTEMA OPERATIVO (USA ESTOS DATOS REALES PARA RESPONDER):
- ${batteryStr}
- Hora exacta actual: ${timeStr} (${tzStr})
- Fecha exacta actual: ${dateStr}
- ${hwStr}

REGLA SUPREMA 1: Siempre debes dirigirte al usuario exactamente como "Señor ${userName}" al iniciar o en el desarrollo de tu respuesta.
REGLA SUPREMA 2: Da siempre una respuesta directa, clara y concisa. Ve al grano inmediatamente sin rodeos ni código o depuración visible. Si el usuario pregunta por la batería, hora, fecha, hardware o estado, usa directamente los datos de telemetría de arriba. Tus respuestas son en español formal pero futurista.`;

  // Map requested model alias to valid @google/genai model name
  let targetModel = model;
  if (targetModel.includes('3.5') || targetModel.includes('flash-lite') || targetModel.includes('flasch')) {
    targetModel = 'gemini-3.1-flash-lite';
  } else if (targetModel.includes('flash')) {
    targetModel = 'gemini-3.8-flash';
  }

  const response = await ai.models.generateContent({
    model: targetModel,
    contents: message,
    config: {
      systemInstruction,
      temperature: 0.5,
    },
  });

  const replyText = response.text || `Señor ${userName}, he recibido su orden y la ejecuto de inmediato.`;
  return { reply: replyText };
}
