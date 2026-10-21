import { EstadoGuardado } from './EstadoGuardado';
import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  Save,
  Plus,
  Trash2,
  Check,
  Building2,
  Calendar,
  Clock,
  Euro,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload,
  ShieldAlert,
  Archive
} from 'lucide-react';
import { PlanSubvencion, ActuacionEnPlan } from '../types';
import { useApp } from '../context/AppContext';
import { formatearMoneda } from '../utils/pdfExport';
import { ENTIDADES_LOCALES_CADIZ } from '../utils/pdfPlanParser';
import { ModalAltaActuacionesPlan } from './ModalAltaActuacionesPlan';

interface EditarPlanModalProps {
  plan: PlanSubvencion;
  mostrar: boolean;
  onCerrar: () => void;
  pestañaInicial?: 'general' | 'anadir' | 'actuaciones';
  onPlanEliminado?: () => void;
}

/**
 * Calcula el siguiente número de actuación respetando la relación de EELL (1 al N)
 * y el esquema de numeración municipal (1.1, 1.2, 2.1, 2.2...)
 */
function calcularSiguienteNumeroActuacionEELL(plan: PlanSubvencion, eell: string): string {
  const previstas = plan.actuacionesPrevistas || [];
  const mapaEELL = new Map<string, number>();
  let eellContador = 1;

  previstas.forEach((p) => {
    const mun = p.entidadLocal || 'Entidad Local';
    if (!mapaEELL.has(mun)) {
      const m = String(p.numero || '').match(/^(\d+)[.\-_/]/);
      const n = m ? parseInt(m[1], 10) : null;
      mapaEELL.set(mun, n && !isNaN(n) ? n : eellContador++);
    }
  });

  const numEELL = mapaEELL.get(eell) || (mapaEELL.size + 1);

  // Buscar actuaciones de esta entidad local
  const deEstaEELL = previstas.filter(
    (p) => (p.entidadLocal || '').toLowerCase() === eell.toLowerCase()
  );

  if (deEstaEELL.length > 0) {
    let maxSub = 0;
    deEstaEELL.forEach((a) => {
      const matchSub = String(a.numero || '').match(/^\d+[.\-_/](\d+)/);
      if (matchSub) {
        const s = parseInt(matchSub[1], 10);
        if (!isNaN(s) && s > maxSub) maxSub = s;
      }
    });
    const siguienteSub = maxSub > 0 ? maxSub + 1 : deEstaEELL.length + 1;
    return `${numEELL}.${siguienteSub}`;
  }

  return `${numEELL}.1`;
}

