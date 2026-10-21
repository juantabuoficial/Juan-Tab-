import { EstadoGuardado } from './EstadoGuardado';
import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Euro,
  Building2,
  FolderKanban,
  Search,
  ChevronRight,
  ChevronDown,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck2,
  ExternalLink,
  Edit,
  Sparkles,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PlanSubvencion, Actuacion, ActuacionEnPlan } from '../types';
import { formatearMoneda, formatearFecha } from '../utils/pdfExport';
import { ENTIDADES_LOCALES_CADIZ } from '../utils/pdfPlanParser';
import { obtenerAlertaJustificacion } from '../utils/plazosAlertas';
import { EditarPlanModal } from './EditarPlanModal';
import { ModalAltaActuacionesPlan } from './ModalAltaActuacionesPlan';
import { limpiarNombreEELL } from '../utils/eellUtils';

interface PlanDetalleViewProps {
  plan: PlanSubvencion;
  onVolver: () => void;
  onAbrirActuacion: (actuacionId: string) => void;
}

interface ItemActuacion {
  id: string;
  planActuacionId?: string;
  numero: string;
  entidadLocal: string;
  titulo: string;
  aplicacionPresupuestaria: string;
  importe: number;
  plazoEjecucion?: string;
  plazoJustificacion?: string;
  dadaDeAlta: boolean;
}

interface GrupoEELL {
  numeroEELL: number;
  eell: string;
  actuaciones: ItemActuacion[];
  importeTotal: number;
}

/**
 * Extrae el número identificador de la EELL a partir del prefijo de sus actuaciones.
 * Si las actuaciones son 1.1 y 1.2 -> ese municipio es el 1
 * Si las actuaciones son 2.1, 2.2 -> esa EELL es el 2
 * y así sucesivamente.
 */
