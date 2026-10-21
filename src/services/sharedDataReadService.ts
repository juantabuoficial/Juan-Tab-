/**
 * Lectura segura de PLANIFICA desde la base compartida de Juan.
 * No inicializa colecciones, no migra datos locales y no escribe datos de ejemplo.
 * Hasta habilitar el flujo autenticado en la interfaz, este módulo es opt-in.
 */
import type { PlanSubvencion, Actuacion } from '../types';
import { comprobarAccesoCompartido } from './sharedAccessService';
import { obtenerPlanesFirestore, obtenerActuacionesFirestore } from './firestoreService';

export type LecturaCompartida =
  | { ok: true; planes: PlanSubvencion[]; actuaciones: Actuacion[]; uid: string }
  | { ok: false; motivo: string };

export async function leerDatosCompartidos(): Promise<LecturaCompartida> {
  const acceso = await comprobarAccesoCompartido();
  if (!acceso.autorizado) {
    return { ok: false, motivo: acceso.motivo };
  }

  // Una colección vacía es válida; los datos iniciales del navegador
  // no deben publicarse ni mezclarse automáticamente con Firestore.
  const [planes, actuaciones] = await Promise.all([
    obtenerPlanesFirestore(),
    obtenerActuacionesFirestore()
  ]);
  if (!planes.exito || !actuaciones.exito) {
    return {
      ok: false,
      motivo: planes.error || actuaciones.error || 'No se pudieron consultar los datos compartidos.'
    };
  }
  return {
    ok: true,
    uid: acceso.uid,
    planes: planes.datos ?? [],
    actuaciones: actuaciones.datos ?? []
  };
}
