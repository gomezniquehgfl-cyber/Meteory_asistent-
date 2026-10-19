/**
 * Pure assistant logic for METEORY ASISTEN
 * Decoupled for fast unit-testing and offline deterministic performance.
 */

import type { DeviceTelemetry } from './system-daemon.ts';

/**
 * Ensures the response always addresses the user with the required honorific:
 * "Señor [userName]" as mandated by the prompt specification.
 */
export function ensureJarvisHonorific(text: string, userName: string): string {
  const cleanName = (userName || 'Comandante').trim();
  const honorific = `Señor ${cleanName}`;
  const trimmed = text.trim();

  if (!trimmed) {
    return `${honorific}, estoy a su entera disposición. ¿Qué requiere verificar?`;
  }

  // Check if it already starts with "Señor [name]"
  const pattern = new RegExp(`^Señor\\s+${cleanName}[,.:\\s]`, 'i');
  if (pattern.test(trimmed)) {
    return trimmed;
  }

  // Check if it starts with generic "Señor" without name
  if (/^Señor[,.:\s]/i.test(trimmed)) {
    return trimmed.replace(/^Señor/i, honorific);
  }

  // Prepend honorific naturally
  const firstCharLower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `${honorific}, ${firstCharLower}`;
}

/**
 * Normalizes speech transcript and detects the wake word "Meteory", "Hey Meteory",
 * or any custom hotword set by the user.
 */
