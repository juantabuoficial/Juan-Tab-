import { fechaServidor } from '../utils/fechaServidor';
import { EstadoGuardado } from './EstadoGuardado';
import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  Users,
  Settings,
  History,
  FileCheck2,
  Lock,
  Mail,
  Key,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  FileSpreadsheet,
  FileDown,
  BarChart3,
  TrendingUp,
  Clock,
  Send,
  MessageSquare,
  AlertCircle,
  Eye,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Sliders,
  Calendar,
  Building2,
  Layers,
  ArrowUpRight,
  Archive,
  RotateCcw,
  Download,
  FileJson,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole, PermisosUsuario } from '../types';
import { formatearMoneda, formatearPorcentaje, generarInformeRendimientoPDF } from '../utils/pdfExport';
import { exportarRendimientoCSV } from '../utils/csvExport';
import { CadizLogo } from './CadizLogo';
import { ModalMigracionFirebase } from './ModalMigracionFirebase';
import { exportarRespaldoOfflineMasivoJSON, ResultadoExportacionMasiva } from '../services/migrationService';

export const AdminPanel: React.FC = () => {
  const {
    usuarios,
    actualizarUsuario,
    crearUsuario,
    esperarGuardado,
    actuaciones,
    asignarTecnicoActuacion,
    registrosAuditoria,
    reiniciarDatosFabrica,
    planes,
    comentarios,
    enviarComentarioActuacion,
    usuarioActual,
    planesPapelera,
    abrirModalPapelera,
    notificaciones
  } = useApp();

  const [pestanaAdmin, setPestanaAdmin] = useState<
    'resumen' | 'usuarios' | 'asignacion' | 'comentarios'
  >('resumen');

  // Modales
  const [mostrarModalNuevoUsuario, setMostrarModalNuevoUsuario] = useState(false);
  const [usuarioEditandoPermisos, setUsuarioEditandoPermisos] = useState<User | null>(null);
  const [mostrarModalMigracion, setMostrarModalMigracion] = useState(false);

  // Estado para exportación masiva JSON offline
  const [estadoExportacionMasiva, setEstadoExportacionMasiva] = useState<ResultadoExportacionMasiva | null>(null);
  const [exportandoMasivo, setExportandoMasivo] = useState(false);

  // Formulario Nuevo Usuario
  const [nuevoUid, setNuevoUid] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellidos, setNuevoApellidos] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoCargo, setNuevoCargo] = useState('Técnico/a de Proyectos');
  const [nuevoRol, setNuevoRol] = useState<UserRole>('tecnico');
  const [nuevosPermisos, setNuevosPermisos] = useState<PermisosUsuario>({
    puedeEditarPlanes: false,
    puedeAsignarTecnicos: false,
    puedeCalificarDocumentos: true,
    puedeExportarInformes: true,
    puedeEnviarComentarios: true,
    puedeGestionarUsuarios: false
  });

  // Formulario Comentario del Administrador a Técnico
  const [comentarioActuacionId, setComentarioActuacionId] = useState<string>(
    actuaciones[0]?.id || ''
  );
  const [comentarioDestinatarioId, setComentarioDestinatarioId] = useState<string>(
    usuarios.find((u) => u.rol === 'tecnico')?.id || ''
  );
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [comentarioEnviarEmail, setComentarioEnviarEmail] = useState(false);
  const [mensajeEnvioExitoso, setMensajeEnvioExitoso] = useState<string | null>(null);

  // Auto-ajustar destinatario cuando cambia la actuación seleccionada
  const handleCambioActuacionComentario = (actId: string) => {
    setComentarioActuacionId(actId);
    const act = actuaciones.find((a) => a.id === actId);
    if (act && act.tecnicoAsignadoId) {
      setComentarioDestinatarioId(act.tecnicoAsignadoId);
    }
  };

  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentarioTexto.trim() || !comentarioActuacionId || !comentarioDestinatarioId) return;

    await enviarComentarioActuacion(
      comentarioActuacionId,
      comentarioDestinatarioId,
      comentarioTexto.trim(),
      comentarioEnviarEmail
    );

    const dest = usuarios.find((u) => u.id === comentarioDestinatarioId);
    setMensajeEnvioExitoso(
      'Comentario guardado en el servidor. El envío por correo no está configurado.'
    );
    setComentarioTexto('');
    setTimeout(() => setMensajeEnvioExitoso(null), 5000);
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoEmail) return;

    crearUsuario({
      firebaseUid: nuevoUid,
      nombre: nuevoNombre,
      apellidos: nuevoApellidos,
      email: nuevoEmail,
      rol: nuevoRol,
      departamento: 'Área de Desarrollo Local',
      cargo: nuevoCargo,
      biometriaHabilitada: false,
      dosFactoresHabilitado: false,
      permisos: nuevosPermisos,
      activo: true,
      fechaAlta: new Date().toISOString(),
      ultimoAcceso: new Date().toISOString()
    });

    await esperarGuardado();
    setNuevoNombre('');
    setNuevoApellidos('');
    setNuevoEmail('');
    setMostrarModalNuevoUsuario(false);
  };

  const handleGuardarPermisos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditandoPermisos) return;
    actualizarUsuario(usuarioEditandoPermisos);
    await esperarGuardado();
    setUsuarioEditandoPermisos(null);
  };

  const handleExportarRespaldoMasivo = () => {
    setExportandoMasivo(true);
    try {
      const res = exportarRespaldoOfflineMasivoJSON({
        planes,
        actuaciones,
        usuarios,
        registrosAuditoria,
        comentarios,
        notificaciones,
        planesPapelera,
        autorNombre: usuarioActual
          ? `${usuarioActual.nombre} ${usuarioActual.apellidos} (${usuarioActual.cargo || usuarioActual.rol})`
          : 'D. Juan Hinojo García (Jefe de Servicio)'
      });
      setEstadoExportacionMasiva(res);
      setTimeout(() => setEstadoExportacionMasiva(null), 10000);
    } catch (err) {
      console.error('Error al exportar respaldo JSON:', err);
    } finally {
      setExportandoMasivo(false);
    }
  };

  // 1. Detección de Cuellos de Botella del Sistema
  const cuellosDeBotella = React.useMemo(() => {
    const alertas: { tipo: 'retraso' | 'deficiencias' | 'vencimiento'; titulo: string; detalle: string; actuacionId?: string }[] = [];

    actuaciones.forEach((act) => {
      // Deficiencias pendientes de subsanar
      if (act.estadoGeneral === 'con_deficiencias') {
        alertas.push({
          tipo: 'deficiencias',
          titulo: `Deficiencias en Actuación Nº ${act.numero} (${act.entidadLocal})`,
          detalle: `Presenta observaciones de subsanación no resueltas. Requiere impulso del técnico asignado (${act.tecnicoAsignadoNombre}).`,
          actuacionId: act.id
        });
      }

      // Vencimiento próximo en plazo de justificación (< 30 días)
      if (act.plazos.plazoJustificacion) {
        const fechaJust = new Date(act.plazos.plazoJustificacion).getTime();
        const diasRestantes = Math.ceil((fechaJust - Date.now()) / (1000 * 60 * 60 * 24));
        if (diasRestantes <= 30 && diasRestantes >= 0 && act.estadoGeneral !== 'justificado') {
          alertas.push({
            tipo: 'vencimiento',
            titulo: `Plazo de Justificación Próximo: Nº ${act.numero}`,
            detalle: `Quedan ${diasRestantes} días para el plazo límite (${act.plazos.plazoJustificacion}) en ${act.entidadLocal}.`,
            actuacionId: act.id
          });
        }
      }
    });

    return alertas;
  }, [actuaciones]);

  // 2. Resumen de Actividad Diaria
  const actividadHoy = React.useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    const registrosHoy = registrosAuditoria.filter((r) => r.fechaHora.startsWith(hoyStr));
    const accesosHoy = registrosHoy.filter((r) => r.accion === 'acceso_pestana').length;
    const modificacionesHoy = registrosHoy.filter((r) => r.accion === 'modificacion_checklist').length;
    const calificacionesHoy = registrosHoy.filter((r) => r.accion === 'calificacion_estado').length;
    const exportacionesHoy = registrosHoy.filter((r) => r.accion === 'exportacion_pdf').length;

    return {
      total: registrosHoy.length,
      accesos: accesosHoy,
      modificaciones: modificacionesHoy,
      calificaciones: calificacionesHoy,
      exportaciones: exportacionesHoy,
      ultimosRegistros: registrosAuditoria.slice(0, 5)
    };
  }, [registrosAuditoria]);

  return (
    <div className="space-y-6">
      {/* Banner Superior Institucional para el Jefe de Servicio con Emblema Diputación de Cádiz */}
      <div className="bg-white rounded-3xl border border-[#DFE6ED] shadow-xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <CadizLogo size="md" showText={false} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#36799C] uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Jefe de Servicio: D. Juan Hinojo García · Asistencia Técnica y Obras</span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-[#1C2E3D] tracking-tight">
              Panel de Control de Administración y Supervisión (ADL v1.1)
            </h1>
            <p className="text-xs text-[#6C7D8E] mt-1 max-w-2xl leading-relaxed">
              Supervisión integral de planes provinciales, balance de carga técnica, gestión de permisos e instrucciones con registro oficial inmutable.
            </p>
          </div>
        </div>

        {/* Botones de Exportación de Rendimiento Global, Respaldo JSON y Firebase */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleExportarRespaldoMasivo}
            disabled={exportandoMasivo}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 text-xs font-black shadow-xs transition active:scale-[0.98]"
            title="Exportación masiva de respaldo offline seguro en formato JSON (Planes y Actuaciones)"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>{exportandoMasivo ? 'Generando...' : 'Respaldo JSON Masivo'}</span>
          </button>

          <button
            onClick={() => setMostrarModalMigracion(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#004F90] text-xs font-black shadow-xs transition"
            title="Gestión de Infraestructura Firebase, Backup y Migración de Datos"
          >
            <Database className="w-4 h-4 text-[#004F90]" />
            <span>Firebase & Backup</span>
          </button>

          <button
            onClick={() => exportarRendimientoCSV(actuaciones)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-[#DFE6ED] bg-white hover:bg-slate-50 text-[#1C2E3D] text-xs font-bold shadow-xs transition"
            title="Exportar informe de rendimiento en formato CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#36799C]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => generarInformeRendimientoPDF(actuaciones, usuarios, planes, usuarioActual)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#283949] hover:bg-[#1E2D3B] text-white text-xs font-bold shadow-xs transition"
            title="Generar informe oficial de rendimiento en PDF con Vº Bº de D. Juan Hinojo García"
          >
            <FileDown className="w-4 h-4" />
            <span>Exportar Informe PDF</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación Interna del Panel de Administrador */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#DFE6ED] shadow-xs overflow-x-auto">
        <button
          onClick={() => setPestanaAdmin('resumen')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            pestanaAdmin === 'resumen'
              ? 'bg-[#283949] text-white shadow-xs'
              : 'text-[#6C7D8E] hover:text-[#1C2E3D] hover:bg-slate-100'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${pestanaAdmin === 'resumen' ? 'text-white' : 'text-[#36799C]'}`} />
          <span>Resumen Ejecutivo & Cuellos de Botella</span>
          {cuellosDeBotella.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              pestanaAdmin === 'resumen' ? 'bg-white/20 text-white' : 'bg-[#DE6C38] text-white'
            }`}>
              {cuellosDeBotella.length}
            </span>
          )}
        </button>

        <button
          disabled={usuarioActual?.rol !== 'administrador'}
          onClick={() => setPestanaAdmin('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            pestanaAdmin === 'usuarios'
              ? 'bg-[#283949] text-white shadow-xs'
              : 'text-[#6C7D8E] hover:text-[#1C2E3D] hover:bg-slate-100'
          }`}
        >
          <Users className={`w-4 h-4 ${pestanaAdmin === 'usuarios' ? 'text-white' : 'text-[#36799C]'}`} />
          <span>Gestión de Usuarios y Permisos Específicos</span>
        </button>

        <button
          onClick={() => setPestanaAdmin('asignacion')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            pestanaAdmin === 'asignacion'
              ? 'bg-[#283949] text-white shadow-xs'
              : 'text-[#6C7D8E] hover:text-[#1C2E3D] hover:bg-slate-100'
          }`}
        >
          <FolderKanban className={`w-4 h-4 ${pestanaAdmin === 'asignacion' ? 'text-white' : 'text-[#36799C]'}`} />
          <span>Asignación de Actuaciones</span>
        </button>

        <button
          onClick={() => setPestanaAdmin('comentarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            pestanaAdmin === 'comentarios'
              ? 'bg-[#283949] text-white shadow-xs'
              : 'text-[#6C7D8E] hover:text-[#1C2E3D] hover:bg-slate-100'
          }`}
        >
          <MessageSquare className={`w-4 h-4 ${pestanaAdmin === 'comentarios' ? 'text-white' : 'text-[#36799C]'}`} />
          <span>Instrucciones del Jefe de Servicio & Correo</span>
          {comentarios.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              pestanaAdmin === 'comentarios' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#283949]'
            }`}>
              {comentarios.length}
            </span>
          )}
        </button>
      </div>

      {/* VISTA 1: RESUMEN EJECUTIVO & CUELLOS DE BOTELLA */}
      {pestanaAdmin === 'resumen' && (
        <div className="space-y-6">
          {/* Alertas de Cuellos de Botella */}
          {cuellosDeBotella.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span>Expedientes con Necesidad de Impulso o Vencimiento Próximo</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cuellosDeBotella.map((alerta, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>{alerta.titulo}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      {alerta.detalle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tarjeta Institucional: Exportación Masiva y Respaldo Offline Seguro Pre-Migración */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-emerald-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Respaldo Offline Seguro · Exportación Masiva Pre-Migración
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Copia Completa en Disco
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      JSON Estructurado
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                    Garantía institucional previa a la sincronización en Firebase Cloud Firestore: descarga una copia completa e inalterable de todos los planes provinciales, actuaciones con sus 5 datos administrativos, importes económicos, expedientes de licitación, modificados cronológicos, certificaciones y documentos Base 14 para custodia offline segura en tu equipo local.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                <button
                  type="button"
                  onClick={handleExportarRespaldoMasivo}
                  disabled={exportandoMasivo}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-black shadow-2xs transition"
                  title="Descargar copia de seguridad masiva completa de todos los planes y actuaciones actuales"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportandoMasivo ? 'Generando archivo JSON...' : 'Descargar Respaldo JSON Completo'}</span>
                </button>
              </div>
            </div>

            {/* Desglose de Registros e Importes Respaldados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  Planes Actuales
                </span>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {planes.length} convocatorias
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
                  Presupuesto: {formatearMoneda(planes.reduce((acc, p) => acc + (Number(p.presupuestoTotal) || 0), 0))}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  Actuaciones y Obras
                </span>
                <div className="text-lg font-black text-[#004F90] font-mono">
                  {actuaciones.length} expedientes
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
                  Subvención: {formatearMoneda(actuaciones.reduce((acc, a) => acc + (Number(a.importes?.importeConcesion || a.importes?.importeActuacion) || 0), 0))}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  Documentación Base 14
                </span>
                <div className="text-lg font-black text-emerald-800 font-mono">
                  {actuaciones.reduce((acc, a) => acc + (a.documentos?.length || 0), 0)} documentos
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                  Checklists y calificaciones
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  Trazabilidad & Modificados
                </span>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {actuaciones.reduce((acc, a) => acc + (a.documentos?.filter((d) => d.categoria === 'modificado').length || 0), 0)} mod. · {actuaciones.reduce((acc, a) => acc + (a.documentos?.filter((d) => d.categoria === 'certificaciones').length || 0), 0)} cert.
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                  Libro de auditoría íntegro
                </span>
              </div>
            </div>

            {/* Notificación de Confirmación de Descarga Exitosa */}
            {estadoExportacionMasiva && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-emerald-900">
                      Archivo de respaldo descargado correctamente: <code className="px-1.5 py-0.5 bg-emerald-100 rounded text-[11px] font-mono text-emerald-950">{estadoExportacionMasiva.nombreArchivo}</code>
                    </span>
                    <span className="text-[11px] text-emerald-800 font-mono">
                      {(estadoExportacionMasiva.tamanoBytes / 1024).toFixed(1)} KB · {new Date(estadoExportacionMasiva.fechaExportacion).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Se han respaldado con éxito <strong>{estadoExportacionMasiva.totalPlanes} planes</strong>, <strong>{estadoExportacionMasiva.totalActuaciones} actuaciones</strong>, <strong>{estadoExportacionMasiva.totalDocumentosBase14} documentos Base 14</strong>, <strong>{estadoExportacionMasiva.totalModificados} modificados</strong> y <strong>{estadoExportacionMasiva.totalCertificaciones} certificaciones</strong> con un presupuesto total consolidado de <strong>{formatearMoneda(estadoExportacionMasiva.importeTotalPresupuestos)}</strong>. Tus datos están completamente a salvo en almacenamiento local para proceder con la migración a Firestore.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta Institucional: Papelera de Reciclaje y Custodia de 30 Días */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                <Archive className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Papelera de Reciclaje de Planes
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    Custodia 30 días naturales
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Garantía de seguridad para administradores: cualquier plan borrado por error se almacena protegido durante 30 días con todas sus actuaciones y documentos Base 14, permitiendo su restauración completa o purga definitiva.
                </p>
                <div className="pt-1 flex items-center gap-4 text-xs font-bold text-slate-700">
                  <span>
                    Planes en custodia: <strong className="text-slate-900 font-black">{planesPapelera.length}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Actuaciones respaldadas:{' '}
                    <strong className="text-[#004F90] font-black">
                      {planesPapelera.reduce((acc, c) => acc + (c.actuacionesAsociadas?.length || c.plan.actuacionesPrevistas?.length || 0), 0)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={abrirModalPapelera}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-2xs transition shrink-0 self-start md:self-center active:scale-[0.98]"
              title="Abrir la Papelera de reciclaje global de planes"
            >
              <Archive className="w-4 h-4" />
              <span>Abrir Papelera ({planesPapelera.length})</span>
            </button>
          </div>

          {/* Métricas de Actividad Diaria */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                Accesos Hoy (Auditoría)
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {actividadHoy.accesos}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Con sellado de fecha y hora exacta
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                Checklists Modificados Hoy
              </span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {actividadHoy.modificaciones}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Revisiones ✅ / ❌ registradas
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                Calificaciones de Estado Hoy
              </span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                {actividadHoy.calificaciones}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Base 14 calificadas por técnicos
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                Informes Emitidos
              </span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                {actividadHoy.exportaciones}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Descargas PDF / CSV oficiales
              </span>
            </div>
          </div>

          {/* Gráficos Estadísticos Interactivos: Progreso de Planes y Actuaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico Progreso por PLAN */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Progreso Consolidado por Plan de Subvenciones</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Porcentaje de ejecución y liquidación justificada en plazo sobre presupuesto total
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">{planes.length} Planes</span>
              </div>

              <div className="space-y-4">
                {planes.map((plan) => {
                  const actsDelPlan = actuaciones.filter((a) => a.plan === plan.nombre);
                  const totalConcesion = actsDelPlan.reduce(
                    (acc, a) => acc + (a.importes.importeConcesion || 0),
                    0
                  );
                  const totalLiquidado = actsDelPlan.reduce(
                    (acc, a) => acc + (a.liquidacion.justificadoEnPlazo || 0),
                    0
                  );
                  const porcLiquidado =
                    totalConcesion > 0 ? (totalLiquidado / totalConcesion) * 100 : 0;
                  const docsTotales = actsDelPlan.length * 22;
                  const docsRevisados = actsDelPlan.reduce(
                    (acc, a) => acc + a.documentos.filter((d) => d.revisadoCompleto).length,
                    0
                  );
                  const porcRevision =
                    docsTotales > 0 ? (docsRevisados / docsTotales) * 100 : 0;

                  return (
                    <div
                      key={plan.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {plan.nombre}
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatearMoneda(totalLiquidado)} / {formatearMoneda(totalConcesion)}
                        </span>
                      </div>

                      {/* Barra de progreso de revisión técnica */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Revisión Técnica de Documentación</span>
                          <span className="font-bold">{formatearPorcentaje(porcRevision)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${Math.min(porcRevision, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Barra de liquidación económica */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Liquidación Económica Conforme</span>
                          <span className="font-bold text-emerald-600">
                            {formatearPorcentaje(porcLiquidado)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                            style={{ width: `${Math.min(porcLiquidado, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actividad en Tiempo Real y Estado de Actuaciones Individuales */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Actividad del Sistema en Tiempo Real</span>
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              </div>

              <div className="space-y-3">
                {actividadHoy.ultimosRegistros.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {reg.usuarioNombre}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(fechaServidor(reg)).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {reg.detalles || reg.accion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: GESTIÓN DE USUARIOS Y PERMISOS ESPECÍFICOS */}
      {pestanaAdmin === 'usuarios' && usuarioActual?.rol === 'administrador' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Personal Autorizado y Matriz de Permisos Específicos</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Asigna roles y configura permisos específicos de acceso, edición de planes y control
              </p>
            </div>

            <button
              onClick={() => setMostrarModalNuevoUsuario(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Dar de Alta Usuario</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Funcionario / Técnico</th>
                  <th className="py-2.5 px-3">Rol Principal</th>
                  <th className="py-2.5 px-3">Permisos Específicos Asignados</th>
                  <th className="py-2.5 px-3 text-center">Biometría / 2FA</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map((u) => {
                  const p = u.permisos;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {u.nombre} {u.apellidos}
                        </div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                        <div className="text-[10px] text-slate-500">{u.cargo}</div>
                      </td>

                      <td className="py-3 px-3">
                        <select
                          value={u.rol}
                          onChange={(e) =>
                            actualizarUsuario({ ...u, rol: e.target.value as UserRole })
                          }
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                        >
                          <option value="jefe_servicio">Jefe de Servicio (Admin)</option>
                          <option value="tecnico">Técnico Revisor</option>
                          <option value="administrativo">Personal Administrativo</option>
                          <option value="auditor">Auditor / Control</option>
                          <option value="consulta">Personal de Consulta (Lectura restringida)</option>
                        </select>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p?.puedeEditarPlanes && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                              Editar Planes
                            </span>
                          )}
                          {p?.puedeAsignarTecnicos && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                              Asignar Obras
                            </span>
                          )}
                          {p?.puedeCalificarDocumentos && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Calificar Base 14
                            </span>
                          )}
                          {p?.puedeExportarInformes && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Exportar Informes
                            </span>
                          )}
                          {p?.puedeEnviarComentarios && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              Comentarios/Emails
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              u.biometriaHabilitada
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            Bio {u.biometriaHabilitada ? 'ON' : 'OFF'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              u.dosFactoresHabilitado
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            2FA {u.dosFactoresHabilitado ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setUsuarioEditandoPermisos(u)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          Configurar Permisos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: ASIGNACIÓN DE ACTUACIONES */}
      {pestanaAdmin === 'asignacion' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Asignación y Balance de Carga de Trabajo de Actuaciones</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribuye las actuaciones entre los técnicos del Área de Desarrollo Local
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actuaciones.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Actuación Nº {act.numero}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {act.entidadLocal}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 line-clamp-1">{act.titulo}</p>
                <div className="text-[11px] text-slate-400">{act.plan}</div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Técnico Revisor:</span>
                  <select
                    value={act.tecnicoAsignadoId}
                    onChange={(e) => asignarTecnicoActuacion(act.id, e.target.value)}
                    className="flex-1 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {usuarios
                      .filter((u) => u.rol === 'tecnico' || u.rol === 'jefe_servicio')
                      .map((tec) => (
                        <option key={tec.id} value={tec.id}>
                          {tec.nombre} {tec.apellidos} ({tec.cargo})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 4: COMENTARIOS DEL JEFE DE SERVICIO A TÉCNICOS & CORREO RECORDATORIO */}
      {pestanaAdmin === 'comentarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulario de Envío de Comentario */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span>Enviar Instrucción a Técnico Revisor</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La instrucción quedará registrada formalmente en el expediente y se remitirá copia al buzón corporativo @dipucadiz.es.
              </p>
            </div>

            {mensajeEnvioExitoso && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mensajeEnvioExitoso}</span>
              </div>
            )}

            <form onSubmit={e => { void handleEnviarComentario(e).catch(() => {}); }} className="space-y-3 text-xs">
<EstadoGuardado />
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Seleccionar Actuación *
                </label>
                <select
                  value={comentarioActuacionId}
                  onChange={(e) => handleCambioActuacionComentario(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  {actuaciones.map((act) => (
                    <option key={act.id} value={act.id}>
                      Nº {act.numero} - {act.entidadLocal}: {act.titulo.substring(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Técnico Revisor Destinatario *
                </label>
                <select
                  value={comentarioDestinatarioId}
                  onChange={(e) => setComentarioDestinatarioId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  {usuarios
                    .filter((u) => u.rol === 'tecnico' || u.rol === 'jefe_servicio')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellidos} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Instrucción / Mensaje del Jefe de Servicio *
                </label>
                <textarea
                  rows={4}
                  required
                  value={comentarioTexto}
                  onChange={(e) => setComentarioTexto(e.target.value)}
                  placeholder="Ej: Carmen, revisa con urgencia la fecha de expedición de la Certificación 2..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enviarEmailCheck"
                  checked={comentarioEnviarEmail}
                    disabled
                  onChange={(e) => setComentarioEnviarEmail(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="enviarEmailCheck" className="text-xs text-blue-900 dark:text-blue-200 font-medium cursor-pointer">
                  Enviar correo electrónico de recordatorio con acuse de recibo oficial
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Trasladar Comentario y Notificar</span>
              </button>
            </form>
          </div>

          {/* Bandeja de Comentarios Enviados con Acuse de Recibo */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Historial de Instrucciones Emitidas y Estado de Envío</span>
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {comentarios.length} comunicaciones
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {comentarios.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No hay comentarios registrados todavía.
                </p>
              ) : (
                comentarios.map((com) => (
                  <div
                    key={com.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Actuación Nº {com.actuacionNumero}</span>
                          <span className="text-slate-400 font-normal">·</span>
                          <span className="text-blue-700 dark:text-blue-300 font-semibold">
                            Para: {com.destinatarioNombre}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {com.destinatarioEmail}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(com.fechaHora).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 leading-relaxed text-[11px]">
                      "{com.mensaje}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Comentario registrado · Correo pendiente de envío externo</span>
                      </div>
                      <span className="text-slate-400">
                        {com.leido ? 'Visto por el técnico' : 'Pendiente de lectura'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Nuevo Usuario */}
      {mostrarModalNuevoUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Dar de Alta Nuevo Funcionario / Técnico
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Área de Desarrollo Local · Diputación Provincial de Cádiz
            </p>

            <form onSubmit={e => { void handleCrearUsuario(e).catch(() => {}); }} className="mt-4 space-y-3 text-xs">
<EstadoGuardado />
<label className="block text-xs">Identificador de la cuenta existente en Firebase Authentication (UID)<input required value={nuevoUid} onChange={e=>setNuevoUid(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Andrés"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoApellidos}
                  onChange={(e) => setNuevoApellidos(e.target.value)}
                  placeholder="Ej. Castro Jiménez"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Correo Electrónico Institucional (@dipucadiz.es) *
                </label>
                <input
                  type="email"
                  required
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="acastro@dipucadiz.es"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Cargo Funcional
                </label>
                <input
                  type="text"
                  value={nuevoCargo}
                  onChange={(e) => setNuevoCargo(e.target.value)}
                  placeholder="Ej. Ingeniero de Caminos"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Rol en el Sistema
                </label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="tecnico">Técnico Revisor</option>
                  <option value="jefe_servicio">Jefe de Servicio (Administrador)</option>
                  <option value="administrativo">Personal Administrativo</option>
                  <option value="auditor">Auditor / Control Financiero</option>
                  <option value="consulta">Personal de Consulta (Lectura restringida)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoUsuario(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold"
                >
                  Registrar Funcionario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configuración de Permisos Específicos */}
      {usuarioEditandoPermisos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Permisos Específicos
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {usuarioEditandoPermisos.nombre} {usuarioEditandoPermisos.apellidos}
              </h3>
              <p className="text-xs text-slate-500">
                {usuarioEditandoPermisos.cargo} · {usuarioEditandoPermisos.email}
              </p>
            </div>

            <form onSubmit={e => { void handleGuardarPermisos(e).catch(() => {}); }} className="space-y-3 text-xs">
<EstadoGuardado />
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usuarioEditandoPermisos.permisos?.puedeEditarPlanes || false}
                    onChange={(e) =>
                      setUsuarioEditandoPermisos({
                        ...usuarioEditandoPermisos,
                        permisos: {
                          ...usuarioEditandoPermisos.permisos!,
                          puedeEditarPlanes: e.target.checked
                        }
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Puede dar de alta y editar Planes de Subvenciones
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usuarioEditandoPermisos.permisos?.puedeAsignarTecnicos || false}
                    onChange={(e) =>
                      setUsuarioEditandoPermisos({
                        ...usuarioEditandoPermisos,
                        permisos: {
                          ...usuarioEditandoPermisos.permisos!,
                          puedeAsignarTecnicos: e.target.checked
                        }
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Puede asignar actuaciones a otros técnicos
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usuarioEditandoPermisos.permisos?.puedeCalificarDocumentos ?? true}
                    onChange={(e) =>
                      setUsuarioEditandoPermisos({
                        ...usuarioEditandoPermisos,
                        permisos: {
                          ...usuarioEditandoPermisos.permisos!,
                          puedeCalificarDocumentos: e.target.checked
                        }
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Puede calificar estado Base 14 (En plazo / Deficiencias)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usuarioEditandoPermisos.permisos?.puedeExportarInformes ?? true}
                    onChange={(e) =>
                      setUsuarioEditandoPermisos({
                        ...usuarioEditandoPermisos,
                        permisos: {
                          ...usuarioEditandoPermisos.permisos!,
                          puedeExportarInformes: e.target.checked
                        }
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Puede exportar informes técnicos en PDF y CSV
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usuarioEditandoPermisos.permisos?.puedeEnviarComentarios ?? true}
                    onChange={(e) =>
                      setUsuarioEditandoPermisos({
                        ...usuarioEditandoPermisos,
                        permisos: {
                          ...usuarioEditandoPermisos.permisos!,
                          puedeEnviarComentarios: e.target.checked
                        }
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Puede enviar comentarios oficiales y alertas por email
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioEditandoPermisos(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold"
                >
                  Guardar Permisos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal oficial de Migración y Backup de Firebase */}
      <ModalMigracionFirebase
        mostrar={mostrarModalMigracion}
        onCerrar={() => setMostrarModalMigracion(false)}
      />
    </div>
  );
};
