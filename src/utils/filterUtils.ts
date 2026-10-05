import {
  DayEvolutionStat,
  MatrixKPIs,
  WorkerAttendanceSummary,
  CFCAttendanceSummary,
} from '../types';

export interface WeekOption {
  id: string; // e.g. '2026-W40'
  weekNumber: number;
  label: string; // e.g. 'Semana 40 (28/09 - 03/10)'
  dates: string[];
}

export interface GlobalFilterState {
  week: string; // 'all' | '2026-W40'
  date: string; // 'all' | '2026-10-03'
  status: 'all' | 'asistio' | 'falto' | 'dt';
}

/**
 * Calculates ISO week info from YYYY-MM-DD
 */
export function getISOWeekInfo(dateStr: string): { id: string; weekNumber: number; year: number } {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { id: 'W0', weekNumber: 0, year: 2026 };
  }
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(y, m, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const isoYear = date.getUTCFullYear();

  return {
    id: `${isoYear}-W${String(weekNo).padStart(2, '0')}`,
    weekNumber: weekNo,
    year: isoYear,
  };
}

/**
 * Extracts unique weeks with formatted date ranges from loaded days
 */
export function extractAvailableWeeks(days: DayEvolutionStat[]): WeekOption[] {
  const weekMap = new Map<string, { weekNumber: number; dates: string[] }>();

  days.forEach((d) => {
    const { id, weekNumber } = getISOWeekInfo(d.date);
    if (!weekMap.has(id)) {
      weekMap.set(id, { weekNumber, dates: [] });
    }
    weekMap.get(id)!.dates.push(d.date);
  });

  const result: WeekOption[] = [];
  weekMap.forEach((val, id) => {
    const sortedDates = [...val.dates].sort();
    const firstParts = sortedDates[0].split('-');
    const lastParts = sortedDates[sortedDates.length - 1].split('-');
    const firstFmt = firstParts.length === 3 ? `${firstParts[2]}/${firstParts[1]}` : sortedDates[0];
    const lastFmt = lastParts.length === 3 ? `${lastParts[2]}/${lastParts[1]}` : sortedDates[sortedDates.length - 1];

    result.push({
      id,
      weekNumber: val.weekNumber,
      label: `Semana ${val.weekNumber} (${firstFmt} – ${lastFmt})`,
      dates: sortedDates,
    });
  });

  return result.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Filters workers and days based on the global filter
 */
export function filterAttendanceData(
  workers: WorkerAttendanceSummary[],
  days: DayEvolutionStat[],
  cfcList: CFCAttendanceSummary[],
  filter: GlobalFilterState,
  weeks: WeekOption[]
): {
  filteredWorkers: WorkerAttendanceSummary[];
  filteredDays: DayEvolutionStat[];
  filteredCfcList: CFCAttendanceSummary[];
  filteredKpis: MatrixKPIs;
  isFilterActive: boolean;
} {
  const isFilterActive =
    filter.week !== 'all' || filter.date !== 'all' || filter.status !== 'all';

  // 1. Determine which dates are included
  let activeDates: string[] = days.map((d) => d.date);

  if (filter.week !== 'all') {
    const selectedWeekObj = weeks.find((w) => w.id === filter.week);
    if (selectedWeekObj) {
      activeDates = activeDates.filter((dateStr) => selectedWeekObj.dates.includes(dateStr));
    }
  }

  if (filter.date !== 'all') {
    activeDates = activeDates.filter((dateStr) => dateStr === filter.date);
  }

  // Filter daysEvolution
  const filteredDays = days.filter((d) => activeDates.includes(d.date));

  // 2. Recompute worker attendance metrics strictly for the active dates
  const computedWorkers: WorkerAttendanceSummary[] = workers.map((w) => {
    const activeHistory = w.history.filter((h) => activeDates.includes(h.date));
    const attendedDaysCount = activeHistory.filter((h) => h.attended).length;
    const absentDaysCount = activeHistory.filter((h) => !h.attended && !h.isDT).length;
    const dtDaysCount = activeHistory.filter((h) => h.isDT && !h.attended).length;
    const totalDaysEvaluated = activeDates.length;
    const evaluatedDaysForRate = attendedDaysCount + absentDaysCount;
    const attendanceRate =
      evaluatedDaysForRate > 0
        ? (attendedDaysCount / evaluatedDaysForRate) * 100
        : activeHistory.length > 0
        ? 100
        : 0;

    return {
      ...w,
      history: activeHistory,
      attendedDaysCount,
      absentDaysCount,
      dtDaysCount,
      totalDaysEvaluated,
      attendanceRate,
      isPerfect: absentDaysCount === 0 && attendedDaysCount > 0,
    };
  });

  // Filter workers based on status for the active dates
  let filteredWorkers = computedWorkers;

  if (filter.status === 'asistio') {
    filteredWorkers = computedWorkers.filter((w) => w.attendedDaysCount > 0);
  } else if (filter.status === 'falto') {
    filteredWorkers = computedWorkers.filter((w) => w.absentDaysCount > 0);
  } else if (filter.status === 'dt') {
    filteredWorkers = computedWorkers.filter((w) => (w.dtDaysCount || 0) > 0);
  }

  // 3. Filter CFC List based on active days and filtered workers
  const allowedWorkerNames = new Set(filteredWorkers.map((w) => w.name.trim().toLowerCase()));
  const filteredCfcList = cfcList
    .map((c) => {
      // Filter history to active dates
      const newHistory = c.history.filter((h) => activeDates.includes(h.date));
      // Count total workers belonging to this CFC that match the filter
      const matchingWorkersInCfc = filteredWorkers.filter(
        (w) => w.cfc && w.cfc.trim().toLowerCase() === c.cfcName.trim().toLowerCase()
      );

      const totalWorkersAssigned = matchingWorkersInCfc.length;
      const totalPresents = newHistory.reduce((sum, h) => sum + h.presentCount, 0);
      const totalPossible = totalWorkersAssigned * Math.max(1, newHistory.length);
      const attendanceRate = totalPossible > 0 ? (totalPresents / totalPossible) * 100 : 0;

      return {
        ...c,
        totalWorkersAssigned,
        history: newHistory,
        attendanceRate,
      };
    })
    .filter((c) => {
      // Only keep CFC if it has matching workers or non-empty history
      return filter.status === 'all' || c.totalWorkersAssigned > 0;
    });

  // 4. Recalculate KPIs for the filtered subset
  const totalDays = filteredDays.length;
  const totalUnique = filteredWorkers.length;
  const counts = filteredDays.map((d) => d.workersWorkingCount);
  const avgWorking =
    totalDays > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / totalDays) : 0;

  const sortedDays = [...filteredDays].sort((a, b) => a.date.localeCompare(b.date));
  const firstCount = sortedDays[0]?.workersWorkingCount || 0;
  const lastCount = sortedDays[sortedDays.length - 1]?.workersWorkingCount || 0;
  let trend: 'MEJORANDO' | 'EMPEORANDO' | 'ESTABLE' | 'UNICO_DIA' = 'ESTABLE';
  if (totalDays <= 1) {
    trend = 'UNICO_DIA';
  } else if (lastCount > firstCount) {
    trend = 'MEJORANDO';
  } else if (lastCount < firstCount) {
    trend = 'EMPEORANDO';
  }

  const perfectCount = filteredWorkers.filter((w) => w.isPerfect).length;

  const filteredKpis: MatrixKPIs = {
    totalUniqueWorkers: totalUnique,
    totalDaysLoaded: totalDays,
    dateRange: {
      start: sortedDays[0]?.formattedDate || '',
      end: sortedDays[sortedDays.length - 1]?.formattedDate || '',
    },
    lastDayLoaded: sortedDays[sortedDays.length - 1] || null,
    worstDay:
      sortedDays.length > 0
        ? [...sortedDays].sort((a, b) => a.workersWorkingCount - b.workersWorkingCount)[0]
        : null,
    bestDay:
      sortedDays.length > 0
        ? [...sortedDays].sort((a, b) => b.workersWorkingCount - a.workersWorkingCount)[0]
        : null,
    perfectWorkersCount: perfectCount,
    averageWorkingDaily: avgWorking,
    trend,
  };

  return {
    filteredWorkers,
    filteredDays,
    filteredCfcList,
    filteredKpis,
    isFilterActive,
  };
}
