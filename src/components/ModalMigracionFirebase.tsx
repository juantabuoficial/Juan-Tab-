import { FIRESTORE_DATABASE_ID } from '../services/firebasePublicConfig';
import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  FileJson,
  Layers,
  FolderKanban,
  Euro,
  RefreshCw,
  Clock,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Server
} from 'lucide-react';
import {
  auditarDatosLocales,
  descargarCopiaSeguridadLocalJSON,
  ejecutarMigracionAFirestore,
  compararLocalVsFirestore,
  CopiaSeguridadExportable,
  InformeResultadoMigracion
} from '../services/migrationService';
import {
  inicializarFirebase,
  validarConexionServidorFirestore,
  guardarConfiguracionFirebaseManual,
  FirebaseConnectionStatus
} from '../services/firebaseConfig';
import { formatearMoneda } from '../utils/pdfExport';

interface ModalMigracionFirebaseProps {
  mostrar: boolean;
  onCerrar: () => void;
}

export const ModalMigracionFirebase: React.FC<ModalMigracionFirebaseProps> = ({
  mostrar,
  onCerrar
}) => {
  const [copiaLocal, setCopiaLocal] = useState<CopiaSeguridadExportable | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus>({
    configurada: false,
    conectada: false,
    projectId: null,
    error: null
  });
  const [migrando, setMigrando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeEstado, setMensajeEstado] = useState('');
  const [informeFinal, setInformeFinal] = useState<InformeResultadoMigracion | null>(null);
  const [mostrarConfigManual, setMostrarConfigManual] = useState(false);

  // Estados para formulario manual de credenciales Firebase
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('planifica-cadiz');
  const [appId, setAppId] = useState('');

  // Cargar auditoría local y estado al abrir
  useEffect(() => {
    if (mostrar) {
      const datos = auditarDatosLocales();
      setCopiaLocal(datos);
      comprobarEstadoFirebase();
    }
  }, [mostrar]);

  const comprobarEstadoFirebase = async () => {
    const { db, status } = inicializarFirebase();
    if (status.configurada && db) {
      const servidorOnline = await validarConexionServidorFirestore(db);
      setFirebaseStatus({
        ...status,
        conectada: servidorOnline
      });
    } else {
      setFirebaseStatus(status);
    }
  };

  const handleGuardarConfiguracionManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) return;

    guardarConfiguracionFirebaseManual({
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      storageBucket: `${projectId.trim()}.appspot.com`,
      databaseId: FIRESTORE_DATABASE_ID,
      appId: appId.trim()
    });

    setMostrarConfigManual(false);
    comprobarEstadoFirebase();
  };

  const handleIniciarMigracion = async () => {
    if (!copiaLocal) return;
    const { db } = inicializarFirebase();
    if (!db) {
      alert('Debes configurar y conectar Firebase antes de iniciar la migración.');
      return;
    }

    setMigrando(true);
    setProgreso(5);
    setMensajeEstado('Iniciando lotes de transferencia segura...');
    setInformeFinal(null);

    try {
      const resultado = await ejecutarMigracionAFirestore(
        db,
        copiaLocal,
        (p, msg) => {
          setProgreso(p);
          setMensajeEstado(msg);
        }
      );
      setInformeFinal(resultado);
    } catch (err: any) {
      console.error('Fallo en migración:', err);
    } finally {
      setMigrando(false);
    }
  };

  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Cabecera */}
        <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#004F90] border border-blue-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Database className="w-5 h-5 text-[#004F90]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  Copia de Seguridad y Migración a Firebase
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  No Destructivo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Auditoría completa de datos locales y sincronización a Cloud Firestore
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">

          {/* Banner de Garantía de Protección de Datos */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 text-xs block">
                Protocolo de Seguridad Oficial: Ningún dato local será borrado ni sustituido
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Tus planes, actuaciones, documentos Base 14, importes y registros de auditoría se conservan intactos en el almacenamiento de tu navegador. Antes de cualquier sincronización en la nube, puedes descargar una copia de seguridad en JSON.
              </p>
            </div>
          </div>

          {/* 1. Resumen de la Auditoría de Datos Locales */}
          {copiaLocal && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  1. Auditoría de Datos en este Navegador (localStorage v2)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(copiaLocal.fechaExportacion).toLocaleString('es-ES')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Planes Activos
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {copiaLocal.resumen.totalPlanes}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
                    {formatearMoneda(copiaLocal.resumen.importeTotalPresupuestos)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Actuaciones
                  </span>
                  <div className="text-xl font-black text-[#004F90] font-mono">
                    {copiaLocal.resumen.totalActuaciones}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
                    {formatearMoneda(copiaLocal.resumen.importeTotalSubvenciones)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Libro Auditoría
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {copiaLocal.resumen.totalAuditorias}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Trazabilidad sellada
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Papelera (30d)
                  </span>
                  <div className="text-xl font-black text-amber-700 font-mono">
                    {copiaLocal.resumen.totalPapelera}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Custodia protegida
                  </span>
                </div>
              </div>

              {/* Botón para descargar el JSON de inmediato */}
              <button
                type="button"
                onClick={descargarCopiaSeguridadLocalJSON}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-300 hover:border-[#004F90] bg-white hover:bg-blue-50/50 text-slate-800 hover:text-[#004F90] font-bold text-xs shadow-2xs transition"
              >
                <Download className="w-4 h-4 text-[#004F90]" />
                <span>Descargar Copia de Seguridad Completa en JSON (Respaldo en tu Equipo)</span>
              </button>
            </div>
          )}

          {/* 2. Estado de Conexión a Firebase */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              2. Infraestructura Firebase & Cloud Firestore
            </span>

            <div className={`p-4 rounded-2xl border ${
              firebaseStatus.conectada
                ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                : 'bg-amber-50/60 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Server className={`w-5 h-5 ${firebaseStatus.conectada ? 'text-[#004F90]' : 'text-amber-700'}`} />
                  <div>
                    <span className="font-bold text-xs block">
                      {firebaseStatus.conectada
                        ? `Conectado a Firebase (${firebaseStatus.projectId})`
                        : firebaseStatus.configurada
                        ? 'Configurado · Verificando conexión...'
                        : 'Pendiente de Proyecto Firebase en tu cuenta'}
                    </span>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {firebaseStatus.conectada
                        ? 'Base de datos Firestore activa y lista para sincronización compartida con David.'
                        : 'Para que dos desarrolladores (Juan en AI Studio y David en ChatGPT) compartan datos, se requiere vincular el proyecto de Firebase.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarConfigManual(!mostrarConfigManual)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shrink-0 shadow-2xs"
                >
                  {mostrarConfigManual ? 'Ocultar' : 'Configurar Claves'}
                </button>
              </div>

              {/* Formulario desplegable para introducir credenciales si se tienen */}
              {mostrarConfigManual && (
                <form onSubmit={handleGuardarConfiguracionManual} className="mt-4 pt-3 border-t border-amber-200/60 space-y-3">
                  <span className="font-bold text-[11px] block text-slate-900">
                    Credenciales de tu Web App en Firebase Console:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                        Project ID (ej: planifica-cadiz)
                      </label>
                      <input
                        type="text"
                        required
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                        API Key (apiKey de Firebase)
                      </label>
                      <input
                        type="text"
                        required
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#004F90] text-white font-bold text-xs"
                    >
                      Guardar y Probar Conexión
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* 3. Acción de Migración Explícita */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              3. Operación de Migración por Lotes (Idempotente)
            </span>

            {migrando && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{mensajeEstado}</span>
                  <span className="font-mono">{progreso}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#004F90] transition-all duration-300 rounded-full"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>
            )}

            {informeFinal && (
              <div className={`p-4 rounded-2xl border space-y-2 ${
                informeFinal.completada
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  {informeFinal.completada ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {informeFinal.completada
                      ? `¡Migración completada con éxito en ${informeFinal.duracionMs} ms!`
                      : 'La migración no se completó debido a errores.'}
                  </span>
                </div>
                <div className="text-[11px] space-y-0.5 opacity-90 font-medium">
                  <div>• Planes subidos a Firestore: {informeFinal.planesMigrados}</div>
                  <div>• Actuaciones subidas: {informeFinal.actuacionesMigradas}</div>
                  <div>• Usuarios migrados: {informeFinal.usuariosMigrados}</div>
                  <div>• Auditoría migrada: {informeFinal.auditoriasMigradas}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={migrando || !firebaseStatus.conectada}
              onClick={handleIniciarMigracion}
              className={`w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-white font-black text-xs shadow-md transition ${
                firebaseStatus.conectada && !migrando
                  ? 'bg-[#004F90] hover:bg-[#003B71] active:scale-[0.99]'
                  : 'bg-slate-400 cursor-not-allowed opacity-70'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {migrando
                  ? 'Migrando datos a Firestore...'
                  : firebaseStatus.conectada
                  ? 'Iniciar Migración a Firestore (Autorización Expresa)'
                  : 'Conecta Firebase antes de iniciar la migración'}
              </span>
            </button>
          </div>
        </div>

        {/* Pie */}
        <div className="p-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Planifica v1.0 · Sistema de Control de Integridad y Backup
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
