import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { inicializarFirebase } from '../services/firebaseConfig';
import { useApp } from '../context/AppContext';

interface AuthModalProps { mostrar: boolean; onCerrar: () => void; }

export const AuthModal: React.FC<AuthModalProps> = ({ mostrar, onCerrar }) => {
  const { usuarioActual, errorAutenticacion } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  if (!mostrar) return null;
  const { auth, status } = inicializarFirebase();
  const acceder = async (google: boolean) => {
    setError(''); setOcupado(true);
    try {
      if (!auth) throw new Error(status.error || 'Firebase no está configurado.');
      if (google) await signInWithPopup(auth, new GoogleAuthProvider());
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
      // La sesión no concede acceso hasta que AppContext valide el perfil remoto.
    } catch {
      setPassword('');
      setError('No se pudo iniciar sesión. Revisa las credenciales, la conexión y el proveedor habilitado en Firebase.');
    } finally { setOcupado(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
    <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
      <h2 id="auth-title" className="font-bold text-xl">Acceso a PLANIFICA</h2>
      <p className="text-sm">Accede con tu cuenta autorizada. Los permisos se comprueban en el proyecto compartido.</p>
      {(error || errorAutenticacion || status.error) && <p role="alert" className="text-red-700">{error || errorAutenticacion || status.error}</p>}
      {usuarioActual ? <>
        <p role="status">Sesión: {usuarioActual.email}</p>
        <button className="p-3 rounded-lg border" disabled={ocupado} onClick={async () => { if (auth) await signOut(auth); }}>Cerrar sesión</button>
        <button className="p-3 rounded-lg border" onClick={onCerrar}>Continuar</button>
      </> : <>
        <button className="w-full p-3 rounded-lg bg-blue-800 text-white disabled:opacity-50" disabled={ocupado || !auth} onClick={() => acceder(true)}>Acceder con Google</button>
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); void acceder(false); }}>
          <label className="block">Correo<input autoComplete="username" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full border rounded-lg p-3" /></label>
          <label className="block">Contraseña<input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full border rounded-lg p-3" /></label>
          <button disabled={ocupado || !auth} className="w-full p-3 rounded-lg border disabled:opacity-50">{ocupado ? 'Verificando…' : 'Acceder con correo y contraseña'}</button>
        </form>
      </>}
    </section>
  </div>;
};
