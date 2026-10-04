import React, { useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
  ArrowRight,
  TrendingUp,
  Plus,
} from 'lucide-react';
import {
  DayEvolutionStat,
  MatrixKPIs,
  WorkerAttendanceSummary,
} from '../types';

interface ResumenViewProps {
  kpis: MatrixKPIs;
  workers: WorkerAttendanceSummary[];
  days: DayEvolutionStat[];
  onSelectWorker: (worker: WorkerAttendanceSummary) => void;
  onGoToView: (view: any) => void;
  onOpenUpload: () => void;
}

export const ResumenView: React.FC<ResumenViewProps> = ({
  kpis,
  workers,
  days,
  onSelectWorker,
  onGoToView,
  onOpenUpload,
}) => {
  const lastDay = kpis.lastDayLoaded;

  const absentLastDayWorkers = useMemo(() => {
    if (days.length < 2 || !lastDay) return [];
    return workers
      .filter((w) => {
        const lastRec = w.history[w.history.length - 1];
        return lastRec && !lastRec.attended;
      })
      .slice(0, 8);
  }, [workers, days.length, lastDay]);

  const topAbsentWorkers = useMemo(() => {
    if (days.length < 2) return [];
    return [...workers]
      .filter((w) => w.absentDaysCount > 0)
      .sort((a, b) => b.absentDaysCount - a.absentDaysCount)
      .slice(0, 6);
  }, [workers, days.length]);

  if (kpis.totalDaysLoaded === 0) {
    return (
      <div className="w-full max-w-[1500px] mx-auto p-4 sm:p-6 space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-800">
            Control de Asistencia
          </h2>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-md text-xs font-semibold shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Día</span>
          </button>
        </div>

        <div className="p-12 text-center text-slate-400 text-xs bg-white border border-slate-200 rounded-xl">
          Carga un archivo Excel para iniciar el control de asistencia.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 sm:p-6 space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            {kpis.totalDaysLoaded === 1
              ? `Asistencia · ${days[0]?.formattedDate || 'Hoy'}`
              : 'Resumen General'}
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {kpis.totalDaysLoaded} {kpis.totalDaysLoaded === 1 ? 'jornada' : 'jornadas'} · {kpis.totalUniqueWorkers.toLocaleString()} personas
          </span>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 shadow-2xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Día</span>
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1 */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Última Jornada
          </span>
          <div className="text-2xl font-bold text-slate-800 font-mono mt-1">
            {(lastDay?.workersWorkingCount || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {lastDay?.formattedDate} ({lastDay?.dayName})
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Personal Total
          </span>
          <div className="text-2xl font-bold text-slate-800 font-mono mt-1">
            {kpis.totalUniqueWorkers.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            Universo en {kpis.totalDaysLoaded} fechas
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Promedio Diario
          </span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            {kpis.averageWorkingDaily.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            personas / día
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            100% Asistencia
          </span>
          <div className="text-2xl font-bold text-slate-800 font-mono mt-1">
            {kpis.perfectWorkersCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            Sin faltas registradas
          </div>
        </div>
      </div>

      {/* Absent Last Day Section */}
      {days.length >= 2 && lastDay && lastDay.absentCount > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-slate-800">
                Faltaron en Última Fecha ({lastDay.formattedDate})
              </h3>
              <span className="text-xs text-rose-600 font-mono font-bold">
                ({lastDay.absentCount})
              </span>
            </div>

            <button
              onClick={() => onGoToView('personal')}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Trabajador</th>
                  <th className="py-2 px-2">DNI</th>
                  <th className="py-2 px-2 text-right">Asistió</th>
                  <th className="py-2 px-2 text-right">Faltas</th>
                  <th className="py-2 px-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {absentLastDayWorkers.map((w) => (
                  <tr
                    key={w.key}
                    onClick={() => onSelectWorker(w)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-1.5 px-3 font-medium text-slate-800">{w.name}</td>
                    <td className="py-1.5 px-2 text-slate-400 font-mono text-[11px]">{w.dni || '-'}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-emerald-600 font-semibold">
                      {w.attendedDaysCount}d
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-600">
                      {w.absentDaysCount}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                      {w.attendanceRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Mayor Ausentismo & Jornadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mayor Ausentismo */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">
              Mayor Ausentismo
            </h3>
            <button
              onClick={() => onGoToView('personal')}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span>Ver tabla</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Trabajador</th>
                  <th className="py-2 px-2 text-right">Asistió</th>
                  <th className="py-2 px-2 text-right">Faltó</th>
                  <th className="py-2 px-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {topAbsentWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                      Sin faltas registradas
                    </td>
                  </tr>
                ) : (
                  topAbsentWorkers.map((w) => (
                    <tr
                      key={w.key}
                      onClick={() => onSelectWorker(w)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-1.5 px-3 font-medium text-slate-800">{w.name}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-600 font-semibold">
                        {w.attendedDaysCount}d
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-600">
                        {w.absentDaysCount}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                        {w.attendanceRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Jornadas Cargadas */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">
              Jornadas Cargadas
            </h3>
            <button
              onClick={() => onGoToView('evolucion')}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span>Ver evolución</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-2 text-right">Asistieron</th>
                  <th className="py-2 px-2 text-right">Faltaron</th>
                  <th className="py-2 px-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {days.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50 transition">
                    <td className="py-1.5 px-3 font-medium text-slate-800">
                      {d.formattedDate} <span className="text-slate-400 font-normal">({d.dayName})</span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-600">
                      {d.workersWorkingCount.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {d.absentCount > 0 ? (
                        <span className="text-rose-600 font-bold">{d.absentCount}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-700">
                      {d.attendanceRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
