import React, { useState, useEffect, useMemo } from 'react';
import {
  ALL_ANDROID_PERMISSIONS,
  AndroidPermissionsEngine,
  AndroidPermissionState,
  AndroidPermissionDef,
  PermissionCategory,
  ANDROID_PACKAGE_NAME,
} from '../utils/android-permissions-engine.ts';
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Code2,
  Terminal,
  Search,
  Check,
  Copy,
  X,
  RefreshCw,
  AlertTriangle,
  Info,
  Mic,
  Camera,
  Bell,
  MapPin,
  Settings,
  CheckCircle2,
} from 'lucide-react';

export interface AndroidPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: PermissionCategory | 'all';
  highlightPermissionId?: string;
  onOverlayStateChanged?: (granted: boolean) => void;
}

const CATEGORY_LABELS: Record<PermissionCategory | 'all', string> = {
  all: 'Todos los Permisos (53)',
  accessibility: 'Accesibilidad (Ojos y Manos)',
  shizuku_root: 'Shizuku & Permisos Root',
  overlay: 'Superposición Flotante',
  foreground_services: 'Servicios en Primer Plano',
  media_hardware: 'Cámara, Micrófono & Háptica',
  battery_policies: 'Batería & No Molestar',
  system_settings: 'Ajustes del Sistema & Uso',
  storage_media: 'Almacenamiento & Media',
  location: 'Geolocalización GPS',
  communication: 'Telefonía, SMS & Contactos',
  connectivity: 'Wi-Fi, Bluetooth & Red',
  package_mgmt: 'Gestión de Paquetes & Launcher',
};

