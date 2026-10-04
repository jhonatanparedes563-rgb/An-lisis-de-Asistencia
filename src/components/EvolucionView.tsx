import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { DayEvolutionStat, MatrixKPIs } from '../types';

interface EvolucionViewProps {
  days: DayEvolutionStat[];
  kpis: MatrixKPIs;
}

export const EvolucionView: React.FC<EvolucionViewProps> = ({ days, kpis }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  // SVG Chart Dimensions
  const width = 800;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 40;

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

  return (
    <div className="w-full px-4 sm:px-6 py-3.5 flex flex-col space-y-3 font-sans h-full">
      {/* 4 Clean Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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

      {/* SVG Chart Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800">
            Curva de Asistencia Diaria
          </h3>
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
                    y={height - 12}
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

      {/* Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Comparación por Jornada
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {days.length} días
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
                <th className="py-2 px-3.5 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono">
              {days.map((d) => (
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
                  <td className="py-2 px-3.5 text-right font-bold text-slate-800">
                    {d.attendanceRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
