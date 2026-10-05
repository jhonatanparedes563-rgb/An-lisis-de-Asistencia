import { DayEvolutionStat, WorkerAttendanceSummary, CFCAttendanceSummary } from '../types';

export interface MarkovTransitionMatrix {
  p_attend_attend: number; // P(A_{t+1} | A_t)
  p_absent_attend: number; // P(F_{t+1} | A_t)
  p_attend_absent: number; // P(A_{t+1} | F_t)
  p_absent_absent: number; // P(F_{t+1} | F_t)
  totalTransitionsEvaluated: number;
}

export interface WorkerRiskPrediction {
  workerKey: string;
  name: string;
  dni: string;
  cfc?: string;
  riskScore: number; // 0 - 100%
  riskLevel: 'BAJO' | 'MODERADO' | 'CRITICO';
  primaryFactor: string;
  probabilityNextAbsence: number; // 0.00 - 1.00
  cluster: 'NUCLEO_FIEL' | 'INTERMITENTE' | 'DESERCION_TEMPRANA';
}

export interface AttendanceForecast {
  nextDayPredictedAttendance: number;
  confidenceInterval95: [number, number];
  optimisticScenario: number;
  pessimisticScenario: number;
  expectedAbsences: number;
  retentionRateForecast: number;
}

export interface ClusterStatistics {
  nucleoFielCount: number;
  nucleoFielPct: number;
  intermitenteCount: number;
  intermitentePct: number;
  desercionTempranaCount: number;
  desercionTempranaPct: number;
}

export interface DayOfWeekPattern {
  dayName: string; // 'Lunes', 'Martes', ...
  dayIndex: number;
  occurrences: number;
  avgAttendanceRate: number;
  avgAbsenceRate: number; // % inasistencias aprendidas
  avgWorkingCount: number;
  riskClassification: 'CRITICO' | 'MODERADO' | 'BAJO';
}

export interface WeeklyPattern {
  weekKey: string;
  label: string; // 'Semana 40'
  daysCount: number;
  avgAttendanceRate: number;
  avgWorkingDaily: number;
  trend: 'MEJORANDO' | 'EMPEORANDO' | 'ESTABLE';
}

export interface LearnedPatternModel {
  dayOfWeekPatterns: DayOfWeekPattern[];
  worstDayOfWeek: DayOfWeekPattern | null; // día en que falta más gente
  bestDayOfWeek: DayOfWeekPattern | null; // día de mayor asistencia
  weeklyPatterns: WeeklyPattern[];
  nextDayOfWeekName: string;
  nextDaySeasonalityMultiplier: number;
}

/**
 * Computes First-Order Discrete Markov Chain Transition Matrix
 * Calculates empirical state transition probabilities between consecutive days:
 * S = { Asistió (A), Faltó (F) }
 */
export function computeMarkovTransitionMatrix(
  workers: WorkerAttendanceSummary[],
  days: DayEvolutionStat[]
): MarkovTransitionMatrix {
  if (workers.length === 0 || days.length < 2) {
    return {
      p_attend_attend: 0.95,
      p_absent_attend: 0.05,
      p_attend_absent: 0.35,
      p_absent_absent: 0.65,
      totalTransitionsEvaluated: 0,
    };
  }

  let count_AA = 0;
  let count_AF = 0; // attended then absent
  let count_FA = 0; // absent then attended
  let count_FF = 0; // absent then absent

  workers.forEach((w) => {
    for (let t = 0; t < w.history.length - 1; t++) {
      const state_t = w.history[t].attended;
      const state_next = w.history[t + 1].attended;

      if (state_t && state_next) count_AA++;
      else if (state_t && !state_next) count_AF++;
      else if (!state_t && state_next) count_FA++;
      else if (!state_t && !state_next) count_FF++;
    }
  });

  const totalFromA = count_AA + count_AF;
  const totalFromF = count_FA + count_FF;

  const p_attend_attend = totalFromA > 0 ? count_AA / totalFromA : 0.95;
  const p_absent_attend = totalFromA > 0 ? count_AF / totalFromA : 0.05;
  const p_attend_absent = totalFromF > 0 ? count_FA / totalFromF : 0.35;
  const p_absent_absent = totalFromF > 0 ? count_FF / totalFromF : 0.65;

  return {
    p_attend_attend,
    p_absent_attend,
    p_attend_absent,
    p_absent_absent,
    totalTransitionsEvaluated: totalFromA + totalFromF,
  };
}

