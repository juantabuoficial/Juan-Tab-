export interface MetadataSincronizacion {
  revisionSync?: number;
  actualizadoPorUid?: string;
  actualizadoEnServidor?: { seconds: number; nanoseconds: number };
}

/**
 * Tipos de datos para ADL (versión 1.1) - Diputación de Cádiz
 * Área de Desarrollo Local
 */

export type UserRole = 'jefe_servicio' | 'tecnico' | 'auditor' | 'administrador' | 'administrativo' | 'consulta';

export interface PermisosUsuario {
  puedeEditarPlanes: boolean;
  puedeAsignarTecnicos: boolean;
  puedeCalificarDocumentos: boolean;
  puedeExportarInformes: boolean;
  puedeEnviarComentarios: boolean;
  puedeGestionarUsuarios: boolean;
}

export interface CertificadoDispositivo {
  id: string;
  titular: string; // ej: "JUAN HINOJO GARCÍA"
  nif: string; // ej: "28765432Z"
  emisor: string; // ej: "AC FNMT Usuarios - Fábrica Nacional de Moneda y Timbre"
  numeroSerie: string; // ej: "4B:91:CA:88:2E:10:97:F5"
  validezDesde: string;
  validezHasta: string;
  algoritmo: string; // ej: "SHA256withRSA (2048 bits)"
  huellaSha256: string; // Thumbprint SHA-256
  origen: 'almacen_sistema' | 'autofirma' | 'archivo_software';
  activo: boolean;
  fechaDeteccion?: string;
}

export interface FirmaElectronicaInforme {
  certificado: CertificadoDispositivo;
  fechaHoraFirma: string; // Timestamp ISO
  selloTiempoTSA: string; // Sello de tiempo de la Autoridad de Sellado
  hashDocumentoSha256: string; // Hash SHA-256 del informe
  csv: string; // Código Seguro de Verificación
  firmado: boolean;
  valido: boolean;
  politicaFirma?: string;
  metodoFirma: 'autofirma_dispositivo' | 'almacen_certificados_dispositivo' | 'archivo_p12';
}

export interface User extends MetadataSincronizacion {
  id: string;
  nombre: string;
  apellidos: string;
  nif?: string;
  email: string;
  rol: UserRole;
  departamento: string;
  cargo: string;
  telefono?: string;
  biometriaHabilitada: boolean;
  dosFactoresHabilitado: boolean;
  certificadoDispositivo?: CertificadoDispositivo;
  permisos?: PermisosUsuario;
  activo?: boolean;
  fechaAlta?: string;
  avatarUrl?: string;
  ultimoAcceso?: string;
}

export type EstadoRevision = 'conforme' | 'no_conforme' | 'sin_revisar';

export type EstadoGeneralActuacion = 
  | 'pendiente' 
  | 'en_revision' 
  | 'con_deficiencias' 
  | 'justificado' 
  | 'no_justificado' 
  | 'conforme';

export type EstadoJustificacionDocumento = 
  | 'En plazo' 
  | 'En plazo con deficiencias no sustanciales' 
  | 'Fuera de plazo' 
  | 'Fuera de plazo con deficiencias no sustanciales' 
  | 'No Justificado' 
  | 'Pendiente de calificar';

export interface CampoRevisar {
  id: string;
  campo: string;
  descripcion?: string;
  estado: EstadoRevision;
  observacion: string; // En blanco si conforme, texto automático / subsanación si error
  subsanaciones?: string[]; // Múltiples motivos de subsanación seleccionados
  requerido: boolean;
}

export interface RegistroAuditoriaAcceso extends MetadataSincronizacion {
  id: string;
  fechaHora: string; // ISO 8601
  usuarioId: string;
  usuarioNombre: string;
  rol: UserRole;
  actuacionId: string;
  documentoId: string;
  documentoTitulo: string;
  accion: 'acceso_pestana' | 'modificacion_checklist' | 'calificacion_estado' | 'exportacion_pdf';
  detalles?: string;
  dispositivo?: string;
  ip?: string;
}

