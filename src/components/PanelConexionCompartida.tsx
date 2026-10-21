import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { inicializarFirebase } from '../services/firebaseConfig';
import { leerDatosCompartidos } from '../services/sharedDataReadService';

/**
 * Panel de diagnóstico explícito. No importa, sobrescribe ni publica registros.
 * La sesión local de PLANIFICA no representa una sesión Firebase autenticada.
 */
export function PanelConexionCompartida() {
  const { auth, status } = inicializarFirebase();
  const [identidad, setIdentidad] = useState<FirebaseUser | null>(auth?.currentUser ?? null);
  const [mensaje, setMensaje] = useState('Sin comprobación de acceso');
  const [resumen, setResumen] = useState<{ planes: number; actuaciones: number } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, u => {
      setIdentidad(u);
      setResumen(null);
      setMensaje(u ? 'Sesión Firebase identificada. Compruebe permisos para leer.' : 'No hay sesión Firebase autenticada.');
    });
  }, [auth]);

  const ejecutar = async (accion: 'login' | 'logout' | 'lectura') => {
    if (!auth) { setMensaje(status.error || 'Firebase no está configurado.'); return; }
    setOcupado(true);
    setResumen(null);
    try {
      if (accion === 'login') {
        await signInWithPopup(auth, new GoogleAuthProvider());
        setMensaje('Autenticación recibida; compruebe ahora los permisos de Firestore.');
      } else if (accion === 'logout') {
        await signOut(auth);
        setMensaje('Sesión Firebase cerrada.');
      } else {
        const resultado = await leerDatosCompartidos();
        if (resultado.ok) {
          setResumen({ planes: resultado.planes.length, actuaciones: resultado.actuaciones.length });
          setMensaje('Lectura comprobada contra Firestore. Ningún registro ha sido modificado.');
        } else {
          setMensaje(resultado.motivo);
        }
      }
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : String(error));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3" aria-label="Diagnóstico de Firebase compartido">
      <h2 className="font-bold text-slate-900">Conexión compartida de Firebase (diagnóstico)</h2>
      <p className="text-sm text-slate-600">Solo lectura de comprobación. Los planes y actuaciones locales no se sincronizan automáticamente.</p>
      <p className="text-sm">Proyecto: {status.projectId || 'Sin configurar'}</p>
      <p className="text-sm">Sesión Firebase: {identidad?.email || 'Sin iniciar sesión'}</p>
      <div className="flex gap-2 flex-wrap">
        <button disabled={ocupado || !auth} onClick={() => ejecutar('login')} className="rounded-lg bg-blue-700 text-white px-3 py-2 disabled:opacity-50">Acceder con Google</button>
        <button disabled={ocupado || !identidad} onClick={() => ejecutar('lectura')} className="rounded-lg bg-slate-800 text-white px-3 py-2 disabled:opacity-50">Comprobar lectura</button>
        <button disabled={ocupado || !identidad} onClick={() => ejecutar('logout')} className="rounded-lg border px-3 py-2 disabled:opacity-50">Cerrar sesión Firebase</button>
      </div>
      <p role="status" className="text-sm text-slate-700">{mensaje}</p>
      {resumen && <p className="text-sm font-medium">Registros remotos: {resumen.planes} planes y {resumen.actuaciones} actuaciones.</p>}
    </section>
  );
}
