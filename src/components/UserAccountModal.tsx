import React from 'react';
import {
  Shield,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  X,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AppUser, APP_USERS } from '../types';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectUser: (user: AppUser) => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Selección de Usuario y Rol
              </h2>
              <p className="text-[11px] text-slate-500">
                Cambia entre Administrador y Usuario Consulta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Options */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Selecciona el perfil de trabajo. Las acciones críticas como cargar o eliminar archivos Excel se restringen según el rol asignado:
          </p>

          <div className="space-y-2.5">
            {APP_USERS.map((user) => {
              const isSelected = currentUser.id === user.id;
              const isAdmin = user.role === 'ADMIN';

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? isAdmin
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-sky-500 bg-sky-50/40 shadow-xs ring-2 ring-sky-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs ${
                      isAdmin ? 'bg-emerald-600' : 'bg-sky-600'
                    }`}
                  >
                    {isAdmin ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <UserCheck className="w-6 h-6" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-800">
                        {user.name}
                      </span>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {user.description}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium">
                      {user.permissions.canUploadData ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Unlock className="w-3 h-3" /> Carga Excel Habilitada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3 text-slate-400" /> Carga Bloqueada
                        </span>
                      )}

                      {user.permissions.canDeleteData ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Unlock className="w-3 h-3" /> Borrado Permitido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3 text-slate-400" /> Solo Lectura
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Indicator Radio */}
                  <div className="shrink-0 mt-0.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? isAdmin
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permisos Comparativa Rápida */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">
              Tabla de Permisos Operativos:
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 font-semibold text-slate-500">
                <span>Acción</span>
                <span className="flex items-center gap-4">
                  <span className="w-16 text-center text-emerald-700">Admin</span>
                  <span className="w-16 text-center text-sky-700">Usuario</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Cargar / Agregar archivos Excel</span>
                <span className="flex items-center gap-4 font-bold">
                  <span className="w-16 text-center text-emerald-600">✓ Sí</span>
                  <span className="w-16 text-center text-slate-400">✗ Bloqueado</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Eliminar jornadas / Limpiar base</span>
                <span className="flex items-center gap-4 font-bold">
                  <span className="w-16 text-center text-emerald-600">✓ Sí</span>
                  <span className="w-16 text-center text-slate-400">✗ Bloqueado</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Consulta de CFC, Personal y Evolución</span>
                <span className="flex items-center gap-4 font-bold">
                  <span className="w-16 text-center text-emerald-600">✓ Sí</span>
                  <span className="w-16 text-center text-sky-600">✓ Sí</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Modelos Predictivos IA y Simulación</span>
                <span className="flex items-center gap-4 font-bold">
                  <span className="w-16 text-center text-emerald-600">✓ Sí</span>
                  <span className="w-16 text-center text-sky-600">✓ Sí</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Descarga y Exportación a Excel</span>
                <span className="flex items-center gap-4 font-bold">
                  <span className="w-16 text-center text-emerald-600">✓ Sí</span>
                  <span className="w-16 text-center text-sky-600">✓ Sí</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
