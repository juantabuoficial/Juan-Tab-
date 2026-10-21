import type {
  Actuacion,
  PlanSubvencion,
  User,
  ComentarioActuacion,
  RegistroAuditoriaAcceso,
  NotificacionSistema,
  CopiaSeguridadPlan,
  ConfiguracionUsuario,
  UserRole,
} from "../types";

export interface Workspace {
  planes: PlanSubvencion[];
  actuaciones: Actuacion[];
  usuarios: User[];
  directorioPersonal: Pick<
    User,
    "id" | "nombre" | "apellidos" | "cargo" | "departamento" | "rol" | "activo"
  >[];
  comentarios: ComentarioActuacion[];
  auditoria: RegistroAuditoriaAcceso[];
  registrosAuditoria: RegistroAuditoriaAcceso[];
  notificaciones: NotificacionSistema[];
  papeleraPlanes: CopiaSeguridadPlan[];
  configuracionesUsuario: (ConfiguracionUsuario & { id: string })[];
}
export type CollectionName = keyof Workspace;
export const collectionNames: CollectionName[] = [
  "planes",
  "actuaciones",
  "usuarios",
  "directorioPersonal",
  "comentarios",
  "auditoria",
  "registrosAuditoria",
  "notificaciones",
  "papeleraPlanes",
  "configuracionesUsuario",
];
export type Row = { id?: string; idCopia?: string; [key: string]: any };
export interface Change {
  collection: CollectionName;
  id: string;
  before: Row | null;
  after: Row | null;
  latest?: Row | null;
}
export const emptyWorkspace = (): Workspace =>
  Object.fromEntries(
    collectionNames.map((c) => [c, []]),
  ) as unknown as Workspace;
export function rowId(collection: CollectionName, row: Row): string {
  const id = collection === "papeleraPlanes" ? row.idCopia : row.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
    throw new Error("Identificador de registro no válido.");
  return id;
}
/** Quita undefined sin convertir fechas/valores especiales ni borrar campos desconocidos. */
export function clean<T>(value: T): T {
  if (Array.isArray(value))
    return value.map((v) => (v === undefined ? null : clean(v))) as T;
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, clean(v)]),
    ) as T;
  }
  return value;
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export function businessData(row: Row | null): Row | null {
  if (!row) return null;
  const { revisionSync, actualizadoEnServidor, actualizadoPorUid, ...data } =
    row;
  return clean(data);
}
export function equalRows(a: Row | null, b: Row | null): boolean {
  return (
    JSON.stringify(canonical(businessData(a))) ===
    JSON.stringify(canonical(businessData(b)))
  );
}
export function diffRows(
  collection: CollectionName,
  before: Row[],
  after: Row[],
): Change[] {
  const prev = new Map(before.map((r) => [rowId(collection, r), r]));
  const next = new Map(after.map((r) => [rowId(collection, r), clean(r)]));
  if (next.size !== after.length)
    throw new Error(
      "Hay identificadores duplicados. No se ha guardado el cambio.",
    );
  return [...new Set([...prev.keys(), ...next.keys()])].flatMap((id) => {
    const a = prev.get(id) ?? null,
      b = next.get(id) ?? null;
    return equalRows(a, b) ? [] : [{ collection, id, before: a, after: b }];
  });
}
export function changeKey(c: Pick<Change, "collection" | "id">): string {
  return `${c.collection}/${c.id}`;
}
export function overlay(base: Workspace, changes: Change[]): Workspace {
  const next = { ...base };
  for (const collection of collectionNames) {
    const affected = changes.filter((c) => c.collection === collection);
    if (!affected.length) continue;
    const rows = new Map(
      (base[collection] as Row[]).map((r) => [rowId(collection, r), r]),
    );
    for (const c of affected) {
      if (c.after) rows.set(c.id, c.after);
      else rows.delete(c.id);
    }
    (next[collection] as Row[]) = [...rows.values()];
  }
  return next;
}
export function canChange(c: Change, uid: string, role: UserRole): boolean {
  const admin = role === "administrador",
    chief = role === "jefe_servicio";
  const editor =
    admin || chief || role === "tecnico" || role === "administrativo";
  if (c.collection === "planes")
    return admin || (!(!c.before || !c.after) && chief);
  if (c.collection === "actuaciones") return c.after ? editor : admin;
  if (
    c.collection === "usuarios" ||
    c.collection === "directorioPersonal" ||
    c.collection === "papeleraPlanes"
  )
    return admin;
  if (c.collection === "auditoria")
    return !!c.after && !c.before && c.after.usuarioId === uid;
  if (c.collection === "configuracionesUsuario")
    return c.id === uid && !!c.after;
  if (c.collection === "comentarios") {
    if (admin) return true;
    if (!c.before) return editor && !!c.after && c.after.autorId === uid;
    return (
      editor &&
      !!c.after &&
      c.before.destinatarioId === uid &&
      equalRows({ ...c.before, leido: c.after.leido }, c.after)
    );
  }
  if (c.collection === "notificaciones") {
    if (!c.before) return editor && !!c.after;
    return admin && !c.after;
  }
  return false;
}
