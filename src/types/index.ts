export interface RawWorkerRow {
  originalRowNumber: number;
  workerName: string;
  dni: string;
  date: string; // YYYY-MM-DD
  area?: string;
  cfc?: string;
  rawRow: Record<string, any>;
}

export interface DayAttendanceBatch {
  date: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM/YYYY
  dayName: string; // Lunes, Martes, etc.
  fileName: string;
  workersCount: number;
  workerKeys: string[]; // array of worker keys present this day: "KEY||NAME||AREA||CFC"
}

export interface WorkerAttendanceSummary {
  key: string;
  name: string;
  dni: string;
  area?: string;
  cfc?: string;
  totalDaysEvaluated: number;
  attendedDaysCount: number;
  absentDaysCount: number;
  dtDaysCount?: number; // Days the worker was on scheduled rest (DT)
  attendanceRate: number; // (attendedDaysCount / totalDaysEvaluated) * 100
  isPerfect: boolean;
  history: {
    date: string;
    formattedDate: string;
    dayName: string;
    attended: boolean;
    isDT?: boolean; // Scheduled rest day for the worker's CFC
  }[];
}

export interface CFCDayStat {
  date: string;
  formattedDate: string;
  dayName: string;
  presentCount: number;
  absentCount: number;
  totalAssigned: number;
  rate: number;
  deltaFromPreviousDay: number; // e.g. +5, -12, 0
  isDT?: boolean; // True if the entire CFC had scheduled rest (DT) on this date
}

export interface CFCAttendanceSummary {
  cfcName: string;
  totalWorkersAssigned: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  attendanceRate: number;
  dailyAverage: number;
  lastDayPresentCount: number;
  lastDayAbsentCount: number;
  lastDayRate: number;
  lastDayDelta: number; // difference from yesterday
  trendDirection: 'SUBIENDO' | 'BAJANDO' | 'ESTABLE';
  history: CFCDayStat[];
  workers: WorkerAttendanceSummary[];
}

export interface DayEvolutionStat {
  date: string;
  formattedDate: string;
  dayName: string;
  workersWorkingCount: number; // Asistieron a laborar hoy
  absentCount: number; // Faltas reales (descontando personal en DT programado)
  attendanceRate: number; // (workersWorkingCount / scheduledWorkersCount) * 100
  dtWorkersCount?: number; // Personal en Descanso Turno (DT) programado por la empresa
  scheduledWorkersCount?: number; // Personal programado para laborar (Activos - DT)
}

export interface MatrixKPIs {
  totalUniqueWorkers: number; // Active universe of workers
  totalDaysLoaded: number;
  dateRange: { start: string; end: string };
  lastDayLoaded: DayEvolutionStat | null;
  worstDay: DayEvolutionStat | null;
  bestDay: DayEvolutionStat | null;
  perfectWorkersCount: number;
  averageWorkingDaily: number;
  trend: 'MEJORANDO' | 'EMPEORANDO' | 'ESTABLE' | 'UNICO_DIA';
}

export type ActiveTab = 'resumen' | 'personal' | 'cfc' | 'evolucion' | 'ai' | 'datos';
