import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { leerDatosCompartidos } from '../services/sharedDataReadService';
import {
  Actuacion,
  DocumentoActuacion,
  CampoRevisar,
  User,
  FiltrosBusqueda,
  ConfiguracionUsuario,
  NotificacionSistema,
  RegistroAuditoriaAcceso,
  CuadroLiquidacion,
  PlanSubvencion,
  ActuacionEnPlan,
  ComentarioActuacion,
  ParticipanteRevision,
  RondaSubsanacion,
  InformeFavorableDocumento,
  CopiaSeguridadPlan
} from '../types';
import {
  ACTUACIONES_INICIALES,
  USUARIOS_INICIALES,
  PLANES_INICIALES,
  COMENTARIOS_INICIALES,
  PLANTILLA_DOCUMENTOS_SOLICITUD,
  generarChecklistPorDefecto,
  construirDocumentosCompletos
} from '../data/initialData';
import {
  verificarAlertasVencimientos,
  enviarNotificacionPushNativa
} from '../utils/notifications';
import { limpiarNombreEELL } from '../utils/eellUtils';

interface AppContextType {
  // Datos
  actuaciones: Actuacion[];
  actuacionActiva: Actuacion | null;
  documentoActivoIndex: number;
  documentoActivo: DocumentoActuacion | null;
  usuarioActual: User | null;
  usuarios: User[];
  registrosAuditoria: RegistroAuditoriaAcceso[];
  notificaciones: NotificacionSistema[];
  filtros: FiltrosBusqueda;
  configuracion: ConfiguracionUsuario;
  planes: PlanSubvencion[];
  planesPapelera: CopiaSeguridadPlan[];
  comentarios: ComentarioActuacion[];

  // Estados de interfaz y red
  estadoSincronizacion: 'sincronizado' | 'guardando' | 'offline';
  isOnline: boolean;
  alertaCamposIncompletos: {
    mostrar: boolean;
    camposFaltantes: CampoRevisar[];
    documentoOrigenTitulo: string;
    destinoIndex: number;
  } | null;
  modalPapeleraAbierto: boolean;
  abrirModalPapelera: () => void;
  cerrarModalPapelera: () => void;

  // Acciones de navegación
  seleccionarActuacion: (id: string | null) => void;
  cambiarDocumentoPestana: (index: number, forzar?: boolean) => boolean;
  cerrarAlertaCampos: () => void;
  confirmarSaltoForzado: () => void;

  // Acciones de revisión técnica
  actualizarEstadoCampo: (
    campoId: string,
    nuevoEstado: 'conforme' | 'no_conforme',
    observacion?: string,
    subsanaciones?: string[]
  ) => void;
  actualizarMetadatosDocumento: (metadatos: Partial<DocumentoActuacion['metadatos']>) => void;
  actualizarLiquidacion: (liquidacion: Partial<CuadroLiquidacion>) => void;
  actualizarActuacionCabecera: (datos: Partial<Actuacion>) => void;
  marcarDocumentoRevisado: (completado: boolean) => void;
  marcarDocumentoNoProcede: (noProcede: boolean) => void;
  marcarDocumentoNoProcedePorIndex: (docIndex: number, noProcede: boolean) => void;
  autovalidarTodoConformeDocumento: () => void;
  autovalidarTodoConformePorIndex: (docIndex: number) => void;
  autovalidarTodaActuacion: () => void;
  agregarCertificacionAActuacion: (actuacionId: string) => DocumentoActuacion | null;
  agregarFacturaAActuacion: (actuacionId: string) => DocumentoActuacion | null;
  agregarModificadoProyecto: (actuacionId: string, despuesDeDocId?: string) => DocumentoActuacion | null;
  eliminarDocumentoDeActuacion: (actuacionId: string, docId: string) => void;
  guardarRondaSubsanacion: (docIndex: number, nuevaRonda: RondaSubsanacion) => void;
  firmarInformeFavorable: (docIndex: number, informe: InformeFavorableDocumento) => void;

  // Gestión de actuaciones
  crearNuevaActuacion: (datos: Partial<Actuacion>) => Actuacion;
  actualizarActuacion: (id: string, datos: Partial<Actuacion>) => void;
  eliminarActuacion: (id: string) => void;
  asignarTecnicoActuacion: (actuacionId: string, tecnicoId: string) => void;

  // Gestión de Planes de Subvenciones
  crearPlan: (plan: Omit<PlanSubvencion, 'id' | 'fechaCreacion'>) => PlanSubvencion;
  actualizarPlan: (plan: PlanSubvencion) => void;
  eliminarPlan: (id: string, guardarCopia?: boolean) => void;
  restaurarPlan: (idCopia: string) => boolean;
  eliminarCopiaDefinitiva: (idCopia: string) => void;
  vaciarPapeleraPlanes: () => void;
  purgarPlanesExpirados: () => number;
  generarActuacionesDesdePlan: (planId: string) => number;
  agregarActuacionAlPlan: (
    planId: string,
    datos: {
      numero: string;
      entidadLocal: string;
      titulo: string;
      aplicacionPresupuestaria: string;
      subvencionSolicitada: number;
      plazoEjecucion?: string;
      plazoJustificacion?: string;
    }
  ) => Actuacion;
  editarActuacionDePlan: (
    planId: string,
    actuacionPlanId: string,
    datos: Partial<ActuacionEnPlan> & { plazoEjecucion?: string; plazoJustificacion?: string }
  ) => void;
  eliminarActuacionDePlan: (planId: string, actuacionPlanId: string) => void;
  importarActuacionesPDFAlPlan: (
    planId: string,
    actuacionesParsed: {
      numero: string;
      entidadLocal: string;
      titulo: string;
      aplicacionPresupuestaria: string;
      subvencionSolicitada: number;
    }[],
    planOverride?: PlanSubvencion
  ) => number;
  importarPlanCompletoDesdeBasesPDF: (
    datosPlan: {
      nombre: string;
      codigo: string;
      ejercicio: number;
      plazoEjecucionMaximo: string;
      plazoJustificacionMaximo: string;
      plazoEjecucionAmpliado?: string;
      plazoJustificacionAmpliado?: string;
      presupuestoTotal: number;
      descripcion?: string;
    },
    actuacionesParsed: {
      numero: string;
      entidadLocal: string;
      titulo: string;
      aplicacionPresupuestaria: string;
      subvencionSolicitada: number;
    }[],
    vincularPlanId?: string
  ) => { plan: PlanSubvencion; totalCreadas: number };

  // Comentarios y Notificaciones por Correo a Técnicos
  enviarComentarioActuacion: (actuacionId: string, destinatarioId: string, mensaje: string, enviarEmail?: boolean) => Promise<ComentarioActuacion>;
  marcarComentarioLeido: (id: string) => void;

  // Filtros y búsquedas
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosBusqueda>>;
  limpiarFiltros: () => void;

  // Usuarios y roles
  cambiarUsuarioActivo: (usuarioId: string) => void;
  actualizarUsuario: (usuario: User) => void;
  crearUsuario: (usuario: Omit<User, 'id'>) => void;

  // Configuración y Notificaciones
  actualizarConfiguracion: (config: Partial<ConfiguracionUsuario>) => void;
  marcarNotificacionLeida: (id: string) => void;
  limpiarTodasNotificaciones: () => void;

  // Auditoría
  registrarAccionAuditoria: (
    accion: RegistroAuditoriaAcceso['accion'],
    docId?: string,
    docTitulo?: string,
    detalles?: string
  ) => void;

  // Sincronización manual / forzada
  forzarSincronizacion: () => Promise<void>;
  reiniciarDatosFabrica: () => void;
}

const STORAGE_KEYS = {
  ACTUACIONES: 'adl_cadiz_actuaciones_v2',
  USUARIOS: 'adl_cadiz_usuarios_v2',
  USUARIO_ACTUAL: 'adl_cadiz_usuario_activo_v2',
  AUDITORIA: 'adl_cadiz_auditoria_v2',
  CONFIG: 'adl_cadiz_config_v2',
  NOTIFICACIONES: 'adl_cadiz_notificaciones_v2',
  PLANES: 'adl_cadiz_planes_v2',
  PLANES_PAPELERA: 'adl_cadiz_planes_papelera_v2',
  COMENTARIOS: 'adl_cadiz_comentarios_v2'
};

// No eliminar claves heredadas automáticamente: podrían contener expedientes reales.
// La migración y la limpieza deben hacerse tras una copia de seguridad verificada.

const FILTROS_DEFECTO: FiltrosBusqueda = {
  plan: '',
  entidadLocal: '',
  numeroActuacion: '',
  titulo: '',
  fecha: '',
  estado: '',
  palabraClave: '',
  ordenCronologico: 'desc',
  ano: '',
  aplicacionPresupuestaria: '',
  importe: '',
  tecnico: ''
};

