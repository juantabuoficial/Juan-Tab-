import { EstadoGuardado } from './EstadoGuardado';
import React, { useState } from 'react';
import {
  Settings,
  X,
  Bell,
  Mail,
  Fingerprint,
  Shield,
  Cloud,
  Moon,
  Sun,
  Monitor,
  Lock,
  RotateCcw,
  CheckCircle2,
  Smartphone,
  KeyRound,
  Database
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  solicitarPermisoNotificacionesPush,
  enviarNotificacionPushNativa
} from '../utils/notifications';
import { MobileCompatibilityModal } from './MobileCompatibilityModal';
import { ModalCertificadoDispositivo } from './ModalCertificadoDispositivo';
import { ModalMigracionFirebase } from './ModalMigracionFirebase';

interface SettingsModalProps {
  mostrar: boolean;
  onCerrar: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ mostrar, onCerrar }) => {
  const {
    esperarGuardado,
    cambiosPendientes,
    configuracion,
    actualizarConfiguracion,
    forzarSincronizacion,
    reiniciarDatosFabrica
  } = useApp();

  const [notifPruebaEnviada, setNotifPruebaEnviada] = useState(false);
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [mostrarModalMovil, setMostrarModalMovil] = useState(false);
  const [modalCertificadoAbierto, setModalCertificadoAbierto] = useState(false);
  const [mostrarModalMigracion, setMostrarModalMigracion] = useState(false);

  if (!mostrar) return null;

  const probarNotificacionPush = async () => {
    const concedido = await solicitarPermisoNotificacionesPush();
    if (concedido) {
      enviarNotificacionPushNativa('ADL Diputación de Cádiz (v1.1)', {
        body: 'Notificación de prueba: Alerta automática de vencimiento y sincronización en tiempo real activa.'
      });
      setNotifPruebaEnviada(true);
      setTimeout(() => setNotifPruebaEnviada(false), 3000);
    } else {
      alert('Las notificaciones push están bloqueadas en tu navegador. Por favor habilítalas en la barra de direcciones.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <EstadoGuardado />
        {/* Cabecera */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Configuración del Sistema ADL (v1.1)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Área de Desarrollo Local · Diputación de Cádiz
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo de Ajustes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* 1. Modo Visual (Oscuro / Claro / Automático) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Tema Visual de la Interfaz</span>
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  actualizarConfiguracion({ modoOscuro: 'light' });
                  document.documentElement.classList.remove('dark');
                }}
                className="p-3.5 rounded-2xl border flex items-center justify-between transition bg-[#EAF6F3] border-[#CFEFE7] text-[#1C2E3D] font-bold shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Sun className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-bold text-[#1C2E3D]">Paleta Diurna Oficial · Diputación de Cádiz</span>
                    <span className="block text-[10px] text-[#6C7D8E]">Azul petróleo profundo, gris-azulado suave (#EEF2F6) y cálido melocotón</span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>
            </div>
          </div>

          {/* 2. Notificaciones Push y Recordatorios */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Notificaciones Push y Avisos de Vencimientos</span>
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Notificaciones Push Personalizadas
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Avisos del navegador mientras PLANIFICA está abierta y el navegador lo permite.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={configuracion.notificacionesPush}
                  onChange={(e) =>
                    actualizarConfiguracion({ notificacionesPush: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Recordatorios Diarios por Correo Electrónico
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Envío de correo pendiente de configurar; no se envían recordatorios actualmente.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Umbral de Aviso de Vencimiento
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Días de antelación para emitir alertas automáticas en el sistema.
                  </span>
                </div>
                <select
                  value={configuracion.alertasVencimientoDias}
                  onChange={(e) =>
                    actualizarConfiguracion({ alertasVencimientoDias: parseInt(e.target.value) })
                  }
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value={15}>15 días</option>
                  <option value={30}>30 días (Recomendado)</option>
                  <option value={45}>45 días</option>
                  <option value={60}>60 días</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={probarNotificacionPush}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-semibold"
              >
                Probar Notificación Push Ahora
              </button>
              {notifPruebaEnviada && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Notificación enviada
                </span>
              )}
            </div>
          </div>

          {/* 3. Seguridad, Biometría y Cifrado E2EE */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Identidad y seguridad</span>
            </h3>

            <div className="space-y-2">
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">El acceso se verifica con Firebase Authentication y un perfil activo. La configuración de factores de autenticación pertenece al proveedor de identidad. Esta aplicación no ofrece biometría ni códigos de verificación simulados.</p>

              {/* Firma Electrónica del Dispositivo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#004F90]" />
                    Firma Electrónica del Dispositivo (Certificado FNMT / DNIe)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Certificado digital instalado en este equipo utilizado para firmar los informes y dictámenes técnicos.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCertificadoAbierto(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#004F90] hover:bg-[#003867] text-white font-bold text-xs transition shrink-0"
                >
                  Ver / Cambiar Certificado
                </button>
              </div>
            </div>
          </div>

          {/* 4. Compatibilidad Móvil iOS y Android */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0063A2] dark:text-sky-400" />
              <span>Compatibilidad Móvil Certificada (Apple iOS y Google Android)</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Aplicación Web Progresiva PWA (iOS 14.3+ y Android 7.0+)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Instalación sin tiendas de aplicaciones, funcionamiento sin conexión con Service Worker v2, optimización para notch de iPhone, Dynamic Island y navegación por gestos de Android.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalMovil(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#0063A2] hover:bg-[#004f82] text-white font-bold text-xs shrink-0 transition shadow-xs"
                >
                  Instalar / Ver QR
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#39DA8A]" />
                  <span>Icono Apple Touch PNG (180x180)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#39DA8A]" />
                  <span>Android Maskable Squircle (512x512)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#39DA8A]" />
                  <span>Caché Offline Completa (Service Worker)</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#39DA8A]" />
                  <span>Safe Area Insets (Touch & Gestos)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Sincronización Nube y Mantenimiento */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>Sincronización en la Nube y Almacenamiento Local</span>
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Sincronización Automática entre Múltiples Dispositivos
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transmisión instantánea de datos y soporte para modo offline completo.
                </span>
              </div>
              <button
                type="button"
                onClick={() => forzarSincronizacion()}
                className="px-3 py-1.5 rounded-xl bg-blue-700 text-white font-bold text-xs shrink-0"
              >
                Sincronizar Ya
              </button>
            </div>

            {/* Acceso a Migración y Backup Firebase */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#004F90]" />
                  Copia de Seguridad y Migración a Firebase
                </span>
                <span className="text-[11px] text-slate-500">
                  Descarga tus datos locales en JSON o conéctate a Cloud Firestore para desarrollo compartido.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalMigracion(true)}
                className="px-3 py-1.5 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white font-bold text-xs shrink-0 shadow-xs"
              >
                Gestionar Firebase
              </button>
            </div>

            {/* Zona de peligro / Reinicio de fábrica */}
            <div className="pt-2">
              {!confirmarReinicio ? (
                <button
                  type="button"
                  onClick={() => setConfirmarReinicio(true)}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer datos de muestra originales de la Diputación</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 space-y-2">
                  <p className="font-bold">
                    ¿Estás seguro de que deseas reiniciar todos los expedientes a los valores predeterminados?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        reiniciarDatosFabrica();
                        setConfirmarReinicio(false);
                        onCerrar();
                      }}
                      className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs"
                    >
                      Sí, restablecer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarReinicio(false)}
                      className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={() => { void esperarGuardado().then(onCerrar).catch(() => {}); }}
            disabled={cambiosPendientes > 0}
            className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>

      {modalCertificadoAbierto && (
        <ModalCertificadoDispositivo
          mostrar={modalCertificadoAbierto}
          onCerrar={() => setModalCertificadoAbierto(false)}
        />
      )}
    </div>
  );
};
