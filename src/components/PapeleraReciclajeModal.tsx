import { EstadoGuardado } from './EstadoGuardado';
import React, { useState, useMemo } from 'react';
import {
  Archive,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Euro,
  FileText,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CopiaSeguridadPlan } from '../types';
import { formatearMoneda, formatearFecha } from '../utils/pdfExport';

interface PapeleraReciclajeModalProps {
  mostrar: boolean;
  onCerrar: () => void;
  onPlanRestaurado?: (nombrePlan: string) => void;
}

export const PapeleraReciclajeModal: React.FC<PapeleraReciclajeModalProps> = ({
  mostrar,
  onCerrar,
  onPlanRestaurado
}) => {
  const { guardarOperacion,
    planesPapelera,
    restaurarPlan,
    eliminarCopiaDefinitiva,
    vaciarPapeleraPlanes,
    purgarPlanesExpirados
  } = useApp();

  const [busqueda, setBusqueda] = useState('');
  const [filtroDias, setFiltroDias] = useState<'todos' | 'urgentes' | 'normales'>('todos');
  const [copiaDesplegadaId, setCopiaDesplegadaId] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estados de diálogo de confirmación de borrado definitivo
  const [copiaAEliminar, setCopiaAEliminar] = useState<CopiaSeguridadPlan | null>(null);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);

  // Helper para calcular días transcurridos y restantes
  const calcularEstadoRetencion = (copia: CopiaSeguridadPlan) => {
    const fechaInicio = new Date(copia.fechaBorrado).getTime();
    const ahora = Date.now();
    const diasTranscurridos = Math.floor((ahora - fechaInicio) / (1000 * 60 * 60 * 24));
    const diasTotal = copia.diasRetencion || 30;
    const diasRestantes = Math.max(0, diasTotal - diasTranscurridos);
    const porcentajeRestante = Math.max(0, Math.min(100, Math.round((diasRestantes / diasTotal) * 100)));
    const expirado = diasRestantes <= 0;

    return {
      diasTranscurridos,
      diasRestantes,
      diasTotal,
      porcentajeRestante,
      expirado
    };
  };

  // Filtrado de copias
  const copiasFiltradas = useMemo(() => {
    return planesPapelera.filter((c) => {
      const { diasRestantes, expirado } = calcularEstadoRetencion(c);

      // Filtro por texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideNombre = c.plan.nombre.toLowerCase().includes(q);
        const coincideAno = String(c.plan.ejercicio).includes(q);
        const coincideUsuario = (c.borradoPorUsuario || '').toLowerCase().includes(q);
        const coincideActuaciones = (c.actuacionesAsociadas || []).some(
          (a) => a.titulo.toLowerCase().includes(q) || a.entidadLocal.toLowerCase().includes(q)
        );
        if (!coincideNombre && !coincideAno && !coincideUsuario && !coincideActuaciones) {
          return false;
        }
      }

      // Filtro por urgencia de retención
      if (filtroDias === 'urgentes') {
        return diasRestantes <= 7 || expirado;
      }
      if (filtroDias === 'normales') {
        return diasRestantes > 7 && !expirado;
      }

      return true;
    });
  }, [planesPapelera, busqueda, filtroDias]);

  // Totales consolidados de la papelera
  const estadisticas = useMemo(() => {
    const totalPlanes = planesPapelera.length;
    let totalPresupuesto = 0;
    let totalActuaciones = 0;
    let totalExpirados = 0;

    planesPapelera.forEach((c) => {
      totalPresupuesto += c.plan.presupuestoTotal || 0;
      totalActuaciones += c.actuacionesAsociadas?.length || c.plan.actuacionesPrevistas?.length || 0;
      const { expirado } = calcularEstadoRetencion(c);
      if (expirado) totalExpirados++;
    });

    return { totalPlanes, totalPresupuesto, totalActuaciones, totalExpirados };
  }, [planesPapelera]);

  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <EstadoGuardado />
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* =========================================================================
            1. CABECERA INSTITUCIONAL DE LA PAPELERA
            ========================================================================= */}
        <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  Papelera de reciclaje de planes
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  Custodia 30 días
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Almacenamiento protegido durante 30 días naturales con restauración completa en 1 clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {estadisticas.totalExpirados > 0 && (
              <button
                type="button"
                onClick={() => {
                  const cant = purgarPlanesExpirados();
                  setMensajeExito(`Se han purgado ${cant} planes que superaron los 30 días reglamentarios.`);
                  setTimeout(() => setMensajeExito(null), 5000);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition shadow-2xs"
                title="Eliminar planes cuyo periodo de 30 días ha vencido"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Purgar expirados ({estadisticas.totalExpirados})</span>
              </button>
            )}

            {planesPapelera.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmarVaciar(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                title="Eliminar permanentemente todos los planes de la papelera"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Vaciar Papelera</span>
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
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-bold shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
            <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:underline">
              Cerrar
            </button>
          </div>
        )}

        {/* Banner de Garantía de Seguridad de 30 Días */}
        <div className="mx-4 sm:mx-6 mt-3 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#004F90] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#004F90] block text-xs">
                Protocolo de Custodia Administrativa de 30 Días
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Los planes eliminados por los administradores se preservan íntegros durante <strong className="font-bold text-slate-800">30 días naturales</strong> antes de su purga definitiva. Puedes recuperarlos en cualquier momento sin perder ninguna actuación ni documento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-700 sm:border-l sm:border-blue-200 sm:pl-4 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">En Papelera</span>
              <span className="text-sm font-black text-slate-900">{estadisticas.totalPlanes} planes</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Actuaciones</span>
              <span className="text-sm font-black text-[#004F90]">{estadisticas.totalActuaciones}</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. BARRA DE BÚSQUEDA Y FILTROS
            ========================================================================= */}
        <div className="p-4 sm:px-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Buscador de texto */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por plan, anualidad o usuario..."
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de retención */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroDias('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroDias === 'todos'
                  ? 'bg-[#004F90] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({planesPapelera.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroDias('normales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroDias === 'normales'
                  ? 'bg-[#004F90] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              En custodia (&gt;7d)
            </button>
            <button
              type="button"
              onClick={() => setFiltroDias('urgentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filtroDias === 'urgentes'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Próximos a purgar (≤7d)
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. LISTADO DE PLANES EN PAPELERA
            ========================================================================= */}
        <div className="p-4 sm:px-6 overflow-y-auto space-y-3.5 flex-1">
          {copiasFiltradas.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 my-4">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-black text-slate-900">
                {planesPapelera.length === 0
                  ? 'La papelera de reciclaje está vacía'
                  : 'No se encontraron planes con los filtros aplicados'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                {planesPapelera.length === 0
                  ? 'Todos los planes provinciales están activos en el sistema. Cuando un administrador borre un plan, se conservará aquí durante 30 días.'
                  : 'Prueba a cambiar los términos de búsqueda o a limpiar el filtro de días.'}
              </p>
            </div>
          ) : (
            copiasFiltradas.map((copia) => {
              const { diasRestantes, diasTotal, expirado } = calcularEstadoRetencion(copia);
              const estaDesplegado = copiaDesplegadaId === copia.idCopia;
              const actuaciones = copia.actuacionesAsociadas || [];

              return (
                <div
                  key={copia.idCopia}
                  className="rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Información Principal del Plan */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Anualidad */}
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-blue-50 text-[#004F90] border border-blue-200">
                          {copia.plan.ejercicio}
                        </span>

                        {/* Nombre del Plan */}
                        <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                          {copia.plan.nombre}
                        </h3>

                        {/* Estado original */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            copia.plan.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {copia.plan.activo ? 'Vigente al borrar' : 'No vigente al borrar'}
                        </span>
                      </div>

                      {/* Metadatos administrativos */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span>
                          Presupuesto: <strong className="text-slate-900 font-mono font-bold">{formatearMoneda(copia.plan.presupuestoTotal)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Actuaciones: <strong className="text-[#004F90] font-bold">{actuaciones.length || copia.plan.actuacionesPrevistas?.length || 0}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Borrado el: <strong className="text-slate-700">{formatearFecha(copia.fechaBorrado)}</strong>
                        </span>
                        {copia.borradoPorUsuario && (
                          <>
                            <span>•</span>
                            <span>
                              Por: <strong className="text-slate-700">{copia.borradoPorUsuario}</strong>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Barra de retención de 30 días */}
                      <div className="pt-1 flex items-center gap-3 flex-wrap">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                            expirado
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : diasRestantes <= 7
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {expirado
                              ? 'Periodo de 30 días superado (Listo para purga)'
                              : `Quedan ${diasRestantes} de ${diasTotal} días de custodia`}
                          </span>
                        </div>

                        {actuaciones.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCopiaDesplegadaId(estaDesplegado ? null : copia.idCopia)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#004F90] hover:underline"
                          >
                            <span>{estaDesplegado ? 'Ocultar actuaciones' : `Ver ${actuaciones.length} actuaciones`}</span>
                            {estaDesplegado ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción (Restaurar y Borrado Definitivo) */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => { void (async () => {
                          const exito = await guardarOperacion(() => restaurarPlan(copia.idCopia));
                          if (exito) {
                            setMensajeExito(`¡El plan "${copia.plan.nombre}" ha sido restaurado con éxito junto con todas sus actuaciones!`);
                            if (onPlanRestaurado) onPlanRestaurado(copia.plan.nombre);
                            setTimeout(() => setMensajeExito(null), 5000);
                          }
                        })().catch(() => {}); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-[0.98]"
                        title="Restaurar este plan íntegro a la lista de planes activos"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar Plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCopiaAEliminar(copia)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition shadow-2xs"
                        title="Borrado definitivo e irreversible de este plan"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span className="hidden sm:inline">Borrar Definitivo</span>
                      </button>
                    </div>
                  </div>

                  {/* Desglose desplegable de actuaciones asociadas respaldadas */}
                  {estaDesplegado && actuaciones.length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in fade-in">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Actuaciones respaldadas en esta copia ({actuaciones.length}):
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {actuaciones.map((a, idx) => (
                          <div
                            key={a.id || idx}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-[#004F90] px-1.5 py-0.5 rounded bg-blue-50 text-[10px]">
                                {a.numero || String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="font-bold text-slate-700 truncate max-w-[140px] sm:max-w-[200px]">
                                {a.entidadLocal}
                              </span>
                              <span className="text-slate-500 truncate hidden sm:inline">
                                {a.titulo}
                              </span>
                            </div>
                            <span className="font-mono font-black text-slate-800 shrink-0 text-[11px]">
                              {formatearMoneda(a.importes?.importeConcesion || a.importes?.importeActuacion || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* =========================================================================
            4. PIE DEL MODAL
            ========================================================================= */}
        <div className="p-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Papelera oficial protegida · Acceso exclusivo para administradores</span>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* =========================================================================
          5. MODAL DE CONFIRMACIÓN: BORRADO DEFINITIVO INDIVIDUAL
          ========================================================================= */}
      {copiaAEliminar && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  ¿Confirmar borrado definitivo?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Estás a punto de eliminar de forma permanente e irreversible el plan{' '}
                  <strong className="text-slate-900 font-black">{copiaAEliminar.plan.nombre}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <span className="font-bold block mb-0.5">⚠️ Esta acción no se puede deshacer:</span>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                El plan y todas sus actuaciones asociadas serán destruidos permanentemente sin posibilidad de recuperación.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCopiaAEliminar(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  eliminarCopiaDefinitiva(copiaAEliminar.idCopia);
                  setCopiaAEliminar(null);
                  setMensajeExito(`El plan "${copiaAEliminar.plan.nombre}" ha sido eliminado definitivamente.`);
                  setTimeout(() => setMensajeExito(null), 4000);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, eliminar definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL DE CONFIRMACIÓN: VACIAR PAPELERA COMPLETA
          ========================================================================= */}
      {confirmarVaciar && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  ¿Vaciar toda la papelera de reciclaje?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Se eliminarán permanentemente los <strong className="text-slate-900 font-black">{planesPapelera.length} planes</strong> respaldados en la papelera.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <span className="font-bold block mb-0.5">⚠️ Acción irreversible:</span>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Ninguno de los planes podrá recuperarse tras vaciar la papelera.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmarVaciar(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  vaciarPapeleraPlanes();
                  setConfirmarVaciar(false);
                  setMensajeExito('La papelera de reciclaje ha sido vaciada completamente.');
                  setTimeout(() => setMensajeExito(null), 4000);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, vaciar papelera</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
