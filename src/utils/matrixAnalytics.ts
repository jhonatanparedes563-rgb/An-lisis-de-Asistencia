import {
  CFCAttendanceSummary,
  CFCDayStat,
  DayAttendanceBatch,
  DayEvolutionStat,
  MatrixKPIs,
  RawWorkerRow,
  WorkerAttendanceSummary,
} from '../types';
import { extractCfcFromRow } from './excelParser';

const DAYS_SPANISH = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function formatISODate(dateStr: string): { formatted: string; dayName: string } {
  if (!dateStr || !dateStr.includes('-')) {
    return { formatted: dateStr || 'Sin fecha', dayName: '' };
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayName = !isNaN(dObj.getTime()) ? DAYS_SPANISH[dObj.getDay()] : '';
    return { formatted, dayName };
  }
  return { formatted: dateStr, dayName: '' };
}

export function computeAttendanceMatrix(
  batches: DayAttendanceBatch[],
  rawRowsByDate?: Record<string, RawWorkerRow[]>
): {
  workers: WorkerAttendanceSummary[];
  daysEvolution: DayEvolutionStat[];
  kpis: MatrixKPIs;
  workersMap: Map<string, WorkerAttendanceSummary>;
} {
  // Sort batches chronologically
  const sortedBatches = [...batches].sort((a, b) => a.date.localeCompare(b.date));
  const totalDaysLoaded = sortedBatches.length;

  if (totalDaysLoaded === 0) {
    return {
      workers: [],
      daysEvolution: [],
      workersMap: new Map(),
      kpis: {
        totalUniqueWorkers: 0,
        totalDaysLoaded: 0,
        dateRange: { start: '', end: '' },
        lastDayLoaded: null,
        worstDay: null,
        bestDay: null,
        perfectWorkersCount: 0,
        averageWorkingDaily: 0,
        trend: 'UNICO_DIA',
      },
    };
  }

  // 1. Build lookup for CFC strictly from rawRowsByDate and count attendance per CFC per date
  const workerCfcLookup = new Map<string, string>();
  const cfcAttendanceByDate = new Map<string, number>();

  if (rawRowsByDate) {
    Object.entries(rawRowsByDate).forEach(([date, rows]) => {
      rows.forEach((r) => {
        // Strict: extract directly from the original row's CFC column
        const extracted = extractCfcFromRow(r.rawRow);
        const cfcVal = extracted !== 'CFC General' ? extracted : (r.cfc || undefined);
        if (cfcVal && cfcVal !== 'CFC General') {
          if (r.dni) workerCfcLookup.set(r.dni.trim().toLowerCase(), cfcVal);
          if (r.workerName) workerCfcLookup.set(r.workerName.trim().toLowerCase(), cfcVal);

          const cfcKey = `${cfcVal.trim().toLowerCase()}||${date}`;
          cfcAttendanceByDate.set(cfcKey, (cfcAttendanceByDate.get(cfcKey) || 0) + 1);
        }
      });
    });
  }

  // 2. Collect all unique workers across all loaded days
  const workerRegistry = new Map<
    string,
    {
      name: string;
      dni: string;
      area?: string;
      cfc?: string;
      attendedDates: Set<string>;
    }
  >();

  sortedBatches.forEach((batch) => {
    batch.workerKeys.forEach((key) => {
      const parts = key.split('||');
      const keyId = parts[0] || '';
      const name = parts[1] || '';
      const area = parts[2] || undefined;
      const explicitCfc = parts[3] || undefined;

      const lookupKey = keyId ? keyId.trim().toLowerCase() : name.trim().toLowerCase();

      // Determine CFC strictly from the CFC column
      let resolvedCfc: string | undefined = undefined;
      if (keyId && workerCfcLookup.has(keyId.trim().toLowerCase())) {
        resolvedCfc = workerCfcLookup.get(keyId.trim().toLowerCase());
      } else if (name && workerCfcLookup.has(name.trim().toLowerCase())) {
        resolvedCfc = workerCfcLookup.get(name.trim().toLowerCase());
      } else if (explicitCfc && explicitCfc.trim() && explicitCfc !== 'CFC General') {
        resolvedCfc = explicitCfc.trim();
      }

      if (!workerRegistry.has(lookupKey)) {
        workerRegistry.set(lookupKey, {
          name: name || keyId,
          dni: keyId && /^\d+$/.test(keyId) ? keyId : '',
          area: area || undefined,
          cfc: resolvedCfc || undefined,
          attendedDates: new Set(),
        });
      } else {
        const existing = workerRegistry.get(lookupKey)!;
        if (!existing.cfc && resolvedCfc) {
          existing.cfc = resolvedCfc;
        }
        if (!existing.area && area) {
          existing.area = area;
        }
      }

      workerRegistry.get(lookupKey)!.attendedDates.add(batch.date);
    });
  });

  const totalUniqueWorkers = workerRegistry.size;

  // 3. Build Daily Evolution Stats with Active Cohort (prevents artificial phantom absences)
  const daysEvolution: DayEvolutionStat[] = sortedBatches.map((batch) => {
    const { formatted, dayName } = formatISODate(batch.date);
    const workersWorkingCount = batch.workersCount;

    // Count workers who were active in the company on or before this date
    let activeCohortToday = 0;
    let absentCount = 0;

    workerRegistry.forEach((val) => {
      let firstDate = '';
      val.attendedDates.forEach((d) => {
        if (!firstDate || d < firstDate) firstDate = d;
      });

      if (firstDate && firstDate <= batch.date) {
        activeCohortToday++;
        if (!val.attendedDates.has(batch.date)) {
          absentCount++;
        }
      }
    });

    if (activeCohortToday < workersWorkingCount) {
      activeCohortToday = workersWorkingCount;
      absentCount = 0;
    }

    const attendanceRate =
      activeCohortToday > 0 ? (workersWorkingCount / activeCohortToday) * 100 : 100;

    return {
      date: batch.date,
      formattedDate: formatted,
      dayName,
      workersWorkingCount,
      absentCount,
      attendanceRate,
    };
  });

  // 4. Build Worker Attendance Summaries
  const workers: WorkerAttendanceSummary[] = [];
  const workersMap = new Map<string, WorkerAttendanceSummary>();

  workerRegistry.forEach((val, key) => {
    const attendedDaysCount = val.attendedDates.size;
    let absentDaysCount = 0;
    let dtDaysCount = 0;

    const workerCfcKey = val.cfc ? val.cfc.trim().toLowerCase() : '';

    const history = sortedBatches.map((batch) => {
      const { formatted, dayName } = formatISODate(batch.date);
      const attended = val.attendedDates.has(batch.date);

      // Rule: If the worker's CFC had 0 workers on this date, the whole CFC had DT (Descanso programado)
      let isDT = false;
      if (workerCfcKey) {
        const cfcAttendanceToday = cfcAttendanceByDate.get(`${workerCfcKey}||${batch.date}`) || 0;
        if (cfcAttendanceToday === 0) {
          isDT = true;
        }
      }

      if (isDT && !attended) {
        dtDaysCount++;
      } else if (!attended) {
        absentDaysCount++;
      }

      return {
        date: batch.date,
        formattedDate: formatted,
        dayName,
        attended,
        isDT,
      };
    });

    const evaluatedWorkingDays = Math.max(1, totalDaysLoaded - dtDaysCount);
    const attendanceRate = Math.min(100, (attendedDaysCount / evaluatedWorkingDays) * 100);
    const isPerfect = absentDaysCount === 0;

    const summary: WorkerAttendanceSummary = {
      key,
      name: val.name,
      dni: val.dni,
      area: val.area,
      cfc: val.cfc,
      totalDaysEvaluated: totalDaysLoaded,
      attendedDaysCount,
      absentDaysCount,
      dtDaysCount,
      attendanceRate,
      isPerfect,
      history,
    };

    workers.push(summary);
    workersMap.set(key, summary);
  });

  // 5. Compute KPIs
  const lastDayLoaded = daysEvolution.length > 0 ? daysEvolution[daysEvolution.length - 1] : null;

  let worstDay: DayEvolutionStat | null = null;
  let bestDay: DayEvolutionStat | null = null;

  if (daysEvolution.length > 0) {
    let minWorking = Infinity;
    let maxWorking = -Infinity;

    daysEvolution.forEach((d) => {
      if (d.workersWorkingCount < minWorking) {
        minWorking = d.workersWorkingCount;
        worstDay = d;
      }
      if (d.workersWorkingCount > maxWorking) {
        maxWorking = d.workersWorkingCount;
        bestDay = d;
      }
    });
  }

  // Trend determination across days
  let trend: 'MEJORANDO' | 'EMPEORANDO' | 'ESTABLE' | 'UNICO_DIA' = 'UNICO_DIA';
  if (daysEvolution.length >= 2) {
    const firstDay = daysEvolution[0];
    const lastDay = daysEvolution[daysEvolution.length - 1];
    const delta = lastDay.workersWorkingCount - firstDay.workersWorkingCount;

    if (delta > 10) trend = 'MEJORANDO';
    else if (delta < -10) trend = 'EMPEORANDO';
    else trend = 'ESTABLE';
  }

  const perfectWorkersCount = workers.filter((w) => w.isPerfect).length;
  const totalWorkingSum = daysEvolution.reduce((acc, d) => acc + d.workersWorkingCount, 0);
  const averageWorkingDaily = daysEvolution.length > 0 ? Math.round(totalWorkingSum / daysEvolution.length) : 0;

  const kpis: MatrixKPIs = {
    totalUniqueWorkers,
    totalDaysLoaded,
    dateRange: {
      start: sortedBatches[0].date,
      end: sortedBatches[sortedBatches.length - 1].date,
    },
    lastDayLoaded,
    worstDay,
    bestDay,
    perfectWorkersCount,
    averageWorkingDaily,
    trend,
  };

  return { workers, daysEvolution, kpis, workersMap };
}

