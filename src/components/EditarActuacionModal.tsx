import { EstadoGuardado } from './EstadoGuardado';
import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Save,
  Building2,
  Calendar,
  Clock,
  Euro,
  Layers,
  User,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Actuacion } from '../types';
import { useApp } from '../context/AppContext';
import { formatearMoneda } from '../utils/pdfExport';
import { ENTIDADES_LOCALES_CADIZ } from '../utils/pdfPlanParser';
import { limpiarNombreEELL } from '../utils/eellUtils';

interface EditarActuacionModalProps {
  actuacion: Actuacion;
  mostrar: boolean;
  onCerrar: () => void;
  onGuardadoExitoso?: () => void;
}

export const EditarActuacionModal: React.FC<EditarActuacionModalProps> = ({
  actuacion,
  mostrar,
  onCerrar,
  onGuardadoExitoso
}) => {
  const {
    cambiosPendientes,
    guardarOperacion,
    actualizarActuacion,
    actualizarActuacionCabecera,
    planes,
    usuarios,
    registrarAccionAuditoria
  } = useApp();

  const [numero, setNumero] = useState(actuacion.numero);
  const [entidadLocal, setEntidadLocal] = useState(actuacion.entidadLocal);
  const [titulo, setTitulo] = useState(actuacion.titulo);
  const [planNombre, setPlanNombre] = useState(actuacion.plan);
  const [aplicacionPresupuestaria, setAplicacionPresupuestaria] = useState(actuacion.aplicacionPresupuestaria || '');
  const [importeActuacion, setImporteActuacion] = useState<number>(actuacion.importes?.importeActuacion || 0);
  const [importeConcesion, setImporteConcesion] = useState<number>(actuacion.importes?.importeConcesion || 0);
  const [importeAdjudicacion, setImporteAdjudicacion] = useState<number>(actuacion.importes?.importeAdjudicacion || 0);

  const [plazoEjecucion, setPlazoEjecucion] = useState(actuacion.plazos?.plazoEjecucion || '');
  const [plazoEjecucionAmpliado, setPlazoEjecucionAmpliado] = useState(actuacion.plazos?.plazoEjecucionAmpliado || '');
  const [plazoJustificacion, setPlazoJustificacion] = useState(actuacion.plazos?.plazoJustificacion || '');
  const [plazoJustificacionAmpliado, setPlazoJustificacionAmpliado] = useState(actuacion.plazos?.plazoJustificacionAmpliado || '');

  const [tecnicoId, setTecnicoId] = useState(actuacion.tecnicoAsignadoId || '');
  const [observaciones, setObservaciones] = useState(actuacion.observacionesInternas || '');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    setNumero(actuacion.numero);
    setEntidadLocal(actuacion.entidadLocal);
    setTitulo(actuacion.titulo);
    setPlanNombre(actuacion.plan);
    setAplicacionPresupuestaria(actuacion.aplicacionPresupuestaria || '');
    setImporteActuacion(actuacion.importes?.importeActuacion || 0);
    setImporteConcesion(actuacion.importes?.importeConcesion || 0);
    setImporteAdjudicacion(actuacion.importes?.importeAdjudicacion || 0);
    setPlazoEjecucion(actuacion.plazos?.plazoEjecucion || '');
    setPlazoEjecucionAmpliado(actuacion.plazos?.plazoEjecucionAmpliado || '');
    setPlazoJustificacion(actuacion.plazos?.plazoJustificacion || '');
    setPlazoJustificacionAmpliado(actuacion.plazos?.plazoJustificacionAmpliado || '');
    setTecnicoId(actuacion.tecnicoAsignadoId || '');
    setObservaciones(actuacion.observacionesInternas || '');
  }, [actuacion]);

  if (!mostrar) return null;

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const tecSeleccionado = usuarios.find((u) => u.id === tecnicoId);
    const tecNombre = tecSeleccionado
      ? `${tecSeleccionado.nombre} ${tecSeleccionado.apellidos}`
      : actuacion.tecnicoAsignadoNombre;

    const datosNuevos: Partial<Actuacion> = {
      numero: numero.trim() || actuacion.numero,
      entidadLocal: entidadLocal.trim() || actuacion.entidadLocal,
      titulo: titulo.trim(),
      plan: planNombre.trim() || actuacion.plan,
      aplicacionPresupuestaria: aplicacionPresupuestaria.trim(),
      importes: {
        importeActuacion: Number(importeActuacion) || 0,
        importeConcesion: Number(importeConcesion) || 0,
        importeAdjudicacion: Number(importeAdjudicacion) || 0
      },
      plazos: {
        plazoEjecucion,
        plazoEjecucionAmpliado: plazoEjecucionAmpliado || undefined,
        plazoJustificacion,
        plazoJustificacionAmpliado: plazoJustificacionAmpliado || undefined
      },
      liquidacion: {
        ...actuacion.liquidacion,
        adjudicacion: Number(importeAdjudicacion) || actuacion.liquidacion?.adjudicacion || 0
      },
      tecnicoAsignadoId: tecnicoId,
      tecnicoAsignadoNombre: tecNombre,
      observacionesInternas: observaciones.trim()
    };

    await guardarOperacion(() => {
    // Actualizar globalmente
    actualizarActuacion(actuacion.id, datosNuevos);
    actualizarActuacionCabecera(datosNuevos);

    registrarAccionAuditoria(
      'calificacion_estado',
      actuacion.id,
      `Actuación Nº ${datosNuevos.numero}`,
      `Modificación de datos principales de la actuación ${actuacion.id} (${datosNuevos.entidadLocal}): título, importes y plazos actualizados.`
    );

    });

    setMensajeExito(`Datos de la actuación nº ${datosNuevos.numero} guardados correctamente.`);
    setTimeout(() => {
      setMensajeExito(null);
      if (onGuardadoExitoso) onGuardadoExitoso();
      onCerrar();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Cabecera del modal */}
        <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004F90] border border-blue-200 flex items-center justify-center font-bold shrink-0">
              <Edit2 className="w-4 h-4 text-[#004F90]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                Modificar Datos de la Actuación
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Expediente: {actuacion.id} · {limpiarNombreEELL(actuacion.entidadLocal)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de éxito */}
        {mensajeExito && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-bold shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
          </div>
        )}

        {/* Formulario con scroll */}
        <form onSubmit={e => { void handleGuardar(e).catch(() => {}); }} className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
