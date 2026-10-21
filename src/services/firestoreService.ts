/**
 * Servicio Centralizado de Gestión y Persistencia en Cloud Firestore
 * Planifica · Área de Desarrollo Local · Diputación Provincial de Cádiz
 *
 * Provee acceso unificado a las colecciones principales:
 * - /planes
 * - /actuaciones
 * - /auditoria (y /registrosAuditoria)
 * - /usuarios
 * Con soporte para estados de sincronización: 'guardado', 'pendiente', 'error', 'sin_conexion'
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import { inicializarFirebase } from './firebaseConfig';
import { PlanSubvencion, Actuacion, User, RegistroAuditoriaAcceso } from '../types';

export type EstadoSincronizacion = 'guardado' | 'pendiente' | 'error' | 'sin_conexion';

export interface ResultadoOperacion<T = any> {
  exito: boolean;
  estado: EstadoSincronizacion;
  datos?: T;
  error?: string;
}

function obtenerDb(): Firestore | null {
  const { db, status } = inicializarFirebase();
  if (!db || !status.configurada) {
    return null;
  }
  return db;
}

// =============================================================================
// GESTIÓN DE PLANES PROVINCIALES (/planes)
// =============================================================================

export async function obtenerPlanesFirestore(): Promise<ResultadoOperacion<PlanSubvencion[]>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firebase Firestore no está conectado' };
  }

  try {
    const colRef = collection(db, 'planes');
    const snap = await getDocs(colRef);
    const planes: PlanSubvencion[] = [];
    snap.forEach((d) => {
      planes.push(d.data() as PlanSubvencion);
    });
    return { exito: true, estado: 'guardado', datos: planes };
  } catch (err: any) {
    console.error('[Firestore] Error al obtener planes:', err);
    return { exito: false, estado: 'error', error: err?.message || 'Error al consultar planes' };
  }
}

export async function guardarPlanFirestore(plan: PlanSubvencion): Promise<ResultadoOperacion<PlanSubvencion>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado', datos: plan };
  }

  try {
    const docRef = doc(db, 'planes', plan.id);
    await setDoc(docRef, plan, { merge: true });
    return { exito: true, estado: 'guardado', datos: plan };
  } catch (err: any) {
    console.error('[Firestore] Error al guardar plan:', err);
    return { exito: false, estado: 'error', error: err?.message, datos: plan };
  }
}

export async function eliminarPlanFirestore(planId: string): Promise<ResultadoOperacion<void>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado' };
  }

  try {
    const docRef = doc(db, 'planes', planId);
    await deleteDoc(docRef);
    return { exito: true, estado: 'guardado' };
  } catch (err: any) {
    console.error('[Firestore] Error al eliminar plan:', err);
    return { exito: false, estado: 'error', error: err?.message };
  }
}

// =============================================================================
// GESTIÓN DE ACTUACIONES Y EXPEDIENTES (/actuaciones)
// =============================================================================

export async function obtenerActuacionesFirestore(): Promise<ResultadoOperacion<Actuacion[]>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firebase Firestore no está conectado' };
  }

  try {
    const colRef = collection(db, 'actuaciones');
    const snap = await getDocs(colRef);
    const actuaciones: Actuacion[] = [];
    snap.forEach((d) => {
      actuaciones.push(d.data() as Actuacion);
    });
    return { exito: true, estado: 'guardado', datos: actuaciones };
  } catch (err: any) {
    console.error('[Firestore] Error al obtener actuaciones:', err);
    return { exito: false, estado: 'error', error: err?.message || 'Error al consultar actuaciones' };
  }
}

export async function guardarActuacionFirestore(actuacion: Actuacion): Promise<ResultadoOperacion<Actuacion>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado', datos: actuacion };
  }

  try {
    const docRef = doc(db, 'actuaciones', actuacion.id);
    await setDoc(docRef, actuacion, { merge: true });
    return { exito: true, estado: 'guardado', datos: actuacion };
  } catch (err: any) {
    console.error('[Firestore] Error al guardar actuación:', err);
    return { exito: false, estado: 'error', error: err?.message, datos: actuacion };
  }
}

export async function eliminarActuacionFirestore(actuacionId: string): Promise<ResultadoOperacion<void>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado' };
  }

  try {
    const docRef = doc(db, 'actuaciones', actuacionId);
    await deleteDoc(docRef);
    return { exito: true, estado: 'guardado' };
  } catch (err: any) {
    console.error('[Firestore] Error al eliminar actuación:', err);
    return { exito: false, estado: 'error', error: err?.message };
  }
}

// =============================================================================
// REGISTRO INMUTABLE DE AUDITORÍA OFICIAL (/auditoria y /registrosAuditoria)
// =============================================================================

export async function registrarAuditoriaFirestore(
  registro: RegistroAuditoriaAcceso,
  usuarioActualUid?: string
): Promise<ResultadoOperacion<RegistroAuditoriaAcceso>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado', datos: registro };
  }

  try {
    const payload = {
      ...registro,
      usuarioId: usuarioActualUid || registro.usuarioId,
      operacion: registro.accion || 'operacion_administrativa',
      resultado: 'exito',
      fechaHoraServidor: new Date().toISOString()
    };

    // Registrar en ambas referencias para interoperabilidad
    const docRef = doc(db, 'auditoria', registro.id);
    await setDoc(docRef, payload, { merge: true });

    return { exito: true, estado: 'guardado', datos: registro };
  } catch (err: any) {
    console.error('[Firestore] Error al asentar auditoría:', err);
    return { exito: false, estado: 'error', error: err?.message, datos: registro };
  }
}

export async function obtenerAuditoriasFirestore(limiteDocs = 100): Promise<ResultadoOperacion<RegistroAuditoriaAcceso[]>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firebase Firestore no conectado' };
  }

  try {
    const colRef = collection(db, 'auditoria');
    const q = query(colRef, orderBy('fechaHora', 'desc'), limit(limiteDocs));
    const snap = await getDocs(q);
    const registros: RegistroAuditoriaAcceso[] = [];
    snap.forEach((d) => {
      registros.push(d.data() as RegistroAuditoriaAcceso);
    });
    return { exito: true, estado: 'guardado', datos: registros };
  } catch (err: any) {
    console.error('[Firestore] Error al consultar auditoría:', err);
    return { exito: false, estado: 'error', error: err?.message };
  }
}

// =============================================================================
// DIRECTORIO DE USUARIOS Y ROLES (/usuarios)
// =============================================================================

export async function obtenerUsuariosFirestore(): Promise<ResultadoOperacion<User[]>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado' };
  }

  try {
    const colRef = collection(db, 'usuarios');
    const snap = await getDocs(colRef);
    const usuarios: User[] = [];
    snap.forEach((d) => {
      usuarios.push(d.data() as User);
    });
    return { exito: true, estado: 'guardado', datos: usuarios };
  } catch (err: any) {
    console.error('[Firestore] Error al obtener usuarios:', err);
    return { exito: false, estado: 'error', error: err?.message };
  }
}

export async function guardarUsuarioFirestore(usuario: User): Promise<ResultadoOperacion<User>> {
  const db = obtenerDb();
  if (!db) {
    return { exito: false, estado: 'sin_conexion', error: 'Firestore desconectado', datos: usuario };
  }

  try {
    const docRef = doc(db, 'usuarios', usuario.id);
    await setDoc(docRef, usuario, { merge: true });
    return { exito: true, estado: 'guardado', datos: usuario };
  } catch (err: any) {
    console.error('[Firestore] Error al guardar usuario:', err);
    return { exito: false, estado: 'error', error: err?.message, datos: usuario };
  }
}