/**
 * Compute CFC-Level Attendance Matrix (Deterministic Math)
 * Allows grouping by CFC / Centro de Costo / Cuadrilla.
 */
export function computeCFCAttendanceMatrix(
  workers: WorkerAttendanceSummary[],
  days: DayEvolutionStat[],
  rawRowsByDate?: Record<string, RawWorkerRow[]>,
  groupColumnOverride?: string
): {
  cfcList: CFCAttendanceSummary[];
  bestCfc: CFCAttendanceSummary | null;
  worstCfc: CFCAttendanceSummary | null;
  totalCfcs: number;
  availableColumns: string[];
} {
  // Discover available columns in raw rows that can be grouped by
  const columnsSet = new Set<string>();
  if (rawRowsByDate) {
    Object.values(rawRowsByDate).forEach((rows) => {
      rows.slice(0, 50).forEach((r) => {
        if (r.rawRow) {
          Object.keys(r.rawRow).forEach((k) => {
            const lower = k.toLowerCase();
            if (
              !lower.includes('fecha') &&
              !lower.includes('hora') &&
              !lower.includes('dni') &&
              !lower.includes('nombre') &&
              !lower.includes('empleado') &&
              !lower.includes('trabajador') &&
              !lower.includes('total')
            ) {
              columnsSet.add(k);
            }
          });
        }
      });
    });
  }

  const availableColumns = Array.from(columnsSet);

  if (workers.length === 0 || days.length === 0) {
    return {
      cfcList: [],
      bestCfc: null,
      worstCfc: null,
      totalCfcs: 0,
      availableColumns,
    };
  }

  // 1. Build lookup for worker -> group name if custom column override is selected
  const customWorkerGroupLookup = new Map<string, string>();
  if (groupColumnOverride && rawRowsByDate) {
    Object.values(rawRowsByDate).forEach((rows) => {
      rows.forEach((r) => {
        const val = r.rawRow ? String(r.rawRow[groupColumnOverride] || '').trim() : '';
        if (val) {
          if (r.dni) customWorkerGroupLookup.set(r.dni.trim().toLowerCase(), val);
          if (r.workerName) customWorkerGroupLookup.set(r.workerName.trim().toLowerCase(), val);
        }
      });
    });
  }

  // 1b. Build direct CFC lookup strictly from the CFC column
  const strictCfcLookup = new Map<string, string>();
  if (rawRowsByDate) {
    Object.values(rawRowsByDate).forEach((rows) => {
      rows.forEach((r) => {
        const strictVal = extractCfcFromRow(r.rawRow);
        if (strictVal && strictVal !== 'CFC General') {
          if (r.dni) strictCfcLookup.set(r.dni.trim().toLowerCase(), strictVal);
          if (r.workerName) strictCfcLookup.set(r.workerName.trim().toLowerCase(), strictVal);
        }
      });
    });
  }

  // 1c. Count attendance per CFC per date
  const cfcAttendanceByDate = new Map<string, number>();
  if (rawRowsByDate) {
    Object.entries(rawRowsByDate).forEach(([date, rows]) => {
      rows.forEach((r) => {
        const extracted = extractCfcFromRow(r.rawRow);
        const cfcVal = extracted !== 'CFC General' ? extracted : (r.cfc || undefined);
        if (cfcVal && cfcVal !== 'CFC General') {
          const cfcKey = `${cfcVal.trim().toLowerCase()}||${date}`;
          cfcAttendanceByDate.set(cfcKey, (cfcAttendanceByDate.get(cfcKey) || 0) + 1);
        }
      });
    });
  }

  // 2. Group workers by CFC
  const cfcMap = new Map<string, WorkerAttendanceSummary[]>();

  workers.forEach((w) => {
    let group = 'CFC General';

    if (groupColumnOverride) {
      if (w.dni && customWorkerGroupLookup.has(w.dni.trim().toLowerCase())) {
        group = customWorkerGroupLookup.get(w.dni.trim().toLowerCase())!;
      } else if (w.name && customWorkerGroupLookup.has(w.name.trim().toLowerCase())) {
        group = customWorkerGroupLookup.get(w.name.trim().toLowerCase())!;
      }
    } else {
      const dniKey = w.dni ? w.dni.trim().toLowerCase() : '';
      const nameKey = w.name ? w.name.trim().toLowerCase() : '';

      if (dniKey && strictCfcLookup.has(dniKey)) {
        group = strictCfcLookup.get(dniKey)!;
      } else if (nameKey && strictCfcLookup.has(nameKey)) {
        group = strictCfcLookup.get(nameKey)!;
      } else if (w.cfc && w.cfc.trim() && w.cfc !== 'CFC General') {
        group = w.cfc.trim();
      } else if (w.area && w.area.trim()) {
        group = w.area.trim();
      }
    }

    if (!cfcMap.has(group)) {
      cfcMap.set(group, []);
    }
    cfcMap.get(group)!.push(w);
  });

  // 3. Compute Metrics for each CFC
  const cfcList: CFCAttendanceSummary[] = [];

  cfcMap.forEach((cfcWorkers, cfcName) => {
    let totalPresentDays = 0;
    let totalAbsentDays = 0;

    let prevPresent = 0;
    const history: CFCDayStat[] = days.map((d, idx) => {
      let presentCount = 0;
      let absentCount = 0;
      let activeAssignedToday = 0;

      cfcWorkers.forEach((w) => {
        const dayRecord = w.history.find((h) => h.date === d.date);
        const isPresentToday = !!dayRecord && dayRecord.attended;

        // Earliest appearance of worker in the dataset
        let firstDate = '';
        w.history.forEach((h) => {
          if (h.attended && (!firstDate || h.date < firstDate)) firstDate = h.date;
        });

        // Worker was active in company on or before this day
        if (firstDate && firstDate <= d.date) {
          activeAssignedToday++;
          if (isPresentToday) {
            presentCount++;
          } else {
            absentCount++;
          }
        } else if (isPresentToday) {
          activeAssignedToday++;
          presentCount++;
        }
      });

      if (activeAssignedToday < presentCount) {
        activeAssignedToday = presentCount;
      }

      // DT Detection:
      // If the CFC has workers assigned, and either raw attendance for this CFC is 0
      // OR presentCount is 0, the entire CFC was given DT (Día de Turno / Descanso programado).
      // DT does NOT count as absences!
      const cfcKey = `${cfcName.trim().toLowerCase()}||${d.date}`;
      const rawCfcCount = cfcAttendanceByDate.get(cfcKey) || 0;

      const isDT = cfcWorkers.length > 0 && (presentCount === 0 || rawCfcCount === 0);

      if (isDT) {
        presentCount = 0;
        absentCount = 0; // DT does NOT count as absences!
      }

      const rate = isDT
        ? 100
        : activeAssignedToday > 0
        ? (presentCount / activeAssignedToday) * 100
        : 100;

      const deltaFromPreviousDay = idx === 0 ? 0 : presentCount - prevPresent;
      prevPresent = presentCount;

      totalPresentDays += presentCount;
      if (!isDT) {
        totalAbsentDays += absentCount;
      }

      return {
        date: d.date,
        formattedDate: d.formattedDate,
        dayName: d.dayName,
        presentCount,
        absentCount,
        totalAssigned: activeAssignedToday,
        rate,
        deltaFromPreviousDay,
        isDT,
      };
    });

    // Mark DT on individual worker history so workers are not penalized
    history.forEach((hStat) => {
      if (hStat.isDT) {
        cfcWorkers.forEach((w) => {
          const wHist = w.history.find((item) => item.date === hStat.date);
          if (wHist && !wHist.attended) {
            if (!wHist.isDT) {
              wHist.isDT = true;
              // Remove artificial absence from worker
              w.absentDaysCount = Math.max(0, w.absentDaysCount - 1);
              w.dtDaysCount = (w.dtDaysCount || 0) + 1;
              const workingDays = Math.max(1, w.totalDaysEvaluated - (w.dtDaysCount || 0));
              w.attendanceRate = Math.min(100, (w.attendedDaysCount / workingDays) * 100);
              w.isPerfect = w.absentDaysCount === 0;
            }
          }
        });
      }
    });

    const workingDaysCount = history.filter((h) => !h.isDT).length;
    const dailyAverage =
      workingDaysCount > 0
        ? Math.round(totalPresentDays / workingDaysCount)
        : days.length > 0
        ? Math.round(totalPresentDays / days.length)
        : 0;

    const totalWorkersAssigned = Math.max(
      dailyAverage,
      ...history.map((h) => h.totalAssigned)
    );

    const totalPossible = totalPresentDays + totalAbsentDays;
    const attendanceRate = totalPossible > 0 ? (totalPresentDays / totalPossible) * 100 : 100;

    const lastDayStat = history[history.length - 1];
    const firstDayStat = history[0];
    const lastDayPresentCount = lastDayStat ? lastDayStat.presentCount : 0;
    const lastDayAbsentCount = lastDayStat ? lastDayStat.absentCount : 0;
    const lastDayRate = lastDayStat ? lastDayStat.rate : 100;
    const lastDayDelta = history.length >= 2 ? (lastDayStat?.deltaFromPreviousDay || 0) : 0;

    let trendDirection: 'SUBIENDO' | 'BAJANDO' | 'ESTABLE' = 'ESTABLE';
    if (history.length >= 2 && lastDayStat && firstDayStat) {
      const net = lastDayStat.presentCount - firstDayStat.presentCount;
      if (net > 2) trendDirection = 'SUBIENDO';
      else if (net < -2) trendDirection = 'BAJANDO';
      else trendDirection = 'ESTABLE';
    }

    cfcList.push({
      cfcName,
      totalWorkersAssigned,
      totalPresentDays,
      totalAbsentDays,
      attendanceRate,
      dailyAverage,
      lastDayPresentCount,
      lastDayAbsentCount,
      lastDayRate,
      lastDayDelta,
      trendDirection,
      history,
      workers: cfcWorkers,
    });
  });

  // 4. Identify Best CFC (highest attendance rate) and Worst CFC (most missing people / lowest rate)
  let bestCfc: CFCAttendanceSummary | null = null;
  let worstCfc: CFCAttendanceSummary | null = null;

  if (cfcList.length > 0) {
    // Sort by attendance rate desc for best
    const sortedByRate = [...cfcList].sort((a, b) => b.attendanceRate - a.attendanceRate);
    bestCfc = sortedByRate[0];

    // Sort by totalAbsentDays desc for worst (most missing people)
    const sortedByAbsences = [...cfcList].sort((a, b) => b.totalAbsentDays - a.totalAbsentDays);
    worstCfc = sortedByAbsences[0];
  }

  return {
    cfcList,
    bestCfc,
    worstCfc,
    totalCfcs: cfcList.length,
    availableColumns,
  };
}

