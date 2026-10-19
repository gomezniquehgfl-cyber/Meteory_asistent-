import React, { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

interface UserSetupScreenProps {
  initialName?: string;
  onConfirm: (userName: string) => void;
}

export const UserSetupScreen: React.FC<UserSetupScreenProps> = ({ initialName = '', onConfirm }) => {
  const [name, setName] = useState(initialName || 'Niquel');
  const [error, setError] = useState('');

  const suggestions = ['Niquel', 'Comandante', 'Tony', 'Stark', 'Alexander'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError('Introduce un nombre o designación de usuario.');
      return;
    }
    setError('');
    onConfirm(clean);
  };

  return (
    <div className="relative z-10 w-full max-w-[420px] mx-auto">
      {/* Specular hairline top glow */}
      <div className="absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_15px_#00d2ff]" />

      <div className="relative rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-black/80">
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono tracking-widest text-cyan-400/90 uppercase font-medium">
            METEORY · CONFIGURACIÓN DEL OPERADOR
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1.5 font-futuristic">
            Designación
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
            ¿Cómo deseas que Jarvis y el núcleo METEORY se dirijan a ti?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="user-name-input" className="block text-[11px] font-mono text-slate-400 mb-1">
              Nombre o título
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ej. Niquel, Comandante"
                maxLength={24}
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-900/50 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/40 font-sans transition-all"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>

          {/* Clean Suggestion Chips */}
          <div>
            <span className="block text-[11px] font-mono text-slate-500 mb-1.5">
              Sugerencias rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setName(sug)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    name === sug
                      ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 shadow-sm'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Protocol Preview */}
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 text-xs font-sans text-cyan-300/90 leading-relaxed">
            <span className="text-cyan-400 font-mono text-[11px] block mb-0.5">Protocolo de voz Jarvis:</span>
            <span className="italic">"Señor {name || '...'}, los sistemas neuronales se encuentran en línea."</span>
          </div>

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.25)] transition-all cursor-pointer active:scale-[0.99]"
          >
            <span>Continuar al Motor de IA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
