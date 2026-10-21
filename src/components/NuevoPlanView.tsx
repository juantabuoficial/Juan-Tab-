import { EstadoGuardado } from './EstadoGuardado';
import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  FileUp,
  Sparkles,
  Check,
  X,
  Plus,
  Trash2,
  Download,
  Copy,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Building2,
  Euro,
  Clock,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  extraerTextoDePDF,
  fileToBase64,
  procesarPDFBasesConIA,
  procesarAnexoInversionesEELL,
  extraerActuacionesDePDFConTabla,
  extraerDatosBasesPleno,
  parsearActuacionesDeTexto,
  parsearTextoAnexoInversionesEELL,
  generarPDFEjemploBasesPleno,
  formatearActuacionesATSV,
  copiarTextoAlPortapapeles,
  ENTIDADES_LOCALES_CADIZ,
  ActuacionReconocidaPDF,
  DatosBasesPlenoExtraidos,
  extraerActuacionesDeCualquierArchivo,
  descargarPlantillaExcelActuaciones,
  descargarPlantillaCSVActuaciones
} from '../utils/pdfPlanParser';
import { formatearMoneda, formatearFecha } from '../utils/pdfExport';

interface NuevoPlanViewProps {
  onVolver: () => void;
  onPlanCreado: (planId: string, planCreado?: any) => void;
}