<EstadoGuardado />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Número */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Número de Actuación
              </label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 text-xs"
              />
            </div>

            {/* Municipio / EELL */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Municipio / Entidad Local
              </label>
              <select
                value={limpiarNombreEELL(entidadLocal)}
                onChange={(e) => setEntidadLocal(limpiarNombreEELL(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-[#004F90] text-xs"
              >
                {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>
            </div>

            {/* Plan al que pertenece */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Plan de Subvenciones
              </label>
              <select
                value={planNombre}
                onChange={(e) => setPlanNombre(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs"
              >
                {planes.map((p) => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Título de la actuación */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Título de la Actuación / Denominación Oficial
            </label>
            <textarea
              rows={2}
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold"
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
                value={aplicacionPresupuestaria}
                onChange={(e) => setAplicacionPresupuestaria(e.target.value)}
                placeholder="2026-03-920-46200"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800 text-xs"
              />
            </div>

            {/* Técnico Asignado */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Técnico Revisor Asignado
              </label>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellidos} ({u.rol === 'jefe_servicio' ? 'Jefe de Servicio' : 'Técnico'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recuadro de Importes oficiales: Introducir a mano + vista formateada */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Euro className="w-4 h-4 text-emerald-600" />
                <span>Importes Económicos Oficiales</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Introducir valores a mano · Formateado en miles con 2 decimales)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Importe Actuación */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                  <span>Imp. Actuación <span className="text-[#004F90] lowercase">(a mano)</span></span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={importeActuacion}
                  onChange={(e) => setImporteActuacion(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 text-xs"
                />
                <span className="block text-[10px] font-mono font-bold text-slate-600 mt-1">
                  {formatearMoneda(importeActuacion)}
                </span>
              </div>

              {/* Importe Concesión */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                  <span>Imp. Concesión <span className="text-[#004F90] lowercase">(a mano)</span></span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={importeConcesion}
                  onChange={(e) => setImporteConcesion(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-emerald-700 text-xs"
                />
                <span className="block text-[10px] font-mono font-bold text-emerald-700 mt-1">
                  {formatearMoneda(importeConcesion)}
                </span>
              </div>

              {/* Importe Adjudicación */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                  <span>Imp. Adjudicación <span className="text-[#004F90] lowercase">(a mano)</span></span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={importeAdjudicacion}
                  onChange={(e) => setImporteAdjudicacion(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-blue-700 text-xs"
                />
                <span className="block text-[10px] font-mono font-bold text-blue-700 mt-1">
                  {formatearMoneda(importeAdjudicacion)}
                </span>
              </div>
            </div>
          </div>

          {/* Plazos de la actuación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Plazos de Ejecución */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#004F90]" />
                <span>Plazos de Ejecución de Obras</span>
              </span>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Plazo Inicial</label>
                <input
                  type="date"
                  value={plazoEjecucion}
                  onChange={(e) => setPlazoEjecucion(e.target.value)}
                  className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Plazo Ampliado</label>
                <input
                  type="date"
                  value={plazoEjecucionAmpliado}
                  onChange={(e) => setPlazoEjecucionAmpliado(e.target.value)}
                  className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            {/* Plazos de Justificación */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Plazos de Justificación</span>
              </span>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Plazo Inicial</label>
                <input
                  type="date"
                  value={plazoJustificacion}
                  onChange={(e) => setPlazoJustificacion(e.target.value)}
                  className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Plazo Ampliado</label>
                <input
                  type="date"
                  value={plazoJustificacionAmpliado}
                  onChange={(e) => setPlazoJustificacionAmpliado(e.target.value)}
                  className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Observaciones Internas */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Observaciones Técnicas Internas
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas internas de la tramitación de esta actuación..."
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cambiosPendientes > 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white font-black shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios de la Actuación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
