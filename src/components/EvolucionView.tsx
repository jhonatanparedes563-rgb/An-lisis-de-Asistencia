import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Coffee,
  Calendar,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { DayEvolutionStat, MatrixKPIs, CFCAttendanceSummary } from '../types';

interface EvolucionViewProps {
  days: DayEvolutionStat[];
  kpis: MatrixKPIs;
  cfcList?: CFCAttendanceSummary[];
}

interface DayDTStat {
  date: string;
  formattedDate: string;
  dayName: string;
  dtCfcCount: number;
  totalCfcCount: number;
  activeCfcCount: number;
  dtWorkersEstimate: number;
  dtCfcNames: string[];
}

export const EvolucionView: React.FC<EvolucionViewProps> = ({ days, kpis, cfcList = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredDtIdx, setHoveredDtIdx] = useState<number | null>(null);

  // 1. Compute Day-by-Day DT Stats
  const dtStatsByDay: DayDTStat[] = useMemo(() => {
    const totalCfcs = cfcList.length;

    return days.map((d) => {
      const dtCfcs: { name: string; avgWorkers: number }[] = [];

      cfcList.forEach((c) => {
        const h = c.history.find((item) => item.date === d.date);
        // A CFC is in DT if flagged isDT or presentCount === 0 on that date
        const isDT = !!h && (h.isDT || h.presentCount === 0);
        if (isDT) {
          dtCfcs.push({
            name: c.cfcName,
            avgWorkers: c.dailyAverage || c.totalWorkersAssigned || 0,
          });
        }
      });

      const dtCfcCount = dtCfcs.length;
      const dtWorkersEstimate = dtCfcs.reduce((sum, item) => sum + item.avgWorkers, 0);

      return {
        date: d.date,
        formattedDate: d.formattedDate,
        dayName: d.dayName,
        dtCfcCount,
        totalCfcCount: totalCfcs,
        activeCfcCount: Math.max(0, totalCfcs - dtCfcCount),
        dtWorkersEstimate,
        dtCfcNames: dtCfcs.map((item) => item.name),
      };
    });
  }, [days, cfcList]);

  if (days.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Sin fechas cargadas.
      </div>
    );
  }

  const first = days[0]?.workersWorkingCount || 0;
  const last = days[days.length - 1]?.workersWorkingCount || 0;
  const delta = last - first;

  const counts = days.map((d) => d.workersWorkingCount);
  const maxCount = Math.max(...counts, 100);
  const minCount = Math.max(0, Math.floor(Math.min(...counts) * 0.7));
  const yRange = maxCount - minCount || 1;

  // Last day DT stats
  const lastDayDt = dtStatsByDay[dtStatsByDay.length - 1];
  const maxDtDay = dtStatsByDay.reduce((prev, curr) => (curr.dtCfcCount > prev.dtCfcCount ? curr : prev), dtStatsByDay[0] || { dtCfcCount: 0 });

  // ---------------------------------------------------------------------------
  // Chart 1: Curva de Asistencia Diaria
  // ---------------------------------------------------------------------------
  const width = 800;
  const height = 220;
  const paddingLeft = 50;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (days.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (days.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minCount, Math.min(maxCount, val));
    return paddingTop + chartHeight - ((clamped - minCount) / yRange) * chartHeight;
  };

  const points = days.map((d, i) => `${getX(i)},${getY(d.workersWorkingCount)}`);
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${getX(days.length - 1)},${paddingTop + chartHeight} L ${getX(0)},${paddingTop + chartHeight} Z`;

  const yTicks = [
    minCount,
    Math.round(minCount + yRange * 0.5),
    maxCount,
  ];

  // ---------------------------------------------------------------------------
  // Chart 2: CFCs con Día de Turno (DT) por Jornada
  // ---------------------------------------------------------------------------
  const dtCounts = dtStatsByDay.map((s) => s.dtCfcCount);
  const maxDtCount = Math.max(...dtCounts, 4); // Minimum scale 4 for aesthetic headroom
  const dtYRange = maxDtCount || 1;

  const getDtY = (val: number) => {
    return paddingTop + chartHeight - (val / dtYRange) * chartHeight;
  };

  const barWidth = Math.min(46, Math.max(24, (chartWidth / Math.max(1, days.length)) * 0.42));

  return (
    <div className="w-full px-4 sm:px-6 py-3.5 flex flex-col space-y-3 font-sans h-full">
      {/* 5 Clean Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            Última Jornada
          </span>
          <div className="text-2xl font-bold text-slate-800 font-mono mt-0.5">
            {last.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {days[days.length - 1]?.formattedDate}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            Promedio Diario
          </span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
            {kpis.averageWorkingDaily.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            personas / día
          </div>
        </div>

        {/* Card: CFCs en DT (Última Jornada) */}
        <div className="p-3 rounded-xl bg-white border border-sky-200 shadow-2xs bg-sky-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-800 uppercase flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-sky-600" />
              <span>CFCs en DT (Últ. Día)</span>
            </span>
          </div>
          <div className="text-2xl font-bold text-sky-700 font-mono mt-0.5">
            {lastDayDt ? lastDayDt.dtCfcCount : 0} <span className="text-xs font-sans text-sky-600 font-medium">cuadrillas</span>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            {lastDayDt && lastDayDt.dtWorkersEstimate > 0
              ? `~${lastDayDt.dtWorkersEstimate.toLocaleString()} pers. en descanso`
              : 'Sin cuadrillas en DT'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            Mínimo / Máximo
          </span>
          <div className="text-lg font-bold font-mono text-slate-800 mt-0.5">
            {Math.min(...counts).toLocaleString()} – {maxCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            Rango registrado
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            Variación Neta
          </span>
          <div
            className={`text-2xl font-bold font-mono mt-0.5 ${
              delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-800'
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            entre inicio y fin
          </div>
        </div>
      </div>

      {/* Chart 1: Curva de Asistencia Diaria */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800">
              Curva de Asistencia Diaria
            </h3>
            <span className="text-[11px] text-slate-500">
              (Volumen real de trabajadores en campo)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {days.length} jornadas
          </span>
        </div>

        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
          >
            <defs>
              <linearGradient id="areaGradGreenClean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yTicks.map((tick, i) => {
              const y = getY(tick);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    fill="#94A3B8"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {tick.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Area and Line */}
            <path d={areaD} fill="url(#areaGradGreenClean)" />
            <path d={pathD} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />

            {/* Nodes */}
            {days.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.workersWorkingCount);
              const isHovered = hoveredIdx === i;

              return (
                <g
                  key={d.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill="#16A34A"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />

                  {/* Value */}
                  <text
                    x={cx}
                    y={cy - 9}
                    fill="#0F172A"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {d.workersWorkingCount.toLocaleString()}
                  </text>

                  {/* Date label */}
                  <text
                    x={cx}
                    y={height - 10}
                    fill="#64748B"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {d.formattedDate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Chart 2: CFCs con Día de Turno (DT) por Jornada */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center justify-between pb-1.5 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-sky-100 text-sky-700">
              <Coffee className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>CFCs con Día de Turno (DT) por Jornada</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  Dato Real DT
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Muestra cuántas cuadrillas completas estuvieron en descanso programado (DT) sin computar faltas
              </p>
            </div>
          </div>
          {maxDtDay && maxDtDay.dtCfcCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold border border-sky-200">
              Pico DT: {maxDtDay.dtCfcCount} CFCs el {maxDtDay.formattedDate} ({maxDtDay.dayName})
            </span>
          )}
        </div>

        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
          >
            <defs>
              <linearGradient id="barGradSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="barGradSkyHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0369A1" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.75" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines for DT count */}
            {[0, Math.ceil(maxDtCount * 0.5), maxDtCount].map((tickVal, i) => {
              const y = getDtY(tickVal);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    fill="#94A3B8"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Bars for each day */}
            {dtStatsByDay.map((stat, i) => {
              const cx = getX(i);
              const barH = (stat.dtCfcCount / dtYRange) * chartHeight;
              const barY = paddingTop + chartHeight - barH;
              const isHovered = hoveredDtIdx === i;

              return (
                <g
                  key={stat.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredDtIdx(i)}
                  onMouseLeave={() => setHoveredDtIdx(null)}
                >
                  {/* Subtle Background Guide Column on Hover */}
                  {isHovered && (
                    <rect
                      x={cx - barWidth - 4}
                      y={paddingTop}
                      width={barWidth * 2 + 8}
                      height={chartHeight}
                      fill="#F0F9FF"
                      rx={4}
                      opacity={0.6}
                    />
                  )}

                  {/* Main DT Bar */}
                  {stat.dtCfcCount > 0 ? (
                    <rect
                      x={cx - barWidth / 2}
                      y={barY}
                      width={barWidth}
                      height={Math.max(4, barH)}
                      fill={isHovered ? 'url(#barGradSkyHover)' : 'url(#barGradSky)'}
                      rx={5}
                      stroke="#0284C7"
                      strokeWidth={1}
                    />
                  ) : (
                    /* Zero baseline indicator */
                    <circle
                      cx={cx}
                      cy={paddingTop + chartHeight}
                      r={3}
                      fill="#CBD5E1"
                    />
                  )}

                  {/* Value Badge above bar */}
                  <text
                    x={cx}
                    y={stat.dtCfcCount > 0 ? barY - 7 : paddingTop + chartHeight - 8}
                    fill={stat.dtCfcCount > 0 ? '#0369A1' : '#94A3B8'}
                    fontSize="11"
                    fontWeight={stat.dtCfcCount > 0 ? '700' : '500'}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {stat.dtCfcCount > 0 ? `${stat.dtCfcCount} CFC${stat.dtCfcCount > 1 ? 's' : ''}` : '0'}
                  </text>

                  {/* Estimated personnel in DT text */}
                  {stat.dtWorkersEstimate > 0 && (
                    <text
                      x={cx}
                      y={stat.dtCfcCount > 0 ? barY - 19 : paddingTop + chartHeight - 19}
                      fill="#0284C7"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      ~{stat.dtWorkersEstimate.toLocaleString()} pers.
                    </text>
                  )}

                  {/* Date label */}
                  <text
                    x={cx}
                    y={height - 10}
                    fill="#64748B"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {stat.formattedDate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Detail Card when hovering a day on the DT chart */}
        {hoveredDtIdx !== null && dtStatsByDay[hoveredDtIdx] && (
          <div className="p-2.5 rounded-lg bg-sky-50/80 border border-sky-200 text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
            <div>
              <span className="font-bold text-sky-900">
                {dtStatsByDay[hoveredDtIdx].formattedDate} ({dtStatsByDay[hoveredDtIdx].dayName}):
              </span>{' '}
              <span className="text-sky-800">
                {dtStatsByDay[hoveredDtIdx].dtCfcCount > 0 ? (
                  <>
                    <strong>{dtStatsByDay[hoveredDtIdx].dtCfcCount} CFCs en descanso programado</strong> (~{dtStatsByDay[hoveredDtIdx].dtWorkersEstimate.toLocaleString()} colaboradores en DT)
                  </>
                ) : (
                  <span>Todas las cuadrillas estuvieron programadas para laborar (0 en DT).</span>
                )}
              </span>
            </div>

            {dtStatsByDay[hoveredDtIdx].dtCfcNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-sky-700 font-semibold uppercase">CFCs en DT:</span>
                {dtStatsByDay[hoveredDtIdx].dtCfcNames.map((name) => (
                  <span
                    key={name}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-sky-800 border border-sky-300 shadow-2xs font-mono"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              Comparación por Jornada
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({days.length} jornadas evaluadas)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Los días con CFCs en DT justifican reducciones de asistencia programada
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px]">
              <tr>
                <th className="py-2 px-3.5">Fecha</th>
                <th className="py-2 px-3.5">Día</th>
                <th className="py-2 px-3.5 text-right">Asistieron</th>
                <th className="py-2 px-3.5 text-right">Faltaron</th>
                <th className="py-2 px-3.5 text-center bg-sky-100/60 text-sky-950 font-bold border-l border-r border-sky-200">
                  CFCs en DT
                </th>
                <th className="py-2 px-3.5 text-right">Personal DT (Est.)</th>
                <th className="py-2 px-3.5 text-right">% Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono">
              {days.map((d) => {
                const dtItem = dtStatsByDay.find((s) => s.date === d.date);
                const hasDt = dtItem && dtItem.dtCfcCount > 0;

                return (
                  <tr key={d.date} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3.5 font-bold text-slate-800">
                      {d.formattedDate}
                    </td>
                    <td className="py-2 px-3.5 font-sans text-slate-500">
                      {d.dayName}
                    </td>
                    <td className="py-2 px-3.5 text-right text-emerald-600 font-bold">
                      {d.workersWorkingCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3.5 text-right text-rose-600">
                      {d.absentCount > 0 ? d.absentCount.toLocaleString() : '0'}
                    </td>

                    {/* CFCs en DT */}
                    <td className="py-2 px-3.5 text-center bg-sky-50/40 border-l border-r border-sky-100">
                      {hasDt ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300"
                          title={dtItem.dtCfcNames.join(', ')}
                        >
                          {dtItem.dtCfcCount} CFC{dtItem.dtCfcCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0</span>
                      )}
                    </td>

                    {/* Personal estimado en DT */}
                    <td className="py-2 px-3.5 text-right">
                      {hasDt ? (
                        <span className="text-sky-700 font-bold">
                          ~{dtItem.dtWorkersEstimate.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium">0</span>
                      )}
                    </td>

                    <td className="py-2 px-3.5 text-right font-bold text-slate-800">
                      {d.attendanceRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
