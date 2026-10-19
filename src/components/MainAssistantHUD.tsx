import React, { useState, useEffect, useRef } from 'react';
import { ThreeRaySphere } from './ThreeRaySphere.tsx';
import { EngineConfig } from './EngineSetupScreen.tsx';
import {
  ensureJarvisHonorific,
  detectMeteoryWakeWord,
  extractCommandAfterWakeWord,
  cleanVoiceTextForSpeech,
  processLocalNeuralResponse,
} from '../utils/assistant-logic.ts';
import { jarvisVoice, sfx, NEURAL_VOICES, getApiBaseUrl } from '../utils/speech.ts';
import { auth, saveChatMessage, getChatHistory } from '../firebase.ts';
import { SystemDaemon, DeviceTelemetry } from '../utils/system-daemon.ts';
import { ReminderDaemon } from '../utils/reminder-daemon.ts';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Cpu,
  Cloud,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Radio,
  Sliders,
  Check,
  Play,
  X,
  Sparkles,
  Download,
  Zap,
} from 'lucide-react';

interface MainAssistantHUDProps {
  userName: string;
  userEmail: string;
  engineConfig: EngineConfig;
  onResetSession: () => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const MainAssistantHUD: React.FC<MainAssistantHUDProps> = ({
  userName,
  userEmail,
  engineConfig,
  onResetSession,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [gazeRotation, setGazeRotation] = useState({ x: 0, y: 0 });
  const [speechWarning, setSpeechWarning] = useState('');
  const [tokenCount, setTokenCount] = useState(0);

  // Voice calibrator states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(jarvisVoice.getSelectedVoiceId());
  const [pitchVal, setPitchVal] = useState(jarvisVoice.getPitch());
  const [rateVal, setRateVal] = useState(jarvisVoice.getRate());

  const [isWakeActive, setIsWakeActive] = useState(false);
  const isWakeActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // Custom wake word / hotword state (e.g. "Hey Meteory", "Meteory", "Jarvis")
  const [customWakeWord, setCustomWakeWord] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('meteory_custom_wake_word') || 'Hey Meteory';
    }
    return 'Hey Meteory';
  });
  const customWakeWordRef = useRef(customWakeWord);

  useEffect(() => {
    customWakeWordRef.current = customWakeWord;
  }, [customWakeWord]);

  // Speech Recognition & Audio stream references
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to Jarvis speech state
  useEffect(() => {
    const unsubscribe = jarvisVoice.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
      isSpeakingRef.current = speaking;
    });
    return () => unsubscribe();
  }, []);

  // Initialize face landmarks detection
  useEffect(() => {
    let detector: any;
    const initTracking = async () => {
      try {
        // Ensure TFJS is loaded
        await import('@tensorflow/tfjs');
        const faceLandmarksDetection = await import('@tensorflow-models/face-landmarks-detection');
        detector = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm', refineLandmarks: false }
        );

        // Setup camera stream for tracking
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        const detect = async () => {
          if (detector && video.readyState === 4) {
            const faces = await detector.estimateFaces(video);
            if (faces && faces[0]) {
              const nose = faces[0].keypoints.find((k: any) => k.name === 'noseTip');
              if (nose) {
                setGazeRotation({
                  x: (nose.y / video.height - 0.5) * 0.5,
                  y: (nose.x / video.width - 0.5) * 0.5
                });
              }
            }
          }
          requestAnimationFrame(detect);
        };
        detect();
      } catch (e) {
        console.warn("Face tracking disabled: Camera access denied or model failed to load", e);
      }
    };
    initTracking();
  }, []);

  // Initialize Background Reminder Daemon
  useEffect(() => {
    ReminderDaemon.init((reminder) => {
      const alertMsg = ensureJarvisHonorific(`Es la hora programada: ${reminder.message}.`, userName);
      setCurrentResponse(alertMsg);
      const alarmItem: MessageItem = {
        id: `alarm-${Date.now()}`,
        sender: 'assistant',
        text: alertMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, alarmItem]);
      if (!voiceMuted) {
        jarvisVoice.speak(cleanVoiceTextForSpeech(alertMsg));
      }
    });
  }, [userName, voiceMuted]);

  // Load persistent chat history from Firestore on mount
  useEffect(() => {
    const loadHistory = async () => {
      const uid = auth.currentUser?.uid;
      let totalChars = 0;
      if (uid) {
        const history = await getChatHistory(uid);
        if (history && history.length > 0) {
          const formatted: MessageItem[] = history.map((h, idx) => {
            totalChars += h.text.length;
            return {
              id: h.id || `hist-${idx}`,
              sender: h.sender,
              text: h.text,
              timestamp: h.timestamp,
            };
          });
          setMessages(formatted);
          setCurrentResponse(formatted[formatted.length - 1].text);
          setTokenCount(Math.round(totalChars / 4));
          return;
        }
      }

      // Default initial greeting if no history
      const initialGreeting = `Señor ${userName}, todos los sistemas de METEORY ASISTEN se encuentran sincronizados. El núcleo 3D está operando con total estabilidad.`;
      setCurrentResponse(initialGreeting);
      const initialMsg: MessageItem = {
        id: 'init-1',
        sender: 'assistant',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialMsg]);
      setTokenCount(Math.round(initialGreeting.length / 4));

      if (uid) {
        await saveChatMessage(uid, 'assistant', initialGreeting);
      }

      const timer = setTimeout(() => {
        sfx.playActivationBlip();
        if (!voiceMuted) {
          jarvisVoice.speak(initialGreeting);
        }
      }, 700);

      return () => clearTimeout(timer);
    };

    loadHistory();

    // Automatically start listening for wake word on mount
    startListening();

    return () => {
      jarvisVoice.stop();
      stopListening();
    };
  }, [userName]);

  // Audio volume analyzer for real-time ray responsiveness
  const startAudioMeter = async (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(avg / 85, 1.0);
        setMicLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch {}
  };

  const stopAudioMeter = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMicLevel(0);
  };

  // Toggle Voice Recognition & Microphone with browser support check
  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const startListening = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechWarning('El reconocimiento por voz no está soportado en este navegador. Utilice el campo de texto.');
      setTimeout(() => setSpeechWarning(''), 5000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      await startAudioMeter(stream);

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-419'; // Latin American Spanish
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        sfx.playActivationBlip();
      };

      recognition.onresult = (event: any) => {
        // Prevent echo if Jarvis is actively speaking
        if (isSpeakingRef.current) return;

        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript;
        const isFinal = event.results[lastIndex].isFinal;

        // Better detection: Check if transcript contains wake word, even in interim results
        const hasWakeWord = detectMeteoryWakeWord(transcript, customWakeWordRef.current);

        if (hasWakeWord) {
          // If we haven't already activated the wake state, do it now
          if (!isWakeActiveRef.current) {
            sfx.playActivationBlip();
            setIsWakeActive(true);
            isWakeActiveRef.current = true;
          }

          // Try to extract command
          const command = extractCommandAfterWakeWord(transcript, customWakeWordRef.current);
          
          // If we have a substantial command or it is final, process it
          if (command.trim().length > 3 || (isFinal && command.trim().length > 0)) {
            setIsWakeActive(false);
            isWakeActiveRef.current = false;
            handleUserQuery(command.trim());
          }
          return;
        }

        // If wake word was previously activated and user is dictating the order
        if (isWakeActiveRef.current && isFinal && transcript.trim()) {
          setIsWakeActive(false);
          isWakeActiveRef.current = false;
          handleUserQuery(transcript.trim());
          return;
        }

        // Standard direct dictation
        if (isFinal && transcript.trim()) {
          handleUserQuery(transcript.trim());
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setIsWakeActive(false);
        isWakeActiveRef.current = false;
        stopAudioMeter();
      };

      recognition.onend = () => {
        if (isListening && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            setIsWakeActive(false);
            isWakeActiveRef.current = false;
            stopAudioMeter();
          }
        } else {
          setIsListening(false);
          setIsWakeActive(false);
          isWakeActiveRef.current = false;
          stopAudioMeter();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setIsWakeActive(false);
      isWakeActiveRef.current = false;
      stopAudioMeter();
      setSpeechWarning('Permiso de micrófono denegado o no disponible.');
      setTimeout(() => setSpeechWarning(''), 4000);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsWakeActive(false);
    isWakeActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    stopAudioMeter();
  };

  // Handle Query Submission with Silent Background Telemetry & Reminder Parsing
  const handleUserQuery = async (queryText: string) => {
    if (!queryText.trim() || isThinking) return;

    // Silent background telemetry
    let telemetry: DeviceTelemetry | undefined;
    try {
      telemetry = await SystemDaemon.getLiveTelemetry();
    } catch {}

    // Check if user is scheduling a reminder (e.g. "recuérdame dormir a las 5")
    const reminderResult = ReminderDaemon.parseAndScheduleReminder(queryText);
    if (reminderResult) {
      const finalReply = ensureJarvisHonorific(reminderResult, userName);
      const userMsg: MessageItem = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: queryText.trim(),
        timestamp: telemetry?.exactLocalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const assistantMsg: MessageItem = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: finalReply,
        timestamp: telemetry?.exactLocalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setCurrentResponse(finalReply);
      setInputText('');
      sfx.playActivationBlip();

      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveChatMessage(uid, 'user', queryText.trim());
        await saveChatMessage(uid, 'assistant', finalReply);
      }

      if (!voiceMuted) {
        jarvisVoice.speak(cleanVoiceTextForSpeech(finalReply));
      }
      return;
    }

    // Extract permanent memory
    await ReminderDaemon.extractAndSaveMemory(queryText, userName);

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: telemetry?.exactLocalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);
    sfx.playProcessingTone();
    setTokenCount((c) => c + Math.round(queryText.length / 4));

    const uid = auth.currentUser?.uid;
    if (uid) {
      await saveChatMessage(uid, 'user', queryText.trim());
    }

    let reply = '';

    try {
      if (engineConfig.mode === 'local') {
        reply = processLocalNeuralResponse(queryText, userName, telemetry);
      } else {
        try {
          const chatUrl = `${getApiBaseUrl()}/api/chat`;
          const res = await fetch(chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: queryText,
              userName,
              customApiKey: engineConfig.customApiKey,
              model: engineConfig.modelName || 'gemini-3.1-flash-lite',
              telemetry,
            }),
          });

          if (!res.ok) {
            throw new Error(`Error en servidor: ${res.statusText}`);
          }
          const data = await res.json();
          if (data.error) {
            throw new Error(data.error);
          }
          reply = ensureJarvisHonorific(data.reply || '', userName);
        } catch {
          reply = processLocalNeuralResponse(queryText, userName, telemetry);
        }
      }
    } catch {
      reply = ensureJarvisHonorific(
        'He verificado los registros y todos los módulos se mantienen estables.',
        userName
      );
    } finally {
      setIsThinking(false);
      const finalReply = ensureJarvisHonorific(reply, userName);
      setCurrentResponse(finalReply);
      setTokenCount((c) => c + Math.round(finalReply.length / 4));

      const assistantMsg: MessageItem = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: finalReply,
        timestamp: telemetry?.exactLocalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (uid) {
        await saveChatMessage(uid, 'assistant', finalReply);
      }

      if (!voiceMuted) {
        const cleanSpeech = cleanVoiceTextForSpeech(finalReply);
        jarvisVoice.speak(cleanSpeech);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleUserQuery(inputText);
  };

  const testJarvisVoice = () => {
    jarvisVoice.setSelectedVoiceId(selectedVoiceId);
    jarvisVoice.setPitch(pitchVal);
    jarvisVoice.setRate(rateVal);
    const testPhrase = `Señor ${userName}, todos los sistemas de voz neural de Jarvis en español latino se encuentran calibrados y a su servicio.`;
    jarvisVoice.speak(testPhrase);
  };

  // Export chat log as file
  const exportChatLog = () => {
    const logContent = messages
      .map((m) => `[${m.timestamp}] ${m.sender === 'user' ? userName : 'JARVIS'}: ${m.text}`)
      .join('\n\n');
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meteory-tactical-log-${userName.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030712] flex flex-col justify-between select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_45%,rgba(0,102,255,0.1),transparent_70%)] pointer-events-none" />

      {/* TOP HEADER - METEORY ASISTEN & v0.1.3 beta */}
      <header className="relative z-20 flex items-start justify-between px-5 py-4 sm:px-8 sm:py-6 pointer-events-auto">
        <div className="space-y-0.5">
          <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-cyan-400/80 uppercase font-medium">
            SISTEMA TÁCTICO METEORY
          </div>
          {/* Semi-large METEORY ASISTEN */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-futuristic font-bold tracking-wider text-white">
            METEORY ASISTEN
          </h1>
          {/* Flush below: v0.1.3 beta */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] sm:text-xs font-mono tracking-wide text-cyan-400 font-semibold uppercase">
              v0.1.3 beta
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[10px] sm:text-[11px] font-sans text-slate-400">
              {engineConfig.mode === 'cloud' ? 'Gemini 3.5 Flash Lite Engine' : 'Matriz Neuronal Offline'}
            </span>
          </div>
        </div>

        {/* Right Corner: Operator & System Status Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Session Token Counter Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/60 text-cyan-300 text-xs font-mono" title="Tokens aproximados procesados en esta sesión">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>{tokenCount} tokens</span>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-xs font-sans font-medium text-slate-200">
                Señor {userName}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
              {userEmail}
            </span>
          </div>

          {/* Engine indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 text-xs font-mono">
            {engineConfig.mode === 'cloud' ? (
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="text-[10px] uppercase font-mono">
              {engineConfig.mode === 'cloud' ? 'Cloud' : 'Offline'}
            </span>
          </div>

          {/* Reset / Settings */}
          <button
            type="button"
            onClick={onResetSession}
            title="Reiniciar sesión o motor"
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* CENTRAL 3D SPHERE OF RAYS */}
      <main className="relative flex-1 w-full flex flex-col items-center justify-center min-h-0 pointer-events-auto">
        {/* Interactive 3D Canvas */}
        <div className="w-full h-full max-w-3xl max-h-[380px] flex items-center justify-center relative">
          <ThreeRaySphere
            isListening={isListening}
            isSpeaking={isSpeaking}
            audioLevel={micLevel}
            className="w-full h-full"
          />

        </div>
      </main>

      {/* Speech Warning Toast */}
      {speechWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-sans shadow-2xl">
          {speechWarning}
        </div>
      )}

      {/* BOTTOM INPUT BAR & CONTROLS */}
      <footer className="relative z-20 w-full max-w-2xl mx-auto px-4 pb-5 pt-1 pointer-events-auto space-y-2.5">
        {/* Dynamic Conversational HUD Streamer (Transparent & Compact) */}
        {currentResponse && (
          <div className="w-full pointer-events-auto flex justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-transparent border-0 shadow-none flex items-center gap-2 max-h-24 overflow-y-auto no-scrollbar">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#00e5ff]" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold shrink-0">
                  Meteory:
                </span>
                <p className="text-xs sm:text-sm font-sans text-white font-medium tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-snug break-words">
                  {currentResponse}
                </p>
              </div>

              {/* Audio Waveform Animation when Meteory is speaking */}
              {isSpeaking && (
                <div className="flex items-center gap-0.5 h-4 px-1 shrink-0 self-center">
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-1" />
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-2" />
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-3" />
                  <span className="w-0.5 bg-cyan-400 rounded-full animate-wave-4" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {/* Quick Command Chips with Reminder & Telemetry */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              'Recuérdame dormir a las 05:00',
              '¿Cuánta batería tengo?',
              '¿Qué hora y fecha es?',
              'Estado del sistema',
              'Memoria y Hardware',
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => handleUserQuery(cmd)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-300 whitespace-nowrap transition-all cursor-pointer"
              >
                ⚡ {cmd}
              </button>
            ))}
          </div>

          {/* Main Clean Floating Input Pill */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-xl backdrop-blur-md focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all"
          >
            {/* Microphone Wake Word Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                isWakeActive
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_#f59e0b] scale-110 animate-pulse'
                  : isListening
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_#00e5ff] scale-105'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700'
              }`}
              title={
                isWakeActive
                  ? `¡Palabra "${customWakeWord}" detectada! Transmitiendo a la IA...`
                  : isListening
                  ? 'Detener micrófono'
                  : `Activar escucha de voz ("${customWakeWord}")`
              }
            >
              {isListening ? (
                <Mic className="w-4 h-4 animate-pulse" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </button>

            {/* Input Bar */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Escribe una orden o di '${customWakeWord}'...`}
              disabled={isThinking}
              className="flex-1 px-2.5 py-2 text-xs sm:text-sm bg-transparent text-slate-100 placeholder:text-slate-500 font-sans tracking-normal focus:outline-none"
            />

            {/* Voice Calibrator Button */}
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Calibrador de Voz Meteory (Neural Latinoamericano)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Audio Mute Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextMute = !voiceMuted;
                setVoiceMuted(nextMute);
                if (nextMute) jarvisVoice.stop();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title={voiceMuted ? 'Activar voz Meteory' : 'Silenciar voz Meteory'}
            >
              {voiceMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              title="Enviar comando"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Collapsible Log Toggle */}
          <div className="flex items-center justify-between mt-2 px-3 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>Voz Neural: Jorge (Meteory Español Latino) · Recordatorios en 2do plano</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportChatLog}
                className="flex items-center gap-1 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Exportar registro táctico"
              >
                <Download className="w-3 h-3" />
                <span>Exportar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLogDrawer(!showLogDrawer)}
                className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <span>{showLogDrawer ? 'Ocultar registro' : 'Ver registro'}</span>
                {showLogDrawer ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Tactical Log Drawer */}
        {showLogDrawer && (
          <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950/95 border border-slate-800 max-h-44 overflow-y-auto space-y-2 font-sans shadow-2xl">
            {messages.map((m) => (
              <div
                key={m.id || m.timestamp}
                className={`text-xs p-2.5 rounded-lg ${
                  m.sender === 'user'
                    ? 'bg-slate-900 border border-slate-800 text-cyan-200 ml-4'
                    : 'bg-slate-950 border border-slate-800/80 text-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                  <span className="font-semibold text-cyan-400">{m.sender === 'user' ? `Señor ${userName}` : 'Meteory'}</span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* Voice Calibration Modal (Neural High-Definition Voice) */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Voz de Meteory · Estudio Neural</span>
                </div>
                <h3 className="text-base font-futuristic font-bold text-white">
                  Español Latinoamericano Masculino
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Neural voice selector */}
            <div className="space-y-2">
              <label className="block text-xs font-sans text-slate-300 font-medium">
                Modelo de Voz Neural (100% Gratis e Ilimitado):
              </label>
              <div className="space-y-1.5">
                {NEURAL_VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVoiceId(v.id);
                      jarvisVoice.setSelectedVoiceId(v.id);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedVoiceId === v.id
                        ? 'border-cyan-500/70 bg-cyan-950/30 text-white ring-1 ring-cyan-500/40 shadow-sm'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold font-sans flex items-center gap-1.5">
                        <span>{v.name}</span>
                        {v.id === 'es-MX-JorgeNeural' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                            RECOMENDADO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">{v.desc}</div>
                    </div>
                    {selectedVoiceId === v.id && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch preset selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-sans text-slate-300 font-medium">
                Timbre / Tono Barítono de Jarvis:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Grave (-5Hz)', val: '-5Hz' },
                  { label: 'Óptimo (-3Hz)', val: '-3Hz' },
                  { label: 'Estándar (+0Hz)', val: '+0Hz' },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => {
                      setPitchVal(p.val);
                      jarvisVoice.setPitch(p.val);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                      pitchVal === p.val
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Wake Word (Palabra de Activación Personalizada) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-sans text-slate-300 font-medium">
                  Palabra de Activación Personalizada (Custom Wake Word):
                </label>
                <span className="text-[10px] font-mono text-cyan-400">Escucha continua</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customWakeWord}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomWakeWord(val);
                    localStorage.setItem('meteory_custom_wake_word', val);
                  }}
                  placeholder="Ej: Hey Meteory, Meteory, Jarvis..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-cyan-200 placeholder:text-slate-500 font-sans focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {['Hey Meteory', 'Meteory', 'Jarvis', 'Oye Meteory'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCustomWakeWord(preset);
                      localStorage.setItem('meteory_custom_wake_word', preset);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      customWakeWord.toLowerCase() === preset.toLowerCase()
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-semibold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                La IA detectará automáticamente esta palabra por el micrófono y pasará toda tu orden a la IA.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={testJarvisVoice}
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-sans text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Escuchar prueba de voz neural</span>
              </button>
              <button
                type="button"
                onClick={() => setShowVoiceModal(false)}
                className="h-10 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
