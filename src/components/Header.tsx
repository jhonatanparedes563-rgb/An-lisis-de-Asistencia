import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Plus,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Lock,
  LogOut,
  Users,
  UserPlus,
} from 'lucide-react';
import { ActiveTab, MatrixKPIs, AppUser } from '../types';

interface HeaderProps {
  currentView: ActiveTab;
  onOpenUpload: () => void;
  kpis: MatrixKPIs;
  currentUser: AppUser;
  onOpenUserModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenUpload,
  kpis,
  currentUser,
  onOpenUserModal,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const titles: Record<ActiveTab, string> = {
    resumen: 'Resumen',
    personal: 'Personal',
    cfc: 'Control por CFC',
    evolucion: 'Evolución',
    ai: 'Modelos de Inteligencia Artificial',
    usuarios: 'Maestro de Usuarios',
    datos: 'Archivos',
  };

  const title = titles[currentView] || 'Asistencia';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-5 py-2.5 font-sans">
      <div className="flex items-center justify-between gap-4">
        {/* Left: View Title & Clean Meta */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-800 tracking-tight">
            {title}
          </h1>

          {kpis.totalDaysLoaded > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>·</span>
              <span>{kpis.totalDaysLoaded} {kpis.totalDaysLoaded === 1 ? 'día' : 'días'}</span>
              <span>·</span>
              <span>{kpis.totalUniqueWorkers.toLocaleString()} personas</span>
            </div>
          )}
        </div>

        {/* Right side: Period date, User Role Badge & Compact Upload Button */}
        <div className="flex items-center gap-2 shrink-0">
          {kpis.dateRange.start && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {kpis.dateRange.start}
                {kpis.dateRange.end && kpis.dateRange.end !== kpis.dateRange.start
                  ? ` – ${kpis.dateRange.end}`
                  : ''}
              </span>
            </div>
          )}

          {/* User Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold transition shadow-2xs cursor-pointer ${
                isAdmin
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                  : 'bg-sky-50/70 border-sky-300 text-sky-800 hover:bg-sky-100/70'
              }`}
              title="Opciones de cuenta y usuario"
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 ${
                  isAdmin ? 'bg-emerald-600' : 'bg-sky-600'
                }`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex items-center gap-1 text-left">
                <span className="hidden sm:inline font-bold">
                  {currentUser.name}
                </span>
                <span className="sm:hidden font-bold">
                  {isAdmin ? 'Admin' : 'Usuario'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-xs text-slate-800 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    @{currentUser.username} · {currentUser.email}
                  </div>
                  <span
                    className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 uppercase ${
                      isAdmin
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {isAdmin ? 'Administrador' : 'Usuario Consulta'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenUserModal();
                    }}
                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isAdmin ? 'Gestionar / Crear Usuarios' : 'Ver Usuarios y Permisos'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cargar Día (Con restricción de rol) */}
          <button
            onClick={isAdmin ? onOpenUpload : onOpenUserModal}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md shadow-2xs transition ${
              isAdmin
                ? 'bg-[#22C55E] hover:bg-[#16A34A] text-white cursor-pointer'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 cursor-pointer'
            }`}
            title={
              isAdmin
                ? 'Cargar nueva fecha de asistencia'
                : 'Solo Administrador. Haz clic para cambiar a Administrador.'
            }
          >
            {isAdmin ? (
              <Plus className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Cargar Día</span>
          </button>
        </div>
      </div>
    </header>
  );
};