/**
 * Computes Multi-Factor Absenteeism Risk Score for every individual worker
 * Integrates Recency, Frequency, Streak Length, and CFC stability penalty.
 */
export function computeWorkerRiskPredictions(
  workers: WorkerAttendanceSummary[],
  cfcList: CFCAttendanceSummary[],
  markov: MarkovTransitionMatrix
): {
  predictions: WorkerRiskPrediction[];
  clusterStats: ClusterStatistics;
  highRiskCount: number;
} {
  // CFC fragility map
  const cfcRiskMap = new Map<string, number>();
  cfcList.forEach((c) => {
    cfcRiskMap.set(c.cfcName, (100 - c.attendanceRate) / 100);
  });

  let nucleoFielCount = 0;
  let intermitenteCount = 0;
  let desercionTempranaCount = 0;
  let highRiskCount = 0;

  const predictions: WorkerRiskPrediction[] = workers.map((w) => {
    const totalDays = w.totalDaysEvaluated;
    const absences = w.absentDaysCount;
    const lastDayAttended = w.history.length > 0 ? w.history[w.history.length - 1].attended : true;

    // Feature 1: Historical Absence Rate
    const absenceRate = totalDays > 0 ? absences / totalDays : 0;

    // Feature 2: Consecutive Inaction at end of history
    let streakAbsent = 0;
    for (let i = w.history.length - 1; i >= 0; i--) {
      if (!w.history[i].attended) streakAbsent++;
      else break;
    }

    // Feature 3: Markov Base Transition Probability
    const markovBaseProb = lastDayAttended
      ? markov.p_absent_attend
      : markov.p_absent_absent;

    // Feature 4: CFC Group Vulnerability factor
    const cfcGroupFragility = (w.cfc && cfcRiskMap.get(w.cfc)) || 0.15;

    // Logistic formulation for predictive risk score
    // R = sigmoid( w1*absenceRate + w2*streak + w3*markov + w4*cfc )
    const rawScore =
      0.35 * absenceRate +
      0.30 * (streakAbsent / Math.max(1, totalDays)) +
      0.25 * markovBaseProb +
      0.10 * cfcGroupFragility;

    // Scale to percentage 0 - 100
    const riskScore = Math.min(99, Math.max(1, Math.round(rawScore * 100)));
    const probabilityNextAbsence = Number((riskScore / 100).toFixed(2));

    let riskLevel: 'BAJO' | 'MODERADO' | 'CRITICO' = 'BAJO';
    if (riskScore >= 60) {
      riskLevel = 'CRITICO';
      highRiskCount++;
    } else if (riskScore >= 30) {
      riskLevel = 'MODERADO';
    }

    // Determine Cluster Category
    let cluster: 'NUCLEO_FIEL' | 'INTERMITENTE' | 'DESERCION_TEMPRANA' = 'NUCLEO_FIEL';
    if (streakAbsent >= 2 && streakAbsent === totalDays - 1) {
      cluster = 'DESERCION_TEMPRANA';
      desercionTempranaCount++;
    } else if (absences > 0) {
      cluster = 'INTERMITENTE';
      intermitenteCount++;
    } else {
      cluster = 'NUCLEO_FIEL';
      nucleoFielCount++;
    }

    // Primary explanatory factor
    let primaryFactor = 'Baja tasa de inasistencia';
    if (streakAbsent >= 2) {
      primaryFactor = `Inasistencia consecutiva (${streakAbsent} días sin laborar)`;
    } else if (!lastDayAttended) {
      primaryFactor = 'Faltó en la jornada más reciente';
    } else if (absenceRate > 0.3) {
      primaryFactor = `Alta tasa acumulada de faltas (${Math.round(absenceRate * 100)}%)`;
    } else if (cfcGroupFragility > 0.25) {
      primaryFactor = 'Adscrito a CFC con alta volatilidad operativa';
    }

    return {
      workerKey: w.key,
      name: w.name,
      dni: w.dni,
      cfc: w.cfc,
      riskScore,
      riskLevel,
      primaryFactor,
      probabilityNextAbsence,
      cluster,
    };
  });

  const total = Math.max(1, workers.length);
  const clusterStats: ClusterStatistics = {
    nucleoFielCount,
    nucleoFielPct: Number(((nucleoFielCount / total) * 100).toFixed(1)),
    intermitenteCount,
    intermitentePct: Number(((intermitenteCount / total) * 100).toFixed(1)),
    desercionTempranaCount,
    desercionTempranaPct: Number(((desercionTempranaCount / total) * 100).toFixed(1)),
  };

  return { predictions, clusterStats, highRiskCount };
}

