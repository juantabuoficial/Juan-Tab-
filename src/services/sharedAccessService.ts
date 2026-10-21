/**
 * Puerta de entrada a la sincronización compartida.
 * No confundir usuarios del estado React con identidades de Firebase Auth.
 * Cualquier acceso debe comprobar un perfil activo, creado por administración.
 */
import { getDocFromServer, doc } from 'firebase/firestore';
import { inicializarFirebase } from './firebaseConfig';

export type AccesoCompartido =
  | { autorizado: true; uid: string; rol: string }
  | { autorizado: false; motivo: string };

const ROLES_VALIDOS = new Set([
  'administrador', 'jefe_servicio', 'tecnico',
  'administrativo', 'auditor', 'consulta'
]);

export async function comprobarAccesoCompartido(): Promise<AccesoCompartido> {
  const { auth, db, status } = inicializarFirebase();
  if (!db || !auth || !status.configurada) {
    return { autorizado: false, motivo: 'Firebase no está configurado para la base de datos de Juan.' };
  }
  const identity = auth.currentUser;
  if (!identity) {
    return { autorizado: false, motivo: 'Es necesario iniciar sesión con Firebase Authentication.' };
  }
  try {
    // Solo lectura contra servidor: jamás crear aquí un perfil ni asignar privilegios.
    const perfil = await getDocFromServer(doc(db, 'usuarios', identity.uid));
    if (!perfil.exists()) {
      return { autorizado: false, motivo: 'Falta activar el perfil administrativamente en /usuarios/{uid}.' };
    }
    const data = perfil.data();
    if (data.activo !== true || !ROLES_VALIDOS.has(data.rol)) {
      return { autorizado: false, motivo: 'Perfil desactivado o con rol no autorizado.' };
    }
    return { autorizado: true, uid: identity.uid, rol: data.rol };
  } catch (error: unknown) {
    return {
      autorizado: false,
      motivo: 'No se pudo validar el perfil contra Firestore: ' +
        (error instanceof Error ? error.message : String(error))
    };
  }
}
