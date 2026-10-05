import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Building2,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { AppUser } from '../types';
import { CamposolLogo } from './CamposolLogo';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = usernameOrEmail.trim().toLowerCase();
    const enteredPassword = password.trim();

    if (!identifier) {
      setError('Por favor, ingresa tu usuario o correo electrónico.');
      return;
    }

    if (!enteredPassword) {
      setError('Por favor, ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const matchedUser = users.find(
        (u) =>
          u.username.toLowerCase() === identifier ||
          u.email.toLowerCase() === identifier
      );

      if (!matchedUser) {
        setError('El usuario o correo electrónico no existe en el sistema.');
        setIsLoading(false);
        return;
      }

      // Check password (case-sensitive)
      if (matchedUser.password && matchedUser.password !== enteredPassword) {
        setError('Contraseña incorrecta. Verifica tus credenciales e intenta de nuevo.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onLogin(matchedUser);
    }, 300);
  };

  const handleQuickLogin = (role: 'ADMIN' | 'USER') => {
    const target = users.find((u) => u.role === role);
    if (target) {
      setUsernameOrEmail(target.username);
      setPassword(target.password || '');
      setError(null);
      onLogin(target);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0d2818] to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <CamposolLogo className="w-20 h-20 shadow-xl rounded-full ring-4 ring-emerald-500/20" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Camposol
          </h1>
          <div className="text-xs font-black text-[#15803D] tracking-widest uppercase mt-0.5">
            Portal de Control de Asistencia
          </div>
          <p className="text-xs text-slate-500 mt-2 max-w-xs">
            Ingresa con tu cuenta asignada para gestionar o consultar dotación, CFC y modelos IA.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Usuario o Correo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Ej: admin o usuario"
                className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
              Acceso Rápido Demo
            </span>
          </div>
        </div>

        {/* Quick Access Badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin('ADMIN')}
            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 transition flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 leading-none">
                Admin
              </div>
              <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                admin / admin
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('USER')}
            className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100/60 transition flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 leading-none">
                Usuario
              </div>
              <div className="text-[10px] text-sky-700 font-mono mt-0.5">
                usuario / user123
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-6 text-center text-slate-400 text-xs relative z-10">
        <p className="font-semibold text-slate-300">
          Camposol S.A.
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Control Analítico y Predictivo de Dotación Agrícola · v2.5
        </p>
      </div>
    </div>
  );
};
