import { EstadoGuardado } from './EstadoGuardado';
import React, { useState } from 'react';
import { Plus, X, Building2, Calendar, Euro, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MUNICIPIOS_CADIZ, PLANES_DISPONIBLES } from '../data/initialData';

interface NuevaActuacionModalProps {
  mostrar: boolean;
  onCerrar: () => void;
  onActuacionCreada: (id: string) => void;
}

export const NuevaActuacionModal: React.FC<NuevaActuacionModalProps> = ({
  mostrar,
  onCerrar,
  onActuacionCreada
}) => {
  const { cambiosPendientes, guardarOperacion,  crearNuevaActuacion, actuaciones, planes } = useApp();

  const [numero, setNumero] = useState(String(actuaciones.length + 1).padStart(2, '0'));
  const [municipio, setMunicipio] = useState(MUNICIPIOS_CADIZ[0] || 'Alcalá de los Gazules');
  const [plan, setPlan] = useState(planes[0]?.nombre || '');
  const [titulo, setTitulo] = useState('');
  const [aplicacionPresupuestaria, setAplicacionPresupuestaria] = useState('2026-03-920-46200');
  const [importeActuacion, setImporteActuacion] = useState('180000');
  const [importeConcesion, setImporteConcesion] = useState('150000');
  const [importeAdjudicacion, setImporteAdjudicacion] = useState('145000');

  const [plazoEjecucion, setPlazoEjecucion] = useState('2028-10-20');
  const [plazoJustificacion, setPlazoJustificacion] = useState('2028-10-30');
  const [plazoEjecucionAmpliado, setPlazoEjecucionAmpliado] = useState('2028-10-20');
  const [plazoJustificacionAmpliado, setPlazoJustificacionAmpliado] = useState('2028-10-30');

  if (!mostrar) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo) return;

    const nueva = await guardarOperacion(() => crearNuevaActuacion({
      numero,
      entidadLocal: municipio,
      plan,
      titulo,
      aplicacionPresupuestaria: aplicacionPresupuestaria.trim() || '2026-03-920-46200',
      importes: {
        importeActuacion: parseFloat(importeActuacion) || 0,
        importeConcesion: parseFloat(importeConcesion) || 0,
        importeAdjudicacion: parseFloat(importeAdjudicacion) || 0
      },
      plazos: {
        plazoEjecucion,
        plazoJustificacion,
        plazoEjecucionAmpliado,
        plazoJustificacionAmpliado
      }
    }));

    onActuacionCreada(nueva.id);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Dar de Alta Nueva Actuación
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

        {/* Formulario */}
        <form onSubmit={e => { void handleSubmit(e).catch(() => {}); }} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
<EstadoGuardado />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nº de Actuación
              </label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej. 06"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Entidad Local Beneficiaria
              </label>
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                {MUNICIPIOS_CADIZ.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Plan / Programa Provincial *
            </label>
            {planes.length > 0 ? (
              <select
                value={plan || (planes[0]?.nombre ?? '')}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                {planes.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre} ({p.ejercicio})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Nombre del Plan (ej. Plan Cádiz 2026)"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Título Completo de la Actuación
            </label>
            <textarea
              required
              rows={2}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Mejora de infraestructuras viarias y soterramiento en Casco Antiguo..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {/* Aplicación Presupuestaria (antes de la subvención solicitada) */}
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
              Aplicación Presupuestaria Oficial *
            </label>
            <input
              type="text"
              required
              value={aplicacionPresupuestaria}
              onChange={(e) => setAplicacionPresupuestaria(e.target.value)}
              placeholder="Ej. 2024-03-920-46200"
              className="w-full p-2 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-blue-800 dark:text-blue-300"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Partida contable oficial consignada en la convocatoria para la fiscalización del gasto.
            </p>
          </div>

          {/* Importes */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Importes Económicos (€)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Importe Actuación (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={importeActuacion}
                  onChange={(e) => setImporteActuacion(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Importe Concesión (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={importeConcesion}
                  onChange={(e) => setImporteConcesion(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Importe Adjudicación (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={importeAdjudicacion}
                  onChange={(e) => setImporteAdjudicacion(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-blue-700 dark:text-blue-300"
                />
              </div>
            </div>
          </div>

          {/* Plazos */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Plazos Oficiales
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <label className="block text-slate-500 mb-1">Plazo Ejecución</label>
                <input
                  type="date"
                  required
                  value={plazoEjecucion}
                  onChange={(e) => setPlazoEjecucion(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Plazo Justificación</label>
                <input
                  type="date"
                  required
                  value={plazoJustificacion}
                  onChange={(e) => setPlazoJustificacion(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Ejecución Ampliado</label>
                <input
                  type="date"
                  value={plazoEjecucionAmpliado}
                  onChange={(e) => setPlazoEjecucionAmpliado(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Justificación Ampliado</label>
                <input
                  type="date"
                  value={plazoJustificacionAmpliado}
                  onChange={(e) => setPlazoJustificacionAmpliado(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cambiosPendientes > 0}
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition"
            >
              Registrar Actuación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
