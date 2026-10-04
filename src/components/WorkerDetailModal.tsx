import React from 'react';
import {
  X,
  User,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import { WorkerAttendanceSummary } from '../types';

interface WorkerDetailModalProps {
  worker: WorkerAttendanceSummary | null;
  onClose: () => void;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({ worker, onClose }) => {
  if (!worker) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-xs">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                {worker.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                {worker.dni && (
                  <span>
                    DNI / Código: <strong className="font-mono text-slate-700">{worker.dni}</strong>
                  </span>
                )}
                {worker.area && (
                  <>
                    <span>•</span>
                    <span>Área: <strong className="text-slate-700">{worker.area}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Summary Cards */}
        <div className="px-6 grid grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-emerald-700 block text-[10px] uppercase font-bold">
              Jornadas Asistidas
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5 font-mono">
              {worker.attendedDaysCount} de {worker.totalDaysEvaluated}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Días que asistió</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
            <span className="text-rose-700 block text-[10px] uppercase font-bold">
              Faltas
            </span>
            <div className="text-2xl font-black text-rose-600 mt-0.5 font-mono">
              {worker.absentDaysCount}
            </div>
            <span className="text-[10px] text-rose-600 font-medium">Días que faltó</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              % Asistencia
            </span>
            <div className="text-2xl font-black text-slate-800 mt-0.5 font-mono">
              {worker.attendanceRate.toFixed(1)}%
            </div>
            <span
              className={`text-[10px] font-bold ${
                worker.attendanceRate === 100
                  ? 'text-emerald-600'
                  : worker.attendanceRate < 80
                  ? 'text-rose-600'
                  : 'text-amber-600'
              }`}
            >
              {worker.attendanceRate === 100
                ? 'Asistencia Perfecta'
                : worker.attendanceRate < 80
                ? 'Alta Inasistencia'
                : 'Asistencia Regular'}
            </span>
          </div>
        </div>

        {/* Chronological Checklist */}
        <div className="px-6 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-[#16A34A]" />
            <span>Presencia por fecha cargada:</span>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Día</th>
                  <th className="py-2.5 px-4 text-center">Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {worker.history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                      {h.formattedDate}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-sans">
                      {h.dayName}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {h.isDT ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                          <span>🔵 DT (Descanso)</span>
                        </span>
                      ) : h.attended ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✅ Asistió</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>❌ Faltó</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
