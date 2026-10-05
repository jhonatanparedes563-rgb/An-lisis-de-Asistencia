import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileSpreadsheet,
  Upload,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FolderTree,
  Minus,
  Plus,
  Layers,
  Download,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  Lock,
} from 'lucide-react';
import { ActiveTab, MatrixKPIs, AppUser } from '../types';
import { CamposolLogo } from './CamposolLogo';

interface SidebarProps {
  currentView: ActiveTab;
  onSelectView: (view: ActiveTab) => void;
  onOpenUpload: () => void;
  onExportExcel: () => void;
  kpis: MatrixKPIs;
  currentUser: AppUser;
  onOpenUserModal: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenUpload,
  onExportExcel,
  kpis,
  currentUser,
  onOpenUserModal,
  onLogout,
}) => {
  const [isProcesosOpen, setIsProcesosOpen] = useState(true);
  const [isReportesOpen, setIsReportesOpen] = useState(true);
  const [isCargaOpen, setIsCargaOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isProcesosActive = ['resumen', 'personal', 'cfc', 'evolucion', 'ai', 'usuarios'].includes(currentView);
  const isReportesActive = currentView === 'datos';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 sticky top-0 select-none shadow-xs z-20 transition-all duration-200 font-sans`}
    >
      {/* Brand Header - Más Grande y Prominente */}
      <div className="py-6 px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3.5 overflow-hidden">
          <CamposolLogo className={`${isCollapsed ? 'w-12 h-12' : 'w-14 h-14'} shadow-md rounded-full shrink-0 ring-2 ring-emerald-100 transition-all`} />

          {!isCollapsed && (
            <div className="truncate">
              <div className="font-black text-xl tracking-tight text-slate-900 leading-none">
                Camposol
              </div>
              <div className="text-[11px] font-black text-[#15803D] tracking-widest uppercase mt-1.5 flex items-center gap-1.5">
                <span>ASISTENCIA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition shrink-0 ml-1"
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections - Desplazado Más Abajo con Espacio Cómodo */}
      <nav className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-4 custom-scrollbar text-xs">
        {/* Section 1: Carga */}
        <div>
          <button
            onClick={() => setIsCargaOpen(!isCargaOpen)}
            className="w-full px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between rounded-lg hover:bg-slate-50 transition group"
            title="Extender u ocultar Carga"
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
              {!isCollapsed && <span>Carga</span>}
            </div>
            {!isCollapsed && (
              <span className="text-slate-400 group-hover:text-slate-600">
                {isCargaOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </span>
            )}
          </button>

          {isCargaOpen && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={isAdmin ? onOpenUpload : onOpenUserModal}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  isAdmin
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title={isAdmin ? 'Cargar o agregar asistencia de otra fecha' : 'Solo Administrador. Clic para ver permisos'}
              >
                <div className="flex items-center gap-2.5">
                  {isAdmin ? (
                    <PlusCircle className="w-4 h-4 shrink-0 text-[#16A34A]" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0 text-slate-400" />
                  )}
                  {!isCollapsed && (
                    <span>{isAdmin ? '+ Cargar / Agregar Día' : '+ Cargar (Solo Admin)'}</span>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Procesos */}
        <div>
          <button
            onClick={() => setIsProcesosOpen(!isProcesosOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-bold transition text-xs ${
              isProcesosActive
                ? 'bg-[#22C55E] text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
            title="Hacer clic para extender u ocultar Procesos"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Procesos</span>}
            </div>
            {!isCollapsed && (
              <span className="font-bold text-xs">
                {isProcesosOpen ? '—' : '+'}
              </span>
            )}
          </button>

          {isProcesosOpen && (
            <div className="mt-1.5 space-y-1 pl-2">
              {/* Resumen */}
              <button
                onClick={() => onSelectView('resumen')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'resumen'
                    ? 'text-[#16A34A] font-bold bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'resumen' ? 'bg-[#22C55E]' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>Resumen</span>}
                </div>
              </button>

              {/* Personal */}
              <button
                onClick={() => onSelectView('personal')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'personal'
                    ? 'text-[#16A34A] font-bold bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'personal' ? 'bg-[#22C55E]' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>Personal</span>}
                </div>
              </button>

              {/* Control por CFC */}
              <button
                onClick={() => onSelectView('cfc')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'cfc'
                    ? 'text-[#16A34A] font-bold bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'cfc' ? 'bg-[#22C55E]' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>CFC</span>}
                </div>
              </button>

              {/* Evolución Asistencia */}
              <button
                onClick={() => onSelectView('evolucion')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'evolucion'
                    ? 'text-[#16A34A] font-bold bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'evolucion' ? 'bg-[#22C55E]' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>Evolución</span>}
                </div>
              </button>

              {/* Modelos IA */}
              <button
                onClick={() => onSelectView('ai')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'ai'
                    ? 'text-purple-700 font-bold bg-purple-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'ai' ? 'bg-purple-600' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>Modelos IA</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">
                    IA
                  </span>
                )}
              </button>

              {/* Maestro de Usuarios */}
              <button
                onClick={() => onSelectView('usuarios')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'usuarios'
                    ? 'text-[#16A34A] font-bold bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Maestro de Usuarios del Sistema"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'usuarios' ? 'bg-[#22C55E]' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>Maestro de Usuarios</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                    {isAdmin ? 'ADMIN' : 'USUARIO'}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Reportes */}
        <div>
          <button
            onClick={() => setIsReportesOpen(!isReportesOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-bold transition text-xs ${
              isReportesActive
                ? 'bg-[#22C55E] text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
            title="Hacer clic para extender u ocultar Reportes"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Reportes</span>}
            </div>
            {!isCollapsed && (
              <span className="font-bold text-xs">
                {isReportesOpen ? '—' : '+'}
              </span>
            )}
          </button>

          {isReportesOpen && (
            <div className="mt-1.5 space-y-1 pl-2">
              <button
                onClick={() => onSelectView('datos')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition ${
                  currentView === 'datos'
                    ? 'text-[#16A34A] font-bold bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Gestión de Jornadas y Archivos"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentView === 'datos' ? 'bg-[#22C55E]' : 'border border-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span>Jornadas Cargadas</span>}
                </div>
              </button>

              <button
                onClick={onExportExcel}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                title="Descargar reporte consolidado a Excel"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  {!isCollapsed && <span>Exportar Excel</span>}
                </div>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Footer con Perfil de Usuario */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {/* User Card */}
        <div
          onClick={onOpenUserModal}
          className="p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center justify-between shadow-2xs group"
          title="Hacer clic para cambiar entre Administrador y Usuario"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${
                isAdmin ? 'bg-emerald-600' : 'bg-sky-600'
              }`}
            >
              {isAdmin ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </div>

            {!isCollapsed && (
              <div className="truncate">
                <div className="font-bold text-[11px] text-slate-800 truncate leading-tight">
                  {currentUser.name}
                </div>
                <div
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isAdmin ? 'text-emerald-700' : 'text-sky-700'
                  }`}
                >
                  {isAdmin ? 'ADMINISTRADOR' : 'USUARIO CONSULTA'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botón Cerrar Sesión Exclusivo */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center justify-center gap-2 ${
            isCollapsed ? 'p-2' : 'px-3 py-2'
          } text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200/70 rounded-xl transition cursor-pointer shadow-2xs`}
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};