function getISOWeekNumber(dStr: string): number {
  const d = new Date(dStr + 'T12:00:00Z');
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Machine Learning Engine that learns day-by-day and week-by-week behavioral patterns
 * Identifies which days of the week have the highest absence rate and calendar seasonality.
 */
export function learnBehavioralPatterns(
  days: DayEvolutionStat[],
  universeTotal: number
): LearnedPatternModel {
  if (days.length === 0) {
    return {
      dayOfWeekPatterns: [],
      worstDayOfWeek: null,
      bestDayOfWeek: null,
      weeklyPatterns: [],
      nextDayOfWeekName: 'Próxima Jornada',
      nextDaySeasonalityMultiplier: 1.0,
    };
  }

  // 1. Group by Day of Week
  const dayGroups = new Map<string, { days: DayEvolutionStat[]; dayIndex: number }>();

  days.forEach((d) => {
    const dt = new Date(d.date + 'T12:00:00Z');
    const dayIndex = dt.getUTCDay();
    if (!dayGroups.has(d.dayName)) {
      dayGroups.set(d.dayName, { days: [], dayIndex });
    }
    dayGroups.get(d.dayName)!.days.push(d);
  });

  const overallAvgAttendanceRate =
    days.reduce((acc, d) => acc + d.attendanceRate, 0) / Math.max(1, days.length);

  const dayOfWeekPatterns: DayOfWeekPattern[] = Array.from(dayGroups.entries())
    .map(([dayName, group]) => {
      const occurrences = group.days.length;
      const avgAttendanceRate =
        group.days.reduce((sum, d) => sum + d.attendanceRate, 0) / occurrences;
      const avgWorkingCount = Math.round(
        group.days.reduce((sum, d) => sum + d.workersWorkingCount, 0) / occurrences
      );
      const avgAbsenceRate = Number((100 - avgAttendanceRate).toFixed(1));

      let riskClassification: 'CRITICO' | 'MODERADO' | 'BAJO' = 'BAJO';
      if (avgAbsenceRate >= 8) riskClassification = 'CRITICO';
      else if (avgAbsenceRate >= 5) riskClassification = 'MODERADO';

      return {
        dayName,
        dayIndex: group.dayIndex,
        occurrences,
        avgAttendanceRate: Number(avgAttendanceRate.toFixed(1)),
        avgAbsenceRate,
        avgWorkingCount,
        riskClassification,
      };
    })
    .sort((a, b) => b.avgAbsenceRate - a.avgAbsenceRate);

  const worstDayOfWeek = dayOfWeekPatterns.length > 0 ? dayOfWeekPatterns[0] : null;
  const bestDayOfWeek =
    dayOfWeekPatterns.length > 0 ? dayOfWeekPatterns[dayOfWeekPatterns.length - 1] : null;

  // 2. Group by ISO Week
  const weekMap = new Map<number, DayEvolutionStat[]>();
  days.forEach((d) => {
    const wk = getISOWeekNumber(d.date);
    if (!weekMap.has(wk)) weekMap.set(wk, []);
    weekMap.get(wk)!.push(d);
  });

  const weeklyPatterns: WeeklyPattern[] = Array.from(weekMap.entries())
    .map(([weekNumber, weekDays]) => {
      const daysCount = weekDays.length;
      const avgAttendanceRate = Number(
        (weekDays.reduce((acc, d) => acc + d.attendanceRate, 0) / daysCount).toFixed(1)
      );
      const avgWorkingDaily = Math.round(
        weekDays.reduce((acc, d) => acc + d.workersWorkingCount, 0) / daysCount
      );

      return {
        weekKey: `sem-${weekNumber}`,
        label: `Semana ${weekNumber}`,
        daysCount,
        avgAttendanceRate,
        avgWorkingDaily,
        trend: 'ESTABLE' as const,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  for (let i = 1; i < weeklyPatterns.length; i++) {
    const diff = weeklyPatterns[i].avgAttendanceRate - weeklyPatterns[i - 1].avgAttendanceRate;
    if (diff > 0.5) weeklyPatterns[i].trend = 'MEJORANDO';
    else if (diff < -0.5) weeklyPatterns[i].trend = 'EMPEORANDO';
  }

  // 3. Next day of week & learned seasonality multiplier
  const lastDay = days[days.length - 1];
  const lastDate = new Date(lastDay.date + 'T12:00:00Z');
  const nextDate = new Date(lastDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const nextDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const nextDayOfWeekName = nextDayNames[nextDate.getUTCDay()];

  const matchingPattern = dayOfWeekPatterns.find((p) => p.dayName === nextDayOfWeekName);
  let nextDaySeasonalityMultiplier = 1.0;
  if (matchingPattern && overallAvgAttendanceRate > 0) {
    nextDaySeasonalityMultiplier = Number(
      (matchingPattern.avgAttendanceRate / overallAvgAttendanceRate).toFixed(3)
    );
  }

  return {
    dayOfWeekPatterns,
    worstDayOfWeek,
    bestDayOfWeek,
    weeklyPatterns,
    nextDayOfWeekName,
    nextDaySeasonalityMultiplier,
  };
}

/**
 * Monte Carlo & Stochastic Forecast for Next Day Attendance with Learned Seasonality
 */
export function computeStochasticForecast(
  workers: WorkerAttendanceSummary[],
  days: DayEvolutionStat[],
  markov: MarkovTransitionMatrix,
  seasonalityMultiplier: number = 1.0
): AttendanceForecast {
  const totalUniverse = workers.length;

  if (totalUniverse === 0 || days.length === 0) {
    return {
      nextDayPredictedAttendance: 0,
      confidenceInterval95: [0, 0],
      optimisticScenario: 0,
      pessimisticScenario: 0,
      expectedAbsences: 0,
      retentionRateForecast: 100,
    };
  }

  // Count how many attended on the last available day that had staff
  const daysWithStaff = days.filter((d) => d.workersWorkingCount > 0);
  const lastDay = daysWithStaff.length > 0 ? daysWithStaff[daysWithStaff.length - 1] : days[days.length - 1];
  const lastWorkingCount = lastDay ? lastDay.workersWorkingCount : 0;
  const lastAbsentCount = Math.max(0, totalUniverse - lastWorkingCount);

  // Markov Expected Value for t+1 combined with learned day-of-week seasonality:
  const expectedFromAttended = lastWorkingCount * markov.p_attend_attend;
  const expectedFromAbsent = lastAbsentCount * markov.p_attend_absent;
  const rawPoint = (expectedFromAttended + expectedFromAbsent) * seasonalityMultiplier;
  const pointForecast = Math.min(totalUniverse, Math.max(0, Math.round(rawPoint)));

  // Standard variance: Var(X) = n*p*(1-p)
  const varAttended = lastWorkingCount * markov.p_attend_attend * (1 - markov.p_attend_attend);
  const varAbsent = lastAbsentCount * markov.p_attend_absent * (1 - markov.p_attend_absent);
  const stdError = Math.sqrt(varAttended + varAbsent);

  const z95 = 1.96;
  const ciLow = Math.max(0, Math.round(pointForecast - z95 * stdError));
  const ciHigh = Math.min(totalUniverse, Math.round(pointForecast + z95 * stdError));

  const optimisticScenario = Math.min(totalUniverse, Math.round(pointForecast + 1.28 * stdError));
  const pessimisticScenario = Math.max(0, Math.round(pointForecast - 1.28 * stdError));

  const expectedAbsences = Math.max(0, totalUniverse - pointForecast);
  const retentionRateForecast = Number(((pointForecast / totalUniverse) * 100).toFixed(1));

  return {
    nextDayPredictedAttendance: pointForecast,
    confidenceInterval95: [ciLow, ciHigh],
    optimisticScenario,
    pessimisticScenario,
    expectedAbsences,
    retentionRateForecast,
  };
}

export interface CFCForecastItem {
  cfcName: string;
  lastDayPresent: number;
  dailyAverage: number;
  predictedAttendance: number;
  expectedDelta: number;
  expectedRate: number;
  trend: 'SUBE' | 'BAJA' | 'ESTABLE';
  history: {
    date: string;
    formattedDate: string;
    presentCount: number;
    deltaFromPreviousDay: number;
  }[];
}

/**
 * Computes Projected Attendance Forecast broken down by CFC with seasonality
 */
export function computeCFCForecasts(
  cfcList: CFCAttendanceSummary[],
  markov: MarkovTransitionMatrix,
  seasonalityMultiplier: number = 1.0
): CFCForecastItem[] {
  return cfcList
    .map((c) => {
      // Find the last day that actually HAD personnel (presentCount > 0 and not DT)
      const daysWithPersonnel = c.history.filter((h) => !h.isDT && h.presentCount > 0);
      const lastDayWithStaff = daysWithPersonnel.length > 0
        ? daysWithPersonnel[daysWithPersonnel.length - 1]
        : null;

      // Base personnel count: Use the last day that had staff to make a realistic projection
      const basePresent = lastDayWithStaff ? lastDayWithStaff.presentCount : c.dailyAverage;
      const universe = c.totalWorkersAssigned || basePresent;
      const absent = Math.max(0, universe - basePresent);

      // CFC-specific Bayesian-adjusted transition rates
      const cfcFidelity = c.attendanceRate / 100;
      const pAA = Math.min(0.99, Math.max(0.70, (markov.p_attend_attend + cfcFidelity) / 2));
      const pAF = Math.min(0.50, Math.max(0.15, (markov.p_attend_absent + (1 - cfcFidelity) * 0.5) / 2));

      const rawPredicted = (basePresent * pAA + absent * pAF) * seasonalityMultiplier;
      const predicted = Math.min(universe, Math.max(0, Math.round(rawPredicted)));
      const expectedDelta = predicted - basePresent;
      const expectedRate = universe > 0 ? Number(((predicted / universe) * 100).toFixed(1)) : 100;

      let trend: 'SUBE' | 'BAJA' | 'ESTABLE' = 'ESTABLE';
      if (expectedDelta > 0) trend = 'SUBE';
      else if (expectedDelta < 0) trend = 'BAJA';

      return {
        cfcName: c.cfcName,
        lastDayPresent: basePresent,
        dailyAverage: c.dailyAverage,
        predictedAttendance: predicted,
        expectedDelta,
        expectedRate,
        trend,
        history: c.history,
      };
    })
    .sort((a, b) => a.predictedAttendance - b.predictedAttendance); // Orden por defecto: de menor a mayor
}

