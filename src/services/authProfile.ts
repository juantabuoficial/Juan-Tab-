import type { User, UserRole } from "../types";

const roles: UserRole[] = [
  "administrador",
  "jefe_servicio",
  "tecnico",
  "administrativo",
  "auditor",
  "consulta",
];

/** Solo perfiles activos del servidor; nunca inferir privilegios del correo. */
export function perfilAutorizado(
  uid: string,
  data: Record<string, unknown>,
): User {
  if (data.activo !== true || !roles.includes(data.rol as UserRole)) {
    throw new Error(
      "El perfil no está activo o no tiene un rol autorizado. Contacta con la administración.",
    );
  }
  if (typeof data.nombre !== "string" || typeof data.email !== "string") {
    throw new Error(
      "El perfil de acceso está incompleto. Contacta con la administración.",
    );
  }
  const rol = data.rol as UserRole;
  const gestor = rol === "administrador" || rol === "jefe_servicio";
  const editor = gestor || rol === "tecnico" || rol === "administrativo";
  return {
    ...data,
    id: uid,
    nombre: data.nombre,
    apellidos: typeof data.apellidos === "string" ? data.apellidos : "",
    email: data.email,
    rol,
    activo: true,
    departamento:
      typeof data.departamento === "string" ? data.departamento : "",
    cargo: typeof data.cargo === "string" ? data.cargo : "",
    biometriaHabilitada: false,
    dosFactoresHabilitado: false,
    permisos: {
      puedeEditarPlanes: gestor,
      puedeAsignarTecnicos: gestor,
      puedeCalificarDocumentos: editor,
      puedeExportarInformes: true,
      puedeEnviarComentarios: editor,
      puedeGestionarUsuarios: rol === "administrador",
    },
  };
}
