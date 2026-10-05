import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Users,
  Eye,
  Download,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DayEvolutionStat, WorkerAttendanceSummary } from '../types';
import * as XLSX from 'xlsx';

interface PersonalViewProps {
  workers: WorkerAttendanceSummary[];
  days: DayEvolutionStat[];
  onSelectWorker: (worker: WorkerAttendanceSummary) => void;
  onGoToCFCView?: () => void;
}

export const PersonalView: React.FC<PersonalViewProps> = ({
  workers,
  days,
  onSelectWorker,
  onGoToCFCView,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'TODOS' | 'CON_FALTAS' | 'PERFECTA' | 'FALTARON_HOY' | 'EN_DT_HOY'
  >('TODOS');
  const [sortField, setSortField] = useState<'absent' | 'attended' | 'rate' | 'name' | 'cfc'>('absent');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const lastDate = days[days.length - 1]?.date;

  const filtered = useMemo(() => {
    let list = workers;

    if (filterType === 'CON_FALTAS') {
      list = list.filter((w) => w.absentDaysCount > 0);
    } else if (filterType === 'PERFECTA') {
      list = list.filter((w) => w.isPerfect);
    } else if (filterType === 'FALTARON_HOY' && lastDate) {
      list = list.filter((w) => {
        const lastEntry = w.history.find((h) => h.date === lastDate);
        return lastEntry && !lastEntry.attended && !lastEntry.isDT;
      });
    } else if (filterType === 'EN_DT_HOY' && lastDate) {
      list = list.filter((w) => {
        const lastEntry = w.history.find((h) => h.date === lastDate);
        return lastEntry && lastEntry.isDT && !lastEntry.attended;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.dni && w.dni.toLowerCase().includes(q)) ||
          (w.cfc && w.cfc.toLowerCase().includes(q)) ||
          (w.area && w.area.toLowerCase().includes(q))
      );
    }

    return list;
  }, [workers, filterType, lastDate, searchTerm]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comp = 0;
      if (sortField === 'absent') comp = a.absentDaysCount - b.absentDaysCount;
      else if (sortField === 'attended') comp = a.attendedDaysCount - b.attendedDaysCount;
      else if (sortField === 'rate') comp = a.attendanceRate - b.attendanceRate;
      else if (sortField === 'name') comp = a.name.localeCompare(b.name);
      else if (sortField === 'cfc') {
        const cfcA = a.cfc || a.area || 'Sin Asignar';
        const cfcB = b.cfc || b.area || 'Sin Asignar';
        comp = cfcA.localeCompare(cfcB);
      }
      return sortAsc ? comp : -comp;
    });
  }, [filtered, sortField, sortAsc]);

  // Reset page when filtering or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortField, sortAsc, pageSize]);

  const handleSort = (field: 'absent' | 'attended' | 'rate' | 'name' | 'cfc') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For name and cfc default to A-Z (ascending = true); for metrics (absent, attended, rate) default to highest first (ascending = false)
      setSortAsc(field === 'name' || field === 'cfc');
    }
  };

  const totalPages = pageSize === -1 ? 1 : Math.ceil(sorted.length / pageSize) || 1;

  const paginatedWorkers = useMemo(() => {
    if (pageSize === -1) return sorted;
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const handleExportExcel = () => {
    const data = sorted.map((w, i) => {
      const rowObj: Record<string, any> = {
        '#': i + 1,
        'Trabajador': w.name,
        'DNI': w.dni || '-',
        'CFC': w.cfc || w.area || '-',
        'Asistió': w.attendedDaysCount,
        'Faltó': w.absentDaysCount,
        '%': Number(w.attendanceRate.toFixed(1)),
      };

      days.forEach((d) => {
        const h = w.history.find((item) => item.date === d.date);
        rowObj[d.formattedDate] = h?.attended ? 'Asistió' : 'Faltó';
      });

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personal');
    XLSX.writeFile(wb, `Personal_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const startIndex = sorted.length === 0 ? 0 : (currentPage - 1) * (pageSize === -1 ? sorted.length : pageSize) + 1;
  const endIndex = pageSize === -1 ? sorted.length : Math.min(startIndex + pageSize - 1, sorted.length);

  return (
    <div className="w-full px-4 sm:px-6 py-3.5 flex flex-col space-y-3 font-sans h-full">
      {/* Clean Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Control de Personal
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({workers.length.toLocaleString()})
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {onGoToCFCView && (
              <button
                onClick={onGoToCFCView}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Ver CFC</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nombre o DNI..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => {
                setFilterType('CON_FALTAS');
                setSortField('absent');
                setSortAsc(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterType === 'CON_FALTAS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Con Faltas
            </button>

            {days.length >= 1 && (
              <button
                onClick={() => setFilterType('FALTARON_HOY')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  filterType === 'FALTARON_HOY'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Personal programado que no asistió (excluye descansos programados DT)"
              >
                Faltaron Hoy
              </button>
            )}

            {days.length >= 1 && (
              <button
                onClick={() => setFilterType('EN_DT_HOY')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  filterType === 'EN_DT_HOY'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Personal en Descanso Turno (DT) programado por la empresa"
              >
                En DT Hoy
              </button>
            )}

            <button
              onClick={() => {
                setFilterType('PERFECTA');
                setSortField('rate');
                setSortAsc(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterType === 'PERFECTA'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              100% Asist.
            </button>

            <button
              onClick={() => setFilterType('TODOS')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filterType === 'TODOS'
                  ? 'bg-[#22C55E] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({workers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Screen-Framed Clean Table */}
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
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={-1}>Todos</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table Viewport with Sticky Header */}
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-250px)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] select-none sticky top-0 z-10 shadow-2xs">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-sky-100 transition min-w-[200px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Trabajador</span>
                    <span className="text-[10px] text-sky-800">
                      {sortField === 'name' ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cfc')}
                  className="py-2.5 px-2.5 cursor-pointer hover:bg-sky-100 transition min-w-[130px] font-bold"
                  title="Ordenar por CFC"
                >
                  <div className="flex items-center gap-1">
                    <span>CFC</span>
                    <span className="text-[10px] text-sky-800">
                      {sortField === 'cfc' ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th className="py-2.5 px-2.5 min-w-[90px]">DNI</th>
                <th
                  onClick={() => handleSort('attended')}
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:bg-sky-100 transition min-w-[75px]"
                  title="Ordenar por asistencias"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Asistió</span>
                    <span className="text-[10px] text-sky-800">
                      {sortField === 'attended' ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('absent')}
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:bg-sky-100 transition min-w-[70px]"
                  title="Ordenar por faltas"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Faltó</span>
                    <span className="text-[10px] text-sky-800">
                      {sortField === 'absent' ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('rate')}
                  className="py-2.5 px-2.5 text-right font-bold cursor-pointer hover:bg-sky-100 transition min-w-[75px]"
                  title="Ordenar por % de asistencia"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>%</span>
                    <span className="text-[10px] text-sky-800">
                      {sortField === 'rate' ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>

                {/* Date Columns */}
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
              {paginatedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7 + days.length} className="py-10 text-center text-slate-400 text-xs">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                paginatedWorkers.map((w) => (
                  <tr
                    key={w.key}
                    onClick={() => onSelectWorker(w)}
                    className="hover:bg-slate-50 cursor-pointer transition group"
                  >
                    <td className="py-2 px-3.5 font-medium text-slate-800 group-hover:text-emerald-700">
                      {w.name}
                    </td>

                    <td className="py-2 px-2.5 font-sans">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        {w.cfc || w.area || 'Sin Asignar'}
                      </span>
                    </td>

                    <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">
                      {w.dni || '-'}
                    </td>

                    <td className="py-2 px-2.5 text-right font-bold text-emerald-600 font-mono">
                      {w.attendedDaysCount}d
                    </td>

                    <td className="py-2 px-2.5 text-right font-mono">
                      {w.absentDaysCount > 0 ? (
                        <span className="text-rose-600 font-bold">{w.absentDaysCount}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    <td className="py-2 px-2.5 text-right font-mono font-semibold">
                      <span
                        className={
                          w.attendanceRate === 100
                            ? 'text-emerald-600'
                            : w.attendanceRate < 80
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }
                      >
                        {w.attendanceRate.toFixed(1)}%
                      </span>
                    </td>

                    {/* Date statuses: clean dot and text */}
                    {days.map((d) => {
                      const h = w.history.find((item) => item.date === d.date);
                      const attended = h?.attended;

                      return (
                        <td key={d.date} className="py-2 px-2.5 text-center">
                          {h?.isDT ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                              title="Día de Turno / Descanso programado (DT). No cuenta como falta."
                            >
                              <span>DT</span>
                            </span>
                          ) : attended ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Asistió</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Faltó</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWorker(w);
                        }}
                        className="p-1 rounded text-slate-300 group-hover:text-emerald-600 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
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
    </div>
  );
};