function extraerNumeroDeActuacionesEELL(actuaciones: ItemActuacion[]): number | null {
  // 1. Prioridad: Buscar formato con punto o separador (ej: 1.1, 1.2, 01.1, 2.1, 2.2, 10.1...)
  for (const act of actuaciones) {
    if (!act.numero) continue;
    const str = String(act.numero).trim();
    const matchDotted = str.match(/^(\d+)[.\-_/]\d+/);
    if (matchDotted) {
      const val = parseInt(matchDotted[1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // 2. Segunda prioridad: número entero simple (ej: 1, 01, 2, 02...)
  for (const act of actuaciones) {
    if (!act.numero) continue;
    const str = String(act.numero).trim();
    const matchSimple = str.match(/^(\d+)/);
    if (matchSimple) {
      const val = parseInt(matchSimple[1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  return null;
}

const formatearNombreEELL = (nombre: string): string => {
  return limpiarNombreEELL(nombre);
};

export const PlanDetalleView: React.FC<PlanDetalleViewProps> = ({
  plan,
  onVolver,
  onAbrirActuacion
}) => {
  const { guardarOperacion,
    actuaciones,
    editarActuacionDePlan,
    actualizarPlan,
    crearNuevaActuacion,
    planes,
    usuarioActual,
    abrirModalPapelera,
    planesPapelera
  } = useApp();

  const esAdmin =
    usuarioActual?.rol === 'administrador' ||
    usuarioActual?.rol === 'jefe_servicio' ||
    !!usuarioActual?.permisos?.puedeEditarPlanes;

  // Estado para EELL seleccionada (si null, muestra todos los municipios; si seleccionada, entra en ese municipio)
  const [eellSeleccionada, setEellSeleccionada] = useState<string | null>(null);

  // Buscador por EELL, Nombre de actuación, palabra del título o importes
  const [busqueda, setBusqueda] = useState('');

  // Estado para modal de editar el plan completo
  const [modalEditarPlanAbierto, setModalEditarPlanAbierto] = useState(false);
  // Estado para modal de dar de alta actuaciones mediante subida de archivos con IA
  const [modalAltaActuacionesAbierto, setModalAltaActuacionesAbierto] = useState(false);

  // Mensaje temporal de éxito
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estados para modal de editar/modificar actuación
  const [actuacionEditando, setActuacionEditando] = useState<ItemActuacion | null>(null);
  const [formEditNumero, setFormEditNumero] = useState('');
  const [formEditTitulo, setFormEditTitulo] = useState('');
  const [formEditPartida, setFormEditPartida] = useState('');
  const [formEditImporte, setFormEditImporte] = useState<number>(0);
  const [formEditEELL, setFormEditEELL] = useState('');

  // 1. Obtener todas las actuaciones vinculadas a este plan
  const planActual = useMemo(() => {
    return planes.find((p) => p.id === plan.id) || plan;
  }, [planes, plan]);

  const listaActuacionesPlan: ItemActuacion[] = useMemo(() => {
    const nombrePlanLower = (planActual.nombre || '').toLowerCase();
    const codigoPlanLower = (planActual.codigo || '').toLowerCase();

    const vinculadasDb = actuaciones.filter((a) => {
      const aPlanLower = (a.plan || '').toLowerCase();
      return (
        (nombrePlanLower && aPlanLower.includes(nombrePlanLower)) ||
        (codigoPlanLower && aPlanLower.includes(codigoPlanLower))
      );
    });

    // Mapa de actuaciones por ID o por número + EELL para combinar con previstas
    const dbMap = new Map<string, Actuacion>();
    actuaciones.forEach((a) => {
      dbMap.set(a.id, a);
      if (a.entidadLocal && a.numero) {
        dbMap.set(`${a.entidadLocal}_${a.numero}`, a);
        const eellLimpia = a.entidadLocal
          .replace(/^(ayuntamiento\s+de\s+|ayuntamiento\s+del\s+|ayto\.\s+de\s+|ayto\s+de\s+|diputación\s+de\s+)/i, '')
          .trim();
        dbMap.set(`${eellLimpia}_${a.numero}`, a);
      }
    });

    // Partir de las previstas en el plan si existen
    if (planActual.actuacionesPrevistas && planActual.actuacionesPrevistas.length > 0) {
      return planActual.actuacionesPrevistas.map((prevista, idx) => {
        const eellLimpia = (prevista.entidadLocal || 'Diputación de Cádiz')
          .replace(/^(ayuntamiento\s+de\s+|ayuntamiento\s+del\s+|ayto\.\s+de\s+|ayto\s+de\s+|diputación\s+de\s+)/i, '')
          .trim();

        const coincidenciaDb =
          (prevista.actuacionGeneradaId && dbMap.get(prevista.actuacionGeneradaId)) ||
          dbMap.get(`${prevista.entidadLocal}_${prevista.numero}`) ||
          dbMap.get(`${eellLimpia}_${prevista.numero}`) ||
          vinculadasDb.find((a) => a.numero === prevista.numero);

        return {
          id: coincidenciaDb ? coincidenciaDb.id : (prevista.actuacionGeneradaId || prevista.id || `act-p-${idx}`),
          planActuacionId: prevista.id,
          numero: coincidenciaDb ? coincidenciaDb.numero : (prevista.numero || String(idx + 1).padStart(2, '0')),
          entidadLocal: coincidenciaDb ? coincidenciaDb.entidadLocal : (prevista.entidadLocal || 'Entidad Local'),
          titulo: coincidenciaDb ? coincidenciaDb.titulo : (prevista.titulo || 'Actuación municipal'),
          aplicacionPresupuestaria:
            (coincidenciaDb && coincidenciaDb.aplicacionPresupuestaria) ||
            prevista.aplicacionPresupuestaria ||
            `${planActual.ejercicio || 2026}-03-920-${46200 + idx}`,
          importe: coincidenciaDb
            ? (coincidenciaDb.importes?.importeConcesion || coincidenciaDb.importes?.importeActuacion || prevista.subvencionSolicitada || 150000)
            : (prevista.subvencionSolicitada || 150000),
          plazoEjecucion: coincidenciaDb?.plazos?.plazoEjecucion || prevista.plazoEjecucion || planActual.plazoEjecucionMaximo,
          plazoJustificacion: coincidenciaDb?.plazos?.plazoJustificacion || prevista.plazoJustificacion || planActual.plazoJustificacionMaximo,
          dadaDeAlta: !!coincidenciaDb
        };
      });
    }

    // Si no tiene array de previstas pero tiene actuaciones en base de datos
    if (vinculadasDb.length > 0) {
      return vinculadasDb.map((a) => ({
        id: a.id,
        numero: a.numero || '01',
        entidadLocal: a.entidadLocal || 'Entidad Local',
        titulo: a.titulo || 'Actuación municipal',
        aplicacionPresupuestaria: a.aplicacionPresupuestaria || '',
        importe: a.importes?.importeConcesion || a.importes?.importeActuacion || 0,
        plazoEjecucion: a.plazos?.plazoEjecucion || planActual.plazoEjecucionMaximo,
        plazoJustificacion: a.plazos?.plazoJustificacion || planActual.plazoJustificacionMaximo,
        dadaDeAlta: true
      }));
    }

    // Si el plan no tiene previstas ni en BD, auto-rellenar con las EELL del plan o muestra oficial de Cádiz
    const listaEELLBase =
      planActual.eellBeneficiarias && planActual.eellBeneficiarias.length > 0
        ? planActual.eellBeneficiarias
        : [
            'Grazalema',
            'Vejer de la Frontera',
            'Ubrique',
            'Barbate',
            'Tarifa',
            'Arcos de la Frontera',
            'Medina Sidonia',
            'Olvera',
            'Alcalá de los Gazules',
            'Benalup-Casas Viejas'
          ];

    const ej = planActual.ejercicio || 2026;
    const ptoMedio = planActual.presupuestoTotal > 0 ? Math.round(planActual.presupuestoTotal / listaEELLBase.length) : 160000;

    return listaEELLBase.map((eell, idx) => ({
      id: `act-gen-${planActual.id || 'plan'}-${idx + 1}`,
      planActuacionId: `act-prev-${planActual.id || 'plan'}-${idx + 1}`,
      numero: `${idx + 1}.1`,
      entidadLocal: eell,
      titulo: `Inversión y acondicionamiento de infraestructuras municipales en ${eell}`,
      aplicacionPresupuestaria: `${ej}-03-920-${46200 + idx}`,
      importe: ptoMedio > 0 ? ptoMedio : 150000,
      plazoEjecucion: planActual.plazoEjecucionMaximo,
      plazoJustificacion: planActual.plazoJustificacionMaximo,
      dadaDeAlta: false
    }));
  }, [actuaciones, planActual]);



  // 2. Agrupación por EELL (Municipios y ELAs beneficiarios)
  // Numerada del 1 al N: si las actuaciones son 1.1 y 1.2 -> es el municipio 1; si son 2.1, 2.2 -> es el municipio 2...
  const eellAgrupadas = useMemo((): GrupoEELL[] => {
    const mapa = new Map<
      string,
      { eell: string; actuaciones: ItemActuacion[]; importeTotal: number; primerIndice: number }
    >();
    let contadorAparicion = 0;

    listaActuacionesPlan.forEach((act) => {
      const eellNombre = formatearNombreEELL(act.entidadLocal || 'Entidad Local');
      if (!mapa.has(eellNombre)) {
        mapa.set(eellNombre, {
          eell: eellNombre,
          actuaciones: [],
          importeTotal: 0,
          primerIndice: contadorAparicion++
        });
      }
      const entry = mapa.get(eellNombre)!;
      entry.actuaciones.push(act);
      entry.importeTotal += Number(act.importe) || 0;
    });

    // Ordenar las actuaciones dentro de cada municipio de forma natural (1.1, 1.2, 1.3...)
    mapa.forEach((entry) => {
      entry.actuaciones.sort((a, b) =>
        String(a.numero || '').localeCompare(String(b.numero || ''), undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      );
    });

    const grupos = Array.from(mapa.values());

    // Ordenar los municipios según el número de EELL identificado a partir de sus actuaciones (1.1 -> 1, 2.1 -> 2...)
    grupos.sort((a, b) => {
      const numA = extraerNumeroDeActuacionesEELL(a.actuaciones);
      const numB = extraerNumeroDeActuacionesEELL(b.actuaciones);

      if (numA !== null && numB !== null) {
        if (numA !== numB) return numA - numB;
        return a.primerIndice - b.primerIndice;
      }
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return a.primerIndice - b.primerIndice;
    });

    // Asignar el número de EELL (del 1 al ...)
    // Si la actuación es 1.1 y 1.2 -> número 1, si 2.1 y 2.2 -> número 2, etc.
    return grupos.map((g, idx) => {
      const numDetectado = extraerNumeroDeActuacionesEELL(g.actuaciones);
      const numeroEELL = numDetectado !== null ? numDetectado : idx + 1;
      return {
        numeroEELL,
        eell: g.eell,
        actuaciones: g.actuaciones,
        importeTotal: g.importeTotal
      };
    });
  }, [listaActuacionesPlan]);

  // 3. Filtrado por buscador: permite utilizar todas las palabras que quieras (búsqueda multi-palabra)
  // Cada palabra introducida se verifica en el conjunto de información de la actuación (título, EELL, número, partida, importe)
  const eellFiltradas = useMemo((): GrupoEELL[] => {
    if (!busqueda.trim()) return eellAgrupadas;

    // Extraer todas las palabras independientes introducidas por el usuario
    const palabras = busqueda
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);

    if (palabras.length === 0) return eellAgrupadas;

    return eellAgrupadas
      .map((grupo) => {
        const textoEELL = `
          ${grupo.eell || ''}
          eell ${grupo.numeroEELL}
          nº ${grupo.numeroEELL}
          municipio ${grupo.numeroEELL}
          ${grupo.numeroEELL}
        `.toLowerCase();

        // Comprobar si TODAS las palabras buscadas coinciden exclusivamente con la Entidad Local
        const todasCoincidenConEELL = palabras.every((palabra) => textoEELL.includes(palabra));

        // Filtrar las actuaciones donde CADA UNA de las palabras buscadas está presente
        // en el conjunto de información de la actuación o de su municipio
        const actuacionesQueCoinciden = grupo.actuaciones.filter((act) => {
          const imp = Number(act.importe) || 0;
          const impFormateado = formatearMoneda(imp).toLowerCase();
          const textoActuacion = `
            ${grupo.eell || ''}
            ${grupo.numeroEELL}
            ${act.numero || ''}
            actuacion ${act.numero || ''}
            ${act.titulo || ''}
            ${act.aplicacionPresupuestaria || ''}
            ${imp}
            ${impFormateado}
            ${act.plazoEjecucion || ''}
            ${act.plazoJustificacion || ''}
          `.toLowerCase();

          return palabras.every((palabra) => {
            // Comprobación directa de subcadena
            if (textoActuacion.includes(palabra)) return true;

            // Comprobación numérica flexible para importes (ej: "150000" o "150.000" o "150000€")
            const numLimpio = parseFloat(palabra.replace(/\./g, '').replace(/,/g, '.').replace(/€/g, ''));
            if (!isNaN(numLimpio) && Math.abs(imp - numLimpio) < 1) {
              return true;
            }

            return false;
          });
        });

        // Si todas las palabras coincidían con la EELL completa, se muestra la EELL con todas sus actuaciones
        if (todasCoincidenConEELL && actuacionesQueCoinciden.length === 0) {
          return grupo;
        }

        // Si hay actuaciones específicas que cumplen todas las palabras, se muestran esas actuaciones
        if (actuacionesQueCoinciden.length > 0) {
          return {
            ...grupo,
            actuaciones: actuacionesQueCoinciden,
            importeTotal: actuacionesQueCoinciden.reduce((acc, a) => acc + (Number(a.importe) || 0), 0)
          };
        }

        return null;
      })
      .filter((g): g is GrupoEELL => g !== null);
  }, [eellAgrupadas, busqueda]);

  // Actuaciones pendientes de dar de alta en la base de datos
  const actuacionesPendientesAlta = useMemo(() => {
    return listaActuacionesPlan.filter((a) => !a.dadaDeAlta);
  }, [listaActuacionesPlan]);

  // Dar de alta TODAS las actuaciones del plan en la base de datos de una sola vez
  const handleDarDeAltaTodasLasActuaciones = async () => {
    const creadas = await guardarOperacion(() => {
    let creadas = 0;
    const nuevasPrevistas: ActuacionEnPlan[] = [];

    listaActuacionesPlan.forEach((item, idx) => {
      // Comprobar si ya existe la actuación en la base de datos
      const yaExiste = actuaciones.find(
        (a) =>
          a.id === item.id ||
          ((a.plan?.toLowerCase() === planActual.nombre?.toLowerCase() ||
            (planActual.codigo && a.plan?.toLowerCase() === planActual.codigo?.toLowerCase())) &&
           a.numero === item.numero)
      );

      if (yaExiste) {
        nuevasPrevistas.push({
          id: item.planActuacionId || item.id,
          numero: item.numero,
          entidadLocal: item.entidadLocal,
          titulo: item.titulo,
          aplicacionPresupuestaria: item.aplicacionPresupuestaria,
          subvencionSolicitada: item.importe,
          actuacionGeneradaId: yaExiste.id
        });
      } else {
        const eellNombreLimpio = formatearNombreEELL(item.entidadLocal || 'Diputación de Cádiz');

        const nueva = crearNuevaActuacion({
          numero: item.numero,
          plan: planActual.nombre,
          entidadLocal: eellNombreLimpio,
          titulo: item.titulo,
          aplicacionPresupuestaria: item.aplicacionPresupuestaria || `${planActual.ejercicio || 2026}-03-920-${46200 + idx}`,
          plazos: {
            plazoEjecucion: item.plazoEjecucion || planActual.plazoEjecucionMaximo,
            plazoJustificacion: item.plazoJustificacion || planActual.plazoJustificacionMaximo,
            plazoEjecucionAmpliado: planActual.plazoEjecucionAmpliado || planActual.plazoEjecucionMaximo,
            plazoJustificacionAmpliado: planActual.plazoJustificacionAmpliado || planActual.plazoJustificacionMaximo
          },
          importes: {
            importeActuacion: Math.round((item.importe || 150000) * 1.10 * 100) / 100,
            importeConcesion: item.importe || 150000,
            importeAdjudicacion: item.importe || 150000
          }
        });

        nuevasPrevistas.push({
          id: item.planActuacionId || item.id,
          numero: item.numero,
          entidadLocal: item.entidadLocal,
          titulo: item.titulo,
          aplicacionPresupuestaria: item.aplicacionPresupuestaria,
          subvencionSolicitada: item.importe,
          actuacionGeneradaId: nueva.id
        });
        creadas++;
      }
    });

    const eellList = Array.from(new Set(listaActuacionesPlan.map((a) => a.entidadLocal)));
    actualizarPlan({
      ...planActual,
      actuacionesPrevistas: nuevasPrevistas,
      eellBeneficiarias: eellList
    });

    return creadas;
    });
    setMensajeExito(
      creadas > 0
        ? `Se han dado de alta ${creadas} actuaciones del ${planActual.nombre} correctamente.`
        : `Todas las ${listaActuacionesPlan.length} actuaciones ya están dadas de alta en el sistema.`
    );
    setTimeout(() => setMensajeExito(null), 5000);
  };

  // Entrar a revisar la actuación (si es prevista y aún no existe en actuaciones, se da de alta automáticamente)
  const handleRevisarActuacion = async (actItem: ItemActuacion) => {
    // 1. Buscar si ya existe la actuación en la base de datos por ID
    let actEncontrada = actuaciones.find((a) => a.id === actItem.id);

    // 2. Si no coincide por ID directo, buscar por coincidencia de plan + número o ID de plan
    if (!actEncontrada) {
      actEncontrada = actuaciones.find(
        (a) =>
          (a.plan?.toLowerCase() === planActual.nombre?.toLowerCase() ||
           (planActual.codigo && a.plan?.toLowerCase() === planActual.codigo?.toLowerCase())) &&
          (a.numero === actItem.numero || a.id === actItem.planActuacionId)
      );
    }

    // 3. Si existe, abrir directamente
    if (actEncontrada) {
      onAbrirActuacion(actEncontrada.id);
      return;
    }

    // 4. Si es una actuación prevista que todavía no se ha materializado en actuaciones,
    // la creamos de inmediato con todos los documentos oficiales Base 14
    const eellNombreLimpio = formatearNombreEELL(actItem.entidadLocal || 'Diputación de Cádiz');

    const nuevaAct = await guardarOperacion(() => {
    const nuevaAct = crearNuevaActuacion({
      numero: actItem.numero,
      plan: planActual.nombre,
      entidadLocal: eellNombreLimpio,
      titulo: actItem.titulo,
      aplicacionPresupuestaria: actItem.aplicacionPresupuestaria || '',
      plazos: {
        plazoEjecucion: actItem.plazoEjecucion || planActual.plazoEjecucionMaximo,
        plazoJustificacion: actItem.plazoJustificacion || planActual.plazoJustificacionMaximo,
        plazoEjecucionAmpliado: planActual.plazoEjecucionAmpliado || planActual.plazoEjecucionMaximo,
        plazoJustificacionAmpliado: planActual.plazoJustificacionAmpliado || planActual.plazoJustificacionMaximo
      },
      importes: {
        importeActuacion: Math.round((actItem.importe || 100000) * 1.15 * 100) / 100,
        importeConcesion: actItem.importe || 100000,
        importeAdjudicacion: actItem.importe || 100000
      }
    });

    // Actualizar el plan para vincular el ID generado
    if (actItem.planActuacionId) {
      const planActualizado = {
        ...planActual,
        actuacionesPrevistas: (planActual.actuacionesPrevistas || []).map((prev) =>
          prev.id === actItem.planActuacionId ? { ...prev, actuacionGeneradaId: nuevaAct.id } : prev
        )
      };
      actualizarPlan(planActualizado);
    }

    return nuevaAct;
    });

    // Entrar directamente en la actuación recién creada
    onAbrirActuacion(nuevaAct.id);
  };

  // Abrir modal de editar actuación
  const handleAbrirEditarActuacion = (act: ItemActuacion) => {
    setActuacionEditando(act);
    setFormEditNumero(act.numero);
    setFormEditTitulo(act.titulo);
    setFormEditPartida(act.aplicacionPresupuestaria);
    setFormEditImporte(act.importe);
    setFormEditEELL(act.entidadLocal);
  };

  // Guardar cambios en la actuación
  const handleGuardarModificacion = async () => {
    if (!actuacionEditando) return;

    const datosNuevos = {
      numero: formEditNumero.trim() || actuacionEditando.numero,
      titulo: formEditTitulo.trim() || actuacionEditando.titulo,
      aplicacionPresupuestaria: formEditPartida.trim(),
      subvencionSolicitada: Number(formEditImporte) || 0,
      entidadLocal: formEditEELL || actuacionEditando.entidadLocal
    };

    await guardarOperacion(() => {
      if (actuacionEditando.planActuacionId) {
        editarActuacionDePlan(planActual.id, actuacionEditando.planActuacionId, datosNuevos);
      } else {
        editarActuacionDePlan(planActual.id, actuacionEditando.id, datosNuevos);
      }
    });
    setActuacionEditando(null);
    setMensajeExito(`Actuación nº ${datosNuevos.numero} modificada correctamente.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // Datos de las métricas clave de la cabecera
  const tieneAmpEjecucion =
    planActual.plazoEjecucionAmpliado &&
    planActual.plazoEjecucionAmpliado !== planActual.plazoEjecucionMaximo;
  const tieneAmpJustificacion =
    planActual.plazoJustificacionAmpliado &&
    planActual.plazoJustificacionAmpliado !== planActual.plazoJustificacionMaximo;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <EstadoGuardado />
      {/* Mensaje de éxito temporal */}
      {mensajeExito && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* =========================================================================
          1. PRIMERO: NOMBRE DEL PLAN Y AL LADO SI ESTÁ VIGENTE + BOTÓN VOLVER
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs shrink-0"
            title="Regresar a la lista de planes"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Planes</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {planActual.nombre}
              </h1>
              {/* Al lado si está vigente */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  planActual.activo
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
              >
                {planActual.activo ? 'Vigente' : 'Cerrado'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Convocatoria Ejercicio {planActual.ejercicio} · Área de Desarrollo Local
            </span>
          </div>
        </div>

        {/* Botones de acción del plan */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          {/* Botón oficial: Dar de Alta Actuaciones mediante subida de archivos con IA */}
          <button
            type="button"
            onClick={() => setModalAltaActuacionesAbierto(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#004F90] border border-blue-200 text-xs font-black shadow-2xs transition active:scale-[0.98]"
            title="Subir archivo Excel, CSV o PDF para dar de alta actuaciones con IA (mapeo de Nº ACT, EELL, ACTUACIÓN, APLICACIÓN PRESUPUESTARIA y SUBVENCIÓN)"
          >
            <Sparkles className="w-4 h-4 text-[#004F90]" />
            <span>Alta con IA (Archivo)</span>
          </button>

          {/* Botón para dar de alta en firme todas las actuaciones pendientes de golpe */}
          {actuacionesPendientesAlta.length > 0 && (
            <button
              type="button"
              onClick={() => { void handleDarDeAltaTodasLasActuaciones().catch(() => {}); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-2xs transition active:scale-[0.98]"
              title="Dar de alta todas las actuaciones previstas del plan en la base de datos de la app"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Dar de Alta Todas ({actuacionesPendientesAlta.length})</span>
            </button>
          )}

          {/* Botón para editar el plan */}
          <button
            type="button"
            onClick={() => setModalEditarPlanAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-black shadow-2xs transition active:scale-[0.98]"
            title="Editar datos generales del plan, añadir actuaciones o modificar existentes"
          >
            <Edit className="w-4 h-4" />
            <span>Editar Plan</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. DEBAJO: IMPORTE TOTAL DEL PLAN, NÚMERO DE EELL, PLAZO MÁX. EJECUCIÓN
             Y PLAZO MÁXIMO DE JUSTIFICACIÓN
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Importe total del plan */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Importe Total del Plan
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-slate-900 mt-1">
            {formatearMoneda(planActual.presupuestoTotal)}
          </div>
        </div>

        {/* Número de EELL */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Número de EELL
          </span>
          <div className="text-lg sm:text-xl font-black text-[#004F90] mt-1">
            {eellAgrupadas.length}
          </div>
        </div>

        {/* Plazo máx. de ejecución */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Plazo Máx. de Ejecución
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm mt-1">
            <Calendar className="w-3.5 h-3.5 text-[#004F90] shrink-0" />
            <span>{formatearFecha(planActual.plazoEjecucionMaximo)}</span>
          </div>
          {tieneAmpEjecucion && (
            <span className="inline-block mt-1 text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              Ampliación: {formatearFecha(planActual.plazoEjecucionAmpliado)}
            </span>
          )}
        </div>

        {/* Plazo máximo de justificación */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Plazo Máx. de Justificación
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm mt-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{formatearFecha(planActual.plazoJustificacionMaximo)}</span>
          </div>
          {tieneAmpJustificacion && (
            <span className="inline-block mt-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Ampliación: {formatearFecha(planActual.plazoJustificacionAmpliado)}
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. DEBAJO: BUSCADOR POR EELL, NOMBRE DE ACTUACIÓN O PALABRA RELACIONADA
             CON EL TÍTULO E IMPORTES
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscador por EELL, nombre de actuación, palabra del título o importes (ej: Grazalema, reurbanización, 150000)..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 px-1"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Breadcrumb o aviso si hay EELL seleccionada */}
        {eellSeleccionada && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400">Filtrando por:</span>
              <span className="font-bold text-[#004F90] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 flex items-center gap-1.5 font-mono text-xs">
                {(() => {
                  const gActual = eellAgrupadas.find((g) => g.eell === eellSeleccionada);
                  return (
                    <>
                      <span className="font-black bg-blue-200/70 text-[#004F90] px-1.5 py-0.2 rounded text-[10px]">
                        {gActual ? gActual.numeroEELL : ''}
                      </span>
                      <span>{eellSeleccionada}</span>
                    </>
                  );
                })()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEellSeleccionada(null)}
              className="text-xs text-[#004F90] hover:underline font-bold"
            >
              Ver todos los municipios
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. DEBAJO: LISTADO DE MUNICIPIOS BENEFICIARIOS
             (con información de número de actuaciones e importe subvencionado a la EELL,
              y a la derecha botón para entrar a ver las actuaciones)
             Y UNA VEZ DENTRO: número, título, aplicación pptaria e importe, con botones
             revisar, editar o modificar esta actuación.
          ========================================================================= */}
      <div className="space-y-3">
        {eellFiltradas.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-slate-300 text-slate-500 text-xs space-y-3">
            <p className="font-medium text-slate-600">
              No se encontraron municipios o actuaciones{busqueda ? ' con los términos de búsqueda especificados.' : ' en este plan.'}
            </p>
            <div>
              <button
                type="button"
                onClick={() => setModalAltaActuacionesAbierto(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-black shadow-2xs transition active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Subir Archivo para Dar de Alta Actuaciones con IA</span>
              </button>
            </div>
          </div>
        ) : (
          eellFiltradas
            .filter((grupo) => !eellSeleccionada || grupo.eell === eellSeleccionada)
            .map((grupo) => {
              const estaAbierto = eellSeleccionada === grupo.eell || !!busqueda.trim();

              return (
                <div
                  key={grupo.eell}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition"
                >
                  {/* Fila del Municipio / EELL Beneficiaria: Solo número, sin 'actuaciones asignadas' y columna 'ACTUACIONES' con solo el número */}
                  <div className="p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50 hover:bg-slate-50 transition border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      {/* Indicador: Solo el número */}
                      <div
                        className="w-7 h-7 min-w-[28px] rounded-lg bg-blue-50 text-[#004F90] border border-blue-200 flex items-center justify-center font-mono font-black shrink-0 shadow-2xs"
                        title={`Municipio nº ${grupo.numeroEELL} - ${grupo.eell}`}
                      >
                        <span className="text-xs font-black tracking-tight text-[#004F90]">
                          {grupo.numeroEELL}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-black text-slate-900">
                            {grupo.eell}
                          </h2>
                          {grupo.actuaciones.some((a) => {
                            const f = a.plazoJustificacion || planActual.plazoJustificacionAmpliado || planActual.plazoJustificacionMaximo;
                            return obtenerAlertaJustificacion(f).esProximo30Dias;
                          }) && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold shadow-2xs"
                              title="Contiene actuaciones próximas a su fecha límite de justificación (< 30 días)"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Próx. Justificación</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                      {/* Información: Número de actuaciones (ACTUACIONES y debajo solo el número) */}
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          ACTUACIONES
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                          {grupo.actuaciones.length}
                        </span>
                      </div>

                      {/* Información: Importe subvencionado a la EELL para este plan */}
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Importe Subvencionado
                        </span>
                        <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                          {formatearMoneda(grupo.importeTotal)}
                        </span>
                      </div>

                      {/* Botón para entrar a ver las actuaciones */}
                      <button
                        type="button"
                        onClick={() => {
                          setEellSeleccionada(eellSeleccionada === grupo.eell ? null : grupo.eell);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
                          estaAbierto
                            ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                            : 'bg-[#004F90] hover:bg-[#003B71] text-white'
                        }`}
                        title={`Entrar a ver las actuaciones de ${grupo.eell} (${grupo.numeroEELL})`}
                      >
                        <span>{estaAbierto ? 'Ocultar' : 'Ver actuaciones'}</span>
                        {estaAbierto ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* =========================================================================
                      5. UNA VEZ DENTRO: NÚMERO DE ACTUACIÓN, TÍTULO, APLICACIÓN PREPUESTARIA
                         E IMPORTE. CON BOTONES PARA REVISAR, EDITAR O MODIFICAR.
                      ========================================================================= */}
                  {estaAbierto && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {grupo.actuaciones.map((act, actIdx) => {
                        const fechaJust = act.plazoJustificacion || planActual.plazoJustificacionAmpliado || planActual.plazoJustificacionMaximo;
                        const alerta = obtenerAlertaJustificacion(fechaJust);

                        return (
                          <div
                            key={`${act.id}-${actIdx}`}
                            className={`p-3.5 sm:px-5 sm:py-3 hover:bg-blue-50/20 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                              alerta.esProximo30Dias ? 'bg-amber-50/25' : ''
                            }`}
                          >
                            {/* Número, Título y Partida */}
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <span
                                className="w-8 h-8 rounded-lg bg-slate-100 font-mono font-black text-slate-700 text-xs flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs"
                                title={`Actuación nº ${act.numero} · EELL nº ${grupo.numeroEELL}`}
                              >
                                {act.numero}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div
                                    onClick={() => { void handleRevisarActuacion(act).catch(() => {}); }}
                                    className="text-slate-900 font-bold text-xs sm:text-sm leading-snug cursor-pointer hover:text-[#004F90] transition"
                                    title="Entrar a revisar esta actuación"
                                  >
                                    {act.titulo}
                                  </div>

                                  {/* Alerta visual de fecha límite de justificación en los próximos 30 días */}
                                  {alerta.esProximo30Dias && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs shrink-0 ${
                                        alerta.esMuyUrgente
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                      title={alerta.mensaje}
                                    >
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Límite Justificación: {alerta.badgeTexto} ({formatearFecha(alerta.fechaLimite)})</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="font-mono text-[11px] text-slate-500">
                                    Partida: <strong className="text-[#004F90]">{act.aplicacionPresupuestaria || 'Sin asignar'}</strong>
                                  </span>
                                  {act.plazoEjecucion && (
                                    <span className="text-[10px] text-slate-400">
                                      · Plazo Ejecución: {formatearFecha(act.plazoEjecucion)}
                                    </span>
                                  )}
                                  {fechaJust && !alerta.esProximo30Dias && (
                                    <span className="text-[10px] text-slate-400">
                                      · Plazo Justificación: {formatearFecha(fechaJust)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                          {/* Importe + Botones Revisar / Editar */}
                          <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pt-1 md:pt-0">
                            {/* Importe de la actuación formateado en miles con puntos y 2 decimales */}
                            <div className="text-left sm:text-right mr-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Subvención
                              </span>
                              <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                                {formatearMoneda(act.importe)}
                              </span>
                            </div>

                            {/* Botón Editar o Modificar */}
                            <button
                              type="button"
                              onClick={() => handleAbrirEditarActuacion(act)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs"
                              title="Editar o modificar los datos de esta actuación"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Editar</span>
                            </button>

                            {/* Botón Revisar (Revisión técnica Base 14 - permite entrar en la actuación) */}
                            <button
                              type="button"
                              onClick={() => { void handleRevisarActuacion(act).catch(() => {}); }}
                              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-black shadow-2xs transition active:scale-[0.98]"
                              title="Entrar a la actuación y revisar sus documentos técnicos Base 14"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Revisar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* =========================================================================
          MODAL PARA EDITAR O MODIFICAR LA ACTUACIÓN
          ========================================================================= */}
      {actuacionEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#004F90]" />
                <h3 className="text-base font-black text-slate-900">
                  Modificar Actuación
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActuacionEditando(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Entidad Local */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Municipio / Entidad Local
                </label>
                <select
                  value={formEditEELL}
                  onChange={(e) => setFormEditEELL(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold text-[#004F90] text-xs focus:outline-hidden focus:border-[#004F90]"
                >
                  {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                    <option key={mun} value={mun}>{mun}</option>
                  ))}
                </select>
              </div>

              {/* Número y Partida */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formEditNumero}
                    onChange={(e) => setFormEditNumero(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-700 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Aplicación Presupuestaria
                  </label>
                  <input
                    type="text"
                    value={formEditPartida}
                    onChange={(e) => setFormEditPartida(e.target.value)}
                    placeholder="2026-03-920-46200"
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-700 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                </div>
              </div>

              {/* Título de la Actuación */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Título de la Actuación / Objeto
                </label>
                <textarea
                  rows={3}
                  value={formEditTitulo}
                  onChange={(e) => setFormEditTitulo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              {/* Importe de la Subvención (Introducir a mano + formato con miles y 2 decimales) */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between mb-1">
                  <span>
                    Importe de la Actuación / Subvención <span className="text-[#004F90] font-bold lowercase">(introducir a mano)</span>
                  </span>
                  {formEditImporte > 0 && (
                    <span className="font-mono text-emerald-700 font-bold lowercase">
                      Vista: {formatearMoneda(formEditImporte)}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formEditImporte}
                  onChange={(e) => setFormEditImporte(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-emerald-700 text-sm focus:outline-hidden focus:border-[#004F90]"
                />
                <span className="block text-[11px] font-mono text-slate-500 mt-1">
                  Importe registrado en miles: <strong>{formatearMoneda(formEditImporte)}</strong>
                </span>
              </div>
            </div>

            {/* Botones del Modal */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setActuacionEditando(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void handleGuardarModificacion().catch(() => {}); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white font-black shadow-xs transition"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para editar el plan completo (datos generales, añadir actuaciones o modificarlas) */}
      {modalEditarPlanAbierto && (
        <EditarPlanModal
          plan={planActual}
          mostrar={modalEditarPlanAbierto}
          onCerrar={() => setModalEditarPlanAbierto(false)}
          onPlanEliminado={() => {
            setModalEditarPlanAbierto(false);
            onVolver();
          }}
        />
      )}

      {/* Modal oficial para dar de alta actuaciones dentro de este plan mediante subida de archivos e IA */}
      {modalAltaActuacionesAbierto && (
        <ModalAltaActuacionesPlan
          plan={planActual}
          mostrar={modalAltaActuacionesAbierto}
          onCerrar={() => setModalAltaActuacionesAbierto(false)}
          onActuacionesCreadas={(cant) => {
            setMensajeExito(
              `Se han dado de alta ${cant} actuaciones en el ${planActual.nombre} con total fidelidad mediante IA.`
            );
            setTimeout(() => setMensajeExito(null), 6000);
          }}
        />
      )}
    </div>
  );
};
