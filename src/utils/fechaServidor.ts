import type { MetadataSincronizacion } from "../types";

/** Presentar el sello del servidor cuando exista; conservar fechas históricas. */
export function fechaServidor(
  registro: MetadataSincronizacion & { fechaHora: string },
): string {
  const stamp = registro.actualizadoEnServidor;
  return stamp
    ? new Date(stamp.seconds * 1000 + stamp.nanoseconds / 1e6).toISOString()
    : registro.fechaHora;
}
