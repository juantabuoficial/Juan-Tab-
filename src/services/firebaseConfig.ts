/**
 * Configuración centralizada e inicialización de Google Firebase / Cloud Firestore
 * Planifica · Área de Desarrollo Local · Diputación Provincial de Cádiz
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export interface FirebaseConnectionStatus {
  configurada: boolean;
  conectada: boolean;
  projectId: string | null;
  error: string | null;
}

// Variables de entorno o fallback para configuración
const getFirebaseConfigObject = () => {
  // 1. Comprobar si hay variables de entorno inyectadas
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : '');
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';
  const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || '';

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      databaseId
    };
  }

  // 2. Comprobar si hay configuración almacenada en el navegador por el propietario
  try {
    const customConfig = localStorage.getItem('adl_cadiz_firebase_custom_config');
    if (customConfig) {
      const parsed = JSON.parse(customConfig);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {}

  return null;
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

export function inicializarFirebase(): {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  status: FirebaseConnectionStatus;
} {
  const config = getFirebaseConfigObject();

  if (!config) {
    return {
      app: null,
      db: null,
      auth: null,
      storage: null,
      status: {
        configurada: false,
        conectada: false,
        projectId: null,
        error: 'Pendiente de vincular las credenciales del proyecto Firebase en la cuenta del propietario.'
      }
    };
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }

    // La base de datos de AI Studio NO es (default): seleccionar su ID explícito.
    // Si falta, no iniciar Firestore contra una base distinta por accidente.
    const databaseId = config.databaseId || '';
    if (!databaseId) {
      throw new Error('Falta VITE_FIREBASE_DATABASE_ID: no se utilizará la base (default) automáticamente.');
    }
    dbInstance = getFirestore(appInstance, databaseId);
    authInstance = getAuth(appInstance);
    storageInstance = getStorage(appInstance);

    return {
      app: appInstance,
      db: dbInstance,
      auth: authInstance,
      storage: storageInstance,
      status: {
        configurada: true,
        // Inicializar SDK no acredita conectividad ni permisos de Firestore.
        conectada: false,
        projectId: config.projectId,
        error: null
      }
    };
  } catch (err: any) {
    console.error('[Firebase] Error al inicializar cliente:', err);
    return {
      app: null,
      db: null,
      auth: null,
      storage: null,
      status: {
        configurada: true,
        conectada: false,
        projectId: config.projectId || null,
        error: err?.message || 'Error de conexión con Firebase'
      }
    };
  }
}

/**
 * Validador oficial de conexión real con el servidor de Firestore
 */
export async function validarConexionServidorFirestore(db: Firestore): Promise<boolean> {
  try {
    // getDocFromServer garantiza que no se responde desde caché local
    await getDocFromServer(doc(db, '_sistema', 'ping'));
    return true;
  } catch (error: any) {
    // Si no existe el doc pero el servidor responde, la conexión es real
    if (error?.code === 'not-found') return true;
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firebase] Cliente en modo offline');
      return false;
    }
    // permission-denied NO confirma acceso efectivo a la base de datos.
    if (error?.code === 'permission-denied') return false;
    return false;
  }
}

export function guardarConfiguracionFirebaseManual(config: {
  apiKey: string;
  projectId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  databaseId?: string;
}) {
  localStorage.setItem('adl_cadiz_firebase_custom_config', JSON.stringify(config));
  // Reiniciar instancias para que tomen la nueva configuración
  appInstance = null;
  dbInstance = null;
  authInstance = null;
  storageInstance = null;
}
