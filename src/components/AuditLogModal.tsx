import { fechaServidor } from '../utils/fechaServidor';
import React, { useState } from 'react';
import {
  History,
  X,
  Search,
  Download,
  ShieldCheck,
  Filter,
  CheckCircle,
  Clock,
  Laptop
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RegistroAuditoriaAcceso } from '../types';

interface AuditLogModalProps {
  mostrar: boolean;
  onCerrar: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ mostrar, onCerrar }) => {
  const { registrosAuditoria, actuaciones } = useApp();

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('todas');

  if (!mostrar) return null;

  const registrosFiltrados = registrosAuditoria.filter((reg) => {
    if (filtroAccion !== 'todas' && reg.accion !== filtroAccion) {
      return false;
    }
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase();
      return (
        reg.usuarioNombre.toLowerCase().includes(q) ||
        reg.documentoTitulo.toLowerCase().includes(q) ||
        (reg.detalles && reg.detalles.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportarAuditoriaCSV = () => {
    const headers = [
      'ID Registro',
      'Fecha y Hora (ISO)',
      'Funcionario / Técnico',
      'Rol',
      'ID Actuación',
      'Documento Base 14',
      'Acción',
      'Detalles',
      'Dispositivo',
      'IP'
    ];

    const rows = registrosAuditoria.map((r) => [
      r.id,
      r.fechaHora,
      `"${r.usuarioNombre}"`,
      r.rol,
      r.actuacionId,
      `"${r.documentoTitulo}"`,
      r.accion,
      `"${(r.detalles || '').replace(/"/g, '""')}"`,
      `"${r.dispositivo || ''}"`,
      r.ip || ''
    ]);

    const csvContent =
      '\uFEFF' + headers.join(';') + '\r\n' + rows.map((e) => e.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_ADL_Cadiz_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Cabecera del modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Registro de Auditoría Electrónica y Trazabilidad de Accesos</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Inmutable
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Área de Desarrollo Local · Diputación de Cádiz · Registro de accesos a pestañas y calificaciones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportarAuditoriaCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Auditoría CSV</span>
            </button>
            <button
              onClick={onCerrar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros de la auditoría */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por técnico, documento o acción..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-400 text-[11px]">Tipo de Acción:</span>
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            >
              <option value="todas">Todas las acciones</option>
              <option value="acceso_pestana">Acceso a Pestaña</option>
              <option value="modificacion_checklist">Modificación Checklist (✅/❌)</option>
              <option value="calificacion_estado">Calificación Estado Base 14</option>
              <option value="exportacion_pdf">Exportación de Informe PDF</option>
            </select>
          </div>
        </div>

        {/* Contenido de la tabla de auditoría */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {registrosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No hay registros de auditoría que coincidan con la búsqueda.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3">Fecha y Hora Exacta</th>
                  <th className="py-2.5 px-3">Funcionario / Revisor</th>
                  <th className="py-2.5 px-3">Documento Base 14</th>
                  <th className="py-2.5 px-3">Acción Registrada</th>
                  <th className="py-2.5 px-3">Detalles</th>
                  <th className="py-2.5 px-3">Dispositivo / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {registrosFiltrados.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {new Date(fechaServidor(reg)).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {reg.usuarioNombre}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {reg.rol}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      <span className="line-clamp-1 max-w-[200px]" title={reg.documentoTitulo}>
                        {reg.documentoTitulo}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {reg.accion === 'acceso_pestana' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          Acceso a Pestaña
                        </span>
                      )}
                      {reg.accion === 'modificacion_checklist' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Checklist (✅/❌)
                        </span>
                      )}
                      {reg.accion === 'calificacion_estado' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Calificación Base 14
                        </span>
                      )}
                      {reg.accion === 'exportacion_pdf' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          Descarga PDF
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                      {reg.detalles || '---'}
                    </td>

                    <td className="py-2.5 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                      <div>{reg.dispositivo || 'Navegador Seguro'}</div>
                      <div className="font-mono text-slate-500">{reg.ip}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total de eventos grabados: <strong>{registrosAuditoria.length}</strong>
          </span>
          <button
            onClick={onCerrar}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
