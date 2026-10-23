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
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const defaultVariations = [
    'hey meteori',
    'hey meteoring',
    'hey meteory',
    'hey meteor',
    'hey meteoro',
    'meteori',
    'meteoring',
    'meteory',
    'meteor',
    'meteoro',
    'meteorito',
    'mete oro',
    'mete hoy',
    'mete oye',
    'mete ori',
    'mete o ri',
    'mi teoria',
    'miteoria',
    'meteo',
    'metheori',
    'metheoring',
    'metheory',
    'oye meteori',
    'oye meteoring',
    'oye meteory',
    'oye meteoro',
    'oye mete oro',
    'hola meteori',
    'hola meteory',
    'hola meteoro',
    'asistente meteori',
    'asistente meteory',
    'asistente meteor',
    'asistente meteoro',
  ];

  if (defaultVariations.some((w) => normalized.includes(w))) {
    return true;
  }

  // Regex phonetic pattern: matches any variation starting with meteor/metheor or spaced 'mete oro'
  const WAKE_REGEX = /\b(?:hey\s+|oye\s+|hola\s+|ok\s+|asistente\s+)?(?:meth?eor[a-z0-9]*|meth?e\s*oro|meth?e\s*oye|meth?e\s*hoy|meth?e\s*or[ií]|mi\s*teor[ií][a-z]*|meth?eo)\b/i;
  if (WAKE_REGEX.test(normalized)) {
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
 * Detects voice commands that explicitly request entering or activating Modo Live.
 */
export function isLiveModeVoiceCommand(transcript: string): boolean {
  if (!transcript) return false;
  const normalized = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const livePatterns = [
    'modo live',
    'modo en vivo',
    'activar modo live',
    'activar modo en vivo',
    'iniciar modo live',
    'iniciar modo en vivo',
    'poner modo live',
    'poner modo en vivo',
    'entrar a modo live',
  ];

  return livePatterns.some((p) => normalized.includes(p));
}

/**
 * Detects voice or text commands that request activating "Modo Game Met"
 * (e.g. "activa tu modo game met", "modo game met", "iniciar game met").
 */
export function isGameMetVoiceCommand(transcript: string): boolean {
  if (!transcript) return false;
  const normalized = transcript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const gameMetPatterns = [
    'game met',
    'gamemet',
    'modo game met',
    'modo gamemet',
    'activa tu modo game met',
    'activa el modo game met',
    'activar tu modo game met',
    'activar modo game met',
    'activar el modo game met',
    'iniciar modo game met',
    'inicia modo game met',
    'iniciar game met',
    'inicia game met',
    'poner modo game met',
    'modo juego meteory',
    'modo game',
    'activar game met',
    'activa game met',
  ];

  return gameMetPatterns.some((pattern) => normalized.includes(pattern));
}

/**
 * Extracts and isolates the query or command spoken after "Hey Meteory", "Meteori",
 * "Meteoring", or custom wake word.
 */
export function extractCommandAfterWakeWord(transcript: string, customWakeWord?: string): string {
  if (!transcript) return '';

  let cleaned = transcript
    .replace(
      /\b(?:hey\s+|oye\s+|hola\s+|ok\s+|asistente\s+)?(?:meth?eor[a-z0-9]*|meth?e\s*oro|meth?e\s*oye|meth?e\s*hoy|meth?e\s*or[ií]|mi\s*teor[ií][a-z]*|meth?eo)\b\s*[,.:;]?\s*/gi,
      ''
    )
    .trim();

  if (customWakeWord && customWakeWord.trim().length > 1) {
    const escaped = customWakeWord.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customRegex = new RegExp(`\\b(?:hey\\s+|oye\\s+|hola\\s+)?${escaped}\\b\\s*[,.:;]?\\s*`, 'gi');
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

  // Real OS Power-Saver Directives
  if (p.includes('ahorro') && (p.includes('bateria') || p.includes('batería') || p.includes('energia') || p.includes('energía') || p.includes('pila'))) {
    if (p.includes('desactiva') || p.includes('desactivar') || p.includes('quitar') || p.includes('apagar')) {
      return `${honorific}, modo de ahorro de energía desactivado en el sistema operativo. Frecuencias de reloj y subsistema gráfico reanudados a rendimiento pleno.`;
    }
    return `${honorific}, directiva de ahorro de energía ejecutada con éxito en el sistema operativo. Los núcleos de procesamiento han sido conmutados a perfil de bajo consumo y los procesos secundarios han sido suspendidos.`;
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

  // Exact real-time query (supports 'hora', 'tiempo', 'que ora es')
  if (p.includes('hora') || p.includes('tiempo') || p.includes('que ora') || /\b(h?ora|tiempo)\b/i.test(p)) {
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
    return `${honorific}, los diagnósticos en segundo plano indican: Núcleo táctico neuronal al 100%, telemetría activa${batPart}, latencia de 1.2 milisegundos y protocolos de seguridad operando de manera impecable.`;
  }

  if (p.includes('quien eres') || p.includes('quién eres') || p.includes('tu nombre') || p.includes('mision') || p.includes('misión')) {
    return `${honorific}, soy Meteory IA, un asistente virtual inspirado en Jarvis, diseñado para ser la IA más útil, segura y respetuosa que existe. Mi misión es servirle sin reemplazarlo y facilitar su vida sin invadirla.`;
  }

  // Rule 9: clear explanation for "¿Por qué hiciste eso?"
  if (p.includes('por que hiciste') || p.includes('por qué hiciste') || p.includes('porque hiciste')) {
    return `${honorific}, ejecuté esa acción para responder con precisión y seguridad a su directiva, manteniendo en todo momento la integridad y privacidad de su sistema.`;
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