export function generateCrossDateExecutiveSummary(kpis: MatrixKPIs, days: DayEvolutionStat[]): string {
  if (kpis.totalDaysLoaded === 0) {
    return 'Carga la asistencia de los días a analizar.';
  }

  if (kpis.totalDaysLoaded === 1) {
    const d = days[0];
    return `Se registró la asistencia de ${d.workersWorkingCount.toLocaleString()} trabajadores para el ${d.formattedDate} (${d.dayName}). Al cargar los archivos de los siguientes días (ej. 700 mañana, 900 pasado), el sistema cruzará las listas de asistencia automáticamente para identificar ausencias repetidas y constancia de personal entre fechas.`;
  }

  let text = `Se analizaron ${kpis.totalDaysLoaded} jornadas (${days[0].formattedDate} al ${days[days.length - 1].formattedDate}) con un universo total de ${kpis.totalUniqueWorkers.toLocaleString()} trabajadores identificados. `;

  text += `El promedio diario de personal trabajando fue de ${kpis.averageWorkingDaily.toLocaleString()} personas. `;

  if (kpis.perfectWorkersCount > 0) {
    text += `Un total de ${kpis.perfectWorkersCount.toLocaleString()} personas mantuvieron asistencia perfecta (asistieron los ${kpis.totalDaysLoaded} días). `;
  }

  if (kpis.worstDay && kpis.bestDay) {
    text += `La jornada con mayor afluencia fue el ${kpis.bestDay.formattedDate} (${kpis.bestDay.workersWorkingCount.toLocaleString()} personas trabajando), mientras que el día con menor asistencia fue el ${kpis.worstDay.formattedDate} (${kpis.worstDay.workersWorkingCount.toLocaleString()} personas trabajando).`;
  }

  return text;
}
