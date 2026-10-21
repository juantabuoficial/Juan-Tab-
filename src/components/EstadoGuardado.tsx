import { useApp } from "../context/AppContext";

/** Estado visible también dentro de los formularios modales. */
export function EstadoGuardado() {
  const { errorSincronizacion, cambiosPendientes } = useApp();
  if (errorSincronizacion)
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
      >
        {errorSincronizacion} Tu borrador se conserva; puedes cerrar este
        formulario para reintentar o guardar una copia y recargar.
      </p>
    );
  if (cambiosPendientes)
    return (
      <p
        role="status"
        className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
      >
        Guardando en el servidor…
      </p>
    );
  return null;
}
