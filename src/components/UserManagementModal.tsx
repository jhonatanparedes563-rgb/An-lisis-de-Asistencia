import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Check,
  AlertCircle,
  Key,
  LogOut,
  Users,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  users: AppUser[];
  onCreateUser: (newUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onLogout: () => void;
  onSelectUser: (user: AppUser) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onCreateUser,
  onDeleteUser,
  onLogout,
  onSelectUser,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'ADMIN';

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName) {
      setError('Ingresa el nombre completo del usuario.');
      return;
    }

    if (!cleanUsername) {
      setError('Ingresa un nombre de usuario.');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      setError(`El nombre de usuario "${cleanUsername}" ya existe. Elige otro.`);
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail || `${cleanUsername}@camposol.com`,
      password: cleanPass,
      role: role,
      title: role === 'ADMIN' ? 'Administrador' : 'Operador / Analista',
      avatarColor: role === 'ADMIN' ? 'bg-emerald-600' : 'bg-sky-600',
      description:
        role === 'ADMIN'
          ? 'Control total y gestión de jornadas y usuarios.'
          : 'Consulta de dotación, reportes y modelos predictivos.',
      createdAt: new Date().toLocaleDateString('es-ES'),
      permissions: {
        canUploadData: role === 'ADMIN',
        canDeleteData: role === 'ADMIN',
        canExportExcel: true,
        canViewAI: true,
        canAccessDiagnostics: role === 'ADMIN',
      },
    };

    onCreateUser(newUser);
    setSuccess(`¡Usuario "${cleanName}" creado exitosamente!`);
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('USER');

    setTimeout(() => {
      setActiveTab('list');
      setSuccess(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Gestión de Usuarios y Accesos
              </h2>
              <p className="text-[11px] text-slate-500">
                Administración de cuentas, roles y credenciales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Solo si es Administrador puede crear) */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-3 shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios Registrados ({users.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Crear Nuevo Usuario</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Cuentas con acceso a la plataforma:</span>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Nuevo usuario</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {users.map((u) => {
                  const isUserActive = currentUser.id === u.id;
                  const isUserAdmin = u.role === 'ADMIN';
                  const isPrimaryRoot = u.id === 'admin';

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isUserActive
                          ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/20 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs ${
                            isUserAdmin ? 'bg-emerald-600' : 'bg-sky-600'
                          }`}
                        >
                          {isUserAdmin ? (
                            <ShieldCheck className="w-5 h-5" />
                          ) : (
                            <UserCheck className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {u.name}
                            </span>
                            {isUserActive && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                Activo
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>@{u.username}</span>
                            <span>·</span>
                            <span>Clave: {u.password || '••••'}</span>
                          </div>

                          <span
                            className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded mt-1 uppercase ${
                              isUserAdmin
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {isUserAdmin ? 'Administrador' : 'Usuario Consulta'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isUserActive && (
                          <button
                            onClick={() => {
                              onSelectUser(u);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          >
                            Cambiar a este
                          </button>
                        )}

                        {isAdmin && !isPrimaryRoot && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Estás seguro de eliminar el usuario "${u.name}" (@${u.username})?`
                                )
                              ) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Carlos Méndez"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: cmendez"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cmendez@camposol.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña Inicial *
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol y Permisos del Usuario *
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div
                    onClick={() => setRole('USER')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center gap-2.5 ${
                      role === 'USER'
                        ? 'border-sky-500 bg-sky-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 text-sky-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Usuario Consulta
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Lectura, reportes y Excel
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setRole('ADMIN')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center gap-2.5 ${
                      role === 'ADMIN'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Administrador
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Control total y carga Excel
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
