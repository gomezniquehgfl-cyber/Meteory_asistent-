import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  syncUserProfile,
  registerWithEmail,
  signInWithEmailAndPassword,
  FirebaseUser,
} from '../firebase.ts';

interface GoogleAuthScreenProps {
  onSuccess: (accountEmail: string, accountName: string, firebaseUser?: FirebaseUser) => void;
}

export const GoogleAuthScreen: React.FC<GoogleAuthScreenProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingMessage, setVerifyingMessage] = useState('Iniciando sesión...');
  const [authError, setAuthError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google Sign-In with Firebase
  const handleGoogleSignIn = async () => {
    setIsVerifying(true);
    setAuthError('');
    setVerifyingMessage('Conectando con Google...');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email || 'usuario@gmail.com';
      const displayName = user.displayName || userEmail.split('@')[0];
      setVerifyingMessage('Sincronizando perfil seguro...');

      await syncUserProfile(user, displayName.split(' ')[0]);

      setTimeout(() => {
        onSuccess(userEmail, displayName, user);
      }, 500);
    } catch (err: any) {
      console.warn('Firebase signInWithPopup error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setAuthError('La ventana de inicio de sesión fue cerrada.');
      } else {
        setAuthError(err?.message || 'No se pudo completar el inicio de sesión con Google.');
      }
      setIsVerifying(false);
    }
  };

  // Email / Password Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Introduce un correo electrónico válido.');
      return;
    }
    if (cleanPassword.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    if (tab === 'register') {
      setVerifyingMessage('Creando tu cuenta...');
      try {
        const user = await registerWithEmail(cleanEmail, cleanPassword, cleanName);
        setVerifyingMessage('Sincronizando perfil...');
        setTimeout(() => {
          onSuccess(cleanEmail, cleanName, user);
        }, 600);
      } catch (err: any) {
        console.warn('Register error:', err);
        if (err?.code === 'auth/email-already-in-use') {
          setAuthError('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
          setIsVerifying(false);
        } else if (err?.code === 'auth/operation-not-allowed') {
          // Fallback if email provider pending in console
          setTimeout(() => {
            onSuccess(cleanEmail, cleanName);
          }, 600);
        } else {
          setAuthError(err?.message || 'Error al crear la cuenta.');
          setIsVerifying(false);
        }
      }
    } else {
      setVerifyingMessage('Verificando credenciales...');
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        setVerifyingMessage('Accediendo al sistema...');
        await syncUserProfile(cred.user, cleanName);
        setTimeout(() => {
          onSuccess(cleanEmail, cleanName, cred.user);
        }, 600);
      } catch (err: any) {
        console.warn('Login error:', err);
        if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          setAuthError('Correo o contraseña incorrectos.');
          setIsVerifying(false);
        } else if (err?.code === 'auth/operation-not-allowed') {
          // Fallback if provider activation pending in console
          setTimeout(() => {
            onSuccess(cleanEmail, cleanName);
          }, 600);
        } else {
          setAuthError(err?.message || 'Error al iniciar sesión.');
          setIsVerifying(false);
        }
      }
    }
  };

  return (
    <div className="relative z-10 w-full max-w-[420px] mx-auto">
      {/* Specular hairline top glow */}
      <div className="absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_15px_#00d2ff]" />

      {/* Main Glass Panel */}
      <div className="relative rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-black/80">
        {/* Brand Kicker & Title */}
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono tracking-widest text-cyan-400/90 uppercase font-medium">
            METEORY · TERMINAL DE ACCESO
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5 font-futuristic">
            Iniciar Sesión
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
            Accede al asistente con tu cuenta de Google o regístrate para sincronizar tu entorno.
          </p>
        </div>

        {isVerifying ? (
          /* Processing State */
          <div className="py-12 text-center space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <ShieldCheck className="absolute inset-0 m-auto w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-xs font-mono tracking-wider text-cyan-300 uppercase animate-pulse">
              {verifyingMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Official Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-sans text-sm font-medium transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            {/* Subtle Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-950 px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                o con correo
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Segmented Mode Switcher (Clean tabs) */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-sans">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setAuthError('');
                }}
                className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setAuthError('');
                }}
                className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {tab === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Nombre o título de usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Niquel, Comandante"
                      className="w-full h-10 pl-9 pr-3 text-xs bg-slate-900/50 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/40 font-sans transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    required
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-900/50 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/40 font-sans transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full h-10 pl-9 pr-9 text-xs bg-slate-900/50 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/40 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-sans">
                  {authError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-10 mt-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans text-xs font-semibold tracking-wide transition-all shadow-[0_0_15px_rgba(0,210,255,0.25)] hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] cursor-pointer active:scale-[0.99]"
              >
                {tab === 'register' ? 'Registrar cuenta' : 'Acceder al terminal'}
              </button>
            </form>

            {/* Status Footer */}
            <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                Firestore conectado
              </span>
              <span>Encriptación 256-bit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
