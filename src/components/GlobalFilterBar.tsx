import React from 'react';
import {
  Filter,
  Calendar,
  CalendarRange,
  UserCheck,
  UserX,
  Users,
  RotateCcw,
  Check,
} from 'lucide-react';
import { DayEvolutionStat } from '../types';
import { GlobalFilterState, WeekOption } from '../utils/filterUtils';

interface GlobalFilterBarProps {
  weeks: WeekOption[];
  days: DayEvolutionStat[];
  filter: GlobalFilterState;
  onFilterChange: (newFilter: GlobalFilterState) => void;
  onReset: () => void;
  isFilterActive: boolean;
  totalWorkersCount: number;
  filteredWorkersCount: number;
  totalDaysCount: number;
  filteredDaysCount: number;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  weeks,
  days,
  filter,
  onFilterChange,
  onReset,
  isFilterActive,
  totalWorkersCount,
  filteredWorkersCount,
  totalDaysCount,
  filteredDaysCount,
}) => {
  // If a week is selected, filter available days to that week only
  const availableDays = React.useMemo(() => {
    if (filter.week === 'all') return days;
    const currentWeek = weeks.find((w) => w.id === filter.week);
    if (!currentWeek) return days;
    return days.filter((d) => currentWeek.dates.includes(d.date));
  }, [days, weeks, filter.week]);

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newWeek = e.target.value;
    // If the currently selected date is not in this new week, reset date to 'all'
    let newDate = filter.date;
    if (newWeek !== 'all') {
      const weekObj = weeks.find((w) => w.id === newWeek);
      if (weekObj && newDate !== 'all' && !weekObj.dates.includes(newDate)) {
        newDate = 'all';
      }
    }
    onFilterChange({
      ...filter,
      week: newWeek,
      date: newDate,
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = e.target.value;
    // Automatically match the week if a specific date is selected
    let newWeek = filter.week;
    if (newDate !== 'all') {
      const matchingWeek = weeks.find((w) => w.dates.includes(newDate));
      if (matchingWeek) {
        newWeek = matchingWeek.id;
      }
    }
    onFilterChange({
      ...filter,
      date: newDate,
      week: newWeek,
    });
  };

  const handleStatusChange = (status: 'all' | 'asistio' | 'falto') => {
    onFilterChange({
      ...filter,
      status,
    });
  };

  if (totalDaysCount === 0) return null;

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-2 font-sans sticky top-[49px] z-9 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pr-1">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Filtros:</span>
          </div>

          {/* 1. Week Filter */}
          <div className="relative flex items-center">
            <CalendarRange className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <select
              value={filter.week}
              onChange={handleWeekChange}
              className={`pl-8 pr-7 py-1 text-xs rounded-md border appearance-none font-medium cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                filter.week !== 'all'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="all">Todas las semanas ({weeks.length})</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 text-[10px] text-slate-400 pointer-events-none">▼</div>
          </div>

          {/* 2. Day Filter */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <select
              value={filter.date}
              onChange={handleDateChange}
              className={`pl-8 pr-7 py-1 text-xs rounded-md border appearance-none font-medium cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                filter.date !== 'all'
                  ? 'bg-sky-50 text-sky-900 border-sky-300 font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="all">Todos los días ({availableDays.length})</option>
              {availableDays.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.formattedDate} ({d.dayName})
                </option>
              ))}
            </select>
            <div className="absolute right-2 text-[10px] text-slate-400 pointer-events-none">▼</div>
          </div>

          {/* 3. Status Segmented Buttons (Asistió / Faltó / Todos) */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
            <button
              onClick={() => handleStatusChange('all')}
              className={`px-2.5 py-0.5 rounded text-xs font-semibold transition ${
                filter.status === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleStatusChange('asistio')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold transition ${
                filter.status === 'asistio'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Asistió</span>
            </button>
            <button
              onClick={() => handleStatusChange('falto')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold transition ${
                filter.status === 'falto'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <UserX className="w-3 h-3" />
              <span>Faltó</span>
            </button>
          </div>
        </div>

        {/* Right Side: Active Filter Counter & Reset Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs font-mono">
            {isFilterActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>
                  {filteredWorkersCount.toLocaleString()} / {totalWorkersCount.toLocaleString()} personas
                </span>
                <span className="text-slate-400 font-normal">
                  ({filteredDaysCount} {filteredDaysCount === 1 ? 'jornada' : 'jornadas'})
                </span>
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] font-sans">
                Sin filtros aplicados ({totalWorkersCount.toLocaleString()} personas)
              </span>
            )}
          </div>

          {isFilterActive && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition cursor-pointer border border-slate-200"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Restablecer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
