/**
 * Configuración centralizada e inicialización de Google Firebase / Cloud Firestore
 * Planifica · Área de Desarrollo Local · Diputación Provincial de Cádiz
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { connectAuthEmulator, getAuth, Auth } from 'firebase/auth';
import { FIREBASE_PUBLIC_CONFIG, FIRESTORE_DATABASE_ID } from './firebasePublicConfig';
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
  const env = import.meta.env ?? {};
  if (env.DEV && env.VITE_PLANIFICA_EMULATORS === 'true') {
    return { ...FIREBASE_PUBLIC_CONFIG, projectId: 'demo-planifica', apiKey: 'demo-only', authDomain: 'localhost', appId: 'demo-planifica', databaseId: FIRESTORE_DATABASE_ID };
  }
  const apiKey = env.VITE_FIREBASE_API_KEY || '';
  const projectId = env.VITE_FIREBASE_PROJECT_ID || '';
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : '');
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = env.VITE_FIREBASE_APP_ID || '';
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || '';

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

  return { ...FIREBASE_PUBLIC_CONFIG, databaseId: FIRESTORE_DATABASE_ID };
};

let emulatorsConnected = false;
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
    const databaseId = config.databaseId || '';
    const emulatorMode = import.meta.env?.DEV && import.meta.env?.VITE_PLANIFICA_EMULATORS === 'true';
    if ((!emulatorMode && config.projectId !== FIREBASE_PUBLIC_CONFIG.projectId) || databaseId !== FIRESTORE_DATABASE_ID) {
      throw new Error('La configuración debe apuntar al proyecto y la base existentes de Juan. No se ha abierto otra base.');
    }
    appInstance = getApps().find(app => app.options.projectId === config.projectId && app.options.appId === config.appId)
      || initializeApp(config, 'planifica-shared');
    dbInstance = getFirestore(appInstance, databaseId);
    authInstance = getAuth(appInstance);
    storageInstance = getStorage(appInstance);
    if (emulatorMode && !emulatorsConnected) {
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8085);
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
      emulatorsConnected = true;
    }

    return {
      app: appInstance,
      db: dbInstance,
      auth: authInstance,
      storage: storageInstance,
      status: {
        configurada: true,
        // Inicializar el SDK no acredita conectividad. La sesión y las lecturas la verifican.
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
    const uid = authInstance?.currentUser?.uid;
    if (!uid) return false;
    const profile = await getDocFromServer(doc(db, 'usuarios', uid));
    if (!profile.exists() || profile.data().activo !== true) return false;
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
