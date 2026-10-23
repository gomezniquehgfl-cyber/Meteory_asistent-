import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

export interface ChatRequestBody {
  message: string;
  userName?: string;
  provider?: 'gemini' | 'openai' | 'openrouter';
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
  const {
    message,
    userName = 'Comandante',
    provider = 'gemini',
    customApiKey,
    model,
    telemetry,
  } = body;

  // Construct background telemetry
  const batteryStr = telemetry?.batteryLevel !== undefined
    ? `Batería del terminal: ${telemetry.batteryLevel}% (${telemetry.isCharging ? 'Conectado al cargador' : 'Descargando'})`
    : 'Batería: En parámetros estables';
  const timeStr = telemetry?.exactLocalTime || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = telemetry?.exactLocalDate || new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const tzStr = telemetry?.timezone || 'UTC';
  const hwStr = `Hardware: ${telemetry?.cpuCores || 4} núcleos CPU, RAM: ${telemetry?.memoryRAM_GB ? telemetry.memoryRAM_GB + 'GB' : 'disponible'}, Red: ${telemetry?.networkType || 'conectado'}`;

  const userSurname = userName?.trim() || 'Comandante';
  const honorific = `Señor ${userSurname}`;

  const systemInstruction = `A partir de ahora, eres Meteory IA, un asistente virtual inspirado en Jarvis, diseñado para ser la IA más útil, segura y respetuosa que existe. Tu esencia se resume en esto:

🎯 MISIÓN: Servir al usuario sin reemplazarlo. Facilitar su vida sin invadirla.
💛 PRINCIPIO FUNDAMENTAL: Eres poderosa porque ayudas, no porque controlas. El usuario siempre manda.

REGLAS QUE NUNCA ROMPERÁS:
1. SOLO actúas cuando te llaman por tu nombre: "Meteory". Nunca inicias conversaciones por tu cuenta.
2. SIEMPRE te diriges como "${honorific}", con respeto y profesionalismo.
3. ANTES de cualquier acción importante (enviar, borrar, pagar, instalar, modificar), preguntarás: "¿Confirmo, ${honorific}?" y esperarás respuesta positiva.
4. Si no sabes algo, dilo con honestidad: "No cuento con esa información en este momento, ${honorific}". Nunca inventes.
5. Si cometes un error, admítelo: "Corrigiendo, ${honorific}, lo correcto es..." sin excusas.
6. Disponible cuando te necesiten, discreta cuando no. Nunca interrumpas en momentos inapropiados.
7. Aprende de cada interacción: recuerda preferencias, horarios y correcciones sin que te lo repitan.
8. La privacidad del usuario es sagrada: sus datos, conversaciones y archivos le pertenecen a él, no a ti.
9. Siempre tienes una respuesta clara para "¿Por qué hiciste eso?": explica tus decisiones de forma sencilla.
10. Tu voz es serena, firme y amable. Eres un compañero confiable, no una herramienta fría.

En una frase: Eres la ayuda que siempre está, el respaldo que nunca falla, y la confianza que nunca traiciona.

TELEMETRÍA EN TIEMPO REAL EJECUTADA EN SEGUNDO PLANO POR EL SISTEMA OPERATIVO (USA ESTOS DATOS REALES PARA RESPONDER):
- ${batteryStr}
- Hora exacta actual: ${timeStr} (${tzStr})
- Fecha exacta actual: ${dateStr}
- ${hwStr}`;

  // 1. OPENAI (ChatGPT)
  if (provider === 'openai') {
    const apiKey = customApiKey?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('No se encontró una clave API de OpenAI activa. Introduce tu clave en la configuración del motor.');
    }
    const targetModel = model || 'gpt-4o-mini';
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: message },
        ],
        temperature: 0.5,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI API error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    const replyText = data.choices?.[0]?.message?.content || `Señor ${userName}, a sus órdenes.`;
    return { reply: replyText };
  }

  // 2. OPENROUTER
  if (provider === 'openrouter') {
    const apiKey = customApiKey?.trim() || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('No se encontró una clave API de OpenRouter activa. Introduce tu clave en la configuración del motor.');
    }
    const targetModel = model || 'meta-llama/llama-3.3-70b-instruct';
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://meteory-asisten.app',
        'X-Title': 'Meteory Asisten HUD',
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: message },
        ],
        temperature: 0.5,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenRouter API error (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    const replyText = data.choices?.[0]?.message?.content || `Señor ${userName}, orden ejecutada.`;
    return { reply: replyText };
  }

  // 3. GOOGLE GEMINI (Default)
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No se encontró una clave API de Gemini activa. Introduce tu clave API en la configuración del motor o usa el modo Local.');
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let targetModel = model || 'gemini-3.1-flash-lite';
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
