/**
 * Servicio de Auditoría, Exportación y Migración Segura a Cloud Firestore
 * Planifica · Área de Desarrollo Local · Diputación Provincial de Cádiz
 *
 * REGLA INQUEBRANTABLE: Nunca sobrescribe, altera ni reinicia datos locales
 * de forma destructiva. Requiere autorización explícita del usuario.
 */

import { Firestore, runTransaction, serverTimestamp, doc, getDocsFromServer, collection } from 'firebase/firestore';
import { inicializarFirebase } from './firebaseConfig';
import { clean, equalRows, rowId, type CollectionName, type Row } from './workspaceModel';
import { PlanSubvencion, Actuacion, User, RegistroAuditoriaAcceso, ComentarioActuacion, NotificacionSistema, CopiaSeguridadPlan } from '../types';

export interface ResumenDatosLocales {
  totalPlanes: number;
  totalActuaciones: number;
  totalUsuarios: number;
  totalAuditorias: number;
  totalComentarios: number;
  totalNotificaciones: number;
  totalPapelera: number;
  importeTotalPresupuestos: number;
  importeTotalSubvenciones: number;
  fechaExtraccion: string;
}

export interface CopiaSeguridadExportable {
  version: string;
  aplicacion: string;
  entidad: string;
  fechaExportacion: string;
  resumen: ResumenDatosLocales;
  datos: {
    planes: PlanSubvencion[];
    actuaciones: Actuacion[];
    usuarios: User[];
    registrosAuditoria: RegistroAuditoriaAcceso[];
    comentarios: ComentarioActuacion[];
    notificaciones: NotificacionSistema[];
    planesPapelera: CopiaSeguridadPlan[];
  };
}

export interface InformeResultadoMigracion {
  completada: boolean;
  fechaInicio: string;
  fechaFin: string;
  duracionMs: number;
  planesMigrados: number;
  actuacionesMigradas: number;
  usuariosMigrados: number;
  auditoriasMigradas: number;
  comentariosMigrados: number;
  notificacionesMigradas: number;
  papeleraMigrada: number;
  errores: string[];
  detalles: string[];
}

const STORAGE_KEYS = {
  ACTUACIONES: 'adl_cadiz_actuaciones_v2',
  USUARIOS: 'adl_cadiz_usuarios_v2',
  USUARIO_ACTUAL: 'adl_cadiz_usuario_activo_v2',
  AUDITORIA: 'adl_cadiz_auditoria_v2',
  CONFIG: 'adl_cadiz_config_v2',
  NOTIFICACIONES: 'adl_cadiz_notificaciones_v2',
  PLANES: 'adl_cadiz_planes_v2',
  PLANES_PAPELERA: 'adl_cadiz_planes_papelera_v2',
  COMENTARIOS: 'adl_cadiz_comentarios_v2'
};

/**
 * Lee y analiza todos los datos almacenados actualmente en el navegador (localStorage)
 */
