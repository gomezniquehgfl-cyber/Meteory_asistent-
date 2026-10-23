import React, { useState } from 'react';
import { Cloud, Cpu, HardDrive, Key, ArrowRight, CheckCircle2, Upload, WifiOff, Sparkles, Volume2, Shield } from 'lucide-react';
import { jarvisVoice } from '../utils/speech.ts';

export interface EngineConfig {
  mode: 'cloud' | 'local';
  provider?: 'gemini' | 'openai' | 'openrouter';
  customApiKey?: string;
  modelName: string;
  localModelFileName?: string;
  localModelSize?: string;
  elevenLabsApiKey?: string;
}

interface EngineSetupScreenProps {
  userName: string;
  onConfirm: (config: EngineConfig) => void;
}

type ProviderType = 'gemini' | 'openai' | 'openrouter' | 'local';

export const EngineSetupScreen: React.FC<EngineSetupScreenProps> = ({ userName, onConfirm }) => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('gemini');

  // API Keys (start empty as required, or load saved from localStorage)
  const [geminiKey, setGeminiKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState(() => jarvisVoice.getElevenLabsApiKey() || '');

  // Model selections
  const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-lite');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o-mini');
  const [openRouterModel, setOpenRouterModel] = useState('meta-llama/llama-3.3-70b-instruct');

  // Local model states
  const [localPreset, setLocalPreset] = useState('Meteory-Neural-V3 (1.2B Quantized)');
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [importedFileSize, setImportedFileSize] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportedFileName(file.name);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setImportedFileSize(`${sizeMB} MB`);
    }
  };

  const handleStart = () => {
    // Save ElevenLabs key if provided
    const cleanElevenKey = elevenLabsKey.trim();
    jarvisVoice.setElevenLabsApiKey(cleanElevenKey);

    if (selectedProvider === 'local') {
      onConfirm({
        mode: 'local',
        modelName: localPreset,
        localModelFileName: importedFileName || undefined,
        localModelSize: importedFileSize || undefined,
        elevenLabsApiKey: cleanElevenKey || undefined,
      });
      return;
    }

    let activeKey = '';
    let activeModel = '';

    if (selectedProvider === 'gemini') {
      activeKey = geminiKey.trim();
      activeModel = geminiModel;
    } else if (selectedProvider === 'openai') {
      activeKey = openAiKey.trim();
      activeModel = openAiModel;
    } else if (selectedProvider === 'openrouter') {
      activeKey = openRouterKey.trim();
      activeModel = openRouterModel;
    }

    onConfirm({
      mode: 'cloud',
      provider: selectedProvider,
      customApiKey: activeKey || undefined,
      modelName: activeModel,
      elevenLabsApiKey: cleanElevenKey || undefined,
    });
  };

  return (
    <div className="relative z-10 w-full max-w-[540px] mx-auto pb-8">
      {/* Specular hairline top glow */}
      <div className="absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_15px_#00d2ff]" />

      <div className="relative rounded-2xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        <div className="text-center">
          <div className="text-[11px] font-mono tracking-widest text-cyan-400/90 uppercase font-medium">
            METEORY · CONFIGURACIÓN DEL MOTOR
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1.5 font-futuristic">
            Motor de Inteligencia & APIs
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
            Señor {userName}, selecciona tu proveedor de IA preferido y configura la voz ultra-realista.
          </p>
        </div>

        {/* 4 Provider Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Google Gemini */}
          <button
            type="button"
            onClick={() => setSelectedProvider('gemini')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
              selectedProvider === 'gemini'
                ? 'border-cyan-400/80 bg-cyan-950/30 shadow-[0_0_15px_rgba(0,210,255,0.2)] ring-1 ring-cyan-400/40'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            {selectedProvider === 'gemini' && (
              <div className="absolute top-2.5 right-2.5 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <div className="font-sans font-semibold text-xs text-white">Google Gemini</div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans">
              Gemini 3.5 Flash Lite de alta velocidad.
            </p>
          </button>

          {/* 2. OpenAI ChatGPT */}
          <button
            type="button"
            onClick={() => setSelectedProvider('openai')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
              selectedProvider === 'openai'
                ? 'border-emerald-400/80 bg-emerald-950/30 shadow-[0_0_15px_rgba(52,211,153,0.2)] ring-1 ring-emerald-400/40'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            {selectedProvider === 'openai' && (
              <div className="absolute top-2.5 right-2.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="font-sans font-semibold text-xs text-white">OpenAI ChatGPT</div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans">
              GPT-4o / GPT-4o-mini con tu clave API.
            </p>
          </button>

          {/* 3. OpenRouter */}
          <button
            type="button"
            onClick={() => setSelectedProvider('openrouter')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
              selectedProvider === 'openrouter'
                ? 'border-indigo-400/80 bg-indigo-950/30 shadow-[0_0_15px_rgba(129,140,248,0.2)] ring-1 ring-indigo-400/40'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            {selectedProvider === 'openrouter' && (
              <div className="absolute top-2.5 right-2.5 text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="font-sans font-semibold text-xs text-white">OpenRouter</div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans">
              Llama 3, Claude 3.5 y DeepSeek.
            </p>
          </button>

          {/* 4. Modelo Local */}
          <button
            type="button"
            onClick={() => setSelectedProvider('local')}
            className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
              selectedProvider === 'local'
                ? 'border-cyan-400/80 bg-cyan-950/30 shadow-[0_0_15px_rgba(0,210,255,0.2)] ring-1 ring-cyan-400/40'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            {selectedProvider === 'local' && (
              <div className="absolute top-2.5 right-2.5 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="font-sans font-semibold text-xs text-white flex items-center gap-1.5">
              <span>Modelo Local</span>
              <WifiOff className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans">
              100% offline sin internet, autónomo.
            </p>
          </button>
        </div>

        {/* Selected Provider Details Box */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3.5">
          {/* Gemini Config */}
          {selectedProvider === 'gemini' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-400 font-mono text-[11px]">Modelo Gemini:</span>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="bg-slate-950 text-cyan-300 text-[11px] font-mono border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
                >
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Rápido)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Avanzado)</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-sans text-cyan-300 font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Clave API de Google AI Studio:</span>
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Introduce tu clave AIza... (o déjala vacía para usar la del sistema)"
                  autoComplete="new-password"
                  className="w-full h-10 px-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-cyan-100 placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
                />
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Opcional. Si tienes tu propia clave de Google AI Studio, puedes usar tus propios límites.
                </p>
              </div>
            </div>
          )}

          {/* OpenAI Config */}
          {selectedProvider === 'openai' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-400 font-mono text-[11px]">Modelo ChatGPT:</span>
                <select
                  value={openAiModel}
                  onChange={(e) => setOpenAiModel(e.target.value)}
                  className="bg-slate-950 text-emerald-300 text-[11px] font-mono border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-emerald-400"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recomendado)</option>
                  <option value="gpt-4o">gpt-4o (Máxima inteligencia)</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-sans text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Clave API de OpenAI (ChatGPT):</span>
                </label>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  autoComplete="new-password"
                  className="w-full h-10 px-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-emerald-100 placeholder:text-slate-600 font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all"
                />
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Ingresa tu clave de OpenAI para conectar directamente con los servidores de ChatGPT.
                </p>
              </div>
            </div>
          )}

          {/* OpenRouter Config */}
          {selectedProvider === 'openrouter' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-400 font-mono text-[11px]">Modelo OpenRouter:</span>
                <select
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  className="bg-slate-950 text-indigo-300 text-[11px] font-mono border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                >
                  <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-sans text-indigo-300 font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Clave API de OpenRouter:</span>
                </label>
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  autoComplete="new-password"
                  className="w-full h-10 px-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-indigo-100 placeholder:text-slate-600 font-mono focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-all"
                />
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Conecta con cientos de modelos abiertos y propietarios a través de OpenRouter.
                </p>
              </div>
            </div>
          )}

          {/* Local Model Config */}
          {selectedProvider === 'local' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-sans">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modo Local Autónomo</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  Sin internet
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Preset de red neuronal offline:
                </label>
                <select
                  value={localPreset}
                  onChange={(e) => setLocalPreset(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-sans focus:outline-none focus:border-cyan-400"
                >
                  <option value="Meteory-Neural-V3 (1.2B Quantized)">Meteory-Neural-V3 (1.2B Cuantizado - 850 MB)</option>
                  <option value="Llama-3.2-1B-Instruct-Q4">Llama-3.2-1B-Instruct-Q4 (Ultraligero)</option>
                  <option value="Phi-3.5-mini-instruct-Q4">Phi-3.5-mini-instruct-Q4 (Alta precisión)</option>
                </select>
              </div>

              {/* Upload custom model file */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-[11px] font-mono text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar archivo de pesos local (.bin, .onnx, .gguf):</span>
                </label>
                <input
                  type="file"
                  accept=".bin,.onnx,.gguf,.json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-cyan-950/60 file:text-cyan-300 file:border file:border-cyan-500/30 hover:file:bg-cyan-900/60 cursor-pointer"
                />
                {importedFileName && (
                  <p className="text-[11px] font-mono text-emerald-400 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Cargado: {importedFileName} ({importedFileSize})</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ElevenLabs Ultra-Realistic Voice Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900/90 border border-cyan-500/30 space-y-2.5 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-sans font-bold text-white">
                Voz Ultra-Realista ElevenLabs (Estilo Jarvis Español)
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              Opcional
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Al colocar tu clave API de ElevenLabs, METEORY activará automáticamente una voz masculina profunda, barítona y cinematográfica con entonación de Jarvis en español latino.
          </p>

          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="password"
              value={elevenLabsKey}
              onChange={(e) => setElevenLabsKey(e.target.value)}
              placeholder="Clave API de ElevenLabs (xi-api-key)"
              autoComplete="new-password"
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-cyan-200 placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
            />
          </div>
          {elevenLabsKey.trim() && (
            <p className="text-[10px] font-mono text-cyan-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>Voz ultra-realista activada: Barítono Profundo (Latinoamérica)</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.3)] transition-all cursor-pointer active:scale-[0.99]"
        >
          <span>Conectar e Iniciar METEORY HUD</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