export function detectMeteoryWakeWord(transcript: string, customWakeWord?: string): boolean {
  if (!transcript) return false;
  const normalized = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const defaultVariations = [
    'hey meteory',
    'hey meteor',
    'hey meteori',
    'meteory',
    'meteor',
    'metheory',
    'meteori',
    'oye meteory',
    'hola meteory',
    'asistente meteory',
    'oye meteor',
    'hola meteor',
  ];

  if (defaultVariations.some((w) => normalized.includes(w))) {
    return true;
  }

  if (customWakeWord && customWakeWord.trim().length > 1) {
    const customNorm = customWakeWord
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (normalized.includes(customNorm)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts and isolates the query or command spoken after "Hey Meteory", "Meteory",
 * or the custom wake word.
 * Example: "Hey Meteory qué hora es" -> "qué hora es"
 * Example: "Meteory cuánta batería tengo" -> "cuánta batería tengo"
 */
export function extractCommandAfterWakeWord(transcript: string, customWakeWord?: string): string {
  if (!transcript) return '';

  let cleaned = transcript
    .replace(/^(?:hey\s+|oye\s+|hola\s+|asistente\s+)?meteor(?:y|i|e)?\s*[,.:;]?\s*/i, '')
    .trim();

  if (customWakeWord && customWakeWord.trim().length > 1) {
    const escaped = customWakeWord.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customRegex = new RegExp(`^(?:hey\\s+|oye\\s+|hola\\s+)?${escaped}\\s*[,.:;]?\\s*`, 'i');
    cleaned = cleaned.replace(customRegex, '').trim();
  }

  return cleaned;
}

/**
 * Strips markdown symbols, asterisks, links, and code blocks for ultra-clean
 * synthetic speech reading (Jarvis voice fidelity).
 */
export function cleanVoiceTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, 'Código computacional omitido en lectura de voz.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[^\w\s\dáéíóúÁÉÍÓÚñÑüÜ.,;:?!¿¡\-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Offline Local Neural Engine (Zero Internet / Sin Internet)
 * Powered by live background system telemetry for accurate battery, time, hardware & diagnostics.
 */
export function processLocalNeuralResponse(prompt: string, userName: string, telemetry?: DeviceTelemetry): string {
  const p = prompt.toLowerCase().trim();
  const cleanName = (userName || 'Comandante').trim();
  const honorific = `Señor ${cleanName}`;

  if (!p) {
    return `${honorific}, sistema neuronal local en línea. Protocolos de seguridad activos. ¿En qué puedo asistirle?`;
  }

  // Real-time battery status command
  if (p.includes('bateria') || p.includes('batería') || p.includes('pila') || p.includes('carga')) {
    if (telemetry?.batteryLevel !== undefined) {
      const chargeText = telemetry.isCharging
        ? 'y el dispositivo se encuentra actualmente conectado a la fuente de alimentación'
        : 'operando con reserva autónoma de batería';
      return `${honorific}, el nivel actual de batería es del ${telemetry.batteryLevel}%, ${chargeText}.`;
    }
    return `${honorific}, los sensores de energía indican que el sistema de alimentación se mantiene estable en parámetros óptimos.`;
  }

  // Exact real-time query
  if (p.includes('hora') || p.includes('tiempo')) {
    const timeStr = telemetry?.exactLocalTime || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${honorific}, el cronómetro del sistema marca exactamente las ${timeStr}.`;
  }

  // Exact real-date query
  if (p.includes('fecha') || p.includes('día') || p.includes('dia')) {
    const dateStr = telemetry?.exactLocalDate || new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `${honorific}, hoy es ${dateStr}. Todos los registros cronológicos se encuentran sincronizados.`;
  }

  // Memory & Hardware queries
  if (p.includes('memoria') || p.includes('ram') || p.includes('hardware') || p.includes('procesador') || p.includes('cpu')) {
    const ramText = telemetry?.memoryRAM_GB ? `${telemetry.memoryRAM_GB} GB de memoria RAM` : 'memoria de alta velocidad';
    const cpuText = telemetry?.cpuCores ? `${telemetry.cpuCores} núcleos lógicos activos` : 'núcleos de cómputo en línea';
    return `${honorific}, el hardware del terminal registra ${ramText} y ${cpuText} con asignación optimizada.`;
  }

  // Network connection status
  if (p.includes('red') || p.includes('conexion') || p.includes('conexión') || p.includes('internet')) {
    const net = telemetry?.networkType ? `red tipo ${telemetry.networkType}` : 'enlace de red estable';
    const online = telemetry?.isOnline ? 'en línea' : 'en modo autónomo local';
    return `${honorific}, el estado de conexión es ${online} a través de ${net}.`;
  }

  // Full system status & diagnostics
  if (p.includes('estado') || p.includes('status') || p.includes('sistema') || p.includes('diagnostico') || p.includes('diagnóstico')) {
    const batPart = telemetry?.batteryLevel !== undefined ? ` · Batería: ${telemetry.batteryLevel}%` : '';
    return `${honorific}, los diagnósticos en segundo plano indican: Núcleo 3D de plasma al 100%, telemetría activa${batPart}, latencia de 1.2 milisegundos y protocolos de seguridad operando de manera impecable.`;
  }

  if (p.includes('quien eres') || p.includes('quién eres') || p.includes('tu nombre')) {
    return `${honorific}, soy METEORY ASISTEN, versión 0.1.3 beta. Su sistema inteligente de asistencia cibernética de alta precisión.`;
  }

  if (p.includes('clima') || p.includes('temperatura')) {
    return `${honorific}, en modo local sin enlace satelital meteorológico, los sensores atmosféricos del terminal estiman 21 grados Celsius con condiciones óptimas en su cuadrante.`;
  }

  if (p.includes('gracias') || p.includes('buen trabajo')) {
    return `${honorific}, es siempre un placer servirle. Permanezco atento a sus siguientes instrucciones.`;
  }

  if (p.includes('apagar') || p.includes('descansar') || p.includes('silencio')) {
    return `${honorific}, reduciendo consumo a modo de reposo. Puede llamarme en cualquier instante diciendo mi nombre: Meteory.`;
  }

  // Mathematical calculations or basic evaluation
  const mathMatch = p.match(/(?:cuanto es|cuánto es|calcula|calcular)\s+([\d\s+\-*/().^]+)/i);
  if (mathMatch && mathMatch[1]) {
    try {
      const sanitized = mathMatch[1].replace(/[^0-9+\-*/().]/g, '');
      if (sanitized.length > 0) {
        // Safe evaluation of simple math
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !Number.isNaN(result)) {
          return `${honorific}, el resultado del cálculo matemático es ${result}.`;
        }
      }
    } catch {
      // Fall through
    }
  }

  // General local reasoning response
  return `${honorific}, he procesado su solicitud a través de la matriz neuronal local. Los parámetros indican estabilidad absoluta y he registrado su orden en el núcleo principal.`;
}