export interface ParticipanteRevision {
  usuarioId: string;
  usuarioNombre: string;
  rol: UserRole;
  fechaHora: string;
  accion: string;
}

export interface MetadatosBase14 {
  importeInicial: number | null;
  importeUltima: number | null;
  fechaExpedicionInicial: string;
  fechaExpedicionUltima: string;
  fechaRegistroInicial: string;
  fechaRegistroUltima: string;
  fechaAprobacionInicial: string;
  fechaAprobacionUltima: string;
  fechaRegistroAprobacionInicial: string;
  fechaRegistroAprobacionUltima: string;
  estadoJustificacion: EstadoJustificacionDocumento;
  observacionesGenerales: string;
}

export interface DeficienciaSubsanacion {
  campoId: string;
  campo: string;
  descripcion?: string;
  subsanaciones: string[];
  observacion: string;
}

export interface RondaSubsanacion {
  id: string;
  numeroRonda: number; // 1, 2, 3...
  fechaHora: string; // ISO 8601
  tecnicoId: string;
  tecnicoNombre: string;
  tecnicoCargo: string;
  estado: 'requiere_subsanacion' | 'parcialmente_subsanado' | 'totalmente_subsanado';
  deficiencias: DeficienciaSubsanacion[];
  camposConformes: string[];
  observaciones?: string;
  csv: string;
  firmado: boolean;
  firmaElectronica?: FirmaElectronicaInforme;
}

export interface InformeFavorableDocumento {
  emitido: boolean;
  fechaHoraFirma: string;
  firmanteId: string;
  firmanteNombre: string;
  firmanteCargo: string;
  firmanteDpto: string;
  csv: string;
  dictamen: string;
  firmaElectronica?: FirmaElectronicaInforme;
}

export interface DocumentoActuacion {
  id: string;
  orden: number;
  codigo: string;
  titulo: string;
  subtitulo?: string;
  categoria: 
    | 'solicitud'
    | 'proyecto'
    | 'adjudicacion' 
    | 'fotografias' 
    | 'replanteo' 
    | 'certificaciones' 
    | 'asistencia_tecnica' 
    | 'recepcion' 
    | 'modificado' 
    | 'justificacion';
  fase?: 'solicitud' | 'justificacion';
  metadatos: MetadatosBase14;
  camposRevisar: CampoRevisar[];
  fechaHoraPrimerAcceso?: string;
  fechaHoraUltimoAcceso?: string;
  tecnicoUltimoAcceso?: string;
  tecnicoRevisorOriginal?: string;
  fechaRevisionOriginal?: string;
  tecnicosParticipantes?: string[];
  historialParticipantes?: ParticipanteRevision[];
  rondasSubsanacion?: RondaSubsanacion[];
  informeFavorable?: InformeFavorableDocumento;
  revisadoCompleto: boolean;
  tieneDeficiencias: boolean;
  noProcede?: boolean;
}

export interface PlazosActuacion {
  plazoEjecucion: string;
  plazoJustificacion: string;
  plazoEjecucionAmpliado?: string;
  plazoJustificacionAmpliado?: string;
}

export interface ImportesActuacion {
  importeActuacion: number;
  importeConcesion: number;
  importeAdjudicacion: number;
  aportacionMunicipal?: number;
}

export interface CuadroLiquidacion {
  adjudicacion: number;
  // Ejecutado en plazo de ejecución
  justificadoEnPlazo: number;
  justificadoEnPlazoConDeficiencias: number;
  justificadoFueraDePlazo: number;
  justificadoFueraDePlazoConDeficiencias: number;
  // No Justificado
  noJustificado: number; // Ejecutado fuera de plazo, aprobado fuera, deficiencias sustanciales
  observacionesLiquidacion: string;
}

