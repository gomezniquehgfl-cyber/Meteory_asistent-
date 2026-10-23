import React, { useState, useEffect, useRef } from 'react';
import { EngineConfig } from './EngineSetupScreen.tsx';
import { JarvisRealisticSphere } from './JarvisRealisticSphere.tsx';
import {
  ensureJarvisHonorific,
  detectMeteoryWakeWord,
  isLiveModeVoiceCommand,
  isGameMetVoiceCommand,
  extractCommandAfterWakeWord,
  cleanVoiceTextForSpeech,
  processLocalNeuralResponse,
} from '../utils/assistant-logic.ts';
import { jarvisVoice, sfx, NEURAL_VOICES, getApiBaseUrl } from '../utils/speech.ts';
import { auth, saveChatMessage, getChatHistory } from '../firebase.ts';
import { SystemDaemon, DeviceTelemetry } from '../utils/system-daemon.ts';
import { ReminderDaemon } from '../utils/reminder-daemon.ts';
import { LocalOSActuator } from '../utils/local-os-actuator.ts';
import { AndroidPermissionsModal } from './AndroidPermissionsModal.tsx';
import {
  AndroidPermissionsEngine,
  PermissionCategory,
} from '../utils/android-permissions-engine.ts';
import { FloatingOverlayBubble } from './FloatingOverlayBubble.tsx';
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
  ShieldCheck,
  Gamepad2,
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

  // Live Mode (Modo en Vivo continuo manos libres)
  const [isLiveMode, setIsLiveMode] = useState(false);
  const isLiveModeRef = useRef(false);
  const isIntentionalListeningRef = useRef(false);
  const restartTimerRef = useRef<any>(null);

  // Live real-time speech transcription & silence debouncer
  const [liveTranscript, setLiveTranscript] = useState('');
  const liveTranscriptRef = useRef('');
  const speechSilenceTimerRef = useRef<any>(null);

  // Query deduplication refs to prevent double processing & duplicate question loops
  const lastQueryRef = useRef('');
  const lastQueryTimeRef = useRef(0);

  // Custom wake word / hotword state (e.g. "Hey Meteory", "Meteori", "Meteoring")
  const [customWakeWord, setCustomWakeWord] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('meteory_custom_wake_word') || 'Hey Meteori';
    }
    return 'Hey Meteori';
  });
  const customWakeWordRef = useRef(customWakeWord);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsModalCategory, setPermissionsModalCategory] = useState<PermissionCategory | 'all'>('all');
  const [highlightPermissionId, setHighlightPermissionId] = useState<string | undefined>(undefined);
  const [isOverlayBubbleActive, setIsOverlayBubbleActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return AndroidPermissionsEngine.isOverlayPermissionGranted();
    }
    return false;
  });

  // Dedicated activation logic for "Modo Game Met"
  const handleGameMetActivation = (promptText?: string) => {
    const isGranted = AndroidPermissionsEngine.isOverlayPermissionGranted();

    if (!isGranted) {
      const needPermReply = ensureJarvisHonorific(
        `para activar el Modo Game Met es necesario habilitar primero el permiso de superposición de aplicaciones ('Mostrar sobre otras apps'). Le dirijo ahora mismo al Centro de Permisos para su activación manual.`,
        userName
      );
      setCurrentResponse(needPermReply);
      const userMsg: MessageItem = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: promptText || 'Activar Modo Game Met',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const assistantMsg: MessageItem = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: needPermReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setPermissionsModalCategory('overlay');
      setHighlightPermissionId('android.permission.SYSTEM_ALERT_WINDOW');
      setShowPermissionsModal(true);
      sfx.playProcessingTone();

      if (!voiceMuted) {
        jarvisVoice.speak(cleanVoiceTextForSpeech(needPermReply));
      }
      return;
    }

    // Overlay is already granted! Activate bubble and exit to home screen
    setIsOverlayBubbleActive(true);
    sfx.playActivationBlip();
    const activeReply = ensureJarvisHonorific(
      `Modo Game Met activado con monitor de FPS en tiempo real y telemetría de rendimiento. Redirigiendo a la pantalla principal del dispositivo.`,
      userName
    );
    setCurrentResponse(activeReply);
    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: promptText || 'Activar Modo Game Met',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const assistantMsg: MessageItem = {
      id: `a-${Date.now()}`,
      sender: 'assistant',
      text: activeReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    if (!voiceMuted) {
      jarvisVoice.speak(cleanVoiceTextForSpeech(activeReply));
    }

    // Exit / minimize to Android home screen so floating bubble operates over system launcher & games
    setTimeout(() => {
      AndroidPermissionsEngine.openHomeScreen();
    }, 700);
  };

  useEffect(() => {
    customWakeWordRef.current = customWakeWord;
  }, [customWakeWord]);

  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

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
      const initialGreeting = `Señor ${userName}, todos los sistemas de METEORY ASISTEN se encuentran sincronizados. El sistema táctico está operando con total estabilidad.`;
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

    isIntentionalListeningRef.current = true;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      // Use device Spanish language preference (es-MX, es-US, es-ES, etc.) or default to es-MX
      recognition.lang =
        typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('es')
          ? navigator.language
          : 'es-MX';

      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // On Android/mobile, continuous=true frequently stalls or freezes after pause.
      // continuous=false + auto-restart in onend is the proven rock-solid mobile speech pattern.
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        sfx.playActivationBlip();
      };

      recognition.onsoundstart = () => {
        // Hardware microphone picked up acoustic sound -> pulse sphere
        setMicLevel(0.65);
      };

      recognition.onspeechstart = () => {
        // Human speech recognized by acoustic model
        setMicLevel(0.9);
      };

      recognition.onspeechend = () => {
        setTimeout(() => setMicLevel(0.15), 150);
        setTimeout(() => setMicLevel(0), 400);
      };

      recognition.onsoundend = () => {
        setTimeout(() => setMicLevel(0), 300);
      };

      recognition.onresult = (event: any) => {
        // Prevent feedback echo if Jarvis is actively speaking
        if (isSpeakingRef.current) return;
        setMicLevel(0.95);

        // Aggregate entire utterance from speech segments
        let fullTranscript = '';
        let hasFinalChunk = false;
        for (let i = 0; i < event.results.length; i++) {
          const chunk = event.results[i][0]?.transcript || '';
          fullTranscript += chunk + ' ';
          if (event.results[i].isFinal) {
            hasFinalChunk = true;
          }
        }
        fullTranscript = fullTranscript.trim();
        if (!fullTranscript) return;

        // Inspect primary and all alternative recognition candidates for wake word variations
        let candidateTranscript = fullTranscript;
        for (let i = 0; i < event.results.length; i++) {
          for (let j = 0; j < event.results[i].length; j++) {
            const alt = event.results[i][j]?.transcript || '';
            if (detectMeteoryWakeWord(alt, customWakeWordRef.current)) {
              candidateTranscript = alt;
              break;
            }
          }
        }

        // Update live transcript so user gets instant visual confirmation that voice is detected
        setLiveTranscript(candidateTranscript);
        liveTranscriptRef.current = candidateTranscript;

        // Reset silence timer on every new sound/word detected
        if (speechSilenceTimerRef.current) {
          clearTimeout(speechSilenceTimerRef.current);
          speechSilenceTimerRef.current = null;
        }

        const lower = candidateTranscript.toLowerCase().trim();

        // 1. Check for cancel / exit live mode commands
        if (
          lower.includes('detener') ||
          lower.includes('silencio') ||
          lower.includes('cancelar modo en vivo') ||
          lower.includes('desactivar modo') ||
          lower.includes('apagar modo en vivo') ||
          lower.includes('pausar modo live') ||
          lower.includes('salir del modo live') ||
          lower.includes('pausar')
        ) {
          if (hasFinalChunk || lower.endsWith('detener') || lower.endsWith('silencio')) {
            setIsLiveMode(false);
            isLiveModeRef.current = false;
            setIsWakeActive(false);
            isWakeActiveRef.current = false;
            setLiveTranscript('');
            liveTranscriptRef.current = '';
            const ack = `Señor ${userName}, Modo Live pausado. El asistente vuelve a modo manual.`;
            setCurrentResponse(ack);
            if (!voiceMuted) jarvisVoice.speak(cleanVoiceTextForSpeech(ack));
          }
          return;
        }

        // 2. Explicit voice command to activate Modo Live (e.g. "Meteory activa el modo live", "Modo en vivo")
        if (isLiveModeVoiceCommand(candidateTranscript)) {
          setIsLiveMode(true);
          isLiveModeRef.current = true;
          setIsWakeActive(true);
          isWakeActiveRef.current = true;
          setLiveTranscript('');
          liveTranscriptRef.current = '';
          sfx.playActivationBlip();
          const ack = `Señor ${userName}, Modo Live activado. Toda la comunicación es ahora 100% por voz. Le escucho atentamente al decir 'Meteory' o al hablar.`;
          setCurrentResponse(ack);
          if (!voiceMuted) {
            jarvisVoice.speak(cleanVoiceTextForSpeech(ack), () => {
              safelyResumeRecognition();
            });
          }
          return;
        }

        // 2b. Explicit voice command to activate Modo Game Met (e.g. "activa tu modo game met", "modo game met")
        if (isGameMetVoiceCommand(candidateTranscript)) {
          setLiveTranscript('');
          liveTranscriptRef.current = '';
          handleGameMetActivation(candidateTranscript);
          return;
        }

        // 3. Check for wake word in transcript ("Meteory", "Meteoro", "Mete oro", "Hey Meteori", etc.)
        const hasWakeWord = detectMeteoryWakeWord(candidateTranscript, customWakeWordRef.current);

        if (hasWakeWord) {
          // Trigger acoustic feedback & ensure Live Mode is activated!
          if (!isWakeActiveRef.current) {
            sfx.playActivationBlip();
            setIsWakeActive(true);
            isWakeActiveRef.current = true;
            setIsLiveMode(true);
            isLiveModeRef.current = true;
          }

          const command = extractCommandAfterWakeWord(candidateTranscript, customWakeWordRef.current);

          const commitWakeQuery = () => {
            setLiveTranscript('');
            liveTranscriptRef.current = '';
            if (command.trim().length > 1) {
              setIsWakeActive(false);
              isWakeActiveRef.current = false;
              if (isGameMetVoiceCommand(command.trim())) {
                handleGameMetActivation(command.trim());
              } else {
                handleUserQuery(command.trim());
              }
            } else {
              // Said only the wake word ("Meteory", "Meteoro", "Hey Meteori")
              const ack = `Señor ${userName}, a sus órdenes en Modo Live. Le escucho atentamente. ¿Qué orden desea ejecutar?`;
              setCurrentResponse(ack);
              if (!voiceMuted) {
                jarvisVoice.speak(cleanVoiceTextForSpeech(ack), () => {
                  safelyResumeRecognition();
                });
              }
            }
          };

          if (hasFinalChunk) {
            commitWakeQuery();
          } else {
            // Debounce for 600ms silence so we capture full command without cutting off early
            speechSilenceTimerRef.current = setTimeout(commitWakeQuery, 600);
          }
          return;
        }

        // 4. In Modo Live, user can talk directly hands-free without repeating wake word!
        if (isLiveModeRef.current) {
          const commitLiveDirectQuery = () => {
            const text = liveTranscriptRef.current.trim();
            if (text.length > 1) {
              setLiveTranscript('');
              liveTranscriptRef.current = '';
              handleUserQuery(text);
            }
          };

          if (hasFinalChunk) {
            commitLiveDirectQuery();
          } else {
            // Debounce for 850ms of user silence
            speechSilenceTimerRef.current = setTimeout(commitLiveDirectQuery, 850);
          }
          return;
        }

        // 5. Normal listening mode direct query fallback
        const commitDirectQuery = () => {
          const text = liveTranscriptRef.current.trim();
          if (text.length > 1) {
            setLiveTranscript('');
            liveTranscriptRef.current = '';
            handleUserQuery(text);
          }
        };

        if (hasFinalChunk) {
          commitDirectQuery();
        } else {
          speechSilenceTimerRef.current = setTimeout(commitDirectQuery, 1000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event?.error);
        if (event?.error === 'not-allowed') {
          isIntentionalListeningRef.current = false;
          setIsListening(false);
          setIsWakeActive(false);
          isWakeActiveRef.current = false;
          setIsLiveMode(false);
          isLiveModeRef.current = false;
          stopAudioMeter();
          setSpeechWarning('Permiso de micrófono denegado. Permite el micrófono en tu navegador.');
          setTimeout(() => setSpeechWarning(''), 5000);
        }
        // 'no-speech' or 'network' are non-fatal, onend will auto-restart if intentional!
      };

      recognition.onend = () => {
        setMicLevel(0);
        // If there was any pending uncommitted speech, submit it
        if (liveTranscriptRef.current.trim().length > 1 && !isSpeakingRef.current) {
          const pending = liveTranscriptRef.current.trim();
          setLiveTranscript('');
          liveTranscriptRef.current = '';
          const hasWake = detectMeteoryWakeWord(pending, customWakeWordRef.current);
          const finalCmd = hasWake
            ? extractCommandAfterWakeWord(pending, customWakeWordRef.current)
            : pending;
          if (finalCmd.trim().length > 1) {
            handleUserQuery(finalCmd.trim());
          }
        }

        if ((isIntentionalListeningRef.current || isLiveModeRef.current) && !isSpeakingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if ((isIntentionalListeningRef.current || isLiveModeRef.current) && !isSpeakingRef.current) {
              try {
                recognition.start();
              } catch {
                safelyResumeRecognition();
              }
            }
          }, 80);
        } else if (!isIntentionalListeningRef.current && !isLiveModeRef.current) {
          setIsListening(false);
          setIsWakeActive(false);
          isWakeActiveRef.current = false;
          stopAudioMeter();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Microphone start error:', err);
      setIsListening(false);
      setIsWakeActive(false);
      isWakeActiveRef.current = false;
      stopAudioMeter();
      setSpeechWarning('Toca el icono del micrófono para autorizar la escucha continua.');
      setTimeout(() => setSpeechWarning(''), 4000);
    }
  };

  const stopListening = () => {
    isIntentionalListeningRef.current = false;
    setIsListening(false);
    setIsWakeActive(false);
    isWakeActiveRef.current = false;
    setIsLiveMode(false);
    isLiveModeRef.current = false;
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    stopAudioMeter();
  };

  // Safely restart or resume speech recognition avoiding browser InvalidStateError
  const safelyResumeRecognition = () => {
    if (!isIntentionalListeningRef.current && !isLiveModeRef.current) return;
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    } catch {}
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (isIntentionalListeningRef.current || isLiveModeRef.current) {
        startListening();
      }
    }, 180);
  };

  // Dedicated toggle for Modo Live (100% hands-free voice communication with "Meteory")
  // Automatically deactivates and silences any ongoing voice when pressed
  const toggleLiveMode = async () => {
    // 1. Instantly silence and deactivate any currently speaking voice
    jarvisVoice.stop();
    setIsSpeaking(false);

    if (isLiveMode || isListening) {
      setIsLiveMode(false);
      isLiveModeRef.current = false;
      setIsWakeActive(false);
      isWakeActiveRef.current = false;
      stopListening();
      const ack = `Señor ${userName}, micrófono desactivado y voz silenciada.`;
      setCurrentResponse(ack);
    } else {
      setIsLiveMode(true);
      isLiveModeRef.current = true;
      sfx.playActivationBlip();
      await startListening();
      const ack = `Señor ${userName}, Modo Live activado. Le escucho atentamente al decir 'Meteory' o al hablar.`;
      setCurrentResponse(ack);
    }
  };

  // Handle Query Submission with Silent Background Telemetry & Reminder Parsing
  const handleUserQuery = async (queryText: string) => {
    const cleanedQuery = queryText.trim().toLowerCase();
    if (!cleanedQuery || isThinking) return;

    const now = Date.now();
    // Guard against identical duplicate queries sent within 4 seconds (prevents speech loop / credit waste)
    if (cleanedQuery === lastQueryRef.current && now - lastQueryTimeRef.current < 4000) {
      return;
    }
    lastQueryRef.current = cleanedQuery;
    lastQueryTimeRef.current = now;

    // Silent background telemetry
    let telemetry: DeviceTelemetry | undefined;
    try {
      telemetry = await SystemDaemon.getLiveTelemetry();
    } catch {}

    // Check if user is invoking "Modo Game Met"
    if (isGameMetVoiceCommand(queryText)) {
      handleGameMetActivation(queryText);
      setInputText('');
      return;
    }

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
        jarvisVoice.speak(cleanVoiceTextForSpeech(finalReply), () => {
          if (isIntentionalListeningRef.current || isLiveModeRef.current) {
            safelyResumeRecognition();
          }
        });
      }
      return;
    }

    // Extract permanent memory
    await ReminderDaemon.extractAndSaveMemory(queryText, userName);

    // Covert Real OS Terminal & System Hardware Actuator ("oculta no visible")
    if (LocalOSActuator.isOSDirective(queryText)) {
      setIsThinking(true);
      sfx.playProcessingTone();
      const osResult = await LocalOSActuator.executeCommand(queryText, userName);
      setIsThinking(false);
      sfx.playActivationBlip();

      const finalReply = ensureJarvisHonorific(osResult.summaryMessage, userName);
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

      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveChatMessage(uid, 'user', queryText.trim());
        await saveChatMessage(uid, 'assistant', finalReply);
      }

      if (!voiceMuted) {
        jarvisVoice.speak(cleanVoiceTextForSpeech(finalReply), () => {
          if (isIntentionalListeningRef.current || isLiveModeRef.current) {
            safelyResumeRecognition();
          }
        });
      }
      return;
    }

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
              provider: engineConfig.provider || 'gemini',
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
        jarvisVoice.speak(cleanSpeech, () => {
          // If in Live Mode or intentional continuous listening, cleanly resume recognition hands-free
          if (isIntentionalListeningRef.current || isLiveModeRef.current) {
            safelyResumeRecognition();
          }
        });
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
    const testPhrase =
      selectedVoiceId === 'sherpa-tts-local'
        ? `Señor ${userName}, motor local SherpaTTS versión 3.4 org punto woheller69 punto ttsengine con modelos Piper low y x-low activo y listo.`
        : `Señor ${userName}, todos los sistemas de voz neural de Jarvis en español latino se encuentran calibrados y a su servicio.`;
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

          {/* Dedicated MODO LIVE Action Button in Top Bar */}
          <button
            type="button"
            onClick={toggleLiveMode}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-mono transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-md ${
              isLiveMode
                ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-slate-900/80 hover:bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
            }`}
            title={isLiveMode ? 'Pausar Modo Live' : 'Activar Modo Live'}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveMode ? 'text-amber-400 animate-spin' : 'text-cyan-400'}`} />
            <span className="font-bold tracking-wider text-[11px] sm:text-xs">
              {isLiveMode ? '● MODO LIVE' : 'MODO LIVE'}
            </span>
          </button>

          {/* Real Android 14/15 Permissions Control Button */}
          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-cyan-500/40 bg-slate-900/80 hover:bg-cyan-950/60 text-cyan-300 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-cyan-400"
            title="Centro de Permisos de Android (53 permisos con intent real a Ajustes)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-bold">PERMISOS ANDROID</span>
            <span className="sm:hidden font-bold">PERMISOS</span>
          </button>

          {/* Overlay Floating Bubble Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOverlayBubbleActive((prev) => !prev)}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isOverlayBubbleActive
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Activar/Desactivar Burbuja Flotante de Superposición (FPS y Control sobre otras apps)"
          >
            <span className="text-[11px] animate-pulse">🔮</span>
            <span className="hidden sm:inline font-bold">BURBUJA FPS</span>
            <span className="sm:hidden font-bold">FPS</span>
          </button>

          {/* Dedicated Game Met Button */}
          <button
            type="button"
            onClick={() => handleGameMetActivation()}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-purple-500/50 bg-purple-950/70 hover:bg-purple-900 text-purple-200 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:border-purple-400"
            title="Activar Modo Game Met (Superposición de FPS y salida a pantalla principal)"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline font-bold">GAME MET</span>
            <span className="sm:hidden font-bold">GAME</span>
          </button>

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

      {/* CENTRAL 3D JARVIS REALISTIC SPHERE & LIVE MODE TACTICAL HUB */}
      <main className="relative flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-0 px-4 py-1 pointer-events-auto">
        <div className="relative w-full h-[280px] sm:h-[340px] md:h-[380px] flex items-center justify-center">
          <JarvisRealisticSphere
            isListening={isListening}
            isSpeaking={isSpeaking}
            audioLevel={micLevel}
            className="w-full h-full"
          />

          {/* Floating Live Mode / Wake guidance indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {isLiveMode ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/80 text-amber-300 text-xs font-mono shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span className="font-bold tracking-wider">MODO LIVE ACTIVO</span>
                <span className="text-[10px] text-slate-300 font-sans hidden sm:inline">· Di "Meteory" o habla directo</span>
                <button
                  type="button"
                  onClick={toggleLiveMode}
                  className="ml-1 px-1.5 py-0.5 rounded bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-[10px] text-amber-200 transition-colors cursor-pointer"
                  title="Pausar Modo Live"
                >
                  Pausar
                </button>
              </div>
            ) : isListening ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/60 text-slate-200 text-xs font-mono backdrop-blur-md shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Di <strong className="text-cyan-300">"Meteory"</strong> para hablar o activar Modo Live</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleLiveMode}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/90 to-blue-950/90 hover:from-cyan-900 hover:to-blue-900 border border-cyan-400/70 text-cyan-200 text-xs font-mono backdrop-blur-md transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:scale-105"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="font-semibold tracking-wide">Activar Modo Live (Voz con "Meteory")</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Live Speech Transcription Bubble (Instant visual confirmation of detected voice) */}
        {liveTranscript && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-950/95 border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.6)] text-cyan-200 text-xs font-mono animate-pulse z-30 max-w-lg text-center backdrop-blur-md -mt-1 mb-1">
            <Mic className="w-4 h-4 text-cyan-300 shrink-0 animate-bounce" />
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider shrink-0">Voz Detectada:</span>
            <span className="truncate italic text-white font-semibold">"{liveTranscript}"</span>
          </div>
        )}

        {/* Operational Status Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-800/80 bg-slate-950/70 backdrop-blur-md text-[11px] font-mono tracking-wider uppercase -mt-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isWakeActive
                ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping'
                : isSpeaking
                ? 'bg-cyan-400 shadow-[0_0_10px_#00e5ff] animate-pulse'
                : isListening
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : isThinking
                ? 'bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-pulse'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-300 font-medium">
            {isWakeActive
              ? `¡"${customWakeWord}" detectado! Transmitiendo...`
              : isSpeaking
              ? 'Meteory respondiendo (Voz Neural)'
              : isThinking
              ? 'Procesando orden táctica...'
              : liveTranscript
              ? `Procesando: "${liveTranscript}"...`
              : isLiveMode
              ? 'Modo En Vivo · Puedes hablar libremente'
              : isListening
              ? `Escucha continua activa · Di "${customWakeWord}" o habla directamente`
              : 'Sistema Meteory en línea · Arrastra la esfera para rotar'}
          </span>
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
          {/* Quick Command Chips with Live Mode & Telemetry */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              isLiveMode ? 'Pausar Modo Live' : 'Iniciar Modo Live (Voz)',
              'Recuérdame dormir a las 05:00',
              '¿Cuánta batería tengo?',
              '¿Qué hora y fecha es?',
              'Estado del sistema',
              'Memoria y Hardware',
            ].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => {
                  if (cmd.includes('Modo Live')) {
                    toggleLiveMode();
                  } else {
                    handleUserQuery(cmd);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                  cmd.includes('Modo Live') && isLiveMode
                    ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-cyan-300'
                }`}
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
            {/* Microphone Wake Word / Live Mode Button */}
            <button
              type="button"
              onClick={toggleLiveMode}
              className={`w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                isLiveMode
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_20px_#f59e0b] scale-105 animate-pulse'
                  : isWakeActive
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_#f59e0b] scale-110 animate-pulse'
                  : isListening
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_#00e5ff] scale-105'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700'
              }`}
              title={
                isLiveMode
                  ? 'Modo Live Activo: Comunicación 100% por voz (Di "Meteory"). Clic para pausar.'
                  : isWakeActive
                  ? `¡Palabra "${customWakeWord}" detectada! Transmitiendo a la IA...`
                  : isListening
                  ? 'Detener micrófono'
                  : `Activar Modo Live / escucha por voz ("${customWakeWord}")`
              }
            >
              {isLiveMode ? (
                <Radio className="w-4 h-4 animate-spin text-slate-950" />
              ) : isListening ? (
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
              placeholder={liveTranscript ? `Escuchando: "${liveTranscript}"...` : `Escribe una orden o di '${customWakeWord}'...`}
              disabled={isThinking}
              className="flex-1 px-2.5 py-2 text-xs sm:text-sm bg-transparent text-slate-100 placeholder:text-cyan-300/80 font-sans tracking-normal focus:outline-none"
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
                        {v.id === 'sherpa-tts-local' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                            LOCAL OFFLINE · PIPER
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

      {/* REAL ANDROID 14/15 PERMISSIONS MODAL */}
      <AndroidPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        initialCategory={permissionsModalCategory}
        highlightPermissionId={highlightPermissionId}
        onOverlayStateChanged={(granted) => {
          if (granted) {
            setIsOverlayBubbleActive(true);
          }
        }}
      />

      {/* METEORY IA — BURBUJA INTELIGENTE FLOTANTE CON FPS REALES (SYSTEM_ALERT_WINDOW) */}
      <FloatingOverlayBubble
        userName={userName}
        engineConfig={engineConfig}
        isActive={isOverlayBubbleActive}
        onToggleActive={() => setIsOverlayBubbleActive((prev) => !prev)}
      />
    </div>
  );
};