export const AndroidPermissionsModal: React.FC<AndroidPermissionsModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  highlightPermissionId,
  onOverlayStateChanged,
}) => {
  const [permissions, setPermissions] = useState<AndroidPermissionState[]>(() =>
    AndroidPermissionsEngine.loadStates()
  );
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | 'all'>(
    initialCategory || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCodeId, setActiveCodeId] = useState<string | null>(highlightPermissionId || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [targetPackage, setTargetPackage] = useState<string>('com.meteory.ia');

  // Probe real hardware permissions on mount and when modal opens
  const probeRealPermissions = async () => {
    setIsProbing(true);
    const updated = await Promise.all(
      permissions.map(async (p) => {
        if (p.isHardwareVerifiable) {
          const granted = await AndroidPermissionsEngine.probeHardwarePermission(p);
          if (granted) {
            AndroidPermissionsEngine.setPermissionGranted(p.id, true);
          }
          return {
            ...p,
            status: (granted || p.status === 'granted') ? ('granted' as const) : ('not_granted' as const),
            lastVerifiedAt: Date.now(),
          };
        }
        return p;
      })
    );
    setPermissions(updated);
    setIsProbing(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setSelectedCategory(initialCategory);
      }
      if (highlightPermissionId) {
        setActiveCodeId(highlightPermissionId);
      }
      // Re-read states from storage to ensure sync
      setPermissions(AndroidPermissionsEngine.loadStates());
      probeRealPermissions();
    }
  }, [isOpen, initialCategory, highlightPermissionId]);

  const handleToggleConfirmed = (item: AndroidPermissionState) => {
    const isNowGranted = item.status !== 'granted';
    AndroidPermissionsEngine.setPermissionGranted(item.id, isNowGranted);
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, status: isNowGranted ? 'granted' : 'not_granted', lastVerifiedAt: Date.now() } : p
      )
    );
    if (item.id === 'android.permission.SYSTEM_ALERT_WINDOW') {
      onOverlayStateChanged?.(isNowGranted);
    }
    setRequestFeedback(
      isNowGranted
        ? `"${item.name}" confirmado como activado en Android.`
        : `"${item.name}" desmarcado.`
    );
    setTimeout(() => setRequestFeedback(null), 3500);
  };

  // Request native hardware permission from Android 14 dialog
  const handleRequestNativeHardware = async (item: AndroidPermissionDef) => {
    let result = false;
    setRequestFeedback(`Solicitando permiso nativo a Android 14 para ${item.name}...`);

    if (item.id === 'android.permission.RECORD_AUDIO') {
      result = await AndroidPermissionsEngine.requestRealMicrophone();
    } else if (item.id === 'android.permission.CAMERA') {
      result = await AndroidPermissionsEngine.requestRealCamera();
    } else if (item.id === 'android.permission.POST_NOTIFICATIONS') {
      result = await AndroidPermissionsEngine.requestRealNotifications();
    } else if (item.id.includes('LOCATION')) {
      result = await AndroidPermissionsEngine.requestRealGeolocation();
    }

    await probeRealPermissions();

    if (result) {
      setRequestFeedback(`¡Permiso concedido exitosamente por el sistema Android 14!`);
    } else {
      setRequestFeedback(`Android 14 no concedió el permiso o fue cancelado en el diálogo del sistema.`);
    }
    setTimeout(() => setRequestFeedback(null), 6000);
  };

  // Filtered list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [permissions, selectedCategory, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExportManifest = () => {
    const xml = AndroidPermissionsEngine.generateAndroidManifestXml();
    handleCopy(xml, 'manifest');
  };

  const handleExportAdbScript = () => {
    const script = AndroidPermissionsEngine.generateAdbGrantScript();
    const blob = new Blob([script], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grant_all_meteory_permissions.sh';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-[0_0_50px_rgba(0,229,255,0.2)] overflow-hidden">
        {/* COMPACT HEADER (~40px) */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-900/80 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shrink-0">
              <Settings className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <h2 className="text-xs sm:text-sm font-futuristic font-bold text-white tracking-wider truncate">
                AJUSTES Y PERMISOS REALES ANDROID 14
              </h2>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 font-mono text-[9px] text-cyan-300 font-semibold shrink-0">
                SIN SIMULACIÓN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportManifest}
              className="px-2 py-1 rounded border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center gap-1 transition-all cursor-pointer"
              title="Copiar AndroidManifest.xml completo"
            >
              <Code2 className="w-3 h-3 text-cyan-400" />
              <span>{copiedId === 'manifest' ? 'Copiado' : 'Manifest'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportAdbScript}
              className="px-2 py-1 rounded border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center gap-1 transition-all cursor-pointer"
              title="Descargar script de activación ADB"
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>ADB (.sh)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ULTRA-COMPACT UNIFIED TOOLBAR (~38px - REDUCED FROM ~10CM TO ~3CM ON MOBILE) */}
        <div className="px-3 py-1.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5 flex-1 min-w-[230px]">
            <div className="relative w-32 sm:w-44">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-6 pr-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-200 placeholder:text-slate-500 text-[11px] focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="py-1 px-1.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-[11px] focus:outline-none focus:border-cyan-500/60 max-w-[150px] sm:max-w-[200px] truncate cursor-pointer"
              title="Filtrar por categoría"
            >
              {(Object.keys(CATEGORY_LABELS) as Array<PermissionCategory | 'all'>).map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <div className="inline-flex rounded border border-slate-800 bg-slate-950 p-0.5">
              <button
                type="button"
                onClick={() => setTargetPackage('com.meteory.ia')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  targetPackage === 'com.meteory.ia'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Paquete objetivo: APK nativo com.meteory.ia"
              >
                APK
              </button>
              <button
                type="button"
                onClick={() => setTargetPackage('com.android.chrome')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  targetPackage === 'com.android.chrome'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Paquete objetivo: Chrome (Navegador)"
              >
                Chrome
              </button>
            </div>

            <a
              href="intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;package=com.android.settings;end"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 flex items-center gap-1 text-[10px] transition-all"
              title="Ajustes de Accesibilidad (Ojos y Manos)"
            >
              <ExternalLink className="w-2.5 h-2.5 text-cyan-400" />
              <span>Accesibilidad</span>
            </a>

            <a
              href={`intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;data=package:${targetPackage};package=com.android.settings;end`}
              className="px-2 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 flex items-center gap-1 text-[10px] transition-all font-semibold"
              title="Superposición: Mostrar sobre otras apps (Modo Game Met)"
            >
              <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
              <span>Superposición</span>
            </a>

            <a
              href={`intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${targetPackage};package=com.android.settings;end`}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1 text-[10px] transition-all"
              title="Ajustes y permisos de la aplicación en Android"
            >
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              <span>App</span>
            </a>

            <button
              type="button"
              onClick={probeRealPermissions}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 flex items-center gap-1 text-[10px] transition-all cursor-pointer"
              title="Volver a verificar permisos reales con el sistema"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isProbing ? 'animate-spin' : ''}`} />
              <span>Verificar</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {requestFeedback && (
          <div className="px-3.5 py-1.5 bg-cyan-950/90 border-b border-cyan-500/40 text-[11px] font-mono text-cyan-300 flex items-center justify-between shrink-0">
            <span>{requestFeedback}</span>
            <button
              type="button"
              onClick={() => setRequestFeedback(null)}
              className="text-cyan-400 hover:text-white cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* PERMISSIONS SCROLLABLE LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 max-h-[55vh]">
          {filteredPermissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No se encontraron permisos para el filtro especificado.
            </div>
          ) : (
            filteredPermissions.map((item) => {
              const isCodeOpen = activeCodeId === item.id;
              const isGranted = item.status === 'granted';
              const intentUri = AndroidPermissionsEngine.buildIntentUri(item, targetPackage);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isGranted
                      ? 'border-emerald-500/40 bg-emerald-950/20 shadow-sm'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-bold text-white font-sans">{item.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold uppercase ${
                            item.protectionLevel === 'dangerous'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.protectionLevel === 'special_app_op'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : item.protectionLevel === 'signature' || item.protectionLevel === 'shizuku'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.protectionLevel}
                        </span>

                        {/* REAL OS STATUS BADGE */}
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            isGranted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isGranted ? '✅ CONCEDIDO POR EL DISPOSITIVO' : '❌ NO CONCEDIDO EN ANDROID'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono text-cyan-400/90 truncate max-w-sm sm:max-w-md">
                          {item.id}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.id)}
                          className="text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Copiar ID de permiso"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed">{item.description}</p>
                    </div>

                    {/* REAL ACTION BUTTONS */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setActiveCodeId(isCodeOpen ? null : item.id)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
                        title="Ver código Kotlin y comando ADB"
                      >
                        <Code2 className="w-4 h-4" />
                      </button>

                      {/* If it is a real hardware permission, offer the genuine Android OS prompt request */}
                      {item.isHardwareVerifiable && !isGranted && (
                        <button
                          type="button"
                          onClick={() => handleRequestNativeHardware(item)}
                          className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5"
                        >
                          {item.nativeProbeType === 'microphone' ? (
                            <Mic className="w-3.5 h-3.5" />
                          ) : item.nativeProbeType === 'camera' ? (
                            <Camera className="w-3.5 h-3.5" />
                          ) : item.nativeProbeType === 'notifications' ? (
                            <Bell className="w-3.5 h-3.5" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5" />
                          )}
                          <span>Pedir a Android 14</span>
                        </button>
                      )}

                      {/* Direct native link to Android Settings */}
                      <a
                        href={intentUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Ajustes</span>
                      </a>

                      {/* Confirmation toggle after returning from Android Settings */}
                      <button
                        type="button"
                        onClick={() => handleToggleConfirmed(item)}
                        className={`px-2 py-1.5 rounded-lg font-mono text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                          isGranted
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/60 hover:text-white'
                        }`}
                        title={
                          isGranted
                            ? 'Permiso confirmado activo en Android (clic para alternar)'
                            : 'Haz clic tras activarlo manualmente en los Ajustes de Android'
                        }
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isGranted ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{isGranted ? 'Activado' : 'Confirmar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* KOTLIN & ADB CODE DRAWER */}
                  {isCodeOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-[10px] text-cyan-400 mb-1 flex items-center justify-between">
                          <span>INVOCACIÓN KOTLIN / ANDROID SETTINGS:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.kotlinSnippet, `kotlin-${item.id}`)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedId === `kotlin-${item.id}` ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre className="text-slate-300 overflow-x-auto whitespace-pre">{item.kotlinSnippet}</pre>
                      </div>

                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-[10px] text-emerald-400 mb-1 flex items-center justify-between">
                          <span>COMANDO ADB CONSOLA (SHIZUKU / ROOT):</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.adbCommand, `adb-${item.id}`)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedId === `adb-${item.id}` ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre className="text-emerald-300 overflow-x-auto whitespace-pre">{item.adbCommand}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 bg-slate-900/60 text-xs font-mono gap-3">
          <div className="text-slate-400 text-[11px]">
            Paquete de la app: <span className="text-cyan-300 font-bold">{ANDROID_PACKAGE_NAME}</span> · Solo se activa
            cuando el sistema Android concede el permiso real.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={probeRealPermissions}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
              <span>Verificar Estado Real</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-sans font-bold transition-all cursor-pointer shadow-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