export interface Actuacion extends MetadataSincronizacion {
  id: string;
  numero: string; // ej: "01", "02", "14"
  plan: string; // Plan / Programa / Convenio
  entidadLocal: string; // Entidad Local Beneficiaria
  nifEntidad?: string;
  titulo: string; // Título de la actuación
  aplicacionPresupuestaria?: string; // Aplicación presupuestaria (antes de la subvención solicitada)
  faseActual?: 'solicitud' | 'ejecucion' | 'justificacion';
  plazos: PlazosActuacion;
  importes: ImportesActuacion;
  documentos: DocumentoActuacion[];
  liquidacion: CuadroLiquidacion;
  estadoGeneral: EstadoGeneralActuacion;
  tecnicoAsignadoId: string;
  tecnicoAsignadoNombre: string;
  tecnicoAsignadoCargo?: string;
  fechaCreacion: string;
  fechaModificacion: string;
  tecnicosParticipantes?: string[];
  observacionesInternas?: string;
}

export interface FiltrosBusqueda {
  plan: string;
  entidadLocal: string;
  numeroActuacion: string;
  titulo: string;
  fecha: string;
  estado: string;
  palabraClave: string;
  ordenCronologico: 'desc' | 'asc';
  ano?: string;
  aplicacionPresupuestaria?: string;
  importe?: string;
  tecnico?: string;
}

export interface NotificacionSistema extends MetadataSincronizacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'alerta' | 'vencimiento' | 'info' | 'exito';
  fechaHora: string;
  leida: boolean;
  actuacionId?: string;
}

export interface ConfiguracionUsuario {
  notificacionesLeidas?: string[];
  notificacionesPush: boolean;
  recordatoriosEmailDiarios: boolean;
  alertasVencimientoDias: number; // e.g. 30 días
  sincronizacionNubeAutomatica: boolean;
  cifradoExtremoAExtremo: boolean;
  modoOscuro: 'auto' | 'dark' | 'light';
  autenticacionBiometrica: boolean;
  autenticacion2FA: boolean;
}

export interface ComentarioActuacion extends MetadataSincronizacion {
  id: string;
  actuacionId: string;
  actuacionNumero: string;
  actuacionTitulo: string;
  autorId: string;
  autorNombre: string;
  autorRol: UserRole;
  destinatarioId: string;
  destinatarioNombre: string;
  destinatarioEmail: string;
  mensaje: string;
  fechaHora: string;
  enviadoPorEmail: boolean;
  emailSimuladoEstado?: 'enviado' | 'entregado' | 'leido';
  leido: boolean;
}

export interface ActuacionEnPlan {
  id: string;
  numero: string; // ej: "01", "02"
  entidadLocal: string;
  titulo: string;
  aplicacionPresupuestaria?: string; // Aplicación presupuestaria (antes de la subvención solicitada)
  subvencionSolicitada: number;
  actuacionGeneradaId?: string;
  plazoEjecucion?: string;
  plazoJustificacion?: string;
}

export interface PlanSubvencion extends MetadataSincronizacion {
  id: string;
  codigo: string; // ej: "PCM-2026", "PPCOS-24-28"
  nombre: string; // ej: "Plan Cádiz Marcha + 2026"
  descripcion?: string;
  ejercicio: number;
  plazoEjecucionMaximo: string;
  plazoJustificacionMaximo: string;
  plazoEjecucionAmpliado?: string;
  plazoJustificacionAmpliado?: string;
  eellBeneficiarias: string[];
  actuacionesPrevistas: ActuacionEnPlan[];
  presupuestoTotal: number;
  fechaCreacion: string;
  activo: boolean;
}

export interface CopiaSeguridadPlan extends MetadataSincronizacion {
  idCopia: string;
  fechaBorrado: string;
  fechaExpiracion: string;
  diasRetencion: number;
  borradoPorUsuario: string;
  plan: PlanSubvencion;
  actuacionesAsociadas: Actuacion[];
  motivo?: string;
}