export const NuevoPlanView: React.FC<NuevoPlanViewProps> = ({ onVolver, onPlanCreado }) => {
  const { cambiosPendientes, guardarOperacion,
    importarPlanCompletoDesdeBasesPDF,
    crearPlan,
    importarActuacionesPDFAlPlan
  } = useApp();

  const [metodo, setMetodo] = useState<'certificado' | 'manual_solicitudes'>('certificado');

  // Estados Forma 1: Certificado de Aprobación Definitiva del Pleno
  const [procesandoF1, setProcesandoF1] = useState(false);
  const [errorF1, setErrorF1] = useState<string | null>(null);
  const [datosExtraidosF1, setDatosExtraidosF1] = useState<DatosBasesPlenoExtraidos | null>(null);
  const [nombreArchivoF1, setNombreArchivoF1] = useState<string>('');
  const [textoManualF1, setTextoManualF1] = useState('');
  const [mostrarPegarTextoF1, setMostrarPegarTextoF1] = useState(false);
  const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);
  const [dragActivoF1, setDragActivoF1] = useState(false);
  const fileInputRefF1 = useRef<HTMLInputElement>(null);

  // Parámetros editables de Forma 1 (incluyendo plazo máximo de justificación editable)
  const [nombrePlanF1, setNombrePlanF1] = useState('Plan Provincial de Cooperación');
  const [ejercicioF1, setEjercicioF1] = useState(new Date().getFullYear());
  const [presupuestoTotalF1, setPresupuestoTotalF1] = useState<number>(0);
  const [plazoEjecucionF1, setPlazoEjecucionF1] = useState(`${new Date().getFullYear() + 1}-06-30`);
  const [plazoJustificacionF1, setPlazoJustificacionF1] = useState(`${new Date().getFullYear() + 1}-09-30`);

  // Estados Forma 2: Manual + Subida de solicitudes en PDF/Word
  const [nombrePlanF2, setNombrePlanF2] = useState('');
  const [codigoPlanF2, setCodigoPlanF2] = useState('');
  const [ejercicioF2, setEjercicioF2] = useState(new Date().getFullYear());
  const [presupuestoTotalF2, setPresupuestoTotalF2] = useState<number>(0);
  const [plazoEjecucionF2, setPlazoEjecucionF2] = useState(`${new Date().getFullYear() + 1}-06-30`);
  const [plazoEjecucionAmpF2, setPlazoEjecucionAmpF2] = useState(`${new Date().getFullYear() + 1}-06-30`);
  const [plazoJustificacionF2, setPlazoJustificacionF2] = useState(`${new Date().getFullYear() + 1}-09-30`);
  const [plazoJustificacionAmpF2, setPlazoJustificacionAmpF2] = useState(`${new Date().getFullYear() + 1}-09-30`);
  const [descripcionF2, setDescripcionF2] = useState('');

  const [actuacionesF2, setActuacionesF2] = useState<ActuacionReconocidaPDF[]>([]);
  const [procesandoF2, setProcesandoF2] = useState(false);
  const [errorF2, setErrorF2] = useState<string | null>(null);
  const [exitoF2, setExitoF2] = useState<string | null>(null);
  const [nombreArchivoF2, setNombreArchivoF2] = useState<string>('');
  const [mostrarPegarF2, setMostrarPegarF2] = useState(false);
  const [textoPegarF2, setTextoPegarF2] = useState('');
  const [dragActivoF2, setDragActivoF2] = useState(false);
  const fileInputRefF2 = useRef<HTMLInputElement>(null);

  // DRAG & DROP FORMA 1
  const handleDragOverF1 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActivoF1) setDragActivoF1(true);
  };
  const handleDragLeaveF1 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivoF1(false);
  };
  const handleDropF1 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivoF1(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcesarArchivoF1(files[0]);
    }
  };

  // DRAG & DROP FORMA 2
  const handleDragOverF2 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActivoF2) setDragActivoF2(true);
  };
  const handleDragLeaveF2 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivoF2(false);
  };
  const handleDropF2 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivoF2(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcesarArchivoF2(files[0]);
    }
  };

  // Cargar actuaciones de ejemplo representativas de Cádiz (10 municipios)
  const handleCargarMuestraCadizF2 = () => {
    const ej = Number(ejercicioF2) || new Date().getFullYear();
    const muestra: ActuacionReconocidaPDF[] = [
      {
        id: `act-muestra-01`,
        numero: '01',
        entidadLocal: 'Grazalema',
        titulo: 'Reurbanización integral y accesibilidad en Calle Real y accesos',
        aplicacionPresupuestaria: `${ej}-03-920-46200`,
        subvencionSolicitada: 165000
      },
      {
        id: `act-muestra-02`,
        numero: '02',
        entidadLocal: 'Vejer de la Frontera',
        titulo: 'Rehabilitación integral de la Muralla Medieval y accesibilidad turística',
        aplicacionPresupuestaria: `${ej}-03-920-46201`,
        subvencionSolicitada: 185000
      },
      {
        id: `act-muestra-03`,
        numero: '03',
        entidadLocal: 'Ubrique',
        titulo: 'Adecuación de infraestructuras hidráulicas y viales peatonales',
        aplicacionPresupuestaria: `${ej}-03-920-46202`,
        subvencionSolicitada: 195000
      },
      {
        id: `act-muestra-04`,
        numero: '04',
        entidadLocal: 'Barbate',
        titulo: 'Modernización de espacios urbanos y eficiencia energética en luminarias',
        aplicacionPresupuestaria: `${ej}-03-920-46203`,
        subvencionSolicitada: 175000
      },
      {
        id: `act-muestra-05`,
        numero: '05',
        entidadLocal: 'Tarifa',
        titulo: 'Remodelación viaria del Paseo Marítimo y adecuación de accesos',
        aplicacionPresupuestaria: `${ej}-03-920-46204`,
        subvencionSolicitada: 180000
      },
      {
        id: `act-muestra-06`,
        numero: '06',
        entidadLocal: 'Medina Sidonia',
        titulo: 'Recuperación del patrimonio histórico y consolidación de calzadas',
        aplicacionPresupuestaria: `${ej}-03-920-46205`,
        subvencionSolicitada: 170000
      },
      {
        id: `act-muestra-07`,
        numero: '07',
        entidadLocal: 'Olvera',
        titulo: 'Infraestructuras comunitarias y acondicionamiento de miradores turísticos',
        aplicacionPresupuestaria: `${ej}-03-920-46206`,
        subvencionSolicitada: 160000
      },
      {
        id: `act-muestra-08`,
        numero: '08',
        entidadLocal: 'Arcos de la Frontera',
        titulo: 'Consolidación de laderas urbanas y mejora de firme en travesías',
        aplicacionPresupuestaria: `${ej}-03-920-46207`,
        subvencionSolicitada: 190000
      },
      {
        id: `act-muestra-09`,
        numero: '09',
        entidadLocal: 'Alcalá de los Gazules',
        titulo: 'Pavimentación, abastecimiento y renovación de redes en casco antiguo',
        aplicacionPresupuestaria: `${ej}-03-920-46208`,
        subvencionSolicitada: 150000
      },
      {
        id: `act-muestra-10`,
        numero: '10',
        entidadLocal: 'Benalup-Casas Viejas',
        titulo: 'Mejora de instalaciones de desarrollo local y acondicionamiento deportivo',
        aplicacionPresupuestaria: `${ej}-03-920-46209`,
        subvencionSolicitada: 140000
      }
    ];

    setActuacionesF2(muestra);
    const suma = muestra.reduce((acc, a) => acc + a.subvencionSolicitada, 0);
    setPresupuestoTotalF2(suma);
    if (!nombrePlanF2.trim() || nombrePlanF2.startsWith('Plan Provincial')) {
      setNombrePlanF2(`Plan Provincial de Inversiones ${ej}`);
    }
    setExitoF2(`Cargadas ${muestra.length} actuaciones oficiales de muestra para la provincia de Cádiz.`);
    setErrorF2(null);
  };

  // PROCESAMIENTO FORMA 1 (PDF Certificado Pleno)
  const handleProcesarArchivoF1 = async (file: File) => {
    if (!file) return;
    setNombreArchivoF1(file.name);
    setProcesandoF1(true);
    setErrorF1(null);

    try {
      const [base64, texto] = await Promise.all([
        fileToBase64(file).catch(() => ''),
        extraerTextoDePDF(file).catch(() => '')
      ]);

      const { datos, motor } = await procesarPDFBasesConIA(texto, file.name, base64, file);
      if (!datos || !datos.actuaciones || datos.actuaciones.length === 0) {
        setErrorF1('No se pudieron reconocer actuaciones en el documento. Verifica que incluye el anexo de inversiones o pega el texto directamente.');
      } else {
        // Asegurar plazo de justificación válido y mantener el que el usuario haya metido si procede
        if (!datos.plazoJustificacionMaximo || datos.plazoJustificacionMaximo.trim() === '') {
          datos.plazoJustificacionMaximo = plazoJustificacionF1 || `${datos.ejercicio + 1}-09-30`;
        }
        setDatosExtraidosF1(datos);
        setNombrePlanF1(datos.nombrePlan);
        setEjercicioF1(datos.ejercicio);
        setPresupuestoTotalF1(datos.presupuestoTotal);
        setPlazoEjecucionF1(datos.plazoEjecucionMaximo);
        if (datos.plazoJustificacionMaximo) {
          setPlazoJustificacionF1(datos.plazoJustificacionMaximo);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorF1('Error al procesar el archivo PDF: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcesandoF1(false);
    }
  };

  const handleProcesarTextoF1 = async () => {
    if (!textoManualF1.trim()) return;
    setProcesandoF1(true);
    setErrorF1(null);

    try {
      const { datos } = await procesarPDFBasesConIA(textoManualF1, 'Texto_Pegado_Certificado_Pleno');
      if (!datos || !datos.actuaciones || datos.actuaciones.length === 0) {
        setErrorF1('No se pudieron reconocer actuaciones en el texto pegado.');
      } else {
        if (!datos.plazoJustificacionMaximo) {
          datos.plazoJustificacionMaximo = plazoJustificacionF1 || `${datos.ejercicio + 1}-09-30`;
        }
        setDatosExtraidosF1(datos);
        setNombrePlanF1(datos.nombrePlan);
        setEjercicioF1(datos.ejercicio);
        setPresupuestoTotalF1(datos.presupuestoTotal);
        setPlazoEjecucionF1(datos.plazoEjecucionMaximo);
        if (datos.plazoJustificacionMaximo) {
          setPlazoJustificacionF1(datos.plazoJustificacionMaximo);
        }
        setMostrarPegarTextoF1(false);
      }
    } catch (err: any) {
      setErrorF1('Error al analizar el texto pegado: ' + (err.message || 'Error'));
    } finally {
      setProcesandoF1(false);
    }
  };

  const handleModificarFilaF1 = (index: number, campo: keyof ActuacionReconocidaPDF, valor: any) => {
    if (!datosExtraidosF1) return;
    const copy = [...datosExtraidosF1.actuaciones];
    copy[index] = { ...copy[index], [campo]: valor };
    const nuevoTotal = copy.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
    setDatosExtraidosF1({
      ...datosExtraidosF1,
      actuaciones: copy,
      presupuestoTotal: nuevoTotal > 0 ? nuevoTotal : datosExtraidosF1.presupuestoTotal
    });
    setPresupuestoTotalF1(nuevoTotal > 0 ? nuevoTotal : presupuestoTotalF1);
  };

  const handleEliminarFilaF1 = (index: number) => {
    if (!datosExtraidosF1) return;
    const copy = datosExtraidosF1.actuaciones.filter((_, i) => i !== index);
    const nuevoTotal = copy.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
    setDatosExtraidosF1({
      ...datosExtraidosF1,
      actuaciones: copy,
      presupuestoTotal: nuevoTotal
    });
    setPresupuestoTotalF1(nuevoTotal);
  };

  const handleAnadirFilaF1 = () => {
    if (!datosExtraidosF1) return;
    const nuevoNumero = String(datosExtraidosF1.actuaciones.length + 1).padStart(2, '0');
    const mun = ENTIDADES_LOCALES_CADIZ[datosExtraidosF1.actuaciones.length % ENTIDADES_LOCALES_CADIZ.length] || 'Alcalá de los Gazules';
    const nueva: ActuacionReconocidaPDF = {
      id: `act-f1-manual-${Date.now()}-${datosExtraidosF1.actuaciones.length + 1}`,
      numero: nuevoNumero,
      entidadLocal: mun,
      titulo: `Inversión y obras de mejora municipal en ${mun}`,
      aplicacionPresupuestaria: `${ejercicioF1 || datosExtraidosF1.ejercicio}-03-920-${46200 + datosExtraidosF1.actuaciones.length}`,
      subvencionSolicitada: 150000
    };
    const copy = [...datosExtraidosF1.actuaciones, nueva];
    const nuevoTotal = copy.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
    setDatosExtraidosF1({
      ...datosExtraidosF1,
      actuaciones: copy,
      presupuestoTotal: nuevoTotal
    });
    setPresupuestoTotalF1(nuevoTotal);
  };

  const handleGuardarPlanF1 = async () => {
    if (!datosExtraidosF1 || datosExtraidosF1.actuaciones.length === 0) {
      setErrorF1('No hay actuaciones para dar de alta. Sube un PDF o añade filas manualmente.');
      return;
    }

    const nombreFinal = (nombrePlanF1 || datosExtraidosF1.nombrePlan).trim();
    const ejercicioFinal = Number(ejercicioF1) || datosExtraidosF1.ejercicio || 2026;
    const plazoEjecFinal = plazoEjecucionF1 || datosExtraidosF1.plazoEjecucionMaximo || `${ejercicioFinal + 1}-06-30`;
    const plazoJustFinal = plazoJustificacionF1 || datosExtraidosF1.plazoJustificacionMaximo || `${ejercicioFinal + 1}-09-30`;
    const ptoFinal = presupuestoTotalF1 > 0 ? presupuestoTotalF1 : datosExtraidosF1.presupuestoTotal;

    const res = await guardarOperacion(() => importarPlanCompletoDesdeBasesPDF(
      {
        nombre: nombreFinal,
        codigo: datosExtraidosF1.codigoPlan || `${nombreFinal.slice(0, 3).toUpperCase()}-${ejercicioFinal}`,
        ejercicio: ejercicioFinal,
        plazoEjecucionMaximo: plazoEjecFinal,
        plazoJustificacionMaximo: plazoJustFinal,
        plazoEjecucionAmpliado: datosExtraidosF1.plazoEjecucionAmpliado || plazoEjecFinal,
        plazoJustificacionAmpliado: datosExtraidosF1.plazoJustificacionAmpliado || plazoJustFinal,
        presupuestoTotal: ptoFinal,
        descripcion: datosExtraidosF1.descripcion
      },
      datosExtraidosF1.actuaciones
    ));

    onPlanCreado(res.plan.id, res.plan);
  };

  // PROCESAMIENTO FORMA 2 (Subida PDF / Word solicitudes de actuaciones)
  const handleProcesarArchivoF2 = async (file: File) => {
    if (!file) return;
    setNombreArchivoF2(file.name);
    setProcesandoF2(true);
    setErrorF2(null);
    setExitoF2(null);

    try {
      // 1. Probar extractor unificado para Excel (.xlsx, .xls), CSV (.csv) o PDF con mapeo oficial de columnas
      const resUnificado = await extraerActuacionesDeCualquierArchivo(
        file,
        nombrePlanF2 || 'Plan Provincial',
        ejercicioF2
      );

      let parsed = resUnificado.actuaciones || [];
      let base64 = '';
      let texto = '';

      // 2. Si no encontró, extraer con procesador especializado de anexo de inversiones EELL
      if (parsed.length === 0) {
        [base64, texto] = await Promise.all([
          fileToBase64(file).catch(() => ''),
          extraerTextoDePDF(file).catch(() => '')
        ]);

        const res = await procesarAnexoInversionesEELL(
          texto,
          nombrePlanF2 || 'Plan Provincial',
          file.name,
          base64,
          file
        );
        parsed = res.actuaciones || [];
      }

      // 3. Si sigue vacío, probar extractor de bases de pleno completas
      if (parsed.length === 0) {
        const { datos } = await procesarPDFBasesConIA(texto, file.name, base64, file);
        if (datos && datos.actuaciones && datos.actuaciones.length > 0) {
          parsed = datos.actuaciones;
          if (datos.nombrePlan && (!nombrePlanF2.trim() || nombrePlanF2.startsWith('Plan Provincial'))) {
            setNombrePlanF2(datos.nombrePlan);
          }
          if (datos.ejercicio) setEjercicioF2(datos.ejercicio);
          if (datos.plazoEjecucionMaximo) setPlazoEjecucionF2(datos.plazoEjecucionMaximo);
          if (datos.plazoJustificacionMaximo) setPlazoJustificacionF2(datos.plazoJustificacionMaximo);
        }
      }

      // 4. Intentar fallback de reglas de anexo de texto
      if (parsed.length === 0) {
        const { actuaciones: parsedTexto } = parsearTextoAnexoInversionesEELL(texto, ejercicioF2);
        if (parsedTexto && parsedTexto.length > 0) parsed = parsedTexto;
      }

      // 5. Fallback con extractor de texto de bases
      if (parsed.length === 0) {
        const datosBases = extraerDatosBasesPleno(texto, file.name);
        if (datosBases.actuaciones && datosBases.actuaciones.length > 0) {
          parsed = datosBases.actuaciones;
        }
      }

      if (parsed.length === 0) {
        setErrorF2(
          'No se encontraron actuaciones en el archivo. Puedes pulsar "Cargar Actuaciones de Muestra (Cádiz)", añadir filas manualmente o pegar el texto.'
        );
      } else {
        setActuacionesF2(parsed);
        const suma = parsed.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
        if (suma > 0) {
          setPresupuestoTotalF2(suma);
        }

        // Metadatos adicionales si están en el documento
        const datosBases = extraerDatosBasesPleno(texto, file.name);
        if (datosBases.nombrePlan && (!nombrePlanF2.trim() || nombrePlanF2.startsWith('Plan Provincial'))) {
          setNombrePlanF2(datosBases.nombrePlan);
        } else if (!nombrePlanF2.trim()) {
          const limpio = file.name
            .replace(/\.pdf$/i, '')
            .replace(/^Aprobacion_Definitiva_Bases_Pleno_/i, '')
            .replace(/^Actuaciones_/i, '')
            .replace(/_Oficial$/i, '')
            .replace(/[_-]/g, ' ')
            .trim();
          if (limpio) setNombrePlanF2(limpio);
        }

        if (datosBases.ejercicio) setEjercicioF2(datosBases.ejercicio);
        if (datosBases.plazoEjecucionMaximo) setPlazoEjecucionF2(datosBases.plazoEjecucionMaximo);
        if (datosBases.plazoJustificacionMaximo) setPlazoJustificacionF2(datosBases.plazoJustificacionMaximo);

        setExitoF2(`Extraídas con éxito ${parsed.length} actuaciones del documento con IA.`);
      }
    } catch (err: any) {
      setErrorF2('Error al procesar el archivo: ' + (err.message || 'Error'));
    } finally {
      setProcesandoF2(false);
    }
  };

  const handleProcesarTextoF2 = () => {
    if (!textoPegarF2.trim()) return;
    setProcesandoF2(true);
    setErrorF2(null);

    try {
      const { actuaciones: parsed } = parsearTextoAnexoInversionesEELL(textoPegarF2, ejercicioF2);
      if (parsed.length === 0) {
        const parsedAlt = parsearActuacionesDeTexto(textoPegarF2, nombrePlanF2 || 'Plan');
        if (parsedAlt.length > 0) {
          setActuacionesF2(parsedAlt);
          setExitoF2(`Extraídas ${parsedAlt.length} actuaciones del texto pegado.`);
        } else {
          setErrorF2('No se encontraron actuaciones en el texto pegado.');
        }
      } else {
        setActuacionesF2(parsed);
        if (presupuestoTotalF2 === 0) {
          const suma = parsed.reduce((acc, a) => acc + (a.subvencionSolicitada || 0), 0);
          if (suma > 0) setPresupuestoTotalF2(suma);
        }
        setExitoF2(`Extraídas ${parsed.length} actuaciones del texto pegado.`);
      }
      setMostrarPegarF2(false);
    } catch (err: any) {
      setErrorF2('Error: ' + err.message);
    } finally {
      setProcesandoF2(false);
    }
  };

  const handleAnadirFilaF2 = () => {
    const nuevoNumero = String(actuacionesF2.length + 1).padStart(2, '0');
    const entidadDefecto = ENTIDADES_LOCALES_CADIZ[actuacionesF2.length % ENTIDADES_LOCALES_CADIZ.length] || 'Alcalá de los Gazules';
    const nueva: ActuacionReconocidaPDF = {
      id: `act-manual-${Date.now()}-${actuacionesF2.length + 1}`,
      numero: nuevoNumero,
      entidadLocal: entidadDefecto,
      titulo: `Inversión municipal en ${entidadDefecto}`,
      aplicacionPresupuestaria: `${ejercicioF2}-03-920-${46200 + actuacionesF2.length}`,
      subvencionSolicitada: 50000
    };
    setActuacionesF2([...actuacionesF2, nueva]);
  };

  const handleModificarFilaF2 = (index: number, campo: keyof ActuacionReconocidaPDF, valor: any) => {
    setActuacionesF2((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  const handleEliminarFilaF2 = (index: number) => {
    setActuacionesF2((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuardarPlanF2 = async () => {
    if (actuacionesF2.length === 0) {
      setErrorF2(
        'No se pueden dar de alta un plan sin actuaciones. Sube o arrastra un PDF con las solicitudes, pulsa "Añadir Fila" o utiliza "Cargar Actuaciones de Ejemplo (Cádiz)".'
      );
      return;
    }

    const nombreFinal = (nombrePlanF2 || `Plan Provincial ${ejercicioF2}`).trim();
    const ejercicioFinal = Number(ejercicioF2) || new Date().getFullYear();
    const sumaSubv = actuacionesF2.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
    const ptoFinal = presupuestoTotalF2 > 0 ? presupuestoTotalF2 : sumaSubv;

    const res = await guardarOperacion(() => importarPlanCompletoDesdeBasesPDF(
      {
        nombre: nombreFinal,
        codigo: codigoPlanF2.trim() || `${nombreFinal.slice(0, 3).toUpperCase()}-${ejercicioFinal}`,
        ejercicio: ejercicioFinal,
        plazoEjecucionMaximo: plazoEjecucionF2,
        plazoJustificacionMaximo: plazoJustificacionF2,
        plazoEjecucionAmpliado: plazoEjecucionAmpF2 || plazoEjecucionF2,
        plazoJustificacionAmpliado: plazoJustificacionAmpF2 || plazoJustificacionF2,
        presupuestoTotal: ptoFinal,
        descripcion: descripcionF2 || `Plan provincial ${ejercicioFinal} registrado con ${actuacionesF2.length} actuaciones reconocidas.`
      },
      actuacionesF2
    ));

    onPlanCreado(res.plan.id, res.plan);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <EstadoGuardado />
      {/* Botón Volver + Título Principal */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Planes</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dar de Alta Nuevo Plan
            </h1>
            <p className="text-xs text-slate-500">
              Área de Desarrollo Local · Diputación Provincial de Cádiz
            </p>
          </div>
        </div>

        {/* Selector de Forma de Alta */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setMetodo('certificado')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              metodo === 'certificado'
                ? 'bg-white text-[#004F90] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Forma 1: Certificado del Pleno</span>
          </button>
          <button
            type="button"
            onClick={() => setMetodo('manual_solicitudes')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              metodo === 'manual_solicitudes'
                ? 'bg-white text-[#004F90] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Forma 2: Manual + Solicitudes</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          FORMA 1: CERTIFICADO DE APROBACIÓN DEFINITIVA DEL PLENO
          ========================================================= */}
      {metodo === 'certificado' && (
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRefF1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleProcesarArchivoF1(f);
            }}
            accept="application/pdf"
            className="hidden"
          />

          {/* Parámetros Previos del Plan (siempre accesibles y editables, incluido Plazo Máx. Justificación) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#004F90] border border-blue-200">
                  Forma 1 · Parámetros del Plan
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Puedes configurar los plazos antes o después de procesar el PDF
                </span>
              </div>
              <button
                type="button"
                onClick={() => generarPDFEjemploBasesPleno()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Descargar modelo PDF oficial de prueba con bases y anexo"
              >
                <Download className="w-3.5 h-3.5 text-[#004F90]" />
                <span>Descargar Modelo PDF Oficial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre Oficial del Plan</label>
                <input
                  type="text"
                  value={nombrePlanF1}
                  onChange={(e) => setNombrePlanF1(e.target.value)}
                  placeholder="Plan Provincial de Cooperación..."
                  className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Año / Ejercicio</label>
                <input
                  type="number"
                  value={ejercicioF1}
                  onChange={(e) => setEjercicioF1(parseInt(e.target.value) || 2026)}
                  className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Presupuesto Total (€)</label>
                <input
                  type="number"
                  value={presupuestoTotalF1 || ''}
                  onChange={(e) => setPresupuestoTotalF1(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full font-mono font-bold text-emerald-700 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                />
                <span className="block text-[10px] text-slate-500 mt-1 font-mono">
                  En miles: <strong className="text-emerald-700">{formatearMoneda(presupuestoTotalF1)}</strong>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Plazo Máx. Ejecución</label>
                <input
                  type="date"
                  value={plazoEjecucionF1}
                  onChange={(e) => setPlazoEjecucionF1(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                />
                <span className="block text-[10px] text-slate-500 mt-1 font-medium">
                  Fecha: <strong className="text-slate-800">{formatearFecha(plazoEjecucionF1)}</strong>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-200 ring-1 ring-blue-300">
                <label className="text-[10px] font-black text-[#004F90] uppercase block mb-1">Plazo Máx. Justificación *</label>
                <input
                  type="date"
                  required
                  value={plazoJustificacionF1}
                  onChange={(e) => setPlazoJustificacionF1(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-white border border-blue-300 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                />
                <span className="block text-[10px] text-slate-600 mt-1 font-medium">
                  Fecha límite: <strong className="text-[#004F90]">{formatearFecha(plazoJustificacionF1)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Subida */}
          <div
            onDragOver={handleDragOverF1}
            onDragEnter={handleDragOverF1}
            onDragLeave={handleDragLeaveF1}
            onDrop={handleDropF1}
            className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-all ${
              dragActivoF1 ? 'border-[#004F90] ring-2 ring-[#004F90]/20 bg-blue-50/20' : 'border-slate-200'
            }`}
          >
            <div>
              <h2 className="text-base font-black text-slate-900">
                Subir Certificado de Aprobación Definitiva de Bases por el Pleno
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Sube el PDF oficial emitido por Secretaría General o pega el texto del acuerdo. Se extraerán automáticamente el nombre oficial del plan, ejercicio, plazos máximos y todas las actuaciones del anexo con IA.
              </p>
            </div>

            {/* Zona de Drop / Botones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRefF1.current?.click()}
                disabled={procesandoF1}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition text-center group cursor-pointer ${
                  dragActivoF1
                    ? 'border-[#004F90] bg-blue-100/80 scale-[1.01]'
                    : 'border-blue-300 hover:border-[#004F90] bg-blue-50/40 hover:bg-blue-50/80'
                }`}
              >
                <Upload className="w-8 h-8 text-[#004F90] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-[#004F90]">
                  Seleccionar o Arrastrar Archivo PDF
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Certificado oficial con Anexo de Actuaciones
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMostrarPegarTextoF1(!mostrarPegarTextoF1)}
                className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition text-center group cursor-pointer"
              >
                <FileText className="w-8 h-8 text-slate-600 mb-2 group-hover:text-slate-900 transition-colors" />
                <span className="text-xs font-bold text-slate-800">
                  Pegar Texto o Tabla del Certificado
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Copiar contenido directo desde PDF o procesador
                </span>
              </button>
            </div>

            {/* Panel para pegar texto */}
            {mostrarPegarTextoF1 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Pegar Texto Completo del Certificado / Anexo de Actuaciones:
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarPegarTextoF1(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={textoManualF1}
                  onChange={(e) => setTextoManualF1(e.target.value)}
                  placeholder="Pega aquí el texto del acuerdo del pleno o la tabla con las actuaciones..."
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs font-mono focus:outline-hidden focus:border-[#004F90]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTextoManualF1('')}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleProcesarTextoF1().catch(() => {}); }}
                    disabled={procesandoF1 || !textoManualF1.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Procesar Texto
                  </button>
                </div>
              </div>
            )}

            {/* Estado de Procesamiento */}
            {procesandoF1 && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#004F90] flex items-center gap-2.5 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Analizando y extrayendo 100% de actuaciones con motor inteligente...</span>
              </div>
            )}

            {errorF1 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs">
                <span>{errorF1}</span>
                <button onClick={() => setErrorF1(null)} className="underline font-bold cursor-pointer">Cerrar</button>
              </div>
            )}
          </div>

          {/* Datos Extraídos del Certificado (Verificación y Guardado) */}
          {datosExtraidosF1 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-black text-slate-900">
                    Datos del Plan Extraídos con Éxito ({datosExtraidosF1.actuaciones.length} actuaciones reconocidas)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const tsv = formatearActuacionesATSV(datosExtraidosF1.actuaciones);
                      await copiarTextoAlPortapapeles(tsv);
                      setMensajeCopiado('¡Copiadas al portapapeles!');
                      setTimeout(() => setMensajeCopiado(null), 3000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    title="Copiar actuaciones en formato Excel / TSV"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#004F90]" />
                    <span>Copiar a Excel/TSV</span>
                  </button>
                  {mensajeCopiado && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      {mensajeCopiado}
                    </span>
                  )}
                </div>
              </div>

              {/* Ficha compacta del Plan (5 columnas incluyendo Plazo Máximo de Justificación) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre Oficial del Plan</label>
                  <input
                    type="text"
                    value={nombrePlanF1 || datosExtraidosF1.nombrePlan}
                    onChange={(e) => {
                      setNombrePlanF1(e.target.value);
                      setDatosExtraidosF1({ ...datosExtraidosF1, nombrePlan: e.target.value });
                    }}
                    className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Año / Ejercicio</label>
                  <input
                    type="number"
                    value={ejercicioF1 || datosExtraidosF1.ejercicio}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 2026;
                      setEjercicioF1(val);
                      setDatosExtraidosF1({ ...datosExtraidosF1, ejercicio: val });
                    }}
                    className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase">Presupuesto Total (€)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const suma = datosExtraidosF1.actuaciones.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
                        setPresupuestoTotalF1(suma);
                        setDatosExtraidosF1({ ...datosExtraidosF1, presupuestoTotal: suma });
                      }}
                      className="text-[10px] text-[#004F90] font-bold hover:underline"
                    >
                      Sumar Actuaciones
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={presupuestoTotalF1 || datosExtraidosF1.presupuestoTotal || ''}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value) || 0;
                      setPresupuestoTotalF1(num);
                      setDatosExtraidosF1({ ...datosExtraidosF1, presupuestoTotal: num });
                    }}
                    className="w-full font-mono font-bold text-emerald-700 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                  <div className="text-[10px] text-slate-600 mt-1 font-medium">
                    En miles: <strong className="text-emerald-700 font-mono text-xs">{formatearMoneda(presupuestoTotalF1 || datosExtraidosF1.presupuestoTotal)}</strong>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Plazo Máx. Ejecución</label>
                  <input
                    type="date"
                    value={plazoEjecucionF1 || datosExtraidosF1.plazoEjecucionMaximo}
                    onChange={(e) => {
                      setPlazoEjecucionF1(e.target.value);
                      setDatosExtraidosF1({ ...datosExtraidosF1, plazoEjecucionMaximo: e.target.value });
                    }}
                    className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Fecha: <strong className="text-slate-800">{formatearFecha(plazoEjecucionF1 || datosExtraidosF1.plazoEjecucionMaximo)}</strong>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">Plazo Máx. Justificación *</label>
                  <input
                    type="date"
                    required
                    value={plazoJustificacionF1 || datosExtraidosF1.plazoJustificacionMaximo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlazoJustificacionF1(val);
                      setDatosExtraidosF1({ ...datosExtraidosF1, plazoJustificacionMaximo: val });
                    }}
                    className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded p-1.5 text-xs focus:outline-hidden focus:border-[#004F90]"
                  />
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    Fecha: <strong className="text-slate-800">{formatearFecha(plazoJustificacionF1 || datosExtraidosF1.plazoJustificacionMaximo)}</strong>
                  </div>
                </div>
              </div>

              {/* Encabezado y botón añadir fila */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">
                  Relación de Actuaciones Reconocidas ({datosExtraidosF1.actuaciones.length} en total):
                </span>
                <button
                  type="button"
                  onClick={handleAnadirFilaF1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#004F90] border border-blue-200 text-xs font-bold hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Fila</span>
                </button>
              </div>

              {/* Tabla de actuaciones */}
              <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2.5 w-12 text-center">Nº</th>
                      <th className="py-2.5 px-3 w-44">Entidad Local</th>
                      <th className="py-2.5 px-3">Título de la Actuación</th>
                      <th className="py-2.5 px-3 w-36">Aplicación Presupuestaria</th>
                      <th className="py-2.5 px-3 text-right w-40">Subvención Solicitada (€)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {datosExtraidosF1.actuaciones.map((act, i) => (
                      <tr key={act.id || i} className="hover:bg-blue-50/30">
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="text"
                            value={act.numero}
                            onChange={(e) => handleModificarFilaF1(i, 'numero', e.target.value)}
                            className="w-10 text-center font-mono font-bold text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            value={act.entidadLocal}
                            onChange={(e) => handleModificarFilaF1(i, 'entidadLocal', e.target.value)}
                            className="w-full text-xs font-bold text-[#004F90] bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                          >
                            {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                              <option key={mun} value={mun}>{mun}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={act.titulo}
                            onChange={(e) => handleModificarFilaF1(i, 'titulo', e.target.value)}
                            className="w-full text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={act.aplicacionPresupuestaria}
                            onChange={(e) => handleModificarFilaF1(i, 'aplicacionPresupuestaria', e.target.value)}
                            className="w-full font-mono text-[11px] text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-black text-emerald-700 text-xs whitespace-nowrap">
                              {formatearMoneda(act.subvencionSolicitada)}
                            </span>
                            <input
                              type="number"
                              value={act.subvencionSolicitada}
                              onChange={(e) => handleModificarFilaF1(i, 'subvencionSolicitada', parseFloat(e.target.value) || 0)}
                              className="w-24 text-right font-mono text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminarFilaF1(i)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                            title="Eliminar fila"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                        Total Subvenciones Aprobadas ({datosExtraidosF1.actuaciones.length} actuaciones):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800 whitespace-nowrap">
                        {formatearMoneda(datosExtraidosF1.actuaciones.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Botón de Confirmación */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDatosExtraidosF1(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { void handleGuardarPlanF1().catch(() => {}); }}
                  disabled={cambiosPendientes > 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-black shadow-md transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Dar de Alta Plan ({datosExtraidosF1.actuaciones.length} actuaciones)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          FORMA 2: MANUAL + SUBIDA DE SOLICITUDES (PDF O WORD)
          ========================================================= */}
      {metodo === 'manual_solicitudes' && (
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRefF2}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleProcesarArchivoF2(f);
            }}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />

          {/* Paso 1: Datos manuales del plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white inline-block mb-1.5">
                Forma 2 · Paso 1
              </span>
              <h2 className="text-base font-black text-slate-900">
                Datos Básicos del Plan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Introduce los parámetros generales del plan provincial.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre Oficial del Plan *</label>
                <input
                  type="text"
                  required
                  value={nombrePlanF2}
                  onChange={(e) => setNombrePlanF2(e.target.value)}
                  placeholder="Ej: Plan Cádiz Marcha + 2026"
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Año / Ejercicio</label>
                <input
                  type="number"
                  value={ejercicioF2}
                  onChange={(e) => setEjercicioF2(parseInt(e.target.value) || 2026)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-900 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Presupuesto Total (€)</label>
                  {actuacionesF2.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const suma = actuacionesF2.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0);
                        setPresupuestoTotalF2(suma);
                      }}
                      className="text-[10px] text-[#004F90] font-bold hover:underline"
                    >
                      Sumar Actuaciones
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={presupuestoTotalF2}
                  onChange={(e) => setPresupuestoTotalF2(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-emerald-700 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Plazo Máx. Ejecución</label>
                <input
                  type="date"
                  value={plazoEjecucionF2}
                  onChange={(e) => setPlazoEjecucionF2(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Plazo Máx. Justificación</label>
                <input
                  type="date"
                  value={plazoJustificacionF2}
                  onChange={(e) => setPlazoJustificacionF2(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={descripcionF2}
                  onChange={(e) => setDescripcionF2(e.target.value)}
                  placeholder="Plan provincial de inversiones..."
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-hidden focus:border-[#004F90]"
                />
              </div>
            </div>
          </div>

          {/* Paso 2: Subir PDF o Word de solicitudes y tabla editable de actuaciones */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#004F90] border border-blue-200 inline-block mb-1.5">
                  Forma 2 · Paso 2
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Subir Solicitudes / Anexo (PDF o Word) y Editar Actuaciones
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sube el documento con las solicitudes de las EELL para extraer las actuaciones, y completa o modifica los datos que estimes antes de guardar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefF2.current?.click()}
                  disabled={procesandoF2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#004F90] border border-blue-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir PDF / Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarPegarF2(!mostrarPegarF2)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pegar Texto</span>
                </button>
                <button
                  type="button"
                  onClick={handleAnadirFilaF2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-bold transition shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Fila</span>
                </button>
              </div>
            </div>

            {/* Mensajes de carga / error */}
            {procesandoF2 && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#004F90] flex items-center gap-2 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Extrayendo actuaciones del documento...</span>
              </div>
            )}
            {errorF2 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs">
                <span>{errorF2}</span>
                <button onClick={() => setErrorF2(null)} className="underline font-bold">Cerrar</button>
              </div>
            )}

            {/* Panel de Pegar Texto para Forma 2 */}
            {mostrarPegarF2 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Pegar filas de solicitudes o inversiones:</label>
                  <button type="button" onClick={() => setMostrarPegarF2(false)} className="text-slate-400 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={textoPegarF2}
                  onChange={(e) => setTextoPegarF2(e.target.value)}
                  placeholder="Ej: Grazalema - Reurbanización calle Real - 150000..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleProcesarTextoF2}
                    className="px-3 py-1.5 rounded-lg bg-[#004F90] text-white text-xs font-bold"
                  >
                    Extraer Filas
                  </button>
                </div>
              </div>
            )}

            {/* Tabla Interactiva y Totalmente Editable de Actuaciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Actuaciones del Plan ({actuacionesF2.length} registradas):</span>
                <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Total Subvenciones: {formatearMoneda(actuacionesF2.reduce((acc, a) => acc + (Number(a.subvencionSolicitada) || 0), 0))}
                </span>
              </div>

              {actuacionesF2.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  No hay actuaciones cargadas aún. Sube un PDF / Word con las solicitudes o pulsa <strong className="text-[#004F90]">"Añadir Fila"</strong> para introducirlas manualmente.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 w-12 text-center">Nº</th>
                        <th className="py-2 px-2.5 w-44">Entidad Local</th>
                        <th className="py-2 px-2.5">Título / Objeto de la Obra</th>
                        <th className="py-2 px-2.5 w-36">Partida Pptaria.</th>
                        <th className="py-2 px-2.5 text-right w-32">Subvención (€)</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {actuacionesF2.map((act, idx) => (
                        <tr key={act.id || idx} className="hover:bg-blue-50/30">
                          <td className="py-1 px-2 text-center">
                            <input
                              type="text"
                              value={act.numero}
                              onChange={(e) => handleModificarFilaF2(idx, 'numero', e.target.value)}
                              className="w-10 text-center font-mono font-bold text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <select
                              value={act.entidadLocal}
                              onChange={(e) => handleModificarFilaF2(idx, 'entidadLocal', e.target.value)}
                              className="w-full text-xs font-bold text-[#004F90] bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                            >
                              {ENTIDADES_LOCALES_CADIZ.map((mun) => (
                                <option key={mun} value={mun}>{mun}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={act.titulo}
                              onChange={(e) => handleModificarFilaF2(idx, 'titulo', e.target.value)}
                              className="w-full text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="text"
                              value={act.aplicacionPresupuestaria}
                              onChange={(e) => handleModificarFilaF2(idx, 'aplicacionPresupuestaria', e.target.value)}
                              className="w-full font-mono text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-2 text-right">
                            <input
                              type="number"
                              value={act.subvencionSolicitada}
                              onChange={(e) => handleModificarFilaF2(idx, 'subvencionSolicitada', parseFloat(e.target.value) || 0)}
                              className="w-full text-right font-mono font-bold text-emerald-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#004F90] rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarFilaF2(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                              title="Eliminar fila"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Botón Final de Guardar Plan Forma 2 */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onVolver}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void handleGuardarPlanF2().catch(() => {}); }}
                disabled={!nombrePlanF2.trim() || cambiosPendientes > 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-black shadow-md transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Guardar y Dar de Alta Plan ({actuacionesF2.length} actuaciones)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