export const EditarPlanModal: React.FC<EditarPlanModalProps> = ({
  plan,
  mostrar,
  onCerrar,
  pestañaInicial = 'general',
  onPlanEliminado
}) => {
  const { cambiosPendientes, guardarOperacion,
    actualizarPlan,
    agregarActuacionAlPlan,
    editarActuacionDePlan,
    eliminarActuacionDePlan,
    eliminarPlan,
    usuarioActual
  } = useApp();

  const esAdmin = usuarioActual?.rol === 'administrador' || usuarioActual?.rol === 'jefe_servicio' || !!usuarioActual?.permisos?.puedeEditarPlanes;

  const [pestaña, setPestaña] = useState<'general' | 'anadir' | 'actuaciones'>(pestañaInicial);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [modalAltaArchivoAbierto, setModalAltaArchivoAbierto] = useState(false);
  const [mostrarConfirmacionBorrar, setMostrarConfirmacionBorrar] = useState(false);
  const [guardarCopiaAlBorrar, setGuardarCopiaAlBorrar] = useState(true);

  // Estados de datos generales del plan
  const [nombre, setNombre] = useState(plan.nombre);
  const [ejercicio, setEjercicio] = useState<number>(plan.ejercicio);
  const [presupuestoTotal, setPresupuestoTotal] = useState<number>(plan.presupuestoTotal);
  const [activo, setActivo] = useState<boolean>(plan.activo);
  const [plazoEjecucionMaximo, setPlazoEjecucionMaximo] = useState(plan.plazoEjecucionMaximo || '');
  const [plazoEjecucionAmpliado, setPlazoEjecucionAmpliado] = useState(plan.plazoEjecucionAmpliado || '');
  const [plazoJustificacionMaximo, setPlazoJustificacionMaximo] = useState(plan.plazoJustificacionMaximo || '');
  const [plazoJustificacionAmpliado, setPlazoJustificacionAmpliado] = useState(plan.plazoJustificacionAmpliado || '');
  const [descripcion, setDescripcion] = useState(plan.descripcion || '');

  // Estados para añadir nueva actuación al plan
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [nuevoEELL, setNuevoEELL] = useState(ENTIDADES_LOCALES_CADIZ[0] || 'Alcalá de los Gazules');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaPartida, setNuevaPartida] = useState('');
  const [nuevoImporte, setNuevoImporte] = useState<number>(100000);
  const [nuevoPlazoEjecucion, setNuevoPlazoEjecucion] = useState(plan.plazoEjecucionMaximo || '');
  const [nuevoPlazoJustificacion, setNuevoPlazoJustificacion] = useState(plan.plazoJustificacionMaximo || '');

  // Estado para modificar una actuación existente
  const [actuacionEditando, setActuacionEditando] = useState<ActuacionEnPlan | null>(null);
  const [editNumero, setEditNumero] = useState('');
  const [editEELL, setEditEELL] = useState('');
  const [editTitulo, setEditTitulo] = useState('');
  const [editPartida, setEditPartida] = useState('');
  const [editImporte, setEditImporte] = useState<number>(0);

  // Sincronizar cuando cambia el plan prop
  useEffect(() => {
    setNombre(plan.nombre);
    setEjercicio(plan.ejercicio);
    setPresupuestoTotal(plan.presupuestoTotal);
    setActivo(plan.activo);
    setPlazoEjecucionMaximo(plan.plazoEjecucionMaximo || '');
    setPlazoEjecucionAmpliado(plan.plazoEjecucionAmpliado || '');
    setPlazoJustificacionMaximo(plan.plazoJustificacionMaximo || '');
    setPlazoJustificacionAmpliado(plan.plazoJustificacionAmpliado || '');
    setDescripcion(plan.descripcion || '');
    setNuevoPlazoEjecucion(plan.plazoEjecucionMaximo || '');
    setNuevoPlazoJustificacion(plan.plazoJustificacionMaximo || '');

    // Calcular siguiente número automático para nueva actuación acorde con el prefijo municipal (1.1, 1.2, 2.1...)
    const siguiente = calcularSiguienteNumeroActuacionEELL(plan, nuevoEELL);
    setNuevoNumero(siguiente);
  }, [plan]);

  // Al cambiar la EELL seleccionada en el formulario de alta de actuación, calcular su número correspondiente
  const handleCambiarNuevoEELL = (eellSeleccionada: string) => {
    setNuevoEELL(eellSeleccionada);
    const siguiente = calcularSiguienteNumeroActuacionEELL(plan, eellSeleccionada);
    setNuevoNumero(siguiente);
  };

  useEffect(() => {
    if (mostrar) {
      setPestaña(pestañaInicial);
    }
  }, [mostrar, pestañaInicial]);

  if (!mostrar) return null;

  // Guardar datos generales del plan
  const handleGuardarDatosGenerales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const planActualizado: PlanSubvencion = {
      ...plan,
      nombre: nombre.trim(),
      codigo: plan.codigo || `P-${ejercicio}`,
      ejercicio: Number(ejercicio) || 2026,
      presupuestoTotal: Number(presupuestoTotal) || 0,
      activo,
      plazoEjecucionMaximo,
      plazoEjecucionAmpliado: plazoEjecucionAmpliado || undefined,
      plazoJustificacionMaximo,
      plazoJustificacionAmpliado: plazoJustificacionAmpliado || undefined,
      descripcion: descripcion.trim()
    };

    await guardarOperacion(() => actualizarPlan(planActualizado));
    setMensajeExito('Datos generales del plan actualizados correctamente.');
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // Añadir una nueva actuación al plan
  const handleAnadirActuacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim()) return;

    const numFinal = nuevoNumero.trim() || String((plan.actuacionesPrevistas?.length || 0) + 1).padStart(2, '0');

    await guardarOperacion(() => agregarActuacionAlPlan(plan.id, {
      numero: numFinal,
      entidadLocal: nuevoEELL,
      titulo: nuevoTitulo.trim(),
      aplicacionPresupuestaria: nuevaPartida.trim() || `${ejercicio}-03-920-46200`,
      subvencionSolicitada: Number(nuevoImporte) || 0,
      plazoEjecucion: nuevoPlazoEjecucion || plazoEjecucionMaximo,
      plazoJustificacion: nuevoPlazoJustificacion || plazoJustificacionMaximo
    }));

    setNuevoTitulo('');
    setNuevaPartida('');
    setNuevoImporte(100000);
    const siguienteNum = String((plan.actuacionesPrevistas?.length || 0) + 2).padStart(2, '0');
    setNuevoNumero(siguienteNum);

    setMensajeExito(`Actuación nº ${numFinal} (${nuevoEELL}) añadida con éxito al plan.`);
    setTimeout(() => setMensajeExito(null), 4000);
    setPestaña('actuaciones');
  };

  // Guardar edición de actuación existente
  const handleGuardarModificacionActuacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actuacionEditando) return;

    await guardarOperacion(() => {
    editarActuacionDePlan(plan.id, actuacionEditando.id, {
      numero: editNumero.trim() || actuacionEditando.numero,
      entidadLocal: editEELL || actuacionEditando.entidadLocal,
      titulo: editTitulo.trim() || actuacionEditando.titulo,
      aplicacionPresupuestaria: editPartida.trim(),
      subvencionSolicitada: Number(editImporte) || 0
    });

    });
    setActuacionEditando(null);
    setMensajeExito(`Actuación nº ${editNumero || actuacionEditando.numero} modificada correctamente.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004F90] border border-blue-200 flex items-center justify-center font-bold shrink-0">
              <Edit className="w-4 h-4 text-[#004F90]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                Editar Plan de Subvenciones
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {plan.nombre} ({plan.ejercicio})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {esAdmin && (
              <button
                type="button"
                onClick={() => setMostrarConfirmacionBorrar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs"
                title="Borrar plan de subvenciones (Administrador)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Borrar Plan</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCerrar}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificación de éxito */}
        {mensajeExito && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
            <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:underline">
              Cerrar
            </button>
          </div>
        )}

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 pt-2 gap-2 shrink-0 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setPestaña('general')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
              pestaña === 'general'
                ? 'border-[#004F90] text-[#004F90] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Datos Generales del Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setPestaña('anadir')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
              pestaña === 'anadir'
                ? 'border-[#004F90] text-[#004F90] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>2. Añadir Actuación al Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setPestaña('actuaciones')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
              pestaña === 'actuaciones'
                ? 'border-[#004F90] text-[#004F90] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Modificar Actuaciones ({plan.actuacionesPrevistas?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setModalAltaArchivoAbierto(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 border-transparent text-[#004F90] hover:text-[#003B71] transition whitespace-nowrap font-black bg-blue-50/60 rounded-t-lg ml-auto"
            title="Subir archivo Excel, CSV o PDF para extraer y dar de alta actuaciones con IA"
          >
            <Sparkles className="w-4 h-4 text-[#004F90]" />
            <span>4. Subir Archivo con IA</span>
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
          {/* =========================================================================
              PESTAÑA 1: DATOS GENERALES DEL PLAN
              ========================================================================= */}
          {pestaña === 'general' && (
            <form onSubmit={e => { void handleGuardarDatosGenerales(e).catch(() => {}); }} className="space-y-4">
<EstadoGuardado />
              <div className="grid grid-cols-1 gap-3">
                {/* Nombre del Plan */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Nombre Oficial del Plan
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#004F90]/20 focus:border-[#004F90]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ejercicio / Anualidad */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Anualidad / Ejercicio
                  </label>
                  <input
                    type="number"
                    required
                    value={ejercicio}
                    onChange={(e) => setEjercicio(parseInt(e.target.value, 10) || 2026)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800 text-xs focus:ring-2 focus:ring-[#004F90]/20 focus:border-[#004F90]"
                  />
                </div>

                {/* Vigencia */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Vigencia del Plan
                  </label>
                  <select
                    value={activo ? 'vigente' : 'cerrado'}
                    onChange={(e) => setActivo(e.target.value === 'vigente')}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs focus:ring-2 focus:ring-[#004F90]/20 focus:border-[#004F90]"
                  >
                    <option value="vigente">Vigente (Convocatoria en curso)</option>
                    <option value="cerrado">Cerrado (Convocatoria finalizada)</option>
                  </select>
                </div>

                {/* Presupuesto Total */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                    <span>Presupuesto Total <span className="text-[#004F90] font-bold lowercase">(a mano)</span></span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={presupuestoTotal}
                    onChange={(e) => setPresupuestoTotal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-emerald-700 text-xs focus:ring-2 focus:ring-[#004F90]/20 focus:border-[#004F90]"
                  />
                  <span className="block text-[10px] font-mono font-bold text-slate-600 mt-1">
                    Formato miles: {formatearMoneda(presupuestoTotal)}
                  </span>
                </div>
              </div>

              {/* Plazos de Ejecución y Ampliación */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-4 h-4 text-[#004F90]" />
                  <span>Plazos de Ejecución de las Obras</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Plazo Máximo de Ejecución Inicial
                    </label>
                    <input
                      type="date"
                      value={plazoEjecucionMaximo}
                      onChange={(e) => setPlazoEjecucionMaximo(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Plazo de Ejecución Ampliado (opcional)
                    </label>
                    <input
                      type="date"
                      value={plazoEjecucionAmpliado}
                      onChange={(e) => setPlazoEjecucionAmpliado(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Plazos de Justificación y Ampliación */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Plazos de Justificación Económica Base 14</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Plazo Máximo de Justificación Inicial
                    </label>
                    <input
                      type="date"
                      value={plazoJustificacionMaximo}
                      onChange={(e) => setPlazoJustificacionMaximo(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Plazo de Justificación Ampliado (opcional)
                    </label>
                    <input
                      type="date"
                      value={plazoJustificacionAmpliado}
                      onChange={(e) => setPlazoJustificacionAmpliado(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Descripción / Objeto de la Convocatoria
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles de la convocatoria del plan..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                {esAdmin ? (
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmacionBorrar(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition shadow-2xs"
                    title="Borrar plan de subvenciones (disponible para administradores)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Borrar Plan</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCerrar}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs transition"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
              disabled={cambiosPendientes > 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white font-black shadow-xs transition text-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Datos del Plan</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* =========================================================================
              PESTAÑA 2: AÑADIR ACTUACIÓN AL PLAN
              ========================================================================= */}
          {pestaña === 'anadir' && (
            <form onSubmit={e => { void handleAnadirActuacion(e).catch(() => {}); }} className="space-y-4">
<EstadoGuardado />
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-700 text-xs">
                <span className="font-bold text-[#004F90]">Añadir actuación al {plan.nombre}:</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  La actuación se dará de alta con sus documentos preceptivos Base 14 y quedará vinculada a este plan.
                </p>
              </div>

              {/* Banner para subir archivo Excel, CSV o PDF con IA */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Sparkles className="w-4 h-4 text-[#004F90]" />
                    <span>¿Prefieres importar una relación oficial en archivo con IA?</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Mapeo automático de columnas: Nº ACT. ➔ NÚMERO, ENTIDAD LOCAL ➔ EELL, ACTUACIÓN ➔ TÍTULO, APLICACIÓN PRESUPUESTARIA e IMPORTE.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAltaArchivoAbierto(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-bold shrink-0 shadow-2xs transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Archivo con IA</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Número */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Número de Actuación
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoNumero}
                    onChange={(e) => setNuevoNumero(e.target.value)}
                    placeholder="04"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800 text-xs"
                  />
                </div>

                {/* Municipio / EELL */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Municipio / Entidad Local Beneficiaria
                  </label>
                  <select
                    value={nuevoEELL}
                    onChange={(e) => handleCambiarNuevoEELL(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-[#004F90] text-xs"
                  >
                    {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                      <option key={mun} value={mun}>{mun}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Título de la actuación */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Título de la Actuación / Denominación del Proyecto
                </label>
                <textarea
                  rows={2}
                  required
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="Ej: Reurbanización, accesibilidad y mejora de saneamiento..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Partida presupuestaria */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Aplicación Presupuestaria
                  </label>
                  <input
                    type="text"
                    value={nuevaPartida}
                    onChange={(e) => setNuevaPartida(e.target.value)}
                    placeholder={`${ejercicio}-03-920-46200`}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800 text-xs"
                  />
                </div>

                {/* Importe subvención */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                    <span>Importe Subvención <span className="text-[#004F90] font-bold lowercase">(a mano)</span></span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevoImporte}
                    onChange={(e) => setNuevoImporte(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-emerald-700 text-xs"
                  />
                  <span className="block text-[10px] font-mono font-bold text-slate-600 mt-1">
                    Formato miles: {formatearMoneda(nuevoImporte)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Plazo de Ejecución de la Actuación
                  </label>
                  <input
                    type="date"
                    value={nuevoPlazoEjecucion}
                    onChange={(e) => setNuevoPlazoEjecucion(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Plazo de Justificación de la Actuación
                  </label>
                  <input
                    type="date"
                    value={nuevoPlazoJustificacion}
                    onChange={(e) => setNuevoPlazoJustificacion(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPestaña('general')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Volver a Datos Generales
                </button>
                <button
                  type="submit"
              disabled={cambiosPendientes > 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white font-black shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Actuación al Plan</span>
                </button>
              </div>
            </form>
          )}

          {/* =========================================================================
              PESTAÑA 3: MODIFICAR ACTUACIONES EXISTENTES DEL PLAN
              ========================================================================= */}
          {pestaña === 'actuaciones' && (
            <div className="space-y-4">
              {/* Formulario si se está modificando una actuación concreta */}
              {actuacionEditando ? (
                <form onSubmit={e => { void handleGuardarModificacionActuacion(e).catch(() => {}); }} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
<EstadoGuardado />
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5 text-[#004F90]" />
                      <span>Modificar Actuación nº {actuacionEditando.numero}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActuacionEditando(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        value={editNumero}
                        onChange={(e) => setEditNumero(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Municipio
                      </label>
                      <select
                        value={editEELL}
                        onChange={(e) => setEditEELL(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-[#004F90]"
                      >
                        {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                          <option key={mun} value={mun}>{mun}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Título
                    </label>
                    <textarea
                      rows={2}
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Partida Presupuestaria
                      </label>
                      <input
                        type="text"
                        value={editPartida}
                        onChange={(e) => setEditPartida(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Importe Subvención (a mano)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editImporte}
                        onChange={(e) => setEditImporte(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-emerald-700 text-xs"
                      />
                      <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                        {formatearMoneda(editImporte)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActuacionEditando(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
              disabled={cambiosPendientes > 0}
                      className="px-4 py-1.5 rounded-lg bg-[#004F90] hover:bg-[#003B71] text-white font-bold shadow-2xs"
                    >
                      Guardar Modificación
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Listado de actuaciones del plan */}
              <div className="space-y-2">
                {(!plan.actuacionesPrevistas || plan.actuacionesPrevistas.length === 0) ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-xs">
                    Este plan no tiene actuaciones previstas registradas. Puedes añadir la primera en la pestaña "Añadir Actuación al Plan".
                  </div>
                ) : (
                  plan.actuacionesPrevistas.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 font-mono font-black text-slate-700 flex items-center justify-center shrink-0">
                          {act.numero}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#004F90]">
                              {act.entidadLocal}
                            </span>
                            {act.aplicacionPresupuestaria && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1 rounded border border-slate-200">
                                {act.aplicacionPresupuestaria}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 font-semibold mt-0.5 line-clamp-1">
                            {act.titulo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                        <span className="font-mono font-black text-emerald-700">
                          {formatearMoneda(act.subvencionSolicitada)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActuacionEditando(act);
                              setEditNumero(act.numero);
                              setEditEELL(act.entidadLocal);
                              setEditTitulo(act.titulo);
                              setEditPartida(act.aplicacionPresupuestaria || '');
                              setEditImporte(act.subvencionSolicitada || 0);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px]"
                            title="Modificar esta actuación"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                            <span>Modificar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { void (async () => {
                              if (window.confirm(`¿Seguro que deseas eliminar la actuación nº ${act.numero} (${act.entidadLocal}) de este plan?`)) {
                                await guardarOperacion(() => eliminarActuacionDePlan(plan.id, act.id));
                                setMensajeExito(`Actuación nº ${act.numero} eliminada del plan.`);
                                setTimeout(() => setMensajeExito(null), 3500);
                              }
                            })().catch(() => {}); }}
                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                            title="Eliminar actuación del plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPestaña('anadir')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#004F90] border border-blue-200 font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir otra actuación</span>
                </button>

                <button
                  type="button"
                  onClick={onCerrar}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para dar de alta actuaciones desde archivo con IA */}
      {modalAltaArchivoAbierto && (
        <ModalAltaActuacionesPlan
          plan={plan}
          mostrar={modalAltaArchivoAbierto}
          onCerrar={() => setModalAltaArchivoAbierto(false)}
          onActuacionesCreadas={(cant) => {
            setMensajeExito(`Se han dado de alta ${cant} actuaciones en el plan con IA.`);
            setTimeout(() => setMensajeExito(null), 5000);
            setPestaña('actuaciones');
          }}
        />
      )}

      {/* Modal de confirmación para borrar plan con opción de copia de seguridad */}
      {mostrarConfirmacionBorrar && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  ¿Estás seguro de que deseas borrar este plan?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Estás a punto de eliminar el plan <strong className="text-slate-900 font-black">{plan.nombre}</strong> (Anualidad {plan.ejercicio}).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Copia de seguridad y recuperación:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Se guardará una copia completa en la <strong className="font-bold">Papelera de reciclaje</strong> durante <strong className="font-bold">30 días naturales</strong>. Si has borrado este plan por error o necesitas volver a consultarlo, cualquier administrador podrá recuperarlo intacto junto a todas sus actuaciones.
              </p>
              <label className="flex items-center gap-2 pt-1 font-bold text-slate-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={guardarCopiaAlBorrar}
                  onChange={(e) => setGuardarCopiaAlBorrar(e.target.checked)}
                  className="rounded border-slate-300 text-[#004F90] focus:ring-[#004F90] w-4 h-4"
                />
                <span className="text-xs text-slate-800">
                  Guardar una copia para recuperarlo más adelante si he borrado alguno por error (30 días de custodia)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostrarConfirmacionBorrar(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void (async () => {
                  await guardarOperacion(() => eliminarPlan(plan.id, guardarCopiaAlBorrar));
                  setMostrarConfirmacionBorrar(false);
                  if (onPlanEliminado) onPlanEliminado();
                  onCerrar();
                })().catch(() => {}); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, borrar plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
