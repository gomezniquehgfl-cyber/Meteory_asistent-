import React, { useState } from 'react';
import { Cloud, Cpu, HardDrive, Key, ArrowRight, CheckCircle2, Upload, WifiOff } from 'lucide-react';

export interface EngineConfig {
  mode: 'cloud' | 'local';
  customApiKey?: string;
  modelName: string;
  localModelFileName?: string;
  localModelSize?: string;
}

interface EngineSetupScreenProps {
  userName: string;
  onConfirm: (config: EngineConfig) => void;
}

export const EngineSetupScreen: React.FC<EngineSetupScreenProps> = ({ userName, onConfirm }) => {
  const [selectedMode, setSelectedMode] = useState<'cloud' | 'local'>('cloud');
  // Always starts completely empty on account creation or login, as requested
  const [customKey, setCustomKey] = useState('');
  const [selectedCloudModel, setSelectedCloudModel] = useState('gemini-3.1-flash-lite');

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
    const cleanKey = customKey.trim();
    onConfirm({
      mode: selectedMode,
      customApiKey: selectedMode === 'cloud' && cleanKey ? cleanKey : undefined,
      modelName: selectedMode === 'cloud' ? selectedCloudModel : localPreset,
      localModelFileName: importedFileName || undefined,
      localModelSize: importedFileSize || undefined,
    });
  };

  return (
    <div className="relative z-10 w-full max-w-[500px] mx-auto">
      {/* Specular hairline top glow */}
      <div className="absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_15px_#00d2ff]" />

      <div className="relative rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-black/80">
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono tracking-widest text-cyan-400/90 uppercase font-medium">
            METEORY · CONFIGURACIÓN DEL MOTOR
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1.5 font-futuristic">
            Motor de Inteligencia
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
            Señor {userName}, selecciona la inferencia en nube o la matriz neuronal autónoma.
          </p>
        </div>

        {/* 2 Options Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Option 1: Cloud */}
          <button
            type="button"
            onClick={() => setSelectedMode('cloud')}
            className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
              selectedMode === 'cloud'
                ? 'border-cyan-500/60 bg-cyan-950/25 shadow-[0_0_20px_rgba(0,210,255,0.15)] ring-1 ring-cyan-500/40'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            {selectedMode === 'cloud' && (
              <div className="absolute top-3 right-3 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2.5">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="font-sans font-semibold text-xs text-white">
              Gemini Cloud AI
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal font-sans">
              Modelo Gemini 3.5 Flash Lite de alta velocidad en la nube.
            </p>
          </button>

          {/* Option 2: Local */}
          <button
            type="button"
            onClick={() => setSelectedMode('local')}
            className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative ${
              selectedMode === 'local'
                ? 'border-cyan-500/60 bg-cyan-950/25 shadow-[0_0_20px_rgba(0,210,255,0.15)] ring-1 ring-cyan-500/40'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
            }`}
          >
            {selectedMode === 'local' && (
              <div className="absolute top-3 right-3 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="font-sans font-semibold text-xs text-white flex items-center gap-1.5">
              <span>Modelo Local</span>
              <WifiOff className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal font-sans">
              100% offline sin internet, seguro y autónomo.
            </p>
          </button>
        </div>

        {/* Configuration Box */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-5 space-y-3.5">
          {selectedMode === 'cloud' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-slate-400 font-mono text-[11px]">Motor activo:</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  gemini-3.5-flash-lite
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-sans text-cyan-300 font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Clave API personal de Gemini:</span>
                </label>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Introduce tu clave API (o déjala vacía si usas la del sistema)"
                  autoComplete="new-password"
                  className="w-full h-10 px-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-cyan-100 placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
                />
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  El campo inicia siempre vacío por sesión. Puedes introducir tu clave API propia de Google AI Studio para usar tus tokens o dejarla vacía para usar la conexión activa.
                </p>
              </div>
            </div>
          ) : (
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

              {/* Import button */}
              <div className="p-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/50 text-center">
                <input
                  id="model-file-upload"
                  type="file"
                  accept=".gguf,.bin,.onnx,.safetensors,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="model-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-slate-300 hover:text-cyan-300"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="font-sans font-medium">
                    {importedFileName ? `Cargado: ${importedFileName}` : 'Importar archivo de modelo (.gguf, .onnx, .bin)'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {importedFileSize ? `Tamaño: ${importedFileSize}` : 'Haz clic para seleccionar desde tu dispositivo'}
                  </span>
                </label>
              </div>

              {/* Preset Select */}
              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1">
                  O usa la matriz local preinstalada:
                </label>
                <select
                  value={localPreset}
                  onChange={(e) => setLocalPreset(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                >
                  <option value="Meteory-Neural-V3 (1.2B Quantized)">
                    Meteory-Neural-V3 (1.2B Quantized Matrix)
                  </option>
                  <option value="Jarvis-Tactical-Local (750M Onnx)">
                    Jarvis-Tactical-Local (750M Core)
                  </option>
                  <option value="Cyber-Matrix-Offline (Lite Engine)">
                    Cyber-Matrix-Offline (Lite Engine)
                  </option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleStart}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.25)] transition-all cursor-pointer active:scale-[0.99]"
        >
          <span>Iniciar Interfaz Principal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