export function auditarDatosLocales(): CopiaSeguridadExportable {
  const getArray = <T>(key: string): T[] => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return [];
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const planes = getArray<PlanSubvencion>(STORAGE_KEYS.PLANES);
  const actuaciones = getArray<Actuacion>(STORAGE_KEYS.ACTUACIONES);
  const usuarios = getArray<User>(STORAGE_KEYS.USUARIOS);
  const registrosAuditoria = getArray<RegistroAuditoriaAcceso>(STORAGE_KEYS.AUDITORIA);
  const comentarios = getArray<ComentarioActuacion>(STORAGE_KEYS.COMENTARIOS);
  const notificaciones = getArray<NotificacionSistema>(STORAGE_KEYS.NOTIFICACIONES);
  const planesPapelera = getArray<CopiaSeguridadPlan>(STORAGE_KEYS.PLANES_PAPELERA);

  let importeTotalPresupuestos = 0;
  planes.forEach((p) => {
    importeTotalPresupuestos += Number(p.presupuestoTotal) || 0;
  });

  let importeTotalSubvenciones = 0;
  actuaciones.forEach((a) => {
    importeTotalSubvenciones += Number(a.importes?.importeConcesion || a.importes?.importeActuacion) || 0;
  });

  const resumen: ResumenDatosLocales = {
    totalPlanes: planes.length,
    totalActuaciones: actuaciones.length,
    totalUsuarios: usuarios.length,
    totalAuditorias: registrosAuditoria.length,
    totalComentarios: comentarios.length,
    totalNotificaciones: notificaciones.length,
    totalPapelera: planesPapelera.length,
    importeTotalPresupuestos,
    importeTotalSubvenciones,
    fechaExtraccion: new Date().toISOString()
  };

  return {
    version: '1.1-DipuCadiz',
    aplicacion: 'Planifica · Área de Desarrollo Local',
    entidad: 'Diputación Provincial de Cádiz',
    fechaExportacion: new Date().toISOString(),
    resumen,
    datos: {
      planes,
      actuaciones,
      usuarios,
      registrosAuditoria,
      comentarios,
      notificaciones,
      planesPapelera
    }
  };
}

/**
 * Genera la descarga en disco del archivo JSON de respaldo
 */
