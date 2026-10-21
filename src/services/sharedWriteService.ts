/**
 * Escritura compartida explícita y optimista de PLANIFICA.
 *
 * No se invoca automáticamente desde AppContext: antes de habilitar escrituras
 * hay que desplegar reglas seguras, provisionar perfiles y comprobar Auth.
 * Cada registro incluye revisionSync para impedir sobrescrituras silenciosas.
 */
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { inicializarFirebase } from './firebaseConfig';
import { comprobarAccesoCompartido } from './sharedAccessService';
import type { PlanSubvencion, Actuacion } from '../types';

type Coleccion = 'planes' | 'actuaciones';
type Registro = PlanSubvencion | Actuacion;
type Rol = 'administrador' | 'jefe_servicio' | 'tecnico' | 'administrativo' | 'auditor' | 'consulta';

export type ResultadoEscritura =
  | { ok: true; id: string; revision: number }
  | { ok: false; error: string; conflicto?: boolean };

function puedeEscribir(coleccion: Coleccion, rol: Rol, crear: boolean): boolean {
  if (coleccion === 'planes') {
    return crear ? rol === 'administrador' : rol === 'administrador' || rol === 'jefe_servicio';
  }
  return ['administrador', 'jefe_servicio', 'tecnico', 'administrativo'].includes(rol);
}

function validarRegistro(registro: Registro): string | null {
  if (!registro || typeof registro.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(registro.id)) {
    return 'Identificador no válido.';
  }
  return null;
}

/**
 * expectedRevision:
 * - null: crear solamente cuando el documento aún no existe.
 * - número >= 0: actualizar únicamente si coincide con revisionSync remota.
 * No usar sobre datos locales iniciales hasta haber realizado una lectura remota.
 */
export async function escribirRegistroCompartido(
  coleccion: Coleccion,
  registro: Registro,
  expectedRevision: number | null
): Promise<ResultadoEscritura> {
  const error = validarRegistro(registro);
  if (error) return { ok: false, error };
  if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) {
    return { ok: false, error: 'Revisión de origen no válida.' };
  }

  const acceso = await comprobarAccesoCompartido();
  if (!acceso.autorizado) return { ok: false, error: acceso.motivo };
  const { db } = inicializarFirebase();
  if (!db) return { ok: false, error: 'No está disponible la base de datos.' };
  const ref = doc(db, coleccion, registro.id);

  try {
    return await runTransaction(db, async tx => {
      const actual = await tx.get(ref);
      const crear = !actual.exists();
      if (!puedeEscribir(coleccion, acceso.rol as Rol, crear)) {
        return { ok: false, error: 'El perfil no tiene permisos para esta operación.' };
      }
      if ((expectedRevision === null && !crear) || (expectedRevision !== null && crear)) {
        return { ok: false, error: 'El registro cambió de estado en el servidor.', conflicto: true };
      }
      const revisionAnterior = crear ? 0 : actual.data().revisionSync;
      if (!crear && (!Number.isSafeInteger(revisionAnterior) || revisionAnterior !== expectedRevision)) {
        return { ok: false, error: 'Conflicto de versión. Recargue antes de guardar.', conflicto: true };
      }
      const revision = crear ? 1 : revisionAnterior + 1;
      // No permitir que propiedades locales gobiernen autoría/revisión remotas.
      const { revisionSync: _ignoredRevision, ...datos } = registro as Registro & { revisionSync?: number };
      tx.set(ref, {
        ...datos,
        revisionSync: revision,
        actualizadoPorUid: acceso.uid,
        actualizadoEnServidor: serverTimestamp()
      });
      return { ok: true, id: registro.id, revision };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
