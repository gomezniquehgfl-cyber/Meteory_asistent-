/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleAuthScreen } from './components/GoogleAuthScreen.tsx';
import { UserSetupScreen } from './components/UserSetupScreen.tsx';
import { EngineSetupScreen, EngineConfig } from './components/EngineSetupScreen.tsx';
import { MainAssistantHUD } from './components/MainAssistantHUD.tsx';
import {
  auth,
  signOut,
  syncUserProfile,
  getUserProfile,
  onAuthStateChanged,
  testFirestoreConnection,
  FirebaseUser,
} from './firebase.ts';
import { ShieldCheck } from 'lucide-react';

type AppStep = 'auth' | 'user_setup' | 'engine_setup' | 'main';

export default function App() {
  const [step, setStep] = useState<AppStep>('auth');
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [userEmail, setUserEmail] = useState('niquelg247@gmail.com');
  const [userName, setUserName] = useState('Niquel');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({
    mode: 'cloud',
    modelName: 'gemini-3.1-flash-lite',
    customApiKey: undefined,
  });

  // Verify connection to Firestore & Restore session automatically (Log in once!)
  useEffect(() => {
    testFirestoreConnection();

    // Check if ?autostart=1 is present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setUserEmail('niquelg247@gmail.com');
        setUserName('Niquel');
        setEngineConfig({
          mode: 'cloud',
          modelName: 'gemini-3.1-flash-lite',
          customApiKey: undefined,
        });
        setStep('main');
        setIsRestoringSession(false);
        return;
      }
    }

    // Permanent session listener across app exits, browser reopens and PWA launches
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setFirebaseUser(currentUser);
        setUserEmail(currentUser.email || 'niquelg247@gmail.com');
        localStorage.setItem('meteory_session_active', 'true');
        localStorage.setItem('meteory_user_email', currentUser.email || 'niquelg247@gmail.com');

        try {
          // Fetch existing user profile from Firestore
          const profile = await getUserProfile(currentUser.uid);
          const name = profile?.customUserName || (currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Niquel');
          setUserName(name);
          localStorage.setItem('meteory_user_name', name);

          // Restore previously configured engine so the user goes STRAIGHT to the main HUD
          const savedEngineStr = localStorage.getItem(`meteory_engine_${currentUser.uid}`) || localStorage.getItem('meteory_engine_default');
          if (savedEngineStr) {
            try {
              const savedEngine = JSON.parse(savedEngineStr);
              setEngineConfig(savedEngine);
              setStep('main');
              setIsRestoringSession(false);
              return;
            } catch {}
          }

          // If user setup was previously finished, proceed to main HUD
          const isSetupDone = localStorage.getItem(`meteory_setup_complete_${currentUser.uid}`) || localStorage.getItem('meteory_setup_complete');
          if (isSetupDone === 'true') {
            setStep('main');
          } else {
            setStep('user_setup');
          }
        } catch (e) {
          console.warn('Error recuperando perfil de sesión:', e);
          setStep('main');
        }
      } else {
        // Fallback: Check if user previously signed in via email/credentials
        const localActive = localStorage.getItem('meteory_session_active');
        if (localActive === 'true') {
          const savedEmail = localStorage.getItem('meteory_user_email') || 'niquelg247@gmail.com';
          const savedName = localStorage.getItem('meteory_user_name') || 'Niquel';
          setUserEmail(savedEmail);
          setUserName(savedName);

          const savedEngineStr = localStorage.getItem('meteory_engine_default');
          if (savedEngineStr) {
            try {
              setEngineConfig(JSON.parse(savedEngineStr));
            } catch {}
          }
          // Direct entrance to main HUD! Never logs out!
          setStep('main');
        } else {
          setStep('auth');
        }
      }
      setIsRestoringSession(false);
    });

    return () => unsubscribe();
  }, []);

  // Step 1: Google Auth Completed (Firebase)
  const handleAuthSuccess = (email: string, detectedName: string, user?: FirebaseUser) => {
    setUserEmail(email);
    setUserName(detectedName || 'Niquel');
    localStorage.setItem('meteory_session_active', 'true');
    localStorage.setItem('meteory_user_email', email);
    localStorage.setItem('meteory_user_name', detectedName || 'Niquel');
    if (user) {
      setFirebaseUser(user);
    }
    setStep('user_setup');
  };

  // Step 2: Username Confirmed
  const handleUserConfirmed = async (chosenName: string) => {
    setUserName(chosenName);
    localStorage.setItem('meteory_user_name', chosenName);
    if (firebaseUser) {
      try {
        await syncUserProfile(firebaseUser, chosenName);
        localStorage.setItem(`meteory_user_name_${firebaseUser.uid}`, chosenName);
      } catch (e) {
        console.warn('Sync user profile in Firestore:', e);
      }
    }
    setStep('engine_setup');
  };

  // Step 3: Engine Configured (Persisted so user never has to re-login on app exit)
  const handleEngineConfirmed = (config: EngineConfig) => {
    setEngineConfig(config);
    localStorage.setItem('meteory_session_active', 'true');
    localStorage.setItem('meteory_engine_default', JSON.stringify(config));
    localStorage.setItem('meteory_setup_complete', 'true');
    if (firebaseUser) {
      localStorage.setItem(`meteory_engine_${firebaseUser.uid}`, JSON.stringify(config));
      localStorage.setItem(`meteory_setup_complete_${firebaseUser.uid}`, 'true');
    }
    setStep('main');
  };

  // Explicit user logout / reset
  const handleResetSession = async () => {
    localStorage.removeItem('meteory_session_active');
    localStorage.removeItem('meteory_user_email');
    localStorage.removeItem('meteory_user_name');
    localStorage.removeItem('meteory_engine_default');
    localStorage.removeItem('meteory_setup_complete');
    if (firebaseUser) {
      localStorage.removeItem(`meteory_engine_${firebaseUser.uid}`);
      localStorage.removeItem(`meteory_setup_complete_${firebaseUser.uid}`);
      localStorage.removeItem(`meteory_user_name_${firebaseUser.uid}`);
    }
    try {
      await signOut(auth);
    } catch {}
    setFirebaseUser(null);
    setEngineConfig({
      mode: 'cloud',
      modelName: 'gemini-3.1-flash-lite',
      customApiKey: undefined,
    });
    setStep('auth');
  };

  // Render sleek cyber splash loader while restoring existing session
  if (isRestoringSession) {
    return (
      <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col justify-center items-center relative overflow-hidden font-hud">
        <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.25)] animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              METEORY ASISTEN
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Sincronizando sesión persistente...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col justify-center items-center relative overflow-hidden font-hud">
      {/* Dynamic Cyber Ambient Background */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,102,255,0.15)_0%,transparent_70%)] pointer-events-none" />

      {step === 'auth' && (
        <div className="w-full px-4 py-8 flex items-center justify-center">
          <GoogleAuthScreen onSuccess={handleAuthSuccess} />
        </div>
      )}

      {step === 'user_setup' && (
        <div className="w-full px-4 py-8 flex items-center justify-center">
          <UserSetupScreen initialName={userName} onConfirm={handleUserConfirmed} />
        </div>
      )}

      {step === 'engine_setup' && (
        <div className="w-full px-4 py-8 flex items-center justify-center">
          <EngineSetupScreen userName={userName} onConfirm={handleEngineConfirmed} />
        </div>
      )}

      {step === 'main' && (
        <MainAssistantHUD
          userName={userName}
          userEmail={userEmail}
          engineConfig={engineConfig}
          onResetSession={handleResetSession}
        />
      )}
    </div>
  );
}
