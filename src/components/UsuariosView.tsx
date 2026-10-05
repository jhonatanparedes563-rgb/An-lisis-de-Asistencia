import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  BrainCircuit,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface UsuariosViewProps {
  users: AppUser[];
  currentUser: AppUser;
  onCreateUser: (newUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUser: (updatedUser: AppUser) => void;
  onSelectUser: (user: AppUser) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  users,
  currentUser,
  onCreateUser,
  onDeleteUser,
  onUpdateUser,
  onSelectUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('USER');
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('USER');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPassword(user.password || '');
    setFormRole(user.role);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanPass = formPassword.trim();

    if (!cleanName) {
      setFormError('El nombre completo es requerido.');
      return;
    }

    if (!cleanUsername) {
      setFormError('El nombre de usuario es requerido.');
      return;
    }

    if (
      !editingUser &&
      users.some((u) => u.username.toLowerCase() === cleanUsername)
    ) {
      setFormError(`El usuario "@${cleanUsername}" ya existe. Elige otro.`);
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setFormError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (editingUser) {
      const updated: AppUser = {
        ...editingUser,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail || `${cleanUsername}@camposol.com`,
        password: cleanPass,
        role: formRole,
        title: formRole === 'ADMIN' ? 'Administrador General' : 'Operador / Analista',
        avatarColor: formRole === 'ADMIN' ? 'bg-emerald-600' : 'bg-sky-600',
        permissions: {
          canUploadData: formRole === 'ADMIN',
          canDeleteData: formRole === 'ADMIN',
          canExportExcel: true,
          canViewAI: true,
          canAccessDiagnostics: formRole === 'ADMIN',
        },
      };
      onUpdateUser(updated);
    } else {
      const newUser: AppUser = {
        id: `usr_${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail || `${cleanUsername}@camposol.com`,
        password: cleanPass,
        role: formRole,
        title: formRole === 'ADMIN' ? 'Administrador General' : 'Operador / Analista',
        avatarColor: formRole === 'ADMIN' ? 'bg-emerald-600' : 'bg-sky-600',
        description:
          formRole === 'ADMIN'
            ? 'Control total y gestión de jornadas y usuarios.'
            : 'Consulta de dotación, reportes y modelos predictivos.',
        createdAt: new Date().toLocaleDateString('es-ES'),
        permissions: {
          canUploadData: formRole === 'ADMIN',
          canDeleteData: formRole === 'ADMIN',
          canExportExcel: true,
          canViewAI: true,
          canAccessDiagnostics: formRole === 'ADMIN',
        },
      };
      onCreateUser(newUser);
    }

    setIsModalOpen(false);
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const totalStandard = users.filter((u) => u.role === 'USER').length;

  return (
    <div className="w-full px-4 sm:px-6 py-4 flex flex-col space-y-4 font-sans">
      {/* Top Banner if logged as standard user */}
      {!isAdmin && (
        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Modo Consulta:</strong> Estás navegando como Usuario Consulta. Puedes visualizar los usuarios y sus permisos asignados, pero la creación, edición y eliminación de cuentas es exclusiva del Administrador.
            </span>
          </div>
        </div>
      )}

      {/* Header and Title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">
                Maestro de Usuarios
              </h1>
              <p className="text-xs text-slate-500">
                Directorio y administración centralizada de cuentas, roles, permisos y credenciales
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Crear Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Usuarios
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {users.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cuentas configuradas en la plataforma
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administradores</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {totalAdmins}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Control total y carga de Excel
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Usuarios Consulta</span>
          </div>
          <div className="text-2xl font-black text-sky-600 font-mono">
            {totalStandard}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Modo lectura y reportes analíticos
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Tu Sesión Actual
          </div>
          <div className="text-sm font-bold text-slate-800 truncate">
            {currentUser.name}
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-700 mt-1 uppercase">
            Rol: {currentUser.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, usuario (@username) o correo electrónico..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Filtrar:</span>
          <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                roleFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-2.5 py-1 rounded-lg transition ${
                roleFilter === 'ADMIN'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admins ({totalAdmins})
            </button>
            <button
              onClick={() => setRoleFilter('USER')}
              className={`px-2.5 py-1 rounded-lg transition ${
                roleFilter === 'USER'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Usuarios ({totalStandard})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Usuario y Nombre</th>
                <th className="px-4 py-3">Login / Correo</th>
                <th className="px-4 py-3">Rol del Sistema</th>
                <th className="px-4 py-3">Contraseña</th>
                <th className="px-4 py-3">Permisos de Acceso</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron usuarios con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isUserAdmin = u.role === 'ADMIN';
                  const isRootAdmin = u.id === 'admin';
                  const isPassRevealed = revealedPasswords[u.id];

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/60 transition ${
                        isCurrent ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Usuario y Nombre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs font-bold text-xs ${
                              isUserAdmin ? 'bg-emerald-600' : 'bg-sky-600'
                            }`}
                          >
                            {isUserAdmin ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Registrado: {u.createdAt || '01/10/2026'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Login / Correo */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-700 text-[11px]">
                          @{u.username}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {u.email}
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isUserAdmin
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-sky-100 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {isUserAdmin ? 'ADMINISTRADOR' : 'USUARIO CONSULTA'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {u.title}
                        </div>
                      </td>

                      {/* Contraseña */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                            {isPassRevealed ? u.password || '••••' : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                            title={isPassRevealed ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            {isPassRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Permisos */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.canUploadData ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title="Puede subir archivos Excel">
                              Carga Excel
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded" title="Carga restringida">
                              Sin Carga
                            </span>
                          )}

                          {u.permissions.canDeleteData ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title="Puede eliminar jornadas">
                              Borrado
                            </span>
                          ) : null}

                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            Reportes
                          </span>
                          <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            Modelos IA
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Activo
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCurrent && (
                            <button
                              onClick={() => onSelectUser(u)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              title="Iniciar sesión directamente como este usuario"
                            >
                              Cambiar a este
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Editar usuario o contraseña"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && !isRootAdmin && (
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
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear o Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {editingUser
                      ? 'Actualiza los datos y credenciales de acceso'
                      : 'Ingresa los datos para registrar un nuevo acceso al sistema'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Laura Vargas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ej: lvargas"
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
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="lvargas@camposol.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol y Nivel de Autorización *
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div
                    onClick={() => setFormRole('USER')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center gap-2.5 ${
                      formRole === 'USER'
                        ? 'border-sky-500 bg-sky-50/50 shadow-2xs ring-1 ring-sky-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 text-sky-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Usuario Consulta
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Solo lectura y reportes
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormRole('ADMIN')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center gap-2.5 ${
                      formRole === 'ADMIN'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20'
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