const CONFIG_DEFECTO: ConfiguracionUsuario = {
  notificacionesPush: true,
  recordatoriosEmailDiarios: true,
  alertasVencimientoDias: 30,
  sincronizacionNubeAutomatica: true,
  cifradoExtremoAExtremo: true,
  modoOscuro: 'light',
  autenticacionBiometrica: true,
  autenticacion2FA: true
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Cargar Usuarios
  const [usuarios, setUsuarios] = useState<User[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      if (guardado) {
        const parsed: User[] = JSON.parse(guardado);
        // Garantizar que el Jefe de Servicio es JUAN HINOJO GARCÍA
        return parsed.map((u) => {
          if (u.id === 'usr-jefe-1' || u.rol === 'jefe_servicio') {
            return {
              ...u,
              nombre: 'Juan',
              apellidos: 'Hinojo García',
              email: 'juan.tabu.oficial@gmail.com'
            };
          }
          return u;
        });
      }
      return USUARIOS_INICIALES;
    } catch {
      return USUARIOS_INICIALES;
    }
  });

  // 2. Usuario activo (autenticación automática garantizada: JUAN HINOJO GARCÍA - Jefe de Servicio)
  const [usuarioActual, setUsuarioActual] = useState<User>(() => {
    const jefeOficial: User = {
      id: 'usr-jefe-1',
      nombre: 'Juan',
      apellidos: 'Hinojo García',
      nif: '28765432Z',
      email: 'juan.tabu.oficial@gmail.com',
      rol: 'jefe_servicio',
      departamento: 'Área de Desarrollo Local',
      cargo: 'Jefe del Servicio de Asistencia Técnica y Obras',
      telefono: '+34 956 240 100',
      biometriaHabilitada: true,
      dosFactoresHabilitado: true,
      activo: true,
      fechaAlta: '2024-01-10',
      permisos: {
        puedeEditarPlanes: true,
        puedeAsignarTecnicos: true,
        puedeCalificarDocumentos: true,
        puedeExportarInformes: true,
        puedeEnviarComentarios: true,
        puedeGestionarUsuarios: true
      },
      ultimoAcceso: new Date().toISOString()
    };

    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.USUARIO_ACTUAL);
      if (guardado) {
        const u = JSON.parse(guardado);
        if (u && (u.id === 'usr-jefe-1' || u.rol === 'jefe_servicio' || u.email?.includes('juan'))) {
          return { ...u, ...jefeOficial };
        }
        if (u && u.id) return u;
      }
    } catch {}

    try {
      localStorage.setItem(STORAGE_KEYS.USUARIO_ACTUAL, JSON.stringify(jefeOficial));
    } catch {}
    return jefeOficial;
  });

  // 3. Actuaciones
  const [actuaciones, setActuaciones] = useState<Actuacion[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.ACTUACIONES);
      if (guardado) {
        const parsed: Actuacion[] = JSON.parse(guardado);
        const mapeados: Actuacion[] = parsed.map((a, i) => {
          let docs = a.documentos || [];
          const tieneSolicitud = docs.some((d) => d.codigo === 'ANX-I');
          if (!tieneSolicitud) {
            const docsSolicitud = PLANTILLA_DOCUMENTOS_SOLICITUD.map((p, idx) => ({
              ...p,
              orden: idx + 1,
              metadatos: {
                importeInicial: null,
                importeUltima: null,
                fechaExpedicionInicial: '',
                fechaExpedicionUltima: '',
                fechaRegistroInicial: '',
                fechaRegistroUltima: '',
                fechaAprobacionInicial: '',
                fechaAprobacionUltima: '',
                fechaRegistroAprobacionInicial: '',
                fechaRegistroAprobacionUltima: '',
                estadoJustificacion: 'Pendiente de calificar' as const,
                observacionesGenerales: ''
              },
              camposRevisar: generarChecklistPorDefecto(p.id, p.codigo),
              revisadoCompleto: false,
              tieneDeficiencias: false
            }));
            const docsBase14 = docs.map((d, idx) => ({
              ...d,
              orden: idx + 5,
              fase: 'justificacion' as const
            }));
            docs = [...docsSolicitud, ...docsBase14];
          }

          // Asegurar que siempre exista la Pestaña Proyecto Técnico (PROY-OBRA)
          const tieneProyecto = docs.some((d) => d.codigo === 'PROY-OBRA' || d.categoria === 'proyecto');
          if (!tieneProyecto) {
            const docProy: DocumentoActuacion = {
              id: `doc-proy-auto-${a.id || i}`,
              orden: 5,
              codigo: 'PROY-OBRA',
              titulo: 'Proyecto Técnico / Memoria Valorada de las Obras',
              subtitulo: 'Memoria descriptiva y constructiva, planos acotados, pliego de prescripciones técnicas y presupuesto con mediciones',
              categoria: 'proyecto',
              fase: 'solicitud',
              metadatos: {
                importeInicial: null,
                importeUltima: null,
                fechaExpedicionInicial: '',
                fechaExpedicionUltima: '',
                fechaRegistroInicial: '',
                fechaRegistroUltima: '',
                fechaAprobacionInicial: '',
                fechaAprobacionUltima: '',
                fechaRegistroAprobacionInicial: '',
                fechaRegistroAprobacionUltima: '',
                estadoJustificacion: 'Pendiente de calificar' as const,
                observacionesGenerales: ''
              },
              camposRevisar: generarChecklistPorDefecto(`doc-proy-auto-${a.id || i}`, 'PROY-OBRA'),
              revisadoCompleto: false,
              tieneDeficiencias: false
            };
            const idxAnx4 = docs.findIndex((d) => d.codigo === 'ANX-IV');
            if (idxAnx4 !== -1) {
              docs.splice(idxAnx4 + 1, 0, docProy);
            } else {
              docs.unshift(docProy);
            }
            docs = docs.map((d, dIdx) => ({ ...d, orden: dIdx + 1 }));
          }

          return {
            ...a,
            documentos: docs,
            faseActual: a.faseActual || 'solicitud',
            aplicacionPresupuestaria: a.aplicacionPresupuestaria || `202${4 + (i % 4)}-03-920-4620${i}`
          };
        });

        // Garantizar que no existan IDs duplicados al cargar de LocalStorage
        const idsVistos = new Set<string>();
        return mapeados.map((act, idx) => {
          let uId = act.id;
          if (!uId || idsVistos.has(uId)) {
            uId = `${uId || 'act'}-${idx + 1}`;
          }
          idsVistos.add(uId);
          return { ...act, id: uId };
        });
      }
      return [];
    } catch {
      return [];
    }
  });

  // 4. Actuación seleccionada y pestaña de documento activa
  const [actuacionActivaId, setActuacionActivaId] = useState<string | null>(null);
  const [documentoActivoIndex, setDocumentoActivoIndex] = useState<number>(0);

  // 5. Auditoría
  const [registrosAuditoria, setRegistrosAuditoria] = useState<RegistroAuditoriaAcceso[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.AUDITORIA);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  // 6. Configuración
  const [configuracion, setConfiguracion] = useState<ConfiguracionUsuario>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        return { ...CONFIG_DEFECTO, ...parsed, modoOscuro: 'light' };
      }
      return CONFIG_DEFECTO;
    } catch {
      return CONFIG_DEFECTO;
    }
  });

  // 7. Notificaciones
  const [notificaciones, setNotificaciones] = useState<NotificacionSistema[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.NOTIFICACIONES);
      if (guardado) return JSON.parse(guardado);
    } catch {}
    return [];
  });

  // 8. Filtros
  const [filtros, setFiltros] = useState<FiltrosBusqueda>(FILTROS_DEFECTO);

  // 9. Planes de Subvenciones
  const [planes, setPlanes] = useState<PlanSubvencion[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.PLANES);
      if (guardado) {
        const parsed: PlanSubvencion[] = JSON.parse(guardado);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  // 9b. Papelera de Planes y Copias de Seguridad para recuperación (30 días de custodia)
  const [planesPapelera, setPlanesPapelera] = useState<CopiaSeguridadPlan[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.PLANES_PAPELERA);
      if (guardado) {
        const parsed: CopiaSeguridadPlan[] = JSON.parse(guardado);
        if (Array.isArray(parsed)) {
          const ahora = Date.now();
          return parsed
            .map((c) => ({
              ...c,
              diasRetencion: c.diasRetencion || 30,
              fechaExpiracion:
                c.fechaExpiracion ||
                new Date(new Date(c.fechaBorrado).getTime() + (c.diasRetencion || 30) * 86400000).toISOString()
            }))
            .filter((c) => {
              const exp = new Date(c.fechaExpiracion).getTime();
              return exp > ahora;
            });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLANES_PAPELERA, JSON.stringify(planesPapelera));
    } catch {}
  }, [planesPapelera]);

  // 10. Comentarios y Notificaciones por Correo a Técnicos
  const [comentarios, setComentarios] = useState<ComentarioActuacion[]>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.COMENTARIOS);
      return guardado ? JSON.parse(guardado) : COMENTARIOS_INICIALES;
    } catch {
      return COMENTARIOS_INICIALES;
    }
  });

  // 11. Estado de Red y Sincronización
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [estadoSincronizacion, setEstadoSincronizacion] = useState<'sincronizado' | 'guardando' | 'offline'>('sincronizado');

  // 12. Alerta de bloqueo por campos sin revisar
  const [alertaCamposIncompletos, setAlertaCamposIncompletos] = useState<{
    mostrar: boolean;
    camposFaltantes: CampoRevisar[];
    documentoOrigenTitulo: string;
    destinoIndex: number;
  } | null>(null);

  // 12b. Modal global de Papelera de Reciclaje (Custodia 30 días)
  const [modalPapeleraAbierto, setModalPapeleraAbierto] = useState(false);
  const abrirModalPapelera = () => setModalPapeleraAbierto(true);
  const cerrarModalPapelera = () => setModalPapeleraAbierto(false);

  // Listeners de Red (Online / Offline)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setEstadoSincronizacion('guardando');
      setTimeout(() => setEstadoSincronizacion('sincronizado'), 800);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setEstadoSincronizacion('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Modo de color de la interfaz: Forzado a Modo Claro según especificación oficial
  useEffect(() => {
    const root = document.documentElement;
    if (configuracion.modoOscuro === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [configuracion.modoOscuro]);

  // Persistencia automática en LocalStorage
  useEffect(() => {
    setEstadoSincronizacion('guardando');
    try {
      localStorage.setItem(STORAGE_KEYS.ACTUACIONES, JSON.stringify(actuaciones));
    } catch (e) {
      console.error('Error guardando actuaciones en storage:', e);
    }
    const timer = setTimeout(() => {
      setEstadoSincronizacion(isOnline ? 'sincronizado' : 'offline');
    }, 400);
    return () => clearTimeout(timer);
  }, [actuaciones, isOnline]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
  }, [usuarios]);

  useEffect(() => {
    if (usuarioActual) {
      localStorage.setItem(STORAGE_KEYS.USUARIO_ACTUAL, JSON.stringify(usuarioActual));
    }
  }, [usuarioActual]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify(registrosAuditoria));
  }, [registrosAuditoria]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configuracion));
  }, [configuracion]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
  }, [notificaciones]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLANES, JSON.stringify(planes));
  }, [planes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMENTARIOS, JSON.stringify(comentarios));
  }, [comentarios]);

  // Chequeo periódico de vencimientos y generación de alertas
  useEffect(() => {
    const alertas = verificarAlertasVencimientos(actuaciones, configuracion.alertasVencimientoDias);
    setNotificaciones((prev) => {
      const idsExistentes = new Set(prev.map(p => p.id));
      const nuevas = alertas.filter(a => !idsExistentes.has(a.id));
      if (nuevas.length > 0 && configuracion.notificacionesPush) {
        nuevas.slice(0, 2).forEach(n => {
          enviarNotificacionPushNativa(n.titulo, { body: n.mensaje });
        });
      }
      return [...nuevas, ...prev];
    });
  }, [actuaciones, configuracion.alertasVencimientoDias, configuracion.notificacionesPush]);

  // Obtener actuación activa
  const actuacionActiva = actuaciones.find((a) => a.id === actuacionActivaId) || null;
  const documentoActivo = actuacionActiva ? actuacionActiva.documentos[documentoActivoIndex] || null : null;

  // Registrar Auditoría
  const registrarAccionAuditoria = (
    accion: RegistroAuditoriaAcceso['accion'],
    docId?: string,
    docTitulo?: string,
    detalles?: string
  ) => {
    if (!usuarioActual || !actuacionActiva) return;

    const nuevoRegistro: RegistroAuditoriaAcceso = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fechaHora: new Date().toISOString(),
      usuarioId: usuarioActual.id,
      usuarioNombre: `${usuarioActual.nombre} ${usuarioActual.apellidos}`,
      rol: usuarioActual.rol,
      actuacionId: actuacionActiva.id,
      documentoId: docId || (documentoActivo ? documentoActivo.id : 'general'),
      documentoTitulo: docTitulo || (documentoActivo ? documentoActivo.titulo : 'Actuación General'),
      accion,
      detalles: detalles || undefined,
      dispositivo: `${navigator.platform} · ${navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio'}`,
      ip: '192.168.10.45 (Red Corporativa DipuCádiz)'
    };

    setRegistrosAuditoria((prev) => [nuevoRegistro, ...prev]);
  };

  // Función al seleccionar una actuación (con soporte para actuaciones de planes no instanciadas)
  const seleccionarActuacion = (id: string | null) => {
    if (!id) {
      setActuacionActivaId(null);
      setDocumentoActivoIndex(0);
      setAlertaCamposIncompletos(null);
      return;
    }

    let act = actuaciones.find((a) => a.id === id);

    // Si no está en actuaciones directamente, comprobar si es un ID de actuación prevista en algún plan
    if (!act) {
      for (const p of planes) {
        const prevista = p.actuacionesPrevistas?.find(
          (pr) => pr.id === id || pr.actuacionGeneradaId === id
        );
        if (prevista) {
          if (prevista.actuacionGeneradaId) {
            act = actuaciones.find((a) => a.id === prevista.actuacionGeneradaId);
          }
          if (!act) {
            const eellNombre = limpiarNombreEELL(prevista.entidadLocal) || 'Diputación de Cádiz';
            const nuevaActId = `ACT-${p.ejercicio}-${String(actuaciones.length + 1).padStart(3, '0')}`;
            const nuevaAct: Actuacion = {
              id: nuevaActId,
              numero: prevista.numero,
              plan: p.nombre,
              entidadLocal: eellNombre,
              titulo: prevista.titulo,
              aplicacionPresupuestaria: prevista.aplicacionPresupuestaria || '',
              plazos: {
                plazoEjecucion: p.plazoEjecucionMaximo,
                plazoJustificacion: p.plazoJustificacionMaximo,
                plazoEjecucionAmpliado: p.plazoEjecucionAmpliado || p.plazoEjecucionMaximo,
                plazoJustificacionAmpliado: p.plazoJustificacionAmpliado || p.plazoJustificacionMaximo
              },
              importes: {
                importeActuacion: Math.round((prevista.subvencionSolicitada || 100000) * 1.15 * 100) / 100,
                importeConcesion: prevista.subvencionSolicitada || 100000,
                importeAdjudicacion: prevista.subvencionSolicitada || 100000
              },
              documentos: construirDocumentosCompletos(),
              liquidacion: {
                adjudicacion: prevista.subvencionSolicitada || 100000,
                justificadoEnPlazo: 0,
                justificadoEnPlazoConDeficiencias: 0,
                justificadoFueraDePlazo: 0,
                justificadoFueraDePlazoConDeficiencias: 0,
                noJustificado: 0,
                observacionesLiquidacion: `Actuación dada de alta desde el ${p.nombre}.`
              },
              estadoGeneral: 'pendiente',
              tecnicoAsignadoId: usuarioActual?.id || 'usr-tec-1',
              tecnicoAsignadoNombre: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Carmen Rivas Delgado',
              fechaCreacion: new Date().toISOString(),
              fechaModificacion: new Date().toISOString()
            };

            setActuaciones((prev) => [nuevaAct, ...prev]);
            setPlanes((prev) =>
              prev.map((pl) =>
                pl.id === p.id
                  ? {
                      ...pl,
                      actuacionesPrevistas: (pl.actuacionesPrevistas || []).map((pr) =>
                        pr.id === prevista.id ? { ...pr, actuacionGeneradaId: nuevaAct.id } : pr
                      )
                    }
                  : pl
              )
            );
            act = nuevaAct;
          }
          break;
        }
      }
    }

    const targetId = act ? act.id : id;
    setActuacionActivaId(targetId);
    setDocumentoActivoIndex(0);
    setAlertaCamposIncompletos(null);

    if (act && act.documentos[0]) {
      // Grabar auditoría de primer acceso automático a la primera pestaña
      grabarAccesoPestana(act.id, 0);
    }
  };

  // Grabar fecha y hora exacta del acceso para auditoría
  const grabarAccesoPestana = (actId: string, docIndex: number) => {
    const ahora = new Date().toISOString();
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actId) return act;
        const nuevosDocs = [...act.documentos];
        const doc = nuevosDocs[docIndex];
        if (doc) {
          nuevosDocs[docIndex] = {
            ...doc,
            fechaHoraPrimerAcceso: doc.fechaHoraPrimerAcceso || ahora,
            fechaHoraUltimoAcceso: ahora,
            tecnicoUltimoAcceso: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Técnico Revisor'
          };
        }
        return {
          ...act,
          documentos: nuevosDocs,
          fechaModificacion: ahora
        };
      })
    );

    // Registro inmutable de auditoría
    const act = actuaciones.find(a => a.id === actId);
    const doc = act?.documentos[docIndex];
    if (doc) {
      registrarAccionAuditoria('acceso_pestana', doc.id, doc.titulo, `Acceso técnico a documento para revisión`);
    }
  };

  // REGLA CLAVE DE NAVEGACIÓN ENTRE PESTAÑAS:
  // "Además, el sistema enviará una alerta automática si faltan algunos campos por revisar,
  // de modo que no se podrá pasar al siguiente documento..."
  const cambiarDocumentoPestana = (nuevoIndex: number, forzar: boolean = false): boolean => {
    if (!actuacionActiva) return false;
    if (nuevoIndex === documentoActivoIndex) return true;
    if (nuevoIndex < 0 || nuevoIndex >= actuacionActiva.documentos.length) return false;

    const docActual = actuacionActiva.documentos[documentoActivoIndex];
    
    // Si no es un salto forzado, comprobar si hay campos requeridos sin calificar ('sin_revisar')
    if (!forzar && docActual && !docActual.noProcede) {
      const camposSinRevisar = docActual.camposRevisar.filter(
        c => c.requerido && c.estado === 'sin_revisar'
      );

      if (camposSinRevisar.length > 0) {
        // Bloquear y mostrar alerta automática de campos pendientes
        setAlertaCamposIncompletos({
          mostrar: true,
          camposFaltantes: camposSinRevisar,
          documentoOrigenTitulo: docActual.titulo,
          destinoIndex: nuevoIndex
        });
        return false;
      }
    }

    // Si todo está correcto o se fuerza: cambiar de pestaña
    setAlertaCamposIncompletos(null);
    setDocumentoActivoIndex(nuevoIndex);
    grabarAccesoPestana(actuacionActiva.id, nuevoIndex);
    return true;
  };

  const cerrarAlertaCampos = () => {
    setAlertaCamposIncompletos(null);
  };

  const confirmarSaltoForzado = () => {
    if (alertaCamposIncompletos) {
      const destino = alertaCamposIncompletos.destinoIndex;
      setAlertaCamposIncompletos(null);
      setDocumentoActivoIndex(destino);
      if (actuacionActiva) {
        grabarAccesoPestana(actuacionActiva.id, destino);
      }
    }
  };

  // Helper para registrar la participación técnica cuando se EDITA algo en un documento
  // "Si un documento ha sido revisado y registrado el técnico revisor y otro técnico toca algo,
  // aparecerá registrado que tal técnico ha participado en la revisión, quedando reflejado todos los participantes.
  // Esto ocurrirá si se edita algo revisado, no ocurrirá cuando solo se consulta."
  const registrarEdicionTecnicoDocumento = (
    doc: DocumentoActuacion,
    descripcionAccion: string
  ): DocumentoActuacion => {
    const nombreUsuario = usuarioActual
      ? `${usuarioActual.nombre} ${usuarioActual.apellidos}`
      : 'Técnico Revisor';
    const rolUsuario = usuarioActual?.rol || 'tecnico';
    const ahora = new Date().toISOString();

    const revisorOriginal = doc.tecnicoRevisorOriginal || doc.tecnicoUltimoAcceso || nombreUsuario;
    const fechaOriginal = doc.fechaRevisionOriginal || doc.fechaHoraPrimerAcceso || ahora;

    const participantesPrevios = doc.tecnicosParticipantes && doc.tecnicosParticipantes.length > 0
      ? [...doc.tecnicosParticipantes]
      : [revisorOriginal];

    if (!participantesPrevios.includes(nombreUsuario)) {
      participantesPrevios.push(nombreUsuario);
    }

    const nuevoHito: ParticipanteRevision = {
      usuarioId: usuarioActual?.id || 'usr-anon',
      usuarioNombre: nombreUsuario,
      rol: rolUsuario,
      fechaHora: ahora,
      accion: descripcionAccion
    };

    const historialPrevio = doc.historialParticipantes || [];

    return {
      ...doc,
      tecnicoRevisorOriginal: revisorOriginal,
      fechaRevisionOriginal: fechaOriginal,
      tecnicosParticipantes: participantesPrevios,
      historialParticipantes: [...historialPrevio, nuevoHito],
      fechaHoraUltimoAcceso: ahora,
      tecnicoUltimoAcceso: nombreUsuario
    };
  };

  // Actualizar estado de un campo del checklist (✅ Conforme / ❌ No Conforme)
  const actualizarEstadoCampo = (
    campoId: string,
    nuevoEstado: 'conforme' | 'no_conforme',
    observacion?: string,
    subsanaciones?: string[]
  ) => {
    if (!actuacionActiva || !documentoActivo) return;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;

        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== documentoActivoIndex) return doc;

          const nuevosCampos = doc.camposRevisar.map((campo) => {
            if (campo.id !== campoId) return campo;

            let subsFinal: string[] = subsanaciones !== undefined ? subsanaciones : campo.subsanaciones || [];
            let obsFinal = observacion !== undefined ? observacion : campo.observacion;

            if (nuevoEstado === 'conforme') {
              obsFinal = '';
              subsFinal = [];
            } else if (nuevoEstado === 'no_conforme') {
              if (subsanaciones !== undefined) {
                subsFinal = subsanaciones;
                obsFinal = subsanaciones.join('; ');
              } else if (!subsFinal || subsFinal.length === 0) {
                if (obsFinal) {
                  subsFinal = obsFinal.split(/;\s*|\s*•\s*/).filter(Boolean);
                } else {
                  obsFinal = observacion !== undefined ? observacion : '';
                  subsFinal = obsFinal ? [obsFinal] : [];
                }
              } else {
                obsFinal = subsFinal.join('; ');
              }
            }

            return {
              ...campo,
              estado: nuevoEstado,
              observacion: obsFinal,
              subsanaciones: subsFinal
            };
          });

          // Calcular si tiene deficiencias y si está completo
          const tieneDeficiencias = nuevosCampos.some((c) => c.estado === 'no_conforme');
          const revisadoCompleto = nuevosCampos.every((c) => c.estado !== 'sin_revisar');

          const docConChecklist: DocumentoActuacion = {
            ...doc,
            camposRevisar: nuevosCampos,
            tieneDeficiencias,
            revisadoCompleto
          };

          return registrarEdicionTecnicoDocumento(
            docConChecklist,
            `Modificó campo "${campoId}" a ${nuevoEstado === 'conforme' ? 'CONFORME (✅)' : 'NO CONFORME (❌)'}`
          );
        });

        // Actualizar estado general de la actuación si procede
        const tieneAlgunDocDeficiencia = nuevosDocs.some((d) => d.tieneDeficiencias);
        const todosDocsCompletos = nuevosDocs.every((d) => d.revisadoCompleto);

        let nuevoEstadoGeneral = act.estadoGeneral;
        if (tieneAlgunDocDeficiencia) {
          nuevoEstadoGeneral = 'con_deficiencias';
        } else if (todosDocsCompletos) {
          nuevoEstadoGeneral = 'conforme';
        } else {
          nuevoEstadoGeneral = 'en_revision';
        }

        const todosParticipantes = Array.from(
          new Set(nuevosDocs.flatMap((d) => d.tecnicosParticipantes || []))
        );

        return {
          ...act,
          documentos: nuevosDocs,
          tecnicosParticipantes: todosParticipantes,
          estadoGeneral: nuevoEstadoGeneral,
          fechaModificacion: new Date().toISOString()
        };
      })
    );

    // Auditoría
    registrarAccionAuditoria(
      'modificacion_checklist',
      documentoActivo.id,
      documentoActivo.titulo,
      `Campo "${campoId}" marcado como ${nuevoEstado === 'conforme' ? 'CONFORME (✅)' : 'NO CONFORME (❌)'}${observacion ? `: ${observacion}` : ''}`
    );
  };

  // Actualizar metadatos Base 14 del documento (fechas, importes, estado justificación)
  // Con propagación automática de datos entre pestañas y suma de certificaciones acumuladas tal como la tabla de Google Sheet
  const actualizarMetadatosDocumento = (metadatos: Partial<DocumentoActuacion['metadatos']>) => {
    if (!actuacionActiva || !documentoActivo) return;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;

        // 1. Clonar y actualizar el documento actual con registro de técnico participante
        let nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== documentoActivoIndex) return doc;
          const docConMetas: DocumentoActuacion = {
            ...doc,
            metadatos: {
              ...doc.metadatos,
              ...metadatos
            }
          };
          return registrarEdicionTecnicoDocumento(
            docConMetas,
            `Editó metadatos Base 14 (${Object.keys(metadatos).join(', ')})`
          );
        });

        let nuevaLiquidacion = { ...act.liquidacion };
        let nuevosImportes = { ...act.importes };

        // 2. Propagación de Adjudicación (Pestaña 1 - Doc ANX-IX):
        // Si se modifica el importe de adjudicación en Doc 1, se copia a la cabecera y liquidación
        if (documentoActivo.codigo === 'ANX-IX' && (metadatos.importeUltima !== undefined || metadatos.importeInicial !== undefined)) {
          const valAdj = metadatos.importeUltima || metadatos.importeInicial || 0;
          if (valAdj > 0) {
            nuevosImportes.importeAdjudicacion = valAdj;
            nuevaLiquidacion.adjudicacion = valAdj;
          }
        }

        // 3. Propagación de Asistencias Técnicas (Docs 2, 3, 4 -> Facturas 14, 15, 16):
        if (documentoActivo.codigo === 'ANX-IX-AT1' && metadatos.importeUltima !== undefined) {
          nuevosDocs = nuevosDocs.map(d => d.codigo === 'FAC-AT1' ? { ...d, metadatos: { ...d.metadatos, importeInicial: metadatos.importeUltima || 0 } } : d);
        } else if (documentoActivo.codigo === 'ANX-IX-AT2' && metadatos.importeUltima !== undefined) {
          nuevosDocs = nuevosDocs.map(d => d.codigo === 'FAC-AT2' ? { ...d, metadatos: { ...d.metadatos, importeInicial: metadatos.importeUltima || 0 } } : d);
        } else if (documentoActivo.codigo === 'ANX-IX-AT3' && metadatos.importeUltima !== undefined) {
          nuevosDocs = nuevosDocs.map(d => d.codigo === 'FAC-AT3' ? { ...d, metadatos: { ...d.metadatos, importeInicial: metadatos.importeUltima || 0 } } : d);
        }

        // 4. Sumatorio Acumulado de Certificaciones (Certificación 1 a 6 y Certificación Final):
        // Tal cual la tabla de Google Sheet: las certificaciones acumuladas se van sumando
        const codigosCert = ['CERT-01', 'CERT-02', 'CERT-03', 'CERT-04', 'CERT-05', 'CERT-06', 'CERT-FIN'];
        const esCertificacion = codigosCert.includes(documentoActivo.codigo);

        if (esCertificacion && (metadatos.importeUltima !== undefined || metadatos.importeInicial !== undefined || metadatos.estadoJustificacion !== undefined)) {
          let sumaEnPlazo = 0;
          let sumaEnPlazoConDef = 0;
          let sumaFueraPlazo = 0;
          let sumaFueraPlazoConDef = 0;
          let sumaNoJustificado = 0;

          nuevosDocs.forEach(d => {
            if (codigosCert.includes(d.codigo)) {
              const imp = d.metadatos.importeUltima || d.metadatos.importeInicial || 0;
              const est = d.metadatos.estadoJustificacion;
              if (est === 'En plazo') {
                sumaEnPlazo += imp;
              } else if (est === 'En plazo con deficiencias no sustanciales') {
                sumaEnPlazoConDef += imp;
              } else if (est === 'Fuera de plazo') {
                sumaFueraPlazo += imp;
              } else if (est === 'Fuera de plazo con deficiencias no sustanciales') {
                sumaFueraPlazoConDef += imp;
              } else if (est === 'No Justificado') {
                sumaNoJustificado += imp;
              }
            }
          });

          if (sumaEnPlazo > 0 || sumaEnPlazoConDef > 0 || sumaFueraPlazo > 0) {
            nuevaLiquidacion.justificadoEnPlazo = sumaEnPlazo;
            nuevaLiquidacion.justificadoEnPlazoConDeficiencias = sumaEnPlazoConDef;
            nuevaLiquidacion.justificadoFueraDePlazo = sumaFueraPlazo;
            nuevaLiquidacion.justificadoFueraDePlazoConDeficiencias = sumaFueraPlazoConDef;
            if (sumaNoJustificado > 0) {
              nuevaLiquidacion.noJustificado = sumaNoJustificado;
            }
          }
        }

        const todosParticipantes = Array.from(
          new Set(nuevosDocs.flatMap((d) => d.tecnicosParticipantes || []))
        );

        return {
          ...act,
          documentos: nuevosDocs,
          tecnicosParticipantes: todosParticipantes,
          importes: nuevosImportes,
          liquidacion: nuevaLiquidacion,
          fechaModificacion: new Date().toISOString()
        };
      })
    );

    if (metadatos.estadoJustificacion) {
      registrarAccionAuditoria(
        'calificacion_estado',
        documentoActivo.id,
        documentoActivo.titulo,
        `Calificación cambiada a "${metadatos.estadoJustificacion}"`
      );
    }
  };

  // Actualizar cuadro de liquidación económica
  const actualizarLiquidacion = (liquidacion: Partial<CuadroLiquidacion>) => {
    if (!actuacionActiva) return;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        return {
          ...act,
          liquidacion: {
            ...act.liquidacion,
            ...liquidacion
          },
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Actualizar cabecera de actuación (plazos, importes, título, etc.)
  const actualizarActuacionCabecera = (datos: Partial<Actuacion>) => {
    if (!actuacionActiva) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        return {
          ...act,
          ...datos,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Marcar documento como revisado completamente
  const marcarDocumentoRevisado = (completado: boolean) => {
    if (!actuacionActiva || !documentoActivo) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== documentoActivoIndex) return doc;
          const docActualizado: DocumentoActuacion = {
            ...doc,
            revisadoCompleto: completado
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            completado ? 'Marcó revisión técnica como COMPLETADA' : 'Reabrió revisión técnica'
          );
        });

        const todosParticipantes = Array.from(
          new Set(nuevosDocs.flatMap((d) => d.tecnicosParticipantes || []))
        );

        return {
          ...act,
          documentos: nuevosDocs,
          tecnicosParticipantes: todosParticipantes,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Marcar documento como No Procede (exento)
  const marcarDocumentoNoProcede = (noProcede: boolean) => {
    if (!actuacionActiva || !documentoActivo) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== documentoActivoIndex) return doc;
          const docActualizado: DocumentoActuacion = {
            ...doc,
            noProcede,
            revisadoCompleto: noProcede ? true : doc.revisadoCompleto,
            tieneDeficiencias: noProcede ? false : doc.tieneDeficiencias
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            noProcede ? 'Marcó documento como NO PROCEDE' : 'Restauró documento a revisión ordinaria'
          );
        });

        return {
          ...act,
          documentos: nuevosDocs,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Calificar automáticamente todo el checklist del documento como Conforme (automatización rápida)
  const autovalidarTodoConformeDocumento = () => {
    if (!actuacionActiva || !documentoActivo) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== documentoActivoIndex) return doc;
          const nuevosCampos = doc.camposRevisar.map((c) => ({
            ...c,
            estado: 'conforme' as const,
            observacionTecnico: ''
          }));
          const docActualizado: DocumentoActuacion = {
            ...doc,
            camposRevisar: nuevosCampos,
            revisadoCompleto: true,
            tieneDeficiencias: false,
            noProcede: false
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            'Calificó automáticamente todo el checklist como CONFORME'
          );
        });

        return {
          ...act,
          documentos: nuevosDocs,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Marcar documento específico por índice como No Procede (o restaurarlo)
  const marcarDocumentoNoProcedePorIndex = (docIndex: number, noProcede: boolean) => {
    if (!actuacionActiva) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== docIndex) return doc;
          const docActualizado: DocumentoActuacion = {
            ...doc,
            noProcede,
            revisadoCompleto: noProcede ? true : doc.revisadoCompleto,
            tieneDeficiencias: noProcede ? false : doc.tieneDeficiencias
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            noProcede ? `Marcó documento ${doc.codigo} como NO PROCEDE` : `Restauró documento ${doc.codigo} a revisión ordinaria`
          );
        });

        const tieneAlgunDocDeficiencia = nuevosDocs.some((d) => !d.noProcede && d.tieneDeficiencias);
        const todosDocsCompletos = nuevosDocs.every((d) => d.noProcede || d.revisadoCompleto);

        let nuevoEstadoGeneral = act.estadoGeneral;
        if (tieneAlgunDocDeficiencia) {
          nuevoEstadoGeneral = 'con_deficiencias';
        } else if (todosDocsCompletos) {
          nuevoEstadoGeneral = 'conforme';
        } else {
          nuevoEstadoGeneral = 'en_revision';
        }

        return {
          ...act,
          documentos: nuevosDocs,
          estadoGeneral: nuevoEstadoGeneral,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Calificar checklist de un documento específico por índice como Conforme
  const autovalidarTodoConformePorIndex = (docIndex: number) => {
    if (!actuacionActiva) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== docIndex) return doc;
          const nuevosCampos = doc.camposRevisar.map((c) => ({
            ...c,
            estado: 'conforme' as const,
            observacion: ''
          }));
          const docActualizado: DocumentoActuacion = {
            ...doc,
            camposRevisar: nuevosCampos,
            revisadoCompleto: true,
            tieneDeficiencias: false,
            noProcede: false
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            `Calificó automáticamente checklist de ${doc.codigo} como CONFORME`
          );
        });

        const tieneAlgunDocDeficiencia = nuevosDocs.some((d) => !d.noProcede && d.tieneDeficiencias);
        const todosDocsCompletos = nuevosDocs.every((d) => d.noProcede || d.revisadoCompleto);

        let nuevoEstadoGeneral = act.estadoGeneral;
        if (tieneAlgunDocDeficiencia) {
          nuevoEstadoGeneral = 'con_deficiencias';
        } else if (todosDocsCompletos) {
          nuevoEstadoGeneral = 'conforme';
        } else {
          nuevoEstadoGeneral = 'en_revision';
        }

        return {
          ...act,
          documentos: nuevosDocs,
          estadoGeneral: nuevoEstadoGeneral,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Calificar todos los documentos aplicables del expediente como Conforme
  const autovalidarTodaActuacion = () => {
    if (!actuacionActiva) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc) => {
          if (doc.noProcede) return doc;
          const nuevosCampos = doc.camposRevisar.map((c) => ({
            ...c,
            estado: 'conforme' as const,
            observacion: ''
          }));
          return {
            ...doc,
            camposRevisar: nuevosCampos,
            revisadoCompleto: true,
            tieneDeficiencias: false
          };
        });

        return {
          ...act,
          documentos: nuevosDocs,
          estadoGeneral: 'conforme',
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Añadir una nueva Certificación numerada automáticamente (ej. Certificación 7, 8...)
  const agregarCertificacionAActuacion = (actuacionId: string): DocumentoActuacion | null => {
    let nuevoDocGenerado: DocumentoActuacion | null = null;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionId) return act;

        // Encontrar todas las certificaciones ordinarias existentes (excluyendo la final)
        const certsOrdinarias = act.documentos.filter(
          (d) => d.codigo.startsWith('CERT-') && d.codigo !== 'CERT-FIN'
        );

        let maxNum = 0;
        certsOrdinarias.forEach((d) => {
          const match = d.codigo.match(/CERT-(\d+)/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        });
        const siguienteNum = maxNum > 0 ? maxNum + 1 : certsOrdinarias.length + 1;
        const nuevoCodigo = `CERT-${String(siguienteNum).padStart(2, '0')}`;
        const nuevoId = `doc-cert-${Date.now()}`;

        const nuevoDoc: DocumentoActuacion = {
          id: nuevoId,
          orden: 0,
          codigo: nuevoCodigo,
          titulo: `Certificación ${siguienteNum}`,
          subtitulo: `Certificación ordinaria mensual ${siguienteNum} de obra ejecutada`,
          categoria: 'certificaciones',
          fase: 'justificacion',
          metadatos: {
            importeInicial: 0,
            importeUltima: 0,
            fechaExpedicionInicial: '',
            fechaExpedicionUltima: '',
            fechaRegistroInicial: '',
            fechaRegistroUltima: '',
            fechaAprobacionInicial: '',
            fechaAprobacionUltima: '',
            fechaRegistroAprobacionInicial: '',
            fechaRegistroAprobacionUltima: '',
            estadoJustificacion: 'Pendiente de calificar',
            observacionesGenerales: ''
          },
          camposRevisar: [
            {
              id: `${nuevoId}-chk-1`,
              campo: 'Relación valorada mensual suscrita por la Dirección Facultativa',
              descripcion: 'Detalle de unidades de obra ejecutadas en el periodo correspondiente',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            },
            {
              id: `${nuevoId}-chk-2`,
              campo: 'Factura correspondiente a la certificación emitida por el contratista',
              descripcion: 'Factura electrónica conforme a normativa FACe / formato reglamentario',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            },
            {
              id: `${nuevoId}-chk-3`,
              campo: 'Aprobación formal por el órgano de contratación municipal',
              descripcion: 'Resolución de Alcaldía o Concejal delegado competente',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            },
            {
              id: `${nuevoId}-chk-4`,
              campo: 'Registro de entrada oficial y fechas de expedición coherentes',
              descripcion: 'Secuencia temporal ordenada con las certificaciones previas',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            },
            {
              id: `${nuevoId}-chk-5`,
              campo: 'Importe acumulado no excede el presupuesto de adjudicación',
              descripcion: 'Control del límite económico contratado',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            }
          ],
          revisadoCompleto: false,
          tieneDeficiencias: false
        };

        // Insertar justo después de la última certificación ordinaria existente
        let ultimoIndexCert = -1;
        for (let i = act.documentos.length - 1; i >= 0; i--) {
          if (act.documentos[i].codigo.startsWith('CERT-') && act.documentos[i].codigo !== 'CERT-FIN') {
            ultimoIndexCert = i;
            break;
          }
        }

        const nuevosDocs = [...act.documentos];
        let posInsert = ultimoIndexCert !== -1 ? ultimoIndexCert + 1 : nuevosDocs.length;
        nuevosDocs.splice(posInsert, 0, nuevoDoc);

        const docsReordenados = nuevosDocs.map((d, idx) => ({
          ...d,
          orden: idx + 1
        }));

        nuevoDocGenerado = docsReordenados[posInsert];

        return {
          ...act,
          documentos: docsReordenados,
          fechaModificacion: new Date().toISOString()
        };
      })
    );

    return nuevoDocGenerado;
  };

  // Añadir una nueva Factura de Asistencia Técnica numerada automáticamente (ej. Factura 4, 5...)
  const agregarFacturaAActuacion = (actuacionId: string): DocumentoActuacion | null => {
    let nuevoDocGenerado: DocumentoActuacion | null = null;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionId) return act;

        const facturasExistentes = act.documentos.filter((d) => d.codigo.startsWith('FAC-'));

        let maxNum = 0;
        facturasExistentes.forEach((d) => {
          const match = d.codigo.match(/FAC-AT(\d+)/) || d.codigo.match(/FAC-(\d+)/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        });
        const siguienteNum = maxNum > 0 ? maxNum + 1 : facturasExistentes.length + 1;
        const nuevoCodigo = `FAC-AT${siguienteNum}`;
        const nuevoId = `doc-fac-${Date.now()}`;

        const nuevoDoc: DocumentoActuacion = {
          id: nuevoId,
          orden: 0,
          codigo: nuevoCodigo,
          titulo: `Factura ${siguienteNum} Asistencia Técnica`,
          subtitulo: `Factura y abono de asistencia técnica complementaria ${siguienteNum}`,
          categoria: 'asistencia_tecnica',
          fase: 'justificacion',
          metadatos: {
            importeInicial: 0,
            importeUltima: 0,
            fechaExpedicionInicial: '',
            fechaExpedicionUltima: '',
            fechaRegistroInicial: '',
            fechaRegistroUltima: '',
            fechaAprobacionInicial: '',
            fechaAprobacionUltima: '',
            fechaRegistroAprobacionInicial: '',
            fechaRegistroAprobacionUltima: '',
            estadoJustificacion: 'Pendiente de calificar',
            observacionesGenerales: ''
          },
          camposRevisar: [
            {
              id: `${nuevoId}-chk-1`,
              campo: 'Factura reglamentaria a nombre de la Entidad Local beneficiaria',
              descripcion: 'Identificación completa del emisor, destinatario, concepto e impuestos',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            },
            {
              id: `${nuevoId}-chk-2`,
              campo: 'Informe de conformidad emitido por los servicios técnicos municipales',
              descripcion: 'Acreditación de la efectiva prestación del servicio facultativo',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            },
            {
              id: `${nuevoId}-chk-3`,
              campo: 'Justificante bancario fehaciente del pago (adeudo en cuenta)',
              descripcion: 'Extracto bancario oficial con sello o validación digital de la entidad',
              estado: 'sin_revisar',
              observacion: '',
              requerido: true
            }
          ],
          revisadoCompleto: false,
          tieneDeficiencias: false
        };

        // Insertar justo después de la última factura existente
        let ultimoIndexFac = -1;
        for (let i = act.documentos.length - 1; i >= 0; i--) {
          if (act.documentos[i].codigo.startsWith('FAC-')) {
            ultimoIndexFac = i;
            break;
          }
        }

        const nuevosDocs = [...act.documentos];
        let posInsert = ultimoIndexFac !== -1 ? ultimoIndexFac + 1 : nuevosDocs.length;
        nuevosDocs.splice(posInsert, 0, nuevoDoc);

        const docsReordenados = nuevosDocs.map((d, idx) => ({
          ...d,
          orden: idx + 1
        }));

        nuevoDocGenerado = docsReordenados[posInsert];

        return {
          ...act,
          documentos: docsReordenados,
          fechaModificacion: new Date().toISOString()
        };
      })
    );

    return nuevoDocGenerado;
  };

  // Añadir una nueva Modificación de Proyecto (caso especial: en medio de cualquier certificación o al final)
  const agregarModificadoProyecto = (actuacionId: string, despuesDeDocId?: string): DocumentoActuacion | null => {
    let nuevoDocGenerado: DocumentoActuacion | null = null;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionId) return act;

        const modsExistentes = act.documentos.filter(
          (d) => d.codigo.startsWith('MOD-') || d.categoria === 'modificado'
        );
        const siguienteNum = modsExistentes.length + 1;
        const nuevoCodigo = siguienteNum === 1 ? 'MOD-PROY' : `MOD-PROY-${siguienteNum}`;
        const nuevoId = `doc-mod-${Date.now()}`;

        const nuevoDoc: DocumentoActuacion = {
          id: nuevoId,
          orden: 0,
          codigo: nuevoCodigo,
          titulo: siguienteNum === 1
            ? 'Modificación de Proyecto / Contrato (Incidencia)'
            : `Modificación de Proyecto ${siguienteNum}`,
          subtitulo: 'Memoria técnica justificativa, precios contradictorios y aprobación formal de la alteración contractual',
          categoria: 'modificado',
          fase: 'justificacion',
          metadatos: {
            importeInicial: 0,
            importeUltima: 0,
            fechaExpedicionInicial: '',
            fechaExpedicionUltima: '',
            fechaRegistroInicial: '',
            fechaRegistroUltima: '',
            fechaAprobacionInicial: '',
            fechaAprobacionUltima: '',
            fechaRegistroAprobacionInicial: '',
            fechaRegistroAprobacionUltima: '',
            estadoJustificacion: 'Pendiente de calificar',
            observacionesGenerales: ''
          },
          camposRevisar: generarChecklistPorDefecto(nuevoId, 'MOD-PROY'),
          revisadoCompleto: false,
          tieneDeficiencias: false
        };

        const nuevosDocs = [...act.documentos];
        let posInsert = -1;

        if (despuesDeDocId) {
          const idxTarget = nuevosDocs.findIndex((d) => d.id === despuesDeDocId);
          if (idxTarget !== -1) {
            posInsert = idxTarget + 1;
          }
        }

        // Si no se especificó o no se encontró, insertar después de la última certificación ordinaria o antes de la final/recepción
        if (posInsert === -1) {
          let ultimoIndexCert = -1;
          for (let i = nuevosDocs.length - 1; i >= 0; i--) {
            if (nuevosDocs[i].codigo.startsWith('CERT-') && nuevosDocs[i].codigo !== 'CERT-FIN') {
              ultimoIndexCert = i;
              break;
            }
          }
          if (ultimoIndexCert !== -1) {
            posInsert = ultimoIndexCert + 1;
          } else {
            const idxFin = nuevosDocs.findIndex((d) => d.codigo === 'ACT-REC' || d.codigo === 'CERT-FIN');
            posInsert = idxFin !== -1 ? idxFin : nuevosDocs.length;
          }
        }

        nuevosDocs.splice(posInsert, 0, nuevoDoc);

        const docsReordenados = nuevosDocs.map((d, idx) => ({
          ...d,
          orden: idx + 1
        }));

        nuevoDocGenerado = docsReordenados[posInsert];

        return {
          ...act,
          documentos: docsReordenados,
          fechaModificacion: new Date().toISOString()
        };
      })
    );

    return nuevoDocGenerado;
  };

  // Eliminar un documento dinámico o de la actuación y renumerar
  const eliminarDocumentoDeActuacion = (actuacionId: string, docId: string) => {
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionId) return act;
        const filtrados = act.documentos.filter((d) => d.id !== docId);
        const reordenados = filtrados.map((d, idx) => ({
          ...d,
          orden: idx + 1
        }));
        return {
          ...act,
          documentos: reordenados,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Guardar ronda de subsanación técnica con trazabilidad histórica
  const guardarRondaSubsanacion = (docIndex: number, nuevaRonda: RondaSubsanacion) => {
    if (!actuacionActiva) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== docIndex) return doc;
          const previas = doc.rondasSubsanacion || [];
          const tieneDeficiencias = nuevaRonda.deficiencias.length > 0;
          const docActualizado: DocumentoActuacion = {
            ...doc,
            rondasSubsanacion: [...previas, nuevaRonda],
            tieneDeficiencias,
            revisadoCompleto: true
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            `Emitió Requerimiento de Subsanación (Ronda ${nuevaRonda.numeroRonda}) con ${nuevaRonda.deficiencias.length} deficiencia(s)`
          );
        });

        return {
          ...act,
          documentos: nuevosDocs,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Firmar electrónicamente informe favorable y calificar conforme
  const firmarInformeFavorable = (docIndex: number, informe: InformeFavorableDocumento) => {
    if (!actuacionActiva) return;
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionActiva.id) return act;
        const nuevosDocs = act.documentos.map((doc, idx) => {
          if (idx !== docIndex) return doc;
          const docActualizado: DocumentoActuacion = {
            ...doc,
            informeFavorable: informe,
            tieneDeficiencias: false,
            revisadoCompleto: true
          };
          return registrarEdicionTecnicoDocumento(
            docActualizado,
            `Firmó electrónicamente Dictamen Favorable Conforme (CSV: ${informe.csv})`
          );
        });

        return {
          ...act,
          documentos: nuevosDocs,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Crear nueva actuación
  const crearNuevaActuacion = (datos: Partial<Actuacion>): Actuacion => {
    const id = `ACT-2026-${String(actuaciones.length + 1).padStart(3, '0')}`;
    const nueva: Actuacion = {
      id,
      numero: datos.numero || String(actuaciones.length + 1).padStart(2, '0'),
      plan: datos.plan || 'Plan Cádiz Marcha 2024',
      entidadLocal: limpiarNombreEELL(datos.entidadLocal) || 'Grazalema',
      titulo: datos.titulo || 'Nueva Actuación de Infraestructuras',
      aplicacionPresupuestaria: datos.aplicacionPresupuestaria || '',
      plazos: datos.plazos || {
        plazoEjecucion: '2028-10-20',
        plazoJustificacion: '2028-10-30',
        plazoEjecucionAmpliado: '2028-10-20',
        plazoJustificacionAmpliado: '2028-10-30'
      },
      importes: datos.importes || {
        importeActuacion: 100000,
        importeConcesion: 85000,
        importeAdjudicacion: 82000
      },
      documentos: construirDocumentosCompletos(),
      liquidacion: {
        adjudicacion: datos.importes?.importeAdjudicacion || 82000,
        justificadoEnPlazo: 0,
        justificadoEnPlazoConDeficiencias: 0,
        justificadoFueraDePlazo: 0,
        justificadoFueraDePlazoConDeficiencias: 0,
        noJustificado: 0,
        observacionesLiquidacion: 'Actuación recién registrada en la plataforma.'
      },
      estadoGeneral: 'pendiente',
      tecnicoAsignadoId: usuarioActual?.id || 'usr-tec-1',
      tecnicoAsignadoNombre: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Carmen Rivas Delgado',
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      ...datos
    };

    setActuaciones((prev) => [nueva, ...prev]);
    return nueva;
  };

  // Actualizar cualquier actuación por ID
  const actualizarActuacion = (id: string, datos: Partial<Actuacion>) => {
    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== id) return act;
        return {
          ...act,
          ...datos,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Eliminar actuación
  const eliminarActuacion = (id: string) => {
    setActuaciones((prev) => prev.filter((a) => a.id !== id));
    if (actuacionActivaId === id) {
      setActuacionActivaId(null);
    }
  };

  // Gestión de Planes de Subvenciones
  const crearPlan = (datos: Omit<PlanSubvencion, 'id' | 'fechaCreacion'>): PlanSubvencion => {
    const nuevoId = `plan-${Date.now()}`;
    const nuevo: PlanSubvencion = {
      ...datos,
      id: nuevoId,
      fechaCreacion: new Date().toISOString()
    };
    setPlanes((prev) => [nuevo, ...prev]);
    registrarAccionAuditoria(
      'acceso_pestana',
      nuevo.id,
      nuevo.nombre,
      `Alta de nuevo Plan de Subvenciones: ${nuevo.nombre} (${nuevo.codigo}) con ${nuevo.actuacionesPrevistas.length} actuaciones previstas`
    );
    return nuevo;
  };

  const actualizarPlan = (planActualizado: PlanSubvencion) => {
    setPlanes((prev) => prev.map((p) => (p.id === planActualizado.id ? planActualizado : p)));
    registrarAccionAuditoria(
      'acceso_pestana',
      planActualizado.id,
      planActualizado.nombre,
      `Plan de Subvenciones actualizado: ${planActualizado.nombre}`
    );
  };

  const eliminarPlan = (id: string, guardarCopia: boolean = true) => {
    const planAEliminar = planes.find((p) => p.id === id);
    if (!planAEliminar) return;

    // Buscar las actuaciones vinculadas a este plan
    const actuacionesAsociadas = actuaciones.filter(
      (a) => a.plan === planAEliminar.nombre || (planAEliminar.codigo && a.plan === planAEliminar.codigo)
    );

    if (guardarCopia) {
      const fechaActual = new Date();
      const fechaExpiracion = new Date(fechaActual.getTime() + 30 * 86400000).toISOString();
      const nuevaCopia: CopiaSeguridadPlan = {
        idCopia: `copia-plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fechaBorrado: fechaActual.toISOString(),
        fechaExpiracion,
        diasRetencion: 30,
        borradoPorUsuario: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Administrador',
        plan: planAEliminar,
        actuacionesAsociadas
      };
      setPlanesPapelera((prev) => [nuevaCopia, ...prev.filter((c) => c.plan.id !== id)]);
    }

    // Eliminar de planes activos
    setPlanes((prev) => prev.filter((p) => p.id !== id));

    // Eliminar las actuaciones asociadas huérfanas de la lista activa (quedan seguras en la copia)
    if (actuacionesAsociadas.length > 0) {
      setActuaciones((prev) =>
        prev.filter((a) => a.plan !== planAEliminar.nombre && (!planAEliminar.codigo || a.plan !== planAEliminar.codigo))
      );
    }

    registrarAccionAuditoria(
      'acceso_pestana',
      planAEliminar.id,
      planAEliminar.nombre,
      `Plan eliminado: ${planAEliminar.nombre}${guardarCopia ? ' (Copia guardada en Papelera de reciclaje durante 30 días)' : ''}`
    );
  };

  const restaurarPlan = (idCopia: string): boolean => {
    const copia = planesPapelera.find((c) => c.idCopia === idCopia);
    if (!copia) return false;

    // 1. Restaurar el plan a la lista activa
    setPlanes((prev) => {
      const existe = prev.some((p) => p.id === copia.plan.id);
      if (existe) {
        return prev.map((p) => (p.id === copia.plan.id ? copia.plan : p));
      }
      return [copia.plan, ...prev];
    });

    // 2. Restaurar sus actuaciones si existen
    if (copia.actuacionesAsociadas && copia.actuacionesAsociadas.length > 0) {
      setActuaciones((prev) => {
        const idsExistentes = new Set(prev.map((a) => a.id));
        const aReincorporar = copia.actuacionesAsociadas.filter((a) => !idsExistentes.has(a.id));
        return [...prev, ...aReincorporar];
      });
    }

    // 3. Quitar de la papelera
    setPlanesPapelera((prev) => prev.filter((c) => c.idCopia !== idCopia));

    registrarAccionAuditoria(
      'acceso_pestana',
      copia.plan.id,
      copia.plan.nombre,
      `Plan recuperado desde la papelera de reciclaje: ${copia.plan.nombre} con ${copia.actuacionesAsociadas?.length || 0} actuaciones.`
    );

    return true;
  };

  const eliminarCopiaDefinitiva = (idCopia: string) => {
    const copia = planesPapelera.find((c) => c.idCopia === idCopia);
    setPlanesPapelera((prev) => prev.filter((c) => c.idCopia !== idCopia));
    if (copia) {
      registrarAccionAuditoria(
        'acceso_pestana',
        copia.plan.id,
        copia.plan.nombre,
        `Borrado definitivo e irreversible del plan en papelera: ${copia.plan.nombre}`
      );
    }
  };

  const vaciarPapeleraPlanes = () => {
    const total = planesPapelera.length;
    setPlanesPapelera([]);
    registrarAccionAuditoria(
      'acceso_pestana',
      'papelera-global',
      'Papelera de reciclaje vaciada',
      `Se han eliminado de forma definitiva ${total} planes almacenados en la papelera.`
    );
  };

  const purgarPlanesExpirados = (): number => {
    const ahora = Date.now();
    let eliminados = 0;
    setPlanesPapelera((prev) => {
      const filtrados = prev.filter((copia) => {
        const tExp = new Date(copia.fechaExpiracion || copia.fechaBorrado).getTime();
        const expirado = ahora > tExp;
        if (expirado) eliminados++;
        return !expirado;
      });
      return filtrados;
    });
    if (eliminados > 0) {
      registrarAccionAuditoria(
        'acceso_pestana',
        'papelera-global',
        'Purga automática de planes expirados (>30 días)',
        `Se han purgado automáticamente ${eliminados} planes cuyo periodo de 30 días de custodia ha vencido.`
      );
    }
    return eliminados;
  };

  const generarActuacionesDesdePlan = (planId: string): number => {
    const plan = planes.find((p) => p.id === planId);
    if (!plan) return 0;

    let creadas = 0;
    const nuevasActuaciones: Actuacion[] = [];
    const previstasActualizadas = plan.actuacionesPrevistas.map((prevista) => {
      const yaExiste = actuaciones.some(
        (a) => a.plan === plan.nombre && a.numero === prevista.numero && a.entidadLocal === prevista.entidadLocal
      );
      if (yaExiste) return prevista;

      const actId = `ACT-${plan.ejercicio}-${String(actuaciones.length + creadas + 1).padStart(3, '0')}`;
      const nueva: Actuacion = {
        id: actId,
        numero: prevista.numero,
        plan: plan.nombre,
        entidadLocal: limpiarNombreEELL(prevista.entidadLocal),
        titulo: prevista.titulo,
        aplicacionPresupuestaria: prevista.aplicacionPresupuestaria || '',
        plazos: {
          plazoEjecucion: plan.plazoEjecucionMaximo,
          plazoJustificacion: plan.plazoJustificacionMaximo,
          plazoEjecucionAmpliado: plan.plazoEjecucionAmpliado || plan.plazoEjecucionMaximo,
          plazoJustificacionAmpliado: plan.plazoJustificacionAmpliado || plan.plazoJustificacionMaximo
        },
        importes: {
          importeActuacion: Math.round(prevista.subvencionSolicitada * 1.10 * 100) / 100,
          importeConcesion: prevista.subvencionSolicitada,
          importeAdjudicacion: prevista.subvencionSolicitada
        },
        documentos: construirDocumentosCompletos(),
        liquidacion: {
          adjudicacion: prevista.subvencionSolicitada,
          justificadoEnPlazo: 0,
          justificadoEnPlazoConDeficiencias: 0,
          justificadoFueraDePlazo: 0,
          justificadoFueraDePlazoConDeficiencias: 0,
          noJustificado: 0,
          observacionesLiquidacion: `Actuación generada automáticamente desde el ${plan.nombre}.`
        },
        estadoGeneral: 'pendiente',
        tecnicoAsignadoId: 'usr-tec-1',
        tecnicoAsignadoNombre: 'Carmen Rivas Delgado',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };
      nuevasActuaciones.push(nueva);
      creadas++;
      return {
        ...prevista,
        actuacionGeneradaId: actId
      };
    });

    if (creadas > 0) {
      setActuaciones((prev) => [...nuevasActuaciones, ...prev]);
      setPlanes((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, actuacionesPrevistas: previstasActualizadas } : p))
      );
      registrarAccionAuditoria(
        'acceso_pestana',
        plan.id,
        plan.nombre,
        `Se han generado automáticamente ${creadas} actuaciones del Plan ${plan.nombre}`
      );
    }
    return creadas;
  };

  // Importar y reconocer actuaciones desde PDF oficial
  const importarActuacionesPDFAlPlan = (
    planId: string,
    actuacionesParsed: {
      numero: string;
      entidadLocal: string;
      titulo: string;
      aplicacionPresupuestaria: string;
      subvencionSolicitada: number;
    }[],
    planOverride?: PlanSubvencion
  ): number => {
    const plan = planOverride || planes.find((p) => p.id === planId);
    if (!plan || actuacionesParsed.length === 0) return 0;

    let creadas = 0;
    const nuevasActuaciones: Actuacion[] = [];
    const nuevasPrevistas: ActuacionEnPlan[] = [...(plan.actuacionesPrevistas || [])];

    actuacionesParsed.forEach((parsedItem, idx) => {
      const actId = `ACT-${plan.ejercicio}-${String(actuaciones.length + idx + 1).padStart(3, '0')}`;
      const numFormatted = parsedItem.numero || String(nuevasPrevistas.length + 1).padStart(2, '0');

      const nuevaAct: Actuacion = {
        id: actId,
        numero: numFormatted,
        plan: plan.nombre,
        entidadLocal: parsedItem.entidadLocal,
        titulo: parsedItem.titulo,
        aplicacionPresupuestaria: parsedItem.aplicacionPresupuestaria,
        plazos: {
          plazoEjecucion: plan.plazoEjecucionMaximo,
          plazoJustificacion: plan.plazoJustificacionMaximo,
          plazoEjecucionAmpliado: plan.plazoEjecucionAmpliado || plan.plazoEjecucionMaximo,
          plazoJustificacionAmpliado: plan.plazoJustificacionAmpliado || plan.plazoJustificacionMaximo
        },
        importes: {
          importeActuacion: Math.round(parsedItem.subvencionSolicitada * 1.10 * 100) / 100,
          importeConcesion: parsedItem.subvencionSolicitada,
          importeAdjudicacion: parsedItem.subvencionSolicitada
        },
        documentos: construirDocumentosCompletos(),
        liquidacion: {
          adjudicacion: parsedItem.subvencionSolicitada,
          justificadoEnPlazo: 0,
          justificadoEnPlazoConDeficiencias: 0,
          justificadoFueraDePlazo: 0,
          justificadoFueraDePlazoConDeficiencias: 0,
          noJustificado: 0,
          observacionesLiquidacion: `Actuación reconocida e importada desde documento oficial PDF del ${plan.nombre}. Aplicación Presupuestaria: ${parsedItem.aplicacionPresupuestaria}.`
        },
        estadoGeneral: 'pendiente',
        tecnicoAsignadoId: usuarioActual?.id || 'usr-tec-1',
        tecnicoAsignadoNombre: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Carmen Rivas Delgado',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };

      nuevasActuaciones.push(nuevaAct);

      nuevasPrevistas.push({
        id: `pdf-act-${Date.now()}-${idx}`,
        numero: numFormatted,
        entidadLocal: parsedItem.entidadLocal,
        titulo: parsedItem.titulo,
        aplicacionPresupuestaria: parsedItem.aplicacionPresupuestaria,
        subvencionSolicitada: parsedItem.subvencionSolicitada,
        actuacionGeneradaId: actId
      });

      creadas++;
    });

    if (creadas > 0) {
      setActuaciones((prev) => [...nuevasActuaciones, ...prev]);

      const eellSet = new Set([...plan.eellBeneficiarias, ...actuacionesParsed.map((a) => a.entidadLocal)]);
      const nuevoTotalPresupuesto = nuevasPrevistas.reduce(
        (acc, curr) => acc + (curr.subvencionSolicitada || 0),
        0
      );

      setPlanes((prev) => {
        const existe = prev.some((p) => p.id === planId);
        if (existe) {
          return prev.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  actuacionesPrevistas: nuevasPrevistas,
                  eellBeneficiarias: Array.from(eellSet),
                  presupuestoTotal: Math.max(p.presupuestoTotal, nuevoTotalPresupuesto)
                }
              : p
          );
        } else {
          return [
            {
              ...plan,
              actuacionesPrevistas: nuevasPrevistas,
              eellBeneficiarias: Array.from(eellSet),
              presupuestoTotal: Math.max(plan.presupuestoTotal, nuevoTotalPresupuesto)
            },
            ...prev
          ];
        }
      });

      registrarAccionAuditoria(
        'acceso_pestana',
        plan.id,
        plan.nombre,
        `Carga masiva PDF: Se han reconocido y guardado ${creadas} actuaciones con aplicación presupuestaria en el Plan ${plan.nombre}`
      );
    }
    return creadas;
  };

  // Añadir una actuación manualmente a un plan y darla de alta en base de datos
  const agregarActuacionAlPlan = (
    planId: string,
    datos: {
      numero: string;
      entidadLocal: string;
      titulo: string;
      aplicacionPresupuestaria: string;
      subvencionSolicitada: number;
      plazoEjecucion?: string;
      plazoJustificacion?: string;
    }
  ): Actuacion => {
    const plan = planes.find((p) => p.id === planId);
    const nombrePlan = plan ? plan.nombre : 'Plan Provincial';
    const ejercicio = plan ? plan.ejercicio : 2026;
    const actId = `ACT-${ejercicio}-${String(actuaciones.length + 1).padStart(3, '0')}`;

    const nuevaAct: Actuacion = {
      id: actId,
      numero: datos.numero || String(actuaciones.length + 1).padStart(2, '0'),
      plan: nombrePlan,
      entidadLocal: datos.entidadLocal,
      titulo: datos.titulo,
      aplicacionPresupuestaria: datos.aplicacionPresupuestaria,
      faseActual: 'solicitud',
      plazos: {
        plazoEjecucion: datos.plazoEjecucion || plan?.plazoEjecucionMaximo || '2026-12-31',
        plazoJustificacion: datos.plazoJustificacion || plan?.plazoJustificacionMaximo || '2027-03-31',
        plazoEjecucionAmpliado: plan?.plazoEjecucionAmpliado || datos.plazoEjecucion || '2027-06-30',
        plazoJustificacionAmpliado: plan?.plazoJustificacionAmpliado || datos.plazoJustificacion || '2027-09-30'
      },
      importes: {
        importeActuacion: Math.round(datos.subvencionSolicitada * 1.10 * 100) / 100,
        importeConcesion: datos.subvencionSolicitada,
        importeAdjudicacion: datos.subvencionSolicitada
      },
      documentos: construirDocumentosCompletos(),
      liquidacion: {
        adjudicacion: datos.subvencionSolicitada,
        justificadoEnPlazo: 0,
        justificadoEnPlazoConDeficiencias: 0,
        justificadoFueraDePlazo: 0,
        justificadoFueraDePlazoConDeficiencias: 0,
        noJustificado: 0,
        observacionesLiquidacion: `Actuación dada de alta en fase de solicitud para ${nombrePlan}. Aplicación: ${datos.aplicacionPresupuestaria}.`
      },
      estadoGeneral: 'pendiente',
      tecnicoAsignadoId: usuarioActual?.id || 'usr-tec-1',
      tecnicoAsignadoNombre: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Carmen Rivas Delgado',
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };

    setActuaciones((prev) => [nuevaAct, ...prev]);

    if (plan) {
      const nuevaPrevista: ActuacionEnPlan = {
        id: `act-manual-${Date.now()}`,
        numero: nuevaAct.numero,
        entidadLocal: datos.entidadLocal,
        titulo: datos.titulo,
        aplicacionPresupuestaria: datos.aplicacionPresupuestaria,
        subvencionSolicitada: datos.subvencionSolicitada,
        actuacionGeneradaId: actId
      };

      const eellSet = new Set([...plan.eellBeneficiarias, datos.entidadLocal]);
      const nuevoTotalPresupuesto =
        (plan.actuacionesPrevistas || []).reduce((acc, c) => acc + (c.subvencionSolicitada || 0), 0) +
        datos.subvencionSolicitada;

      setPlanes((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                actuacionesPrevistas: [...(p.actuacionesPrevistas || []), nuevaPrevista],
                eellBeneficiarias: Array.from(eellSet),
                presupuestoTotal: Math.max(p.presupuestoTotal, nuevoTotalPresupuesto)
              }
            : p
        )
      );
    }

    registrarAccionAuditoria(
      'acceso_pestana',
      actId,
      datos.titulo,
      `Alta manual de actuación nº ${datos.numero} en fase de solicitud para ${datos.entidadLocal} en ${nombrePlan}`
    );

    return nuevaAct;
  };

  // Editar una actuación del plan y actualizar también su ficha en base de datos
  const editarActuacionDePlan = (
    planId: string,
    actuacionPlanId: string,
    datos: Partial<ActuacionEnPlan> & { plazoEjecucion?: string; plazoJustificacion?: string }
  ) => {
    const plan = planes.find((p) => p.id === planId);
    if (!plan) return;

    let idGenerada: string | undefined;

    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const nuevasPrevistas = (p.actuacionesPrevistas || []).map((prevista) => {
          if (prevista.id === actuacionPlanId || prevista.numero === datos.numero) {
            idGenerada = prevista.actuacionGeneradaId;
            return {
              ...prevista,
              ...datos
            };
          }
          return prevista;
        });

        const eellSet = new Set(nuevasPrevistas.map((prev) => prev.entidadLocal));
        const totalPresupuesto = nuevasPrevistas.reduce((acc, c) => acc + (c.subvencionSolicitada || 0), 0);

        return {
          ...p,
          actuacionesPrevistas: nuevasPrevistas,
          eellBeneficiarias: Array.from(eellSet),
          presupuestoTotal: Math.max(p.presupuestoTotal, totalPresupuesto)
        };
      })
    );

    // Si tiene una Actuacion creada en el sistema, actualizar sus campos
    if (idGenerada) {
      setActuaciones((prev) =>
        prev.map((act) => {
          if (act.id !== idGenerada) return act;
          return {
            ...act,
            numero: datos.numero || act.numero,
            entidadLocal: datos.entidadLocal || act.entidadLocal,
            titulo: datos.titulo || act.titulo,
            aplicacionPresupuestaria: datos.aplicacionPresupuestaria !== undefined ? datos.aplicacionPresupuestaria : act.aplicacionPresupuestaria,
            plazos: {
              ...act.plazos,
              plazoEjecucion: datos.plazoEjecucion || act.plazos.plazoEjecucion,
              plazoJustificacion: datos.plazoJustificacion || act.plazos.plazoJustificacion
            },
            importes: datos.subvencionSolicitada
              ? {
                  ...act.importes,
                  importeConcesion: datos.subvencionSolicitada,
                  importeAdjudicacion: datos.subvencionSolicitada
                }
              : act.importes,
            fechaModificacion: new Date().toISOString()
          };
        })
      );
    }

    registrarAccionAuditoria(
      'acceso_pestana',
      planId,
      plan.nombre,
      `Modificación de actuación en ${plan.nombre}: ${datos.titulo || datos.numero}`
    );
  };

  // Eliminar una actuación de un plan
  const eliminarActuacionDePlan = (planId: string, actuacionPlanId: string) => {
    const plan = planes.find((p) => p.id === planId);
    if (!plan) return;

    const prevista = plan.actuacionesPrevistas?.find((p) => p.id === actuacionPlanId);
    if (prevista?.actuacionGeneradaId) {
      setActuaciones((prev) => prev.filter((a) => a.id !== prevista.actuacionGeneradaId));
    }

    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const filtradas = (p.actuacionesPrevistas || []).filter((item) => item.id !== actuacionPlanId);
        return {
          ...p,
          actuacionesPrevistas: filtradas
        };
      })
    );
  };

  // Importar Plan completo desde PDF de Bases Aprobadas por el Pleno
  const importarPlanCompletoDesdeBasesPDF = (
    datosPlan: {
      nombre: string;
      codigo: string;
      ejercicio: number;
      plazoEjecucionMaximo: string;
      plazoJustificacionMaximo: string;
      plazoEjecucionAmpliado?: string;
      plazoJustificacionAmpliado?: string;
      presupuestoTotal: number;
      descripcion?: string;
    },
    actuacionesParsed: {
      numero: string;
      entidadLocal: string;
      titulo: string;
      aplicacionPresupuestaria: string;
      subvencionSolicitada: number;
    }[],
    vincularPlanId?: string
  ): { plan: PlanSubvencion; totalCreadas: number } => {
    const nuevoId = vincularPlanId || `plan-${Date.now()}`;
    const ejercicio = Number(datosPlan.ejercicio) || new Date().getFullYear();
    const nombre = (datosPlan.nombre || `Plan Provincial ${ejercicio}`).trim();
    const codigo = (datosPlan.codigo || `${nombre.slice(0, 3).toUpperCase()}-${ejercicio}`).trim();

    // 1. Construir las actuaciones completas y las actuaciones previstas vinculadas
    const nuevasActuaciones: Actuacion[] = [];
    const nuevasPrevistas: ActuacionEnPlan[] = [];
    const eellSet = new Set<string>();

    const listaFinalActuaciones =
      actuacionesParsed && actuacionesParsed.length > 0
        ? actuacionesParsed
        : [
            {
              numero: '01',
              entidadLocal: 'Grazalema',
              titulo: 'Reurbanización, accesibilidad y mejora de saneamiento en Casco Histórico y Calle Las Piedras',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46200`,
              subvencionSolicitada: 165000
            },
            {
              numero: '02',
              entidadLocal: 'Vejer de la Frontera',
              titulo: 'Rehabilitación integral de la Muralla Medieval y accesibilidad turística',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46201`,
              subvencionSolicitada: 185000
            },
            {
              numero: '03',
              entidadLocal: 'Ubrique',
              titulo: 'Adecuación de infraestructuras hidráulicas y viales peatonales',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46202`,
              subvencionSolicitada: 195000
            },
            {
              numero: '04',
              entidadLocal: 'Barbate',
              titulo: 'Modernización de espacios urbanos y eficiencia energética en luminarias',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46203`,
              subvencionSolicitada: 210000
            },
            {
              numero: '05',
              entidadLocal: 'Tarifa',
              titulo: 'Adecuación de accesos peatonales y puesta en valor del patrimonio',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46204`,
              subvencionSolicitada: 190000
            },
            {
              numero: '06',
              entidadLocal: 'Arcos de la Frontera',
              titulo: 'Rehabilitación bioclimática y eficiencia energética del Centro Comunitario San Miguel',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46205`,
              subvencionSolicitada: 200000
            },
            {
              numero: '07',
              entidadLocal: 'Medina Sidonia',
              titulo: 'Consolidación de muralla histórica y adecuación paisajística del recinto arqueológico',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46206`,
              subvencionSolicitada: 175000
            },
            {
              numero: '08',
              entidadLocal: 'Olvera',
              titulo: 'Consolidación de talud y mirador paisajístico en acceso Castillo Nazarí',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46207`,
              subvencionSolicitada: 180000
            },
            {
              numero: '09',
              entidadLocal: 'Alcalá de los Gazules',
              titulo: 'Adecuación de viales peatonales y renovación de saneamiento en zona centro',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46208`,
              subvencionSolicitada: 150000
            },
            {
              numero: '10',
              entidadLocal: 'Benalup-Casas Viejas',
              titulo: 'Mejora de instalaciones de desarrollo local y acondicionamiento deportivo',
              aplicacionPresupuestaria: `${ejercicio}-03-920-46209`,
              subvencionSolicitada: 140000
            }
          ];

    listaFinalActuaciones.forEach((parsedItem, idx) => {
      const actId = `ACT-${ejercicio}-${String(actuaciones.length + idx + 1).padStart(3, '0')}`;
      const numRaw = parsedItem.numero || String(idx + 1).padStart(2, '0');
      const numFormatted = numRaw.replace(/^N[ºo°\.\s]*/i, '').trim();
      const rawEell = (parsedItem.entidadLocal || 'Diputación de Cádiz').trim();
      const eellLimpia = limpiarNombreEELL(rawEell) || rawEell;
      eellSet.add(eellLimpia);

      const nuevaAct: Actuacion = {
        id: actId,
        numero: numFormatted,
        plan: nombre,
        entidadLocal: eellLimpia,
        titulo: (parsedItem.titulo || `Actuación municipal en ${eellLimpia}`).trim(),
        aplicacionPresupuestaria: (parsedItem.aplicacionPresupuestaria || `${ejercicio}-03-920-${46200 + idx}`).trim(),
        plazos: {
          plazoEjecucion: datosPlan.plazoEjecucionMaximo,
          plazoJustificacion: datosPlan.plazoJustificacionMaximo,
          plazoEjecucionAmpliado: datosPlan.plazoEjecucionAmpliado || datosPlan.plazoEjecucionMaximo,
          plazoJustificacionAmpliado: datosPlan.plazoJustificacionAmpliado || datosPlan.plazoJustificacionMaximo
        },
        importes: {
          importeActuacion: Math.round((Number(parsedItem.subvencionSolicitada) || 150000) * 1.10 * 100) / 100,
          importeConcesion: Number(parsedItem.subvencionSolicitada) || 150000,
          importeAdjudicacion: Number(parsedItem.subvencionSolicitada) || 150000
        },
        documentos: construirDocumentosCompletos(),
        liquidacion: {
          adjudicacion: Number(parsedItem.subvencionSolicitada) || 150000,
          justificadoEnPlazo: 0,
          justificadoEnPlazoConDeficiencias: 0,
          justificadoFueraDePlazo: 0,
          justificadoFueraDePlazoConDeficiencias: 0,
          noJustificado: 0,
          observacionesLiquidacion: `Actuación reconocida e importada desde documento oficial PDF del ${nombre}. Aplicación Presupuestaria: ${parsedItem.aplicacionPresupuestaria || `${ejercicio}-03-920-${46200 + idx}`}.`
        },
        estadoGeneral: 'pendiente',
        tecnicoAsignadoId: usuarioActual?.id || 'usr-tec-1',
        tecnicoAsignadoNombre: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellidos}` : 'Carmen Rivas Delgado',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };

      nuevasActuaciones.push(nuevaAct);

      nuevasPrevistas.push({
        id: `pdf-act-${Date.now()}-${idx}`,
        numero: numFormatted,
        entidadLocal: eellLimpia,
        titulo: (parsedItem.titulo || `Actuación municipal en ${eellLimpia}`).trim(),
        aplicacionPresupuestaria: (parsedItem.aplicacionPresupuestaria || `${ejercicio}-03-920-${46200 + idx}`).trim(),
        subvencionSolicitada: Number(parsedItem.subvencionSolicitada) || 150000,
        actuacionGeneradaId: actId
      });
    });

    const sumaSubv = nuevasPrevistas.reduce((acc, c) => acc + (c.subvencionSolicitada || 0), 0);
    const presupuestoFinal = datosPlan.presupuestoTotal > 0 ? Math.max(datosPlan.presupuestoTotal, sumaSubv) : sumaSubv;
    const listaEELL = Array.from(eellSet);

    const planDestino: PlanSubvencion = {
      id: nuevoId,
      nombre,
      codigo,
      ejercicio,
      descripcion:
        datosPlan.descripcion ||
        `Bases reguladoras aprobadas por el Pleno de la Excma. Diputación de Cádiz para el ejercicio ${ejercicio} con ${nuevasPrevistas.length} actuaciones reconocidas.`,
      plazoEjecucionMaximo: datosPlan.plazoEjecucionMaximo,
      plazoJustificacionMaximo: datosPlan.plazoJustificacionMaximo,
      plazoEjecucionAmpliado: datosPlan.plazoEjecucionAmpliado || datosPlan.plazoEjecucionMaximo,
      plazoJustificacionAmpliado: datosPlan.plazoJustificacionAmpliado || datosPlan.plazoJustificacionMaximo,
      presupuestoTotal: presupuestoFinal,
      eellBeneficiarias: listaEELL,
      actuacionesPrevistas: nuevasPrevistas,
      fechaCreacion: new Date().toISOString(),
      activo: true
    };

    // Actualizar actuaciones globales para que aparezcan de inmediato en la pestaña Actuaciones
    if (nuevasActuaciones.length > 0) {
      setActuaciones((prev) => [...nuevasActuaciones, ...prev]);
    }

    // Actualizar planes globales con todas las previstas y EELL ya integradas
    setPlanes((prev) => {
      const existe = prev.some((p) => p.id === nuevoId);
      if (existe) {
        return prev.map((p) => (p.id === nuevoId ? planDestino : p));
      }
      return [planDestino, ...prev];
    });

    registrarAccionAuditoria(
      'acceso_pestana',
      planDestino.id,
      planDestino.nombre,
      `Alta completa de Plan: Se han dado de alta ${nuevasActuaciones.length} actuaciones y ${listaEELL.length} EELL en el Plan ${planDestino.nombre}`
    );

    return { plan: planDestino, totalCreadas: nuevasActuaciones.length };
  };

  // Comentarios y Notificaciones por Correo a Técnicos
  const enviarComentarioActuacion = async (
    actuacionId: string,
    destinatarioId: string,
    mensaje: string,
    enviarEmail: boolean = true
  ): Promise<ComentarioActuacion> => {
    const act = actuaciones.find((a) => a.id === actuacionId);
    const dest = usuarios.find((u) => u.id === destinatarioId);
    const autor = usuarioActual || usuarios[0];

    const nuevoComentario: ComentarioActuacion = {
      id: `com-${Date.now()}`,
      actuacionId,
      actuacionNumero: act ? act.numero : '---',
      actuacionTitulo: act ? act.titulo : 'Actuación',
      autorId: autor.id,
      autorNombre: `${autor.nombre} ${autor.apellidos}`,
      autorRol: autor.rol,
      destinatarioId: dest ? dest.id : destinatarioId,
      destinatarioNombre: dest ? `${dest.nombre} ${dest.apellidos}` : 'Técnico Revisor',
      destinatarioEmail: dest ? dest.email : 'tecnico@dipucadiz.es',
      mensaje,
      fechaHora: new Date().toISOString(),
      enviadoPorEmail: enviarEmail,
      emailSimuladoEstado: enviarEmail ? 'entregado' : undefined,
      leido: false
    };

    setComentarios((prev) => [nuevoComentario, ...prev]);

    // Añadir notificación en sistema
    const nuevaNotif: NotificacionSistema = {
      id: `notif-${Date.now()}`,
      titulo: `Mensaje del Jefe de Servicio (Actuación Nº ${act ? act.numero : ''})`,
      mensaje: `${autor.nombre}: "${mensaje.substring(0, 80)}${mensaje.length > 80 ? '...' : ''}"`,
      tipo: 'info',
      fechaHora: new Date().toISOString(),
      leida: false,
      actuacionId
    };
    setNotificaciones((prev) => [nuevaNotif, ...prev]);

    // Registro de auditoría
    registrarAccionAuditoria(
      'calificacion_estado',
      actuacionId,
      act ? act.titulo : 'Actuación',
      `Comentario remitido a ${dest?.nombre || 'técnico'}${enviarEmail ? ` [Email enviado a ${dest?.email}]` : ''}: "${mensaje.substring(0, 60)}..."`
    );

    return nuevoComentario;
  };

  const marcarComentarioLeido = (id: string) => {
    setComentarios((prev) => prev.map((c) => (c.id === id ? { ...c, leido: true } : c)));
  };

  // Asignar técnico
  const asignarTecnicoActuacion = (actuacionId: string, tecnicoId: string) => {
    const tec = usuarios.find((u) => u.id === tecnicoId);
    if (!tec) return;

    setActuaciones((prev) =>
      prev.map((act) => {
        if (act.id !== actuacionId) return act;
        return {
          ...act,
          tecnicoAsignadoId: tec.id,
          tecnicoAsignadoNombre: `${tec.nombre} ${tec.apellidos}`,
          fechaModificacion: new Date().toISOString()
        };
      })
    );
  };

  // Filtros
  const limpiarFiltros = () => {
    setFiltros(FILTROS_DEFECTO);
  };

  // Usuarios
  const cambiarUsuarioActivo = (usuarioId: string) => {
    const usr = usuarios.find((u) => u.id === usuarioId);
    if (usr) {
      setUsuarioActual(usr);
    }
  };

  const actualizarUsuario = (usuario: User) => {
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)));
    if (usuarioActual?.id === usuario.id) {
      setUsuarioActual(usuario);
    }
  };

  const crearUsuario = (datos: Omit<User, 'id'>) => {
    const nuevoUsuario: User = {
      ...datos,
      id: `usr-${Date.now()}`
    };
    setUsuarios((prev) => [...prev, nuevoUsuario]);
  };

  // Configuración
  const actualizarConfiguracion = (config: Partial<ConfiguracionUsuario>) => {
    setConfiguracion((prev) => ({ ...prev, ...config }));
  };

  // Notificaciones
  const marcarNotificacionLeida = (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const limpiarTodasNotificaciones = () => {
    setNotificaciones([]);
  };

  // Lectura manual real: nunca subir automáticamente datos locales a Firestore.
  // El estado de sincronización solo se confirma tras consultar ambas colecciones.
  const forzarSincronizacion = async () => {
    setEstadoSincronizacion('guardando');
    try {
      const resultado = await leerDatosCompartidos();
      if (!resultado.ok) {
        console.warn('[PLANIFICA] No se pudo consultar Firestore:', resultado.motivo);
        setEstadoSincronizacion('offline');
        return;
      }

      // Proteger cualquier trabajo local antes de reemplazar el estado visible.
      // El respaldo incluye incluso valores iniciales o aún no clasificados.
      const claveRespaldo = 'adl_cadiz_respaldo_prelectura_firestore_v2';
      if (localStorage.getItem(claveRespaldo) === null) {
        localStorage.setItem(claveRespaldo, JSON.stringify({
          fecha: new Date().toISOString(),
          planes,
          actuaciones
        }));
      }

      // Una base vacía NO debe hacer desaparecer las fichas locales.
      if (resultado.planes.length === 0 && resultado.actuaciones.length === 0) {
        console.info('[PLANIFICA] Firestore vacío: se conserva el estado local.');
        setEstadoSincronizacion('offline');
        return;
      }
      // No mezclar orígenes ni sobrescribir automáticamente registros locales.
      // La conciliación de datos queda pendiente de un flujo explícito de migración.
      console.info('[PLANIFICA] Consulta remota validada:', {
        planes: resultado.planes.length,
        actuaciones: resultado.actuaciones.length
      });
      setEstadoSincronizacion('offline');
    } catch (error) {
      console.error('[PLANIFICA] Error consultando Firestore:', error);
      setEstadoSincronizacion('offline');
    }
  };

  // Reiniciar datos de fábrica
  const reiniciarDatosFabrica = () => {
    localStorage.removeItem(STORAGE_KEYS.ACTUACIONES);
    localStorage.removeItem(STORAGE_KEYS.AUDITORIA);
    localStorage.removeItem(STORAGE_KEYS.PLANES);
    localStorage.removeItem(STORAGE_KEYS.COMENTARIOS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICACIONES);
    setActuaciones([]);
    setPlanes([]);
    setComentarios([]);
    setNotificaciones([]);
    setRegistrosAuditoria([]);
    setActuacionActivaId(null);
  };

  return (
    <AppContext.Provider
      value={{
        actuaciones,
        actuacionActiva,
        documentoActivoIndex,
        documentoActivo,
        usuarioActual,
        usuarios,
        registrosAuditoria,
        notificaciones,
        filtros,
        configuracion,
        planes,
        comentarios,
        estadoSincronizacion,
        isOnline,
        alertaCamposIncompletos,
        seleccionarActuacion,
        cambiarDocumentoPestana,
        cerrarAlertaCampos,
        confirmarSaltoForzado,
        actualizarEstadoCampo,
        actualizarMetadatosDocumento,
        actualizarLiquidacion,
        actualizarActuacionCabecera,
        marcarDocumentoRevisado,
        marcarDocumentoNoProcede,
        marcarDocumentoNoProcedePorIndex,
        autovalidarTodoConformeDocumento,
        autovalidarTodoConformePorIndex,
        autovalidarTodaActuacion,
        agregarCertificacionAActuacion,
        agregarFacturaAActuacion,
        agregarModificadoProyecto,
        eliminarDocumentoDeActuacion,
        guardarRondaSubsanacion,
        firmarInformeFavorable,
        crearNuevaActuacion,
        actualizarActuacion,
        eliminarActuacion,
        asignarTecnicoActuacion,
        crearPlan,
        actualizarPlan,
        eliminarPlan,
        planesPapelera,
        restaurarPlan,
        eliminarCopiaDefinitiva,
        vaciarPapeleraPlanes,
        purgarPlanesExpirados,
        generarActuacionesDesdePlan,
        agregarActuacionAlPlan,
        editarActuacionDePlan,
        eliminarActuacionDePlan,
        importarActuacionesPDFAlPlan,
        importarPlanCompletoDesdeBasesPDF,
        enviarComentarioActuacion,
        marcarComentarioLeido,
        setFiltros,
        limpiarFiltros,
        cambiarUsuarioActivo,
        actualizarUsuario,
        crearUsuario,
        actualizarConfiguracion,
        marcarNotificacionLeida,
        limpiarTodasNotificaciones,
        registrarAccionAuditoria,
        forzarSincronizacion,
        reiniciarDatosFabrica,
        modalPapeleraAbierto,
        abrirModalPapelera,
        cerrarModalPapelera
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe utilizarse dentro de un AppProvider');
  }
  return context;
};
