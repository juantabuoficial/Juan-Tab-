import React, { useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Menu,
  Sliders,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  FolderKanban,
  FileBarChart,
  Settings,
  X,
  KeyRound,
  Archive,
  BarChart3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CadizOfficialLogo } from './CadizOfficialLogo';
import { ModalCertificadoDispositivo } from './ModalCertificadoDispositivo';

interface HeaderProps {
  vistaActual: 'actuaciones' | 'planes' | 'estado' | 'dashboard' | 'admin' | 'auditoria';
  setVistaActual: (vista: 'actuaciones' | 'planes' | 'estado' | 'dashboard' | 'admin' | 'auditoria') => void;
  abrirAjustes: () => void;
  abrirAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vistaActual,
  setVistaActual,
  abrirAjustes,
  abrirAuthModal
}) => {
  const {
    usuarioActual,
    usuarios,
    cambiarUsuarioActivo,
    notificaciones,
    marcarNotificacionLeida,
    limpiarTodasNotificaciones,
    seleccionarActuacion,
    planesPapelera,
    abrirModalPapelera
  } = useApp();

  const esAdmin =
    usuarioActual?.rol === 'administrador' ||
    usuarioActual?.rol === 'jefe_servicio' ||
    !!usuarioActual?.permisos?.puedeEditarPlanes;

  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [modalCertificadoAbierto, setModalCertificadoAbierto] = useState(false);

  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida);

  const menuItems = [
    {
      id: 'planes' as const,
      label: 'Planes',
      icon: Layers,
      active: vistaActual === 'planes',
      onClick: () => {
        seleccionarActuacion(null);
        setVistaActual('planes');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      id: 'actuaciones' as const,
      label: 'Actuaciones',
      icon: FolderKanban,
      active: vistaActual === 'actuaciones',
      onClick: () => {
        seleccionarActuacion(null);
        setVistaActual('actuaciones');
      }
    },
    {
      id: 'estado' as const,
      label: 'ESTADO',
      icon: BarChart3,
      active: vistaActual === 'estado',
      onClick: () => {
        seleccionarActuacion(null);
        setVistaActual('estado');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      id: 'dashboard' as const,
      label: 'Inicio',
      icon: LayoutDashboard,
      active: vistaActual === 'dashboard',
      onClick: () => {
        seleccionarActuacion(null);
        setVistaActual('dashboard');
      }
    },
    {
      id: 'auditoria' as const,
      label: 'Informes',
      icon: FileBarChart,
      active: vistaActual === 'auditoria',
      onClick: () => {
        seleccionarActuacion(null);
        setVistaActual('auditoria');
      }
    },
    {
      id: 'admin' as const,
      label: 'Administración',
      icon: Settings,
      active: vistaActual === 'admin',
      onClick: () => {
        seleccionarActuacion(null);
        setVistaActual('admin');
      }
    }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-2xs">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Lado Izquierdo: LOGO OFICIAL DIPUTACIÓN DE CÁDIZ Y DESARROLLO LOCAL */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => {
              seleccionarActuacion(null);
              setVistaActual('planes');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-left focus:outline-hidden group"
            title="Ir a Planes · Área de Desarrollo Local"
          >
            <CadizOfficialLogo size="md" showSubtitle={false} />
          </button>
        </div>

        {/* Centro: MENÚ PRINCIPAL ARRIBA (Navegación Horizontal) */}
        <nav className="hidden md:flex items-center gap-1.5 flex-1 max-w-2xl ml-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  item.active
                    ? 'bg-[#004F90] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Lado Derecho: Seguridad + Ajustes + Notificaciones + Perfil */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Botón Seguridad */}
          <button
            onClick={abrirAuthModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-[#004F90] hover:border-blue-200 hover:bg-blue-50/50 text-xs font-bold transition shadow-2xs"
            title="Seguridad y Control de Acceso Oficial"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#004F90]" />
            <span className="hidden xl:inline">Seguridad</span>
          </button>

          {/* Botón Ajustes */}
          <button
            onClick={abrirAjustes}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-[#004F90] hover:border-blue-200 hover:bg-blue-50/50 text-xs font-bold transition shadow-2xs"
            title="Configuración del Servicio"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xl:inline">Ajustes</span>
          </button>

          {/* Botón Firma Electrónica del Dispositivo */}
          <button
            onClick={() => setModalCertificadoAbierto(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-[#004F90] hover:border-blue-200 hover:bg-blue-50/50 text-xs font-bold transition shadow-2xs"
            title="Firma electrónica instalada en el dispositivo (FNMT / DNIe)"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#004F90]" />
            <span className="hidden xl:inline">Firma Dispositivo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>

          {/* Botón Papelera de Reciclaje Global (Custodia 30 días) */}
          {(esAdmin || planesPapelera.length > 0) && (
            <button
              onClick={abrirModalPapelera}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-amber-800 hover:border-amber-300 hover:bg-amber-50/70 text-xs font-bold transition shadow-2xs relative"
              title="Papelera de reciclaje global · Custodia de planes eliminados durante 30 días con restauración en 1 clic"
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden lg:inline">Papelera</span>
              {planesPapelera.length > 0 && (
                <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                  {planesPapelera.length}
                </span>
              )}
            </button>
          )}

          {/* Botón Notificaciones */}
          <div className="relative">
            <button
              onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition hover:bg-slate-50 shadow-2xs relative"
              title="Notificaciones oficiales"
            >
              <Bell className="w-4 h-4" />
              {notificacionesNoLeidas.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#004F90] text-[9px] font-black text-white ring-2 ring-white">
                  {notificacionesNoLeidas.length}
                </span>
              )}
            </button>

            {/* Dropdown Notificaciones */}
            {mostrarNotificaciones && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-sm text-slate-900">Notificaciones Oficiales</span>
                  {notificaciones.length > 0 && (
                    <button
                      onClick={limpiarTodasNotificaciones}
                      className="text-xs text-[#004F90] hover:underline font-semibold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                  {notificaciones.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No hay avisos pendientes en la bandeja oficial.
                    </div>
                  ) : (
                    notificaciones.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          marcarNotificacionLeida(n.id);
                          if (n.actuacionId) {
                            seleccionarActuacion(n.actuacionId);
                            setVistaActual('actuaciones');
                          }
                          setMostrarNotificaciones(false);
                        }}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          n.leida
                            ? 'bg-slate-50 border-slate-100 text-slate-500'
                            : 'bg-blue-50/50 border-blue-200 text-slate-800 font-semibold'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-[#004F90]">{n.titulo}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{n.mensaje}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Menú Usuario Activo */}
          <div className="relative">
            <button
              onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-blue-200/80 hover:border-[#004F90] bg-blue-50/40 hover:bg-blue-50/70 transition shadow-2xs group"
              title={`Sesión activa: ${usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos} (${usuarioActual.cargo})` : 'Autenticado'}`}
            >
              <div className="relative w-7 h-7 rounded-lg bg-[#004F90] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                {usuarioActual ? usuarioActual.nombre[0] : 'J'}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" title="Identidad autenticada; consultar el indicador de sincronización" />
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                    {usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Juan Hinojo García'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    Sesión iniciada
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                  {usuarioActual?.cargo || 'Jefe de Servicio'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </button>

            {/* Dropdown de Usuario */}
            {mostrarMenuUsuario && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in-50 zoom-in-95 space-y-2">
                <div className="p-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">
                    {usuarioActual?.nombre} {usuarioActual?.apellidos}
                  </div>
                  <div className="text-[11px] text-[#004F90] font-semibold">
                    {usuarioActual?.cargo}
                  </div>
                  <div className="text-[10px] text-slate-400">{usuarioActual?.email}</div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#004F90] border border-blue-200">
                    {usuarioActual?.rol?.replaceAll('_', ' ')}
                  </span>
                </div>

                <button className="w-full p-2 rounded-xl border text-xs" onClick={() => {
                  setMostrarMenuUsuario(false);
                  abrirAuthModal();
                }}>Gestionar sesión de Firebase</button>

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setMostrarMenuUsuario(false);
                      setModalCertificadoAbierto(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 text-left transition"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#004F90]" />
                      <span>Firma Electrónica del Dispositivo</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Certificado instalado y válido" />
                  </button>

                  <button
                    onClick={() => {
                      setMostrarMenuUsuario(false);
                      abrirAuthModal();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#004F90]" />
                    <span>Control de Seguridad / Biometría</span>
                  </button>

                  {(esAdmin || planesPapelera.length > 0) && (
                    <button
                      onClick={() => {
                        setMostrarMenuUsuario(false);
                        abrirModalPapelera();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50/70 hover:bg-amber-100 border border-amber-200/80 text-left transition"
                    >
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-amber-600" />
                        <span>Papelera de Planes (Custodia 30d)</span>
                      </div>
                      {planesPapelera.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                          {planesPapelera.length}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMostrarMenuUsuario(false);
                      abrirAjustes();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span>Configuración del Sistema</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botón Menú Móvil (Hamburger para pantallas < md) */}
          <button
            onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
            title="Abrir menú"
          >
            {menuMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menú Desplegable Móvil (cuando pantalla < md) */}
      {menuMovilAbierto && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1.5 animate-in slide-in-from-top">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  setMenuMovilAbierto(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  item.active
                    ? 'bg-[#004F90] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => {
                setModalCertificadoAbierto(true);
                setMenuMovilAbierto(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#004F90]" />
              <span>Firma Dispositivo</span>
            </button>
            <button
              onClick={() => {
                abrirAuthModal();
                setMenuMovilAbierto(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#004F90]" />
              <span>Seguridad</span>
            </button>
            <button
              onClick={() => {
                abrirAjustes();
                setMenuMovilAbierto(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>Ajustes</span>
            </button>
            {(esAdmin || planesPapelera.length > 0) && (
              <button
                onClick={() => {
                  abrirModalPapelera();
                  setMenuMovilAbierto(false);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-bold text-xs"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Papelera ({planesPapelera.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Firma Electrónica del Dispositivo */}
      {modalCertificadoAbierto && (
        <ModalCertificadoDispositivo
          mostrar={modalCertificadoAbierto}
          onCerrar={() => setModalCertificadoAbierto(false)}
        />
      )}
    </header>
  );
};
