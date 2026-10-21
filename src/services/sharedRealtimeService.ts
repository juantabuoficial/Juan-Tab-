/**
 * Suscripción opcional a cambios de Firestore, con control de identidad.
 * No modifica localStorage ni reemplaza el estado de React automáticamente.
 * El consumidor debe conciliar los registros y liberar la suscripción.
 */
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { PlanSubvencion, Actuacion } from '../types';
import { inicializarFirebase } from './firebaseConfig';
import { comprobarAccesoCompartido } from './sharedAccessService';

export interface EstadoRemoto {
  planes: PlanSubvencion[];
  actuaciones: Actuacion[];
}

export interface SuscripcionCompartida {
  cerrar: () => void;
}

export async function suscribirDatosCompartidos(
  onDatos: (datos: EstadoRemoto) => void,
  onError: (error: Error) => void
): Promise<SuscripcionCompartida> {
  const acceso = await comprobarAccesoCompartido();
  if (!acceso.autorizado) {
    throw new Error(acceso.motivo);
  }
  const { db, auth } = inicializarFirebase();
  if (!db || !auth || auth.currentUser?.uid !== acceso.uid) {
    throw new Error('La sesión autenticada ha cambiado.');
  }

  let cerrada = false;
  let unsubscribePlanes: Unsubscribe = () => {};
  let unsubscribeActuaciones: Unsubscribe = () => {};
  let cancelarAuth: Unsubscribe = () => {};
  let planes: PlanSubvencion[] | null = null;
  let actuaciones: Actuacion[] | null = null;

  const cerrar = () => {
    if (cerrada) return;
    cerrada = true;
    unsubscribePlanes();
    unsubscribeActuaciones();
    cancelarAuth();
  };
  const fallo = (error: Error) => { cerrar(); onError(error); };
  const emitir = () => {
    if (cerrada) return;
    if (auth.currentUser?.uid !== acceso.uid) {
      fallo(new Error('Sesión modificada: vuelva a iniciar sesión.'));
      return;
    }
    if (planes !== null && actuaciones !== null) {
      onDatos({ planes, actuaciones });
    }
  };

  // Se mantiene en memoria y no se envía automáticamente a ninguna colección.
  cancelarAuth = auth.onAuthStateChanged(usuario => {
    if (usuario?.uid !== acceso.uid) fallo(new Error('Sesión cerrada o cambiada.'));
  });
  const cerrarConAuth = cerrar;
  // Instalar callbacks separados: nunca representar carga parcial como sincronización completa.
  try {
    unsubscribePlanes = onSnapshot(
      collection(db, 'planes'),
      snapshot => { planes = snapshot.docs.map(d => d.data() as PlanSubvencion); emitir(); },
      fallo
    );
    unsubscribeActuaciones = onSnapshot(
      collection(db, 'actuaciones'),
      snapshot => { actuaciones = snapshot.docs.map(d => d.data() as Actuacion); emitir(); },
      fallo
    );
  } catch (error) {
    cerrarConAuth();
    throw error;
  }
  return { cerrar: cerrarConAuth };
}
