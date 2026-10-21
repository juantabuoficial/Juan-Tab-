import { EstadoGuardado } from './EstadoGuardado';
import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Save,
  Building2,
  Euro,
  Layers,
  ArrowRight,
  RefreshCw,
  ClipboardCopy
} from 'lucide-react';
import { PlanSubvencion, ActuacionEnPlan } from '../types';
import { useApp } from '../context/AppContext';
import { limpiarNombreEELL } from '../utils/eellUtils';
import {
  extraerActuacionesDeCualquierArchivo,
  descargarPlantillaExcelActuaciones,
  descargarPlantillaCSVActuaciones,
  ActuacionReconocidaPDF,
  parsearFilasTabulares,
  ENTIDADES_LOCALES_CADIZ
} from '../utils/pdfPlanParser';
import { formatearMoneda } from '../utils/pdfExport';

interface ModalAltaActuacionesPlanProps {
  plan: PlanSubvencion;
  mostrar: boolean;
  onCerrar: () => void;
  onActuacionesCreadas?: (cantidad: number) => void;
}

export const ModalAltaActuacionesPlan: React.FC<ModalAltaActuacionesPlanProps> = ({
  plan,
  mostrar,
  onCerrar,
  onActuacionesCreadas
}) => {
  const { guardarOperacion,
    actuaciones,
    crearNuevaActuacion,
    actualizarPlan
  } = useApp();

  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [motorDetectado, setMotorDetectado] = useState<string | null>(null);
  const [mensajeInfo, setMensajeInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista de actuaciones extraídas listas para dar de alta
  const [actuacionesExtraidas, setActuacionesExtraidas] = useState<ActuacionReconocidaPDF[]>([]);

  // Modo edición inline para una fila concreta
  const [filaEditandoId, setFilaEditandoId] = useState<string | null>(null);
  const [editNumero, setEditNumero] = useState('');
  const [editEELL, setEditEELL] = useState('');
  const [editTitulo, setEditTitulo] = useState('');
  const [editAppPres, setEditAppPres] = useState('');
  const [editImporte, setEditImporte] = useState<number>(0);

  // Modo pegar texto manual
  const [mostrarPegarTexto, setMostrarPegarTexto] = useState(false);
  const [textoManual, setTextoManual] = useState('');

  const inputArchivoRef = useRef<HTMLInputElement>(null);

  if (!mostrar) return null;

  // Procesamiento del archivo subido (Excel, CSV o PDF)
  const procesarArchivoSubido = async (archivo: File) => {
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setProcesando(true);
    setError(null);
    setMensajeInfo(null);

    try {
      const res = await extraerActuacionesDeCualquierArchivo(
        archivo,
        plan.nombre,
        plan.ejercicio || 2026
      );

      if (res.actuaciones && res.actuaciones.length > 0) {
        setActuacionesExtraidas(res.actuaciones);
        setMotorDetectado(res.motor);
        setMensajeInfo(res.mensaje || `Se han extraído ${res.actuaciones.length} actuaciones correctamente.`);
      } else {
        setError('No se pudieron extraer actuaciones de este archivo. Comprueba que las columnas contengan Nº ACT., ENTIDAD LOCAL, ACTUACIÓN, APLICACIÓN PRESUPUESTARIA y SUBVENCIÓN SOLICITADA A DIPUTACION, o descarga la plantilla oficial.');
      }
    } catch (err: any) {
      console.error('Error al procesar archivo:', err);
      setError(err.message || 'Error durante la lectura y separación de datos del archivo.');
    } finally {
      setProcesando(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      procesarArchivoSubido(f);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      procesarArchivoSubido(f);
    }
  };

  // Cargar datos oficiales de muestra
  const handleCargarMuestraCadiz = () => {
    const muestra: ActuacionReconocidaPDF[] = [
      {
        id: `muestra-1`,
        numero: '01',
        entidadLocal: 'Grazalema',
        titulo: 'Rehabilitación y acondicionamiento del Centro Cultural Municipal',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46200`,
        subvencionSolicitada: 160000
      },
      {
        id: `muestra-2`,
        numero: '02',
        entidadLocal: 'Vejer de la Frontera',
        titulo: 'Mejora de la accesibilidad y reurbanización de viales del Casco Histórico',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46201`,
        subvencionSolicitada: 200000
      },
      {
        id: `muestra-3`,
        numero: '03',
        entidadLocal: 'Ubrique',
        titulo: 'Construcción y pavimentación de aparcamiento disuasorio en zona sur',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46202`,
        subvencionSolicitada: 175000
      },
      {
        id: `muestra-4`,
        numero: '04',
        entidadLocal: 'Barbate',
        titulo: 'Acondicionamiento y modernización de infraestructuras deportivas municipales',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46203`,
        subvencionSolicitada: 190000
      },
      {
        id: `muestra-5`,
        numero: '05',
        entidadLocal: 'Tarifa',
        titulo: 'Renovación integral del alumbrado público con tecnología LED de alta eficiencia',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46204`,
        subvencionSolicitada: 180000
      },
      {
        id: `muestra-6`,
        numero: '06',
        entidadLocal: 'Arcos de la Frontera',
        titulo: 'Reparación de caminos rurales de titularidad municipal y red de drenaje',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46205`,
        subvencionSolicitada: 150000
      },
      {
        id: `muestra-7`,
        numero: '07',
        entidadLocal: 'Medina Sidonia',
        titulo: 'Adecuación de espacios públicos y zonas verdes en el recinto amurallado',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46206`,
        subvencionSolicitada: 165000
      },
      {
        id: `muestra-8`,
        numero: '08',
        entidadLocal: 'Olvera',
        titulo: 'Modernización de redes de abastecimiento y saneamiento en calle Llana',
        aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-46207`,
        subvencionSolicitada: 145000
      }
    ];

    setActuacionesExtraidas(muestra);
    setNombreArchivo('Muestra_Oficial_Diputacion_Cadiz.xlsx');
    setMotorDetectado('excel');
    setMensajeInfo('Se han cargado 8 actuaciones de muestra con la estructura de columnas exacta.');
  };

  // Procesar texto pegado
  const handleProcesarTextoManual = () => {
    if (!textoManual.trim()) return;
    const lineas = textoManual.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const matriz = lineas.map((l) => {
      if (l.includes('\t')) return l.split('\t');
      if (l.includes(';')) return l.split(';');
      if (l.includes('|')) return l.split('|').map((c) => c.trim());
      return l.split(',');
    });

    const parsed = parsearFilasTabulares(matriz, plan.ejercicio || 2026);
    if (parsed.length > 0) {
      setActuacionesExtraidas(parsed);
      setMotorDetectado('reglas_precisas');
      setMensajeInfo(`Se han procesado ${parsed.length} actuaciones a partir del texto pegado.`);
      setMostrarPegarTexto(false);
      setTextoManual('');
    } else {
      setError('No se pudieron reconocer las columnas en el texto pegado.');
    }
  };

  // Eliminar fila
  const handleEliminarFila = (id: string | undefined, idx: number) => {
    setActuacionesExtraidas((prev) => prev.filter((item, i) => (item.id ? item.id !== id : i !== idx)));
  };

  // Iniciar edición de una fila
  const handleIniciarEdicion = (act: ActuacionReconocidaPDF, idx: number) => {
    setFilaEditandoId(act.id || String(idx));
    setEditNumero(act.numero);
    setEditEELL(act.entidadLocal);
    setEditTitulo(act.titulo);
    setEditAppPres(act.aplicacionPresupuestaria);
    setEditImporte(act.subvencionSolicitada);
  };

  // Guardar edición
  const handleGuardarEdicion = (id: string | undefined, idx: number) => {
    setActuacionesExtraidas((prev) =>
      prev.map((item, i) => {
        const itemId = item.id || String(i);
        if (itemId === (id || String(idx))) {
          return {
            ...item,
            numero: editNumero.padStart(2, '0'),
            entidadLocal: editEELL,
            titulo: editTitulo,
            aplicacionPresupuestaria: editAppPres,
            subvencionSolicitada: Number(editImporte) || 0
          };
        }
        return item;
      })
    );
    setFilaEditandoId(null);
  };

  // Añadir fila manual vacía
  const handleAnadirFilaManual = () => {
    const siguienteNum = String(actuacionesExtraidas.length + 1).padStart(2, '0');
    const nuevaFila: ActuacionReconocidaPDF = {
      id: `manual-${Date.now()}`,
      numero: siguienteNum,
      entidadLocal: ENTIDADES_LOCALES_CADIZ[0] || 'Alcalá de los Gazules',
      titulo: `Nueva actuación municipal en ${ENTIDADES_LOCALES_CADIZ[0] || 'Alcalá de los Gazules'}`,
      aplicacionPresupuestaria: `${plan.ejercicio || 2026}-03-920-${46200 + actuacionesExtraidas.length}`,
      subvencionSolicitada: 150000
    };
    setActuacionesExtraidas((prev) => [...prev, nuevaFila]);
  };

  // DAR DE ALTA DEFINITIVA EN LA APP
  const handleConfirmarDarDeAlta = async () => {
    if (actuacionesExtraidas.length === 0) return;

    const altasCreadas = await guardarOperacion(() => {
    let altasCreadas = 0;
    const nuevasPrevistas: ActuacionEnPlan[] = [...(plan.actuacionesPrevistas || [])];

    actuacionesExtraidas.forEach((item, idx) => {
      // 1. Verificar si ya existe una actuación con ese número y plan
      const yaExiste = actuaciones.find(
        (a) =>
          (a.plan?.toLowerCase() === plan.nombre?.toLowerCase() ||
            (plan.codigo && a.plan?.toLowerCase() === plan.codigo?.toLowerCase())) &&
          a.numero === item.numero
      );

      const eellNombreLimpio = limpiarNombreEELL(item.entidadLocal) || 'Diputación de Cádiz';

      if (!yaExiste) {
        // Crear la actuación oficial en la base de datos de la app
        const nueva = crearNuevaActuacion({
          numero: item.numero,
          plan: plan.nombre,
          entidadLocal: eellNombreLimpio,
          titulo: item.titulo,
          aplicacionPresupuestaria: item.aplicacionPresupuestaria || `${plan.ejercicio || 2026}-03-920-${46200 + idx}`,
          plazos: {
            plazoEjecucion: plan.plazoEjecucionMaximo,
            plazoJustificacion: plan.plazoJustificacionMaximo,
            plazoEjecucionAmpliado: plan.plazoEjecucionAmpliado || plan.plazoEjecucionMaximo,
            plazoJustificacionAmpliado: plan.plazoJustificacionAmpliado || plan.plazoJustificacionMaximo
          },
          importes: {
            importeActuacion: Math.round((item.subvencionSolicitada || 150000) * 1.10 * 100) / 100,
            importeConcesion: item.subvencionSolicitada || 150000,
            importeAdjudicacion: item.subvencionSolicitada || 150000
          }
        });

        nuevasPrevistas.push({
          id: `alta-ia-${Date.now()}-${idx}`,
          numero: item.numero,
          entidadLocal: item.entidadLocal,
          titulo: item.titulo,
          aplicacionPresupuestaria: item.aplicacionPresupuestaria,
          subvencionSolicitada: item.subvencionSolicitada,
          actuacionGeneradaId: nueva.id
        });

        altasCreadas++;
      } else {
        // Si ya existía, asegurarse de que está en las previstas del plan
        const yaEnPrevistas = nuevasPrevistas.some((p) => p.numero === item.numero);
        if (!yaEnPrevistas) {
          nuevasPrevistas.push({
            id: `alta-ia-${Date.now()}-${idx}`,
            numero: item.numero,
            entidadLocal: item.entidadLocal,
            titulo: item.titulo,
            aplicacionPresupuestaria: item.aplicacionPresupuestaria,
            subvencionSolicitada: item.subvencionSolicitada,
            actuacionGeneradaId: yaExiste.id
          });
        }
      }
    });

    // Actualizar el plan con las nuevas actuaciones y entidades locales beneficiarias
    const eellList = Array.from(new Set(nuevasPrevistas.map((p) => p.entidadLocal)));
    const nuevoTotalPresupuesto = nuevasPrevistas.reduce(
      (acc, curr) => acc + (Number(curr.subvencionSolicitada) || 0),
      0
    );

    actualizarPlan({
      ...plan,
      actuacionesPrevistas: nuevasPrevistas,
      eellBeneficiarias: eellList,
      presupuestoTotal: nuevoTotalPresupuesto > 0 ? nuevoTotalPresupuesto : plan.presupuestoTotal
    });

    return altasCreadas;
    });

    if (onActuacionesCreadas) {
      onActuacionesCreadas(altasCreadas);
    }
    onCerrar();
  };

  const totalImporte = actuacionesExtraidas.reduce(
    (acc, a) => acc + (Number(a.subvencionSolicitada) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <EstadoGuardado />
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        {/* =========================================================================
            CABECERA DEL MODAL
            ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004F90]/10 text-[#004F90] flex items-center justify-center shrink-0 border border-[#004F90]/20">
              <Sparkles className="w-5 h-5 text-[#004F90]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Dar de Alta Actuaciones en el Plan con IA
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#004F90] border border-blue-200">
                  {plan.nombre}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Área de Desarrollo Local · Diputación Provincial de Cádiz
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            CUERPO DEL MODAL (SCROLLABLE)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* 1. Mapeo mandatorio oficial de columnas */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-slate-800 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#004F90] text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#004F90]" />
                Reglas Oficiales de Mapeo y Separación Automática por IA:
              </span>
              <span className="text-[10px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                100% Automático
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Columna 1</div>
                <div className="font-mono font-bold text-slate-800">Nº ACT.</div>
                <div className="text-[10px] text-blue-700 font-bold mt-1">➔ NÚMERO</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Columna 2</div>
                <div className="font-mono font-bold text-slate-800">ENTIDAD LOCAL</div>
                <div className="text-[10px] text-blue-700 font-bold mt-1">➔ EELL</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Columna 3</div>
                <div className="font-mono font-bold text-slate-800">ACTUACIÓN</div>
                <div className="text-[10px] text-blue-700 font-bold mt-1">➔ TÍTULO DE LA ACTUACIÓN</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Columna 4</div>
                <div className="font-mono font-bold text-slate-800">APLICACIÓN PRESUP.</div>
                <div className="text-[10px] text-blue-700 font-bold mt-1">➔ APLICACIÓN PRESUP.</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Columna 5</div>
                <div className="font-mono font-bold text-slate-800">SUBV. SOLICITADA</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1">➔ IMPORTE</div>
              </div>
            </div>
          </div>

          {/* 2. Zona de arrastrar o seleccionar archivo */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={handleDrop}
            onClick={() => inputArchivoRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              arrastrando
                ? 'border-[#004F90] bg-blue-50/50'
                : 'border-slate-300 hover:border-[#004F90] bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={inputArchivoRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.pdf,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-[#004F90]">
              {procesando ? (
                <RefreshCw className="w-6 h-6 animate-spin text-[#004F90]" />
              ) : (
                <Upload className="w-6 h-6 text-[#004F90]" />
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                {procesando
                  ? 'Procesando y extrayendo actuaciones con IA...'
                  : nombreArchivo
                  ? `Archivo seleccionado: ${nombreArchivo}`
                  : 'Arrastra aquí tu archivo o pulsa para seleccionarlo'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos compatibles: Excel (<strong>.xlsx</strong>, <strong>.xls</strong>), CSV (<strong>.csv</strong>) o documento PDF oficial (<strong>.pdf</strong>)
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => descargarPlantillaExcelActuaciones(plan.nombre)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs"
                title="Descargar plantilla de Excel con las 5 columnas"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Descargar Plantilla Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => descargarPlantillaCSVActuaciones(plan.nombre)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs"
                title="Descargar plantilla en CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Descargar Plantilla CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCargarMuestraCadiz}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#004F90] text-xs font-bold transition shadow-2xs"
                title="Cargar 8 actuaciones de muestra de la provincia de Cádiz"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#004F90]" />
                <span>Cargar Muestra Oficial (Cádiz)</span>
              </button>

              <button
                type="button"
                onClick={() => setMostrarPegarTexto(!mostrarPegarTexto)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs"
                title="Pegar texto o tabla manualmente"
              >
                <ClipboardCopy className="w-3.5 h-3.5 text-slate-500" />
                <span>{mostrarPegarTexto ? 'Ocultar Pegar Texto' : 'Pegar Texto / Tabla'}</span>
              </button>
            </div>
          </div>

          {/* Cuadro desplegable para pegar texto o tabla */}
          {mostrarPegarTexto && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="text-[11px] font-bold text-slate-700 uppercase block">
                Pegar tabla copiada desde Excel, Word o texto separado por tabulaciones / punto y coma:
              </label>
              <textarea
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                rows={5}
                placeholder="01&#9;Grazalema&#9;Rehabilitación centro cultural&#9;2026-03-920-46200&#9;160.000 €&#10;02&#9;Vejer de la Frontera&#9;Mejora viales&#9;2026-03-920-46201&#9;200.000 €"
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800 focus:outline-hidden focus:border-[#004F90]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarPegarTexto(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcesarTextoManual}
                  className="px-4 py-1.5 rounded-lg bg-[#004F90] text-white font-bold text-xs shadow-2xs"
                >
                  Procesar Tabla Pegada
                </button>
              </div>
            </div>
          )}

          {/* Avisos de información o error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mensajeInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mensajeInfo}</span>
              </div>
              {motorDetectado && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                  Motor: {motorDetectado}
                </span>
              )}
            </div>
          )}

          {/* =========================================================================
              3. TABLA DE PREVISUALIZACIÓN DE ACTUACIONES EXTRAÍDAS
              ========================================================================= */}
          {actuacionesExtraidas.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Actuaciones Reconocidas ({actuacionesExtraidas.length})
                  </h3>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    Total: {formatearMoneda(totalImporte)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAnadirFilaManual}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#004F90]" />
                    <span>Añadir fila</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActuacionesExtraidas([])}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-rose-600 text-xs font-bold transition shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Limpiar todo</span>
                  </button>
                </div>
              </div>

              {/* Contenedor de la tabla */}
              <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-2xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-16">NÚMERO</th>
                      <th className="py-2.5 px-3 w-44">EELL</th>
                      <th className="py-2.5 px-3">TÍTULO DE LA ACTUACIÓN</th>
                      <th className="py-2.5 px-3 w-40">APLICACIÓN PRESUPUESTARIA</th>
                      <th className="py-2.5 px-3 w-32 text-right">IMPORTE</th>
                      <th className="py-2.5 px-3 w-20 text-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actuacionesExtraidas.map((act, idx) => {
                      const editandoEsta = filaEditandoId === (act.id || String(idx));

                      if (editandoEsta) {
                        return (
                          <tr key={act.id || idx} className="bg-blue-50/40">
                            <td className="p-2">
                              <input
                                type="text"
                                value={editNumero}
                                onChange={(e) => setEditNumero(e.target.value)}
                                className="w-full p-1 rounded border border-slate-300 font-mono text-center font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={editEELL}
                                onChange={(e) => setEditEELL(e.target.value)}
                                className="w-full p-1 rounded border border-slate-300 font-bold text-xs"
                              >
                                {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                                  <option key={mun} value={mun}>{mun}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editTitulo}
                                onChange={(e) => setEditTitulo(e.target.value)}
                                className="w-full p-1 rounded border border-slate-300 font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editAppPres}
                                onChange={(e) => setEditAppPres(e.target.value)}
                                className="w-full p-1 rounded border border-slate-300 font-mono text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={editImporte}
                                onChange={(e) => setEditImporte(parseFloat(e.target.value) || 0)}
                                className="w-full p-1 rounded border border-slate-300 font-mono text-right font-bold"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleGuardarEdicion(act.id, idx)}
                                className="p-1 rounded bg-[#004F90] text-white hover:bg-[#003B71]"
                                title="Guardar cambios"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={act.id || idx} className="hover:bg-slate-50/80 transition">
                          {/* 1. NÚMERO */}
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            <span className="w-7 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                              {act.numero}
                            </span>
                          </td>

                          {/* 2. EELL */}
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#004F90] shrink-0" />
                              <span className="truncate">{act.entidadLocal}</span>
                            </div>
                          </td>

                          {/* 3. TÍTULO DE LA ACTUACIÓN */}
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {act.titulo}
                          </td>

                          {/* 4. APLICACIÓN PRESUPUESTARIA */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#004F90] font-bold">
                            {act.aplicacionPresupuestaria}
                          </td>

                          {/* 5. IMPORTE */}
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-right">
                            {formatearMoneda(act.subvencionSolicitada)}
                          </td>

                          {/* ACCIONES */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleIniciarEdicion(act, idx)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                title="Editar fila"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarFila(act.id, idx)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            PIE DEL MODAL CON ACCIONES
            ========================================================================= */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="text-xs text-slate-500">
            {actuacionesExtraidas.length > 0 ? (
              <span>
                Se darán de alta <strong>{actuacionesExtraidas.length} actuaciones</strong> en el{' '}
                <strong>{plan.nombre}</strong> con sus expedientes y expedición Base 14.
              </span>
            ) : (
              <span>Sube un archivo Excel, CSV o PDF para comenzar la extracción con IA.</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={actuacionesExtraidas.length === 0 || procesando}
              onClick={() => { void handleConfirmarDarDeAlta().catch(() => {}); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition active:scale-[0.98] ${
                actuacionesExtraidas.length > 0 && !procesando
                  ? 'bg-[#004F90] hover:bg-[#003B71] text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Dar de Alta {actuacionesExtraidas.length > 0 ? `(${actuacionesExtraidas.length}) Actuaciones` : ''} en el Plan
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
