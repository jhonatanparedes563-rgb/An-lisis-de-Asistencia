import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Building2,
  Trophy,
  Flame,
  Download,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from 'lucide-react';
import {
  CFCAttendanceSummary,
  DayEvolutionStat,
  WorkerAttendanceSummary,
} from '../types';
import * as XLSX from 'xlsx';

interface CFCViewProps {
  cfcList: CFCAttendanceSummary[];
  bestCfc: CFCAttendanceSummary | null;
  worstCfc: CFCAttendanceSummary | null;
  days: DayEvolutionStat[];
  onSelectWorker: (worker: WorkerAttendanceSummary) => void;
  onGoToPersonalView: () => void;
  availableColumns?: string[];
  selectedGroupColumn?: string;
  onSelectGroupColumn?: (col: string) => void;
}

export const CFCView: React.FC<CFCViewProps> = ({
  cfcList,
  bestCfc,
  worstCfc,
  days,
  onSelectWorker,
  onGoToPersonalView,
  availableColumns = [],
  selectedGroupColumn = '',
  onSelectGroupColumn,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'TODOS' | 'MAS_FALTAS' | 'MEJOR_ASIST' | 'CAYERON_HOY' | 'SUBIERON_HOY'
  >('TODOS');
  const [sortField, setSortField] = useState<'absent' | 'average' | 'delta' | 'name'>('absent');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected CFC modal inspector
  const [inspectedCfc, setInspectedCfc] = useState<CFCAttendanceSummary | null>(null);
  const [cfcWorkerSearch, setCfcWorkerSearch] = useState('');

  // Filter CFCs
  const filtered = useMemo(() => {
    let list = cfcList;

    if (filterType === 'MAS_FALTAS') {
      list = list.filter((c) => c.totalAbsentDays > 0);
    } else if (filterType === 'MEJOR_ASIST') {
      list = list.filter((c) => c.attendanceRate >= 80);
    } else if (filterType === 'CAYERON_HOY') {
      list = list.filter((c) => c.lastDayDelta < 0);
    } else if (filterType === 'SUBIERON_HOY') {
      list = list.filter((c) => c.lastDayDelta > 0);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((c) => c.cfcName.toLowerCase().includes(q));
    }

    return list;
  }, [cfcList, filterType, searchTerm]);

  // Sort CFCs
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comp = 0;
      if (sortField === 'absent') {
        comp = (a.lastDayAbsentCount - b.lastDayAbsentCount) || (a.totalAbsentDays - b.totalAbsentDays);
      } else if (sortField === 'average') {
        comp = a.dailyAverage - b.dailyAverage;
      } else if (sortField === 'delta') {
        comp = a.lastDayDelta - b.lastDayDelta;
      } else if (sortField === 'name') {
        comp = a.cfcName.localeCompare(b.cfcName);
      }
      return sortAsc ? comp : -comp;
    });
  }, [filtered, sortField, sortAsc]);

  // Reset page when filtering or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortField, sortAsc, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(sorted.length / pageSize) || 1;

  const paginatedCFCs = useMemo(() => {
    if (pageSize === -1) return sorted;
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const overallLastDayDelta = useMemo(() => {
    return cfcList.reduce((sum, c) => sum + c.lastDayDelta, 0);
  }, [cfcList]);

  const handleExportExcel = () => {
    const data = sorted.map((c, i) => {
      const rowObj: Record<string, any> = {
        '#': i + 1,
        'CFC': c.cfcName,
        'Promedio': c.dailyAverage,
        'Faltas': c.totalAbsentDays,
        'Tendencia': c.trendDirection,
      };

      days.forEach((d) => {
        const h = c.history.find((item) => item.date === d.date);
        rowObj[d.formattedDate] = h ? h.presentCount : 0;
      });

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CFC');
    XLSX.writeFile(wb, `CFC_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const startIndex = sorted.length === 0 ? 0 : (currentPage - 1) * (pageSize === -1 ? sorted.length : pageSize) + 1;
  const endIndex = pageSize === -1 ? sorted.length : Math.min(startIndex + pageSize - 1, sorted.length);

  const inspectedWorkersFiltered = useMemo(() => {
    if (!inspectedCfc) return [];
    if (!cfcWorkerSearch.trim()) return inspectedCfc.workers;
    const q = cfcWorkerSearch.toLowerCase().trim();
    return inspectedCfc.workers.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.dni && w.dni.includes(q))
    );
  }, [inspectedCfc, cfcWorkerSearch]);

  return (
    <div className="w-full px-4 sm:px-6 py-3.5 flex flex-col space-y-3 font-sans h-full">
      {/* Clean KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Mejor Asistencia */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Mejor Asistencia</span>
            </span>
          </div>
          <div className="text-sm font-bold text-slate-800 truncate" title={bestCfc?.cfcName || '-'}>
            {bestCfc ? bestCfc.cfcName : '-'}
          </div>
          <div className="text-xs text-emerald-600 font-mono font-bold mt-0.5">
            {bestCfc ? `${bestCfc.dailyAverage} pers/día · ${bestCfc.attendanceRate.toFixed(1)}%` : '-'}
          </div>
        </div>

        {/* Card 2: Más Faltas */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Más Faltas</span>
            </span>
          </div>
          <div className="text-sm font-bold text-slate-800 truncate" title={worstCfc?.cfcName || '-'}>
            {worstCfc ? worstCfc.cfcName : '-'}
          </div>
          <div className="text-xs text-rose-600 font-mono font-bold mt-0.5">
            {worstCfc
              ? `${worstCfc.lastDayAbsentCount} faltas (últ. día)${days.length > 1 ? ` · ${worstCfc.totalAbsentDays} tot.` : ''}`
              : '-'}
          </div>
        </div>

        {/* Card 3: Total CFCs */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">
            CFCs Activas
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono">
            {cfcList.length}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            Centros / Cuadrillas
          </div>
        </div>

        {/* Card 4: Variación Última Fecha */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">
            Variación Último Día
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              overallLastDayDelta > 0
                ? 'text-emerald-600'
                : overallLastDayDelta < 0
                ? 'text-rose-600'
                : 'text-slate-800'
            }`}
          >
            {overallLastDayDelta > 0 ? `+${overallLastDayDelta}` : overallLastDayDelta}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            vs día previo
          </div>
        </div>
      </div>

      {/* Clean Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Control por CFC
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({cfcList.length})
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={onGoToPersonalView}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Personal</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Grouping */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar CFC..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => {
                setFilterType('MAS_FALTAS');
                setSortField('absent');
                setSortAsc(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterType === 'MAS_FALTAS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Más Faltas
            </button>

            <button
              onClick={() => {
                setFilterType('MEJOR_ASIST');
                setSortField('average');
                setSortAsc(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterType === 'MEJOR_ASIST'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Mejor Asist.
            </button>

            {days.length >= 2 && (
              <>
                <button
                  onClick={() => setFilterType('CAYERON_HOY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    filterType === 'CAYERON_HOY'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cayeron
                </button>

                <button
                  onClick={() => setFilterType('SUBIERON_HOY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    filterType === 'SUBIERON_HOY'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Subieron
                </button>
              </>
            )}

            <button
              onClick={() => setFilterType('TODOS')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterType === 'TODOS'
                  ? 'bg-[#22C55E] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({cfcList.length})
            </button>
          </div>

          {availableColumns.length > 1 && onSelectGroupColumn && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs ml-auto">
              <span>Agrupar:</span>
              <select
                value={selectedGroupColumn}
                onChange={(e) => onSelectGroupColumn(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="">CFC</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Screen-Framed Clean CFC Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[380px]">
        {/* Table Subheader */}
        <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            {startIndex}–{endIndex} de {sorted.length}
          </span>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>Todos</option>
            </select>
          </div>
        </div>

        {/* Scrollable Viewport with Sticky Header */}
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-270px)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] select-none sticky top-0 z-10 shadow-2xs">
              <tr>
                <th
                  onClick={() => {
                    setSortField('name');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-sky-100 transition min-w-[180px]"
                >
                  CFC ˅
                </th>
                <th
                  onClick={() => {
                    setSortField('average');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-2.5 text-right cursor-pointer hover:bg-sky-100 transition font-bold min-w-[95px]"
                >
                  Promedio ˅
                </th>
                <th
                  onClick={() => {
                    setSortField('absent');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:bg-sky-100 transition min-w-[85px]"
                  title="Inasistencias reales registradas"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Faltas</span>
                    <span className="text-[10px] text-sky-800">˅</span>
                  </div>
                  <div className="text-[10px] text-sky-800 font-normal">Últ. Día</div>
                </th>
                <th className="py-2.5 px-2.5 text-center min-w-[90px]">
                  Tendencia
                </th>

                {/* Day Columns */}
                {days.map((d) => (
                  <th key={d.date} className="py-2.5 px-2.5 text-center min-w-[95px]">
                    <div className="font-bold">{d.formattedDate}</div>
                    <div className="text-[10px] text-sky-800 font-normal">{d.dayName.slice(0, 3)}</div>
                  </th>
                ))}

                <th className="py-2.5 px-2 text-center min-w-[45px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedCFCs.length === 0 ? (
                <tr>
                  <td colSpan={5 + days.length} className="py-10 text-center text-slate-400 text-xs">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                paginatedCFCs.map((c) => {
                  return (
                    <tr
                      key={c.cfcName}
                      onClick={() => setInspectedCfc(c)}
                      className="hover:bg-slate-50 cursor-pointer transition group"
                    >
                      {/* CFC Name */}
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800 group-hover:text-emerald-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={c.cfcName}>
                            {c.cfcName}
                          </span>
                        </div>
                      </td>

                      {/* Promedio Diario */}
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-600">
                        {c.dailyAverage.toLocaleString()}
                      </td>

                      {/* Faltas Reales: Última Jornada y Total Acumulado */}
                      <td className="py-2.5 px-2.5 text-right font-mono">
                        <div className="flex flex-col items-end leading-tight">
                          {c.lastDayAbsentCount > 0 ? (
                            <span className="text-rose-600 font-bold text-xs">{c.lastDayAbsentCount}</span>
                          ) : (
                            <span className="text-slate-300 font-medium text-xs">0</span>
                          )}
                          {days.length > 1 && (
                            <span
                              className="text-[10px] text-slate-400 font-normal"
                              title={`Total de inasistencias en las ${days.length} jornadas evaluadas (excluyendo días de descanso DT)`}
                            >
                              {c.totalAbsentDays} tot.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tendencia */}
                      <td className="py-2.5 px-2.5 text-center">
                        {c.trendDirection === 'SUBIENDO' ? (
                          <span className="text-emerald-700 font-semibold text-[11px] inline-flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span>Sube</span>
                          </span>
                        ) : c.trendDirection === 'BAJANDO' ? (
                          <span className="text-rose-600 font-semibold text-[11px] inline-flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3 text-rose-500" />
                            <span>Baja</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] inline-flex items-center gap-0.5">
                            <Minus className="w-3 h-3" />
                            <span>Estable</span>
                          </span>
                        )}
                      </td>

                      {/* Day Columns */}
                      {days.map((d, dIdx) => {
                        const h = c.history.find((item) => item.date === d.date);
                        if (!h) {
                          return (
                            <td key={d.date} className="py-2.5 px-2.5 text-center text-slate-300 font-mono">
                              -
                            </td>
                          );
                        }

                        const delta = h.deltaFromPreviousDay;
                        const isFirst = dIdx === 0;

                        return (
                          <td key={d.date} className="py-2 px-2.5 text-center">
                            {h.isDT ? (
                              <span
                                className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs"
                                title="Día de Turno / Descanso programado de la cuadrilla (DT). No genera faltas."
                              >
                                DT
                              </span>
                            ) : (
                              <>
                                <div className="font-mono font-bold text-slate-800 text-xs">
                                  {h.presentCount}
                                </div>
                                {!isFirst && delta !== 0 && (
                                  <div
                                    className={`text-[10px] font-mono font-semibold ${
                                      delta > 0 ? 'text-emerald-600' : 'text-rose-500'
                                    }`}
                                  >
                                    {delta > 0 ? `+${delta}` : delta}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        );
                      })}

                      {/* Eye button */}
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedCfc(c);
                          }}
                          className="p-1 rounded text-slate-300 group-hover:text-emerald-600 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bottom Bar */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 select-none">
            <span className="text-slate-400 font-mono">
              Página {currentPage} de {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-3.5 h-3.5 inline" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspected CFC Workers Modal */}
      {inspectedCfc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in duration-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {inspectedCfc.cfcName}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Prom. {inspectedCfc.dailyAverage}/día · {inspectedCfc.totalAbsentDays} faltas
                </p>
              </div>

              <button
                onClick={() => setInspectedCfc(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={cfcWorkerSearch}
                  onChange={(e) => setCfcWorkerSearch(e.target.value)}
                  placeholder="Buscar en este CFC..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md pl-7 pr-3 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <span className="text-slate-400 font-mono text-[11px]">
                {inspectedWorkersFiltered.length} personas
              </span>
            </div>

            {/* Workers Table inside CFC */}
            <div className="flex-1 overflow-y-auto p-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Trabajador</th>
                    <th className="py-2 px-2">Cód. Empleado</th>
                    <th className="py-2 px-2 text-right">Asistió</th>
                    <th className="py-2 px-2 text-right">Faltó</th>
                    <th className="py-2 px-2 text-right">%</th>
                    {days.map((d) => (
                      <th key={d.date} className="py-2 px-2 text-center text-[10px]">
                        {d.formattedDate}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {inspectedWorkersFiltered.map((w) => (
                    <tr
                      key={w.key}
                      onClick={() => {
                        setInspectedCfc(null);
                        onSelectWorker(w);
                      }}
                      className="hover:bg-slate-50 cursor-pointer transition group"
                    >
                      <td className="py-1.5 px-3 font-medium text-slate-800 group-hover:text-emerald-700">
                        {w.name}
                      </td>
                      <td className="py-1.5 px-2 text-slate-400 font-mono text-[11px]">
                        {w.dni || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-600">
                        {w.attendedDaysCount}d
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {w.absentDaysCount > 0 ? (
                          <span className="text-rose-600 font-bold">{w.absentDaysCount}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold">
                        {w.attendanceRate.toFixed(1)}%
                      </td>
                      {days.map((d) => {
                        const h = w.history.find((item) => item.date === d.date);
                        return (
                          <td key={d.date} className="py-1.5 px-2 text-center font-mono">
                            {h?.isDT ? (
                              <span
                                className="text-sky-700 font-bold text-[10px] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200"
                                title="DT - Día de descanso programado"
                              >
                                DT
                              </span>
                            ) : h?.attended ? (
                              <span className="text-emerald-600 font-bold">✓</span>
                            ) : (
                              <span className="text-rose-400">✗</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end text-xs">
              <button
                onClick={() => setInspectedCfc(null)}
                className="px-3.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