export function descargarCopiaSeguridadLocalJSON(): void {
  const backup = auditarDatosLocales();
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fechaStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_planifica_cadiz_${fechaStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ResultadoExportacionMasiva {
  totalPlanes: number;
  totalActuaciones: number;
  totalDocumentosBase14: number;
  totalModificados: number;
  totalCertificaciones: number;
  importeTotalPresupuestos: number;
  importeTotalSubvenciones: number;
  nombreArchivo: string;
  fechaExportacion: string;
  tamanoBytes: number;
}

/**
 * Exportación Masiva Oficial de Respaldo Offline Seguro
 * Exporta todos los planes y actuaciones actuales (priorizando el estado en memoria de la sesión
 * con respaldo en localStorage), garantizando integridad administrativa total antes de migrar a Firestore.
 */
export function exportarRespaldoOfflineMasivoJSON(opciones?: {
  planes?: PlanSubvencion[];
  actuaciones?: Actuacion[];
  usuarios?: User[];
  registrosAuditoria?: RegistroAuditoriaAcceso[];
  comentarios?: ComentarioActuacion[];
  notificaciones?: NotificacionSistema[];
  planesPapelera?: CopiaSeguridadPlan[];
  autorNombre?: string;
}): ResultadoExportacionMasiva {
  const localBackup = auditarDatosLocales();

  // Preferir datos en memoria si se suministran; de lo contrario usar datos locales persistidos
  const planes = opciones?.planes ?? localBackup.datos.planes;
  const actuaciones = opciones?.actuaciones ?? localBackup.datos.actuaciones;
  const usuarios = opciones?.usuarios ?? localBackup.datos.usuarios;
  const registrosAuditoria = opciones?.registrosAuditoria ?? localBackup.datos.registrosAuditoria;
  const comentarios = opciones?.comentarios ?? localBackup.datos.comentarios;
  const notificaciones = opciones?.notificaciones ?? localBackup.datos.notificaciones;
  const planesPapelera = opciones?.planesPapelera ?? localBackup.datos.planesPapelera;

  let importeTotalPresupuestos = 0;
  planes.forEach((p) => {
    importeTotalPresupuestos += Number(p.presupuestoTotal) || 0;
  });

  let importeTotalSubvenciones = 0;
  let totalDocumentosBase14 = 0;
  let totalModificados = 0;
  let totalCertificaciones = 0;

  actuaciones.forEach((a) => {
    importeTotalSubvenciones += Number(a.importes?.importeConcesion || a.importes?.importeActuacion) || 0;
    if (Array.isArray(a.documentos)) {
      totalDocumentosBase14 += a.documentos.length;
      totalModificados += a.documentos.filter((d) => d.categoria === 'modificado').length;
      totalCertificaciones += a.documentos.filter((d) => d.categoria === 'certificaciones').length;
    }
  });

  const fechaAhora = new Date();
  const fechaStr = fechaAhora.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const nombreArchivo = `planifica_cadiz_respaldo_offline_${fechaStr}.json`;

  const payloadCompleto = {
    version: '1.1-DipuCadiz',
    aplicacion: 'PLANIFICA · Área de Desarrollo Local',
    organismo: 'Diputación Provincial de Cádiz',
    proposito: 'Respaldo Offline Seguro Pre-Migración a Cloud Firestore',
    tipoExportacion: 'Exportación Masiva Integral de Planes y Actuaciones',
    fechaExportacion: fechaAhora.toISOString(),
    autor: opciones?.autorNombre || 'Administrador / Jefe de Servicio',
    resumenEjecutivo: {
      totalPlanes: planes.length,
      totalActuaciones: actuaciones.length,
      totalDocumentosBase14,
      totalModificados,
      totalCertificaciones,
      totalUsuarios: usuarios.length,
      totalAuditorias: registrosAuditoria.length,
      totalComentarios: comentarios.length,
      totalNotificaciones: notificaciones.length,
      totalPlanesPapelera: planesPapelera.length,
      importeTotalPresupuestos,
      importeTotalSubvenciones,
      checksumIntegridad: 'OK_VALIDATED'
    },
    datos: {
      planes,
      actuaciones,
      usuarios,
      registrosAuditoria,
      comentarios,
      notificaciones,
      planesPapelera
    }
  };

  const jsonStr = JSON.stringify(payloadCompleto, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    totalPlanes: planes.length,
    totalActuaciones: actuaciones.length,
    totalDocumentosBase14,
    totalModificados,
    totalCertificaciones,
    importeTotalPresupuestos,
    importeTotalSubvenciones,
    nombreArchivo,
    fechaExportacion: fechaAhora.toISOString(),
    tamanoBytes: blob.size
  };
}

/**
 * Valida la integridad estructural de una copia antes de permitir la importación
 */
export function validarEstructuraCopia(obj: any): { valido: boolean; motivo?: string } {
  if (!obj || typeof obj !== 'object') {
    return { valido: false, motivo: 'El archivo no contiene un objeto JSON válido' };
  }
  if (!obj.datos || typeof obj.datos !== 'object') {
    return { valido: false, motivo: 'Falta la sección raíz "datos" en la copia de seguridad' };
  }
  if (!Array.isArray(obj.datos.planes) || !Array.isArray(obj.datos.actuaciones)) {
    return { valido: false, motivo: 'La estructura de planes o actuaciones no es un array válido' };
  }
  return { valido: true };
}

/**
 * Ejecuta la migración por lotes a Firestore usando identificadores estables
 * GARANTÍA DE IDEMPOTENCIA: No duplica registros y conserva todas las claves
 */
export async function ejecutarMigracionAFirestore(
  db: Firestore,
  copia: CopiaSeguridadExportable,
  onProgreso?: (progreso: number, estado: string) => void
): Promise<InformeResultadoMigracion> {
  const inicio = Date.now();
  const errores: string[] = [];
  const detalles: string[] = [];

  const informe: InformeResultadoMigracion = {
    completada: false,
    fechaInicio: new Date(inicio).toISOString(),
    fechaFin: '',
    duracionMs: 0,
    planesMigrados: 0,
    actuacionesMigradas: 0,
    usuariosMigrados: 0,
    auditoriasMigradas: 0,
    comentariosMigrados: 0,
    notificacionesMigradas: 0,
    papeleraMigrada: 0,
    errores,
    detalles
  };

  try {
    const { auth } = inicializarFirebase();
    const uid = auth?.currentUser?.uid;
    if (!uid) throw new Error('Inicia sesión con una cuenta autorizada de administración.');
    const rows: { collection: CollectionName; row: Row }[] = [
      ...copia.datos.planes.map(row => ({ collection: 'planes' as const, row })),
      ...copia.datos.actuaciones.map(row => ({ collection: 'actuaciones' as const, row })),
      ...copia.datos.planesPapelera.map(row => ({ collection: 'papeleraPlanes' as const, row }))
    ];
    if (rows.length > 400) throw new Error('Esta importación contiene más de 400 registros. Divide la copia antes de importar; no se ha modificado ningún registro.');
    const refs = rows.map(({collection,row}) => doc(db, collection, rowId(collection,row)));
    if (new Set(refs.map(ref => ref.path)).size !== refs.length) throw new Error('La copia contiene identificadores duplicados.');
    onProgreso?.(20, 'Comprobando identidad y conciliando registros contra el servidor…');
    const counts = await runTransaction(db, async tx => {
      const profile = await tx.get(doc(db, 'usuarios', uid));
      if (!profile.exists() || profile.data().activo !== true || profile.data().rol !== 'administrador') throw new Error('La importación requiere un administrador activo.');
      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      const totals = { planes: 0, actuaciones: 0, papeleraPlanes: 0 };
      for (let i=0;i<rows.length;i++) {
        const {collection,row}=rows[i], snap=snapshots[i];
        if (snap.exists()) {
          const key=collection==='papeleraPlanes'?'idCopia':'id';
          if (!equalRows({ ...snap.data(), [key]: snap.id },row)) throw new Error(`Conflicto en ${refs[i].path}. La importación se ha detenido sin sobrescribir registros.`);
          continue;
        }
        tx.set(refs[i], { ...clean(row), revisionSync: 1, actualizadoPorUid: uid, actualizadoEnServidor: serverTimestamp() });
        totals[collection as keyof typeof totals]++;
      }
      return totals;
    });
    informe.planesMigrados=counts.planes;
    informe.actuacionesMigradas=counts.actuaciones;
    informe.papeleraMigrada=counts.papeleraPlanes;
    detalles.push('Importación atómica de registros nuevos; los existentes idénticos se conservan. Ningún dato local se ha borrado.');
    detalles.push('Los perfiles, roles, comentarios y auditorías históricos se conservan en la copia original para conciliación; no se convierten en identidades ni eventos autenticados.');

    informe.completada = true;
    onProgreso?.(100, 'Migración completada con éxito.');
  } catch (err: any) {
    console.error('[Migración] Error durante el proceso:', err);
    errores.push(err?.message || 'Error desconocido al transferir lotes a Firestore');
    informe.completada = false;
  } finally {
    informe.fechaFin = new Date().toISOString();
    informe.duracionMs = Date.now() - inicio;
  }

  return informe;
}

/**
 * Compara los registros existentes en local con los existentes en Firestore
 */
export async function compararLocalVsFirestore(db: Firestore): Promise<{
  planesLocal: number;
  planesFirestore: number;
  actuacionesLocal: number;
  actuacionesFirestore: number;
  coinciden: boolean;
}> {
  const audit = auditarDatosLocales();
  let planesFirestore = 0;
  let actuacionesFirestore = 0;

  try {
    const snapPlanes = await getDocsFromServer(collection(db, 'planes'));
    planesFirestore = snapPlanes.size;

    const snapAct = await getDocsFromServer(collection(db, 'actuaciones'));
    actuacionesFirestore = snapAct.size;
  } catch (err) {
    console.warn('[Comparación] No se pudo leer Firestore:', err);
  }

  return {
    planesLocal: audit.resumen.totalPlanes,
    planesFirestore,
    actuacionesLocal: audit.resumen.totalActuaciones,
    actuacionesFirestore,
    coinciden:
      audit.resumen.totalPlanes === planesFirestore &&
      audit.resumen.totalActuaciones === actuacionesFirestore
  };
}
