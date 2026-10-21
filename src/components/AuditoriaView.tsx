import { fechaServidor } from '../utils/fechaServidor';
import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Clock,
  Laptop,
  UserCheck,
  FileCheck2,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RegistroAuditoriaAcceso } from '../types';
import { CadizLogo } from './CadizLogo';

export const AuditoriaView: React.FC = () => {
  const { registrosAuditoria, actuaciones, usuarios, usuarioActual } = useApp();

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroAccion, setFiltroAccion] = useState<string>('todas');
  const [filtroUsuario, setFiltroUsuario] = useState<string>('todos');

  const registrosFiltrados = registrosAuditoria.filter((reg) => {
    if (filtroAccion !== 'todas' && reg.accion !== filtroAccion) {
      return false;
    }
    if (filtroUsuario !== 'todos' && reg.usuarioId !== filtroUsuario) {
      return false;
    }
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase();
      return (
        reg.usuarioNombre.toLowerCase().includes(q) ||
        reg.documentoTitulo.toLowerCase().includes(q) ||
        (reg.detalles && reg.detalles.toLowerCase().includes(q)) ||
        reg.actuacionId.toLowerCase().includes(q)
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
    link.download = `Auditoria_Oficial_ADL_Cadiz_${Date.now()}.csv`;
    link.click();
  };

  const getAccionBadge = (accion: RegistroAuditoriaAcceso['accion']) => {
    switch (accion) {
      case 'acceso_pestana':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0063A2] dark:text-sky-300 border border-blue-200 dark:border-blue-900">
            Acceso a Pestaña
          </span>
        );
      case 'modificacion_checklist':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDAC41]/15 text-[#FDAC41]">
            Revisión Checklist
          </span>
        );
      case 'calificacion_estado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#39DA8A]/15 text-[#39DA8A]">
            Calificación Oficial
          </span>
        );
      case 'exportacion_pdf':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00CFDD]/15 text-[#00CFDD]">
            Exportación PDF
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal de Auditoría con Escudo Diputación de Cádiz */}
      <div className="bg-white rounded-3xl border border-[#DFE6ED] shadow-xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <CadizLogo size="md" showText={false} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#36799C] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Área de Desarrollo Local · Diputación Provincial de Cádiz</span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-[#1C2E3D] tracking-tight flex items-center gap-2 flex-wrap">
              <span>Auditoría Electrónica y Trazabilidad Inmutable</span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EAF6F3] text-emerald-800 border border-[#CFEFE7]">
                Certificado Digital
              </span>
            </h1>
            <p className="text-xs text-[#6C7D8E] mt-1 max-w-3xl leading-relaxed">
              Registro cronológico obligatorio e inalterable de todos los accesos a expedientes, comprobaciones de checklist Base 14, modificaciones de importes y calificaciones técnicas de justificación por parte de técnicos y jefatura del servicio.
            </p>
          </div>
        </div>

        <button
          onClick={exportarAuditoriaCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#004F90] hover:bg-[#003B71] text-white text-xs font-bold shadow-xs transition shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Certificado CSV</span>
        </button>
      </div>

      {/* Métricas del Sistema de Auditoría */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#DFE6ED] shadow-xs p-5 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-slate-100 text-[#283949] border border-slate-200">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#6C7D8E] uppercase tracking-wider">Total Registros</span>
            <div className="text-xl font-black text-[#1C2E3D]">
              {registrosAuditoria.length} accesos
            </div>
          </div>
        </div>

        <div className="bg-[#EAF6F3] rounded-2xl border border-[#CFEFE7] shadow-xs p-5 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-white/80 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Calificaciones</span>
            <div className="text-xl font-black text-emerald-700">
              {registrosAuditoria.filter((r) => r.accion === 'calificacion_estado').length} emitidas
            </div>
          </div>
        </div>

        <div className="bg-[#FDF0E7] rounded-2xl border border-[#F5DACB] shadow-xs p-5 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-white/80 text-[#DE6C38] border border-[#F5DACB]">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#8D5C43] uppercase tracking-wider">Jefe de Servicio</span>
            <div className="text-xs font-black text-[#DE6C38] truncate">
              JUAN HINOJO GARCÍA
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#DFE6ED] shadow-xs p-5 flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-slate-100 text-[#36799C] border border-slate-200">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#6C7D8E] uppercase tracking-wider">Informes PDF</span>
            <div className="text-xl font-black text-[#1C2E3D]">
              {registrosAuditoria.filter((r) => r.accion === 'exportacion_pdf').length} generados
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-[#1E2738] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por técnico, actuación, documento o detalle de la acción..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2738] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0063A2]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2738] text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0063A2]"
            >
              <option value="todas">Todas las Acciones</option>
              <option value="acceso_pestana">Acceso a Pestaña</option>
              <option value="modificacion_checklist">Modificación Checklist</option>
              <option value="calificacion_estado">Calificación Estado</option>
              <option value="exportacion_pdf">Exportación PDF</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2738] text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0063A2]"
            >
              <option value="todos">Todos los Usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellidos} ({u.cargo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            Mostrando <strong>{registrosFiltrados.length}</strong> de {registrosAuditoria.length} eventos inmutables
          </span>
          {(filtroTexto || filtroAccion !== 'todas' || filtroUsuario !== 'todos') && (
            <button
              onClick={() => {
                setFiltroTexto('');
                setFiltroAccion('todas');
                setFiltroUsuario('todos');
              }}
              className="text-[#0063A2] font-semibold hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal de Auditoría en estilo Frest */}
      <div className="frest-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#1E2738] text-[#475F7B] dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 w-40">Fecha y Hora</th>
                <th className="py-3 px-4 w-48">Funcionario / Técnico</th>
                <th className="py-3 px-4 w-36">Tipo Acción</th>
                <th className="py-3 px-4">Documento / Expediente</th>
                <th className="py-3 px-4 min-w-[200px]">Detalle Registrado</th>
                <th className="py-3 px-4 w-32 text-right">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {registrosFiltrados.length > 0 ? (
                registrosFiltrados.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#727E8C] dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(fechaServidor(reg)).toLocaleString('es-ES')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#475F7B] dark:text-white">
                        {reg.usuarioNombre}
                      </div>
                      <div className="text-[10px] text-[#727E8C] dark:text-slate-400 capitalize">{reg.rol.replace('_', ' ')}</div>
                    </td>
                    <td className="py-3 px-4">{getAccionBadge(reg.accion)}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#475F7B] dark:text-slate-200 line-clamp-1">
                        {reg.documentoTitulo}
                      </div>
                      <div className="text-[10px] font-mono text-[#727E8C] dark:text-slate-400">Exp: {reg.actuacionId}</div>
                    </td>
                    <td className="py-3 px-4 text-[#727E8C] dark:text-slate-300 text-[11px] leading-relaxed">
                      {reg.detalles || 'Acceso estándar a expediente'}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-[#727E8C] dark:text-slate-400 font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <Laptop className="w-3 h-3 text-slate-400" />
                        <span>{reg.dispositivo || 'Navegador Web'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No se han encontrado registros con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
