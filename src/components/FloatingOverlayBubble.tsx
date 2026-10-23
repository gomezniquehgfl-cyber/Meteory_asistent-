import React, { useState, useEffect, useRef } from 'react';
import { fpsMonitor, FPSReading } from '../utils/fps-monitor.ts';
import { ScreenAccessibilityEngine, ScreenContextSnapshot } from '../utils/screen-accessibility-engine.ts';
import { EngineConfig } from './EngineSetupScreen.tsx';
import { processLocalNeuralResponse, cleanVoiceTextForSpeech } from '../utils/assistant-logic.ts';
import { sfx, jarvisVoice } from '../utils/speech.ts';
import {
  X,
  Send,
  Eye,
  Zap,
  Radio,
  Check,
  Copy,
  ChevronDown,
  Sparkles,
  Move,
  MousePointer,
  Keyboard,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

interface FloatingOverlayBubbleProps {
  userName: string;
  engineConfig: EngineConfig;
  isActive: boolean;
  onToggleActive?: () => void;
}

export const FloatingOverlayBubble: React.FC<FloatingOverlayBubbleProps> = ({
  userName,
  engineConfig,
  isActive,
  onToggleActive,
}) => {
  // Bubble Position (X, Y)
  const [position, setPosition] = useState({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [isEdgeIdle, setIsEdgeIdle] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // FPS State
  const [fpsReading, setFpsReading] = useState<FPSReading>(() => fpsMonitor.getCurrentReading());

  // Panel Conversation & Input
  const [inputQuery, setInputQuery] = useState('');
  const [liveResponse, setLiveResponse] = useState<string>(
    `Señor ${userName || 'Comandante'}, burbuja táctica de superposición activa. Observando pantalla en tiempo real.`
  );
  const [displayedResponse, setDisplayedResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState<{
    type: 'click' | 'type' | 'scroll';
    label: string;
    targetX?: number;
    targetY?: number;
    text?: string;
  } | null>(null);

  // Screen Context State ("Los Ojos")
  const [screenContext, setScreenContext] = useState<ScreenContextSnapshot | null>(null);

  // Dragging refs
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const hasMovedRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const responseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic context placeholder
  const placeholders = [
    '¿Qué ves en mi pantalla?',
    '¿Ayúdame con esto?',
    'Escribe tu orden...',
    '¿En qué botón debo hacer clic?',
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // 1. Subscribe to real hardware FPS
  useEffect(() => {
    if (!isActive) return;
    const unsub = fpsMonitor.subscribe((reading) => {
      setFpsReading(reading);
    });
    return () => unsub();
  }, [isActive]);

  // 2. Rotate placeholders every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 3. Scan screen context every 1 second ("Los Ojos")
  useEffect(() => {
    if (!isActive) return;
    const scanScreen = () => {
      const snap = ScreenAccessibilityEngine.extractScreenContext();
      if (snap.hasChangedFromPrevious || !screenContext) {
        setScreenContext(snap);
      }
    };

    scanScreen();
    const interval = setInterval(scanScreen, 1000);
    return () => clearInterval(interval);
  }, [isActive, screenContext]);

  // 4. Reset idle transparency timer
  const resetIdleTimer = () => {
    setIsEdgeIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!isPanelOpen) {
        setIsEdgeIdle(true);
      }
    }, 4500);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [position, isPanelOpen]);

  // 5. Stream live response text with typewriter effect
  useEffect(() => {
    if (responseIntervalRef.current) clearInterval(responseIntervalRef.current);
    setDisplayedResponse('');

    let charIdx = 0;
    responseIntervalRef.current = setInterval(() => {
      if (charIdx < liveResponse.length) {
        setDisplayedResponse(liveResponse.slice(0, charIdx + 1));
        charIdx++;
      } else {
        if (responseIntervalRef.current) clearInterval(responseIntervalRef.current);
      }
    }, 12);

    return () => {
      if (responseIntervalRef.current) clearInterval(responseIntervalRef.current);
    };
  }, [liveResponse]);

  // Pointer / Touch Dragging Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
      setIsDragging(true);
      resetIdleTimer();

      const newX = Math.min(Math.max(dragStartRef.current.posX + dx, 10), window.innerWidth - 85);
      const newY = Math.min(Math.max(dragStartRef.current.posY + dy, 40), window.innerHeight - 100);
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
    dragStartRef.current = null;
    setIsDragging(false);

    // If it was just a tap (no significant move), toggle panel
    if (!hasMovedRef.current) {
      sfx.playActivationBlip();
      setIsPanelOpen((prev) => !prev);
      setIsEdgeIdle(false);
    } else {
      // Snap to nearest edge (left or right)
      const screenMid = window.innerWidth / 2;
      const snapX = position.x < screenMid ? 16 : window.innerWidth - 86;
      setPosition((prev) => ({ ...prev, x: snapX }));
      resetIdleTimer();
    }
  };

  // Submit Query to Main AI Engine with Screen Context
  const handleSubmitQuery = async () => {
    const q = inputQuery.trim();
    if (!q) return;

    setInputQuery('');
    setIsLoading(true);
    setSuggestedAction(null);

    // Build context-aware prompt
    const snap = ScreenAccessibilityEngine.extractScreenContext();
    const contextualMessage = `[CONTEXTO DE PANTALLA EN TIEMPO REAL: ${snap.summaryText}]
Pregunta del usuario: "${q}"
Responde conciso y breve como Meteory IA. Si sugieres pulsar un botón o escribir, indícalo claramente.`;

    try {
      if (engineConfig.mode === 'local') {
        const localReply = processLocalNeuralResponse(q, userName);
        setLiveResponse(localReply);
        jarvisVoice.speak(cleanVoiceTextForSpeech(localReply));
      } else {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: contextualMessage,
            userName,
            provider: engineConfig.provider || 'gemini',
            model: engineConfig.modelName,
            customApiKey: engineConfig.customApiKey,
          }),
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        const reply = data.reply || `Señor ${userName}, respuesta recibida.`;
        setLiveResponse(reply);
        jarvisVoice.speak(cleanVoiceTextForSpeech(reply));

        // Detect suggested action from response
        const lowerReply = reply.toLowerCase();
        if (lowerReply.includes('pulsar') || lowerReply.includes('clic en')) {
          const matchButton = snap.elements.find((el) => el.isClickable && lowerReply.includes(el.text.toLowerCase()));
          if (matchButton) {
            setSuggestedAction({
              type: 'click',
              label: `Pulsar "${matchButton.text}"`,
              targetX: matchButton.x,
              targetY: matchButton.y,
            });
          }
        }
      }
    } catch {
      const fallback = processLocalNeuralResponse(q, userName);
      setLiveResponse(fallback);
      jarvisVoice.speak(cleanVoiceTextForSpeech(fallback));
    } finally {
      setIsLoading(false);
    }
  };

  // "LAS MANOS" — Execute suggested physical action
  const handleExecuteAction = async () => {
    if (!suggestedAction) return;

    if (suggestedAction.type === 'click' && suggestedAction.targetX && suggestedAction.targetY) {
      await ScreenAccessibilityEngine.clickAtCoordinates(suggestedAction.targetX, suggestedAction.targetY);
      setLiveResponse(`Señor ${userName}, he ejecutado el toque táctil en las coordenadas (${suggestedAction.targetX}, ${suggestedAction.targetY}).`);
      setSuggestedAction(null);
    } else if (suggestedAction.type === 'scroll') {
      ScreenAccessibilityEngine.smoothScroll('down', 300);
      setSuggestedAction(null);
    }
  };

  if (!isActive) return null;

  return (
    <>
      {/* 1. FLOATING OVERLAY BUBBLE (Always on top, draggable, edge-snapping) */}
      <div
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`fixed top-0 left-0 z-[99999] select-none transition-opacity duration-300 cursor-grab active:cursor-grabbing ${
          isEdgeIdle ? 'opacity-35 hover:opacity-100' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col items-center">
          {/* FPS REAL-TIME READOUT (Above Sphere) */}
          <div className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.4)] flex items-center gap-1 mb-1 backdrop-blur-md">
            <span className="text-[10px] animate-pulse">⚡</span>
            <span className={`text-[10px] font-mono font-bold tracking-tight ${fpsReading.colorClass}`}>
              {fpsReading.fps} FPS
            </span>
          </div>

          {/* JARVIS NEON CYAN GLOWING SPHERE */}
          <div className="relative w-14 h-14 rounded-full flex items-center justify-center p-0.5 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-500 shadow-[0_0_25px_rgba(0,229,255,0.7)] animate-pulse">
            <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden border border-cyan-300/60">
              {/* Inner glowing rings */}
              <div className="absolute inset-1 rounded-full border border-cyan-400/40 animate-spin" style={{ animationDuration: '8s' }}></div>
              <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_15px_#00e5ff] animate-ping" style={{ animationDuration: '2.5s' }}></div>
              <div className="w-2.5 h-2.5 rounded-full bg-white absolute"></div>
            </div>
          </div>

          {/* NAME LABEL (Below Sphere) */}
          <span className="text-[10px] font-mono font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)] mt-0.5 tracking-wider">
            Meteory
          </span>
        </div>
      </div>

      {/* 2. MINIATURE OVERLAY PANEL (Parte 3 — Interfaz de Comunicación Compacta) */}
      {isPanelOpen && (
        <div
          className="fixed z-[99998] flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/50 shadow-[0_0_40px_rgba(0,229,255,0.3)] backdrop-blur-xl p-4 text-xs font-sans"
          style={{
            width: 'min(360px, calc(100vw - 32px))',
            left: `${Math.min(Math.max(position.x - 140, 16), window.innerWidth - 376)}px`,
            top: `${Math.min(Math.max(position.y + 70, 60), window.innerHeight - 440)}px`,
          }}
        >
          {/* PANEL HEADER */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="font-futuristic font-bold text-white tracking-widest text-xs">
                M E T E O R Y
              </span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${fpsReading.colorClass} bg-slate-900 border border-slate-800`}>
                {fpsReading.fps} FPS
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* CONTEXT CHIP ("LOS OJOS") */}
          <div className="my-2 p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                {screenContext
                  ? `${screenContext.totalButtons} botones · ${screenContext.totalInputs} campos detectados`
                  : 'Escaneando pantalla...'}
              </span>
            </div>
            <span className="text-emerald-400 shrink-0">● Activo</span>
          </div>

          {/* INPUT FIELD */}
          <div className="relative mb-2.5">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitQuery()}
              placeholder={placeholders[placeholderIndex]}
              className="w-full px-3 py-2 pr-9 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-cyan-100 placeholder:text-slate-500 font-sans focus:outline-none focus:border-cyan-500/60 transition-colors shadow-inner"
            />
            <button
              type="button"
              onClick={handleSubmitQuery}
              disabled={isLoading || !inputQuery.trim()}
              className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white transition-all cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* LIVE RESPONSE AREA (Typewriter stream effect) */}
          <div className="relative p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-2.5 min-h-[90px] max-h-[160px] overflow-y-auto no-scrollbar space-y-1.5">
            <div className="text-[10px] font-mono text-cyan-400 flex items-center justify-between">
              <span>RESPUESTA EN VIVO:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(liveResponse);
                  setCopiedResponse(true);
                  setTimeout(() => setCopiedResponse(false), 2000);
                }}
                className="text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1 text-[9px]"
              >
                <Copy className="w-2.5 h-2.5" />
                <span>{copiedResponse ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {displayedResponse || (isLoading ? 'Pensando y procesando pantalla...' : '')}
            </p>

            {/* SUGGESTED ACTION BUTTON ("LAS MANOS") */}
            {suggestedAction && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>✅ {suggestedAction.label}</span>
                </button>
              </div>
            )}
          </div>

          {/* STATUS INDICATORS (Parte 3 — Función 3) */}
          <div className="space-y-1 text-[10px] font-mono border-t border-slate-800/80 pt-2 text-slate-400">
            <div className="flex items-center justify-between">
              <span>📡 Motor IA ({engineConfig.mode.toUpperCase()})</span>
              <span className="text-emerald-400 font-bold">{isLoading ? '⚡ Procesando' : '✅ Conectado'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>👁️ Accesibilidad (Pantalla)</span>
              <span className="text-emerald-400 font-bold">✅ Viendo pantalla</span>
            </div>
            <div className="flex items-center justify-between">
              <span>⚡ Shizuku / Bridge ADB</span>
              <span className="text-emerald-400 font-bold">✅ Listo</span>
            </div>
          </div>

          {/* PHYSICAL SHORTCUT BUTTONS */}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-800/80 pt-2">
            <button
              type="button"
              onClick={() => ScreenAccessibilityEngine.smoothScroll('down', 280)}
              className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center gap-1 cursor-pointer border border-slate-800"
            >
              <ArrowDown className="w-3 h-3 text-cyan-400" />
              <span>Deslizar Abajo</span>
            </button>
            <button
              type="button"
              onClick={() => ScreenAccessibilityEngine.smoothScroll('up', 280)}
              className="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center gap-1 cursor-pointer border border-slate-800"
            >
              <ArrowUp className="w-3 h-3 text-cyan-400" />
              <span>Deslizar Arriba</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
