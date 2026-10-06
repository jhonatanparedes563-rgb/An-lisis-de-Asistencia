import React, { useState, useMemo } from 'react';
import { WorkerAttendanceSummary } from '../types';
import { CheckCircle2, Users } from 'lucide-react';

interface DonutAbsenceChartProps {
  workers: WorkerAttendanceSummary[];
}

interface AttendanceTier {
  id: number;
  label: string;
  sublabel: string;
  count: number;
  percentage: number;
  color: string;
  bgLight: string;
}

export const DonutAbsenceChart: React.FC<DonutAbsenceChartProps> = ({ workers }) => {
  const [hoveredTierId, setHoveredTierId] = useState<number | null>(null);

  // Exact real counts directly from workers list
  const { tiers, totalWorkers } = useMemo(() => {
    let count0 = 0; // Asiste todos los días (0 faltas)
    let count1 = 0; // 1 día de falta
    let count2 = 0; // 2 días de falta
    let count3 = 0; // 3 días de falta
    let count4 = 0; // 4 días de falta
    let count5 = 0; // 5 o más días de falta

    workers.forEach((w) => {
      const absences = w.absentDaysCount;
      if (absences === 0) count0++;
      else if (absences === 1) count1++;
      else if (absences === 2) count2++;
      else if (absences === 3) count3++;
      else if (absences === 4) count4++;
      else if (absences >= 5) count5++;
    });

    const total = count0 + count1 + count2 + count3 + count4 + count5;
    const safeTotal = total > 0 ? total : 1;

    const tierList: AttendanceTier[] = [
      {
        id: 0,
        label: 'Asiste Todos los Días',
        sublabel: '0 faltas · Asistencia completa',
        count: count0,
        percentage: Number(((count0 / safeTotal) * 100).toFixed(1)),
        color: '#10B981', // Emerald 500
        bgLight: 'bg-emerald-50',
      },
      {
        id: 1,
        label: 'Falta 1 Día',
        sublabel: '1 falta registrada',
        count: count1,
        percentage: Number(((count1 / safeTotal) * 100).toFixed(1)),
        color: '#F59E0B', // Amber 500
        bgLight: 'bg-amber-50',
      },
      {
        id: 2,
        label: 'Falta 2 Días',
        sublabel: '2 faltas registradas',
        count: count2,
        percentage: Number(((count2 / safeTotal) * 100).toFixed(1)),
        color: '#F97316', // Orange 500
        bgLight: 'bg-orange-50',
      },
      {
        id: 3,
        label: 'Falta 3 Días',
        sublabel: '3 faltas registradas',
        count: count3,
        percentage: Number(((count3 / safeTotal) * 100).toFixed(1)),
        color: '#F43F5E', // Rose 500
        bgLight: 'bg-rose-50',
      },
      {
        id: 4,
        label: 'Falta 4 Días',
        sublabel: '4 faltas registradas',
        count: count4,
        percentage: Number(((count4 / safeTotal) * 100).toFixed(1)),
        color: '#DC2626', // Red 600
        bgLight: 'bg-red-50',
      },
      {
        id: 5,
        label: 'Falta 5 Días a más',
        sublabel: '5 o más faltas',
        count: count5,
        percentage: Number(((count5 / safeTotal) * 100).toFixed(1)),
        color: '#881337', // Crimson / Vino
        bgLight: 'bg-rose-100',
      },
    ];

    return {
      tiers: tierList,
      totalWorkers: total,
    };
  }, [workers]);

  // SVG Geometry for Donut
  const radius = 75;
  const strokeWidth = 24;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc slices
  let accumulatedAngle = 0;
  const slices = useMemo(() => {
    if (totalWorkers === 0) return [];

    return tiers.map((tier) => {
      const proportion = tier.count / totalWorkers;
      const strokeLength = proportion * circumference;
      const dashoffset = -accumulatedAngle;
      accumulatedAngle += strokeLength;

      return {
        ...tier,
        strokeLength,
        dashoffset,
      };
    });
  }, [tiers, totalWorkers, circumference]);

  const activeTier = tiers.find((t) => t.id === hoveredTierId) || null;

  if (totalWorkers === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-100">
          Distribución de Asistencia y Faltas
        </h3>
        <div className="py-8 text-center flex flex-col items-center justify-center gap-1.5">
          <Users className="w-8 h-8 text-slate-300" />
          <span className="text-xs font-bold text-slate-700">Sin datos en este período</span>
          <p className="text-[11px] text-slate-400">Carga o selecciona una jornada para ver la distribución.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Distribución de Asistencia y Faltas (Todos los Días a 5+ Días)
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500 font-bold">
          {totalWorkers.toLocaleString()} colaboradores en total
        </span>
      </div>

      {/* Main Container: Donut + Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Donut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative select-none">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {slices.map((s) => {
                const isHovered = hoveredTierId === s.id;
                const strokeW = isHovered ? strokeWidth + 4 : strokeWidth;

                return (
                  <circle
                    key={s.id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={s.color}
                    strokeWidth={strokeW}
                    strokeDasharray={`${s.strokeLength} ${circumference - s.strokeLength}`}
                    strokeDashoffset={s.dashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredTierId(s.id)}
                    onMouseLeave={() => setHoveredTierId(null)}
                    style={{
                      opacity: hoveredTierId !== null && !isHovered ? 0.5 : 1,
                    }}
                  />
                );
              })}
            </svg>

            {/* Donut Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
              {activeTier ? (
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white inline-block mb-1 shadow-2xs"
                    style={{ backgroundColor: activeTier.color }}
                  >
                    {activeTier.label}
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono leading-none">
                    {activeTier.count.toLocaleString()}
                  </div>
                  <div className="text-xs font-bold text-slate-600 font-mono mt-0.5">
                    {activeTier.percentage}% del personal
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Total Personal
                  </span>
                  <div className="text-3xl font-black text-slate-900 font-mono leading-none mt-1">
                    {totalWorkers.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">
                    100% evaluado
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: The 6 Tiers with exact Count, Percentage from Total, and Bar */}
        <div className="md:col-span-7 space-y-1.5">
          {tiers.map((t) => {
            const isHovered = hoveredTierId === t.id;

            return (
              <div
                key={t.id}
                onMouseEnter={() => setHoveredTierId(t.id)}
                onMouseLeave={() => setHoveredTierId(null)}
                className={`p-2 sm:p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isHovered
                    ? `${t.bgLight} border-slate-300 shadow-2xs`
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                {/* Tier Name */}
                <div className="flex items-center gap-2.5 min-w-[145px]">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: t.color }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-none">
                      {t.sublabel}
                    </span>
                  </div>
                </div>

                {/* Progress bar based on % of total personal */}
                <div className="flex-1 hidden sm:block px-2">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, t.percentage)}%`,
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                </div>

                {/* Exact Count and Percentage */}
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div className="font-mono text-sm font-bold text-slate-800">
                    {t.count.toLocaleString()}{' '}
                    <span className="text-xs text-slate-400 font-sans font-normal">pers.</span>
                  </div>

                  <div
                    className="font-mono text-xs font-bold w-12 text-right"
                    style={{ color: t.color }}
                  >
                    {t.percentage}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
