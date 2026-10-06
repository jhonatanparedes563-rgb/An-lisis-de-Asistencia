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
  activeWeeks?: string[]; // ISO week IDs where worker was active (e.g. ['2026-W40', '2026-W41'])
  history: {
    date: string;
    formattedDate: string;
    dayName: string;
    attended: boolean;
    isDT?: boolean; // Scheduled rest day for the worker's CFC
    isInactive?: boolean; // Not part of this week's workforce
    cfc?: string; // CFC where the worker was on this date
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

export type ActiveTab = 'resumen' | 'personal' | 'cfc' | 'evolucion' | 'ai' | 'usuarios' | 'datos';

export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  title: string;
  avatarColor: string;
  description: string;
  createdAt?: string;
  permissions: {
    canUploadData: boolean;
    canDeleteData: boolean;
    canExportExcel: boolean;
    canViewAI: boolean;
    canAccessDiagnostics: boolean;
  };
}

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'admin',
    name: 'Administrador Camposol',
    username: 'admin',
    email: 'administrador@camposol.com',
    password: 'admin',
    role: 'ADMIN',
    title: 'Administrador General',
    avatarColor: 'bg-emerald-600',
    description: 'Control y gestión total. Autorizado para crear usuarios, cargar nuevas jornadas, eliminar datos y configurar parámetros.',
    createdAt: '01/10/2026',
    permissions: {
      canUploadData: true,
      canDeleteData: true,
      canExportExcel: true,
      canViewAI: true,
      canAccessDiagnostics: true,
    },
  },
  {
    id: 'user',
    name: 'Usuario Consulta',
    username: 'usuario',
    email: 'consulta@camposol.com',
    password: 'user123',
    role: 'USER',
    title: 'Operador / Analista',
    avatarColor: 'bg-sky-600',
    description: 'Perfil de consulta y análisis. Visualiza dotación, evolución, CFCs, modelos IA y descarga reportes Excel en modo seguro.',
    createdAt: '01/10/2026',
    permissions: {
      canUploadData: false,
      canDeleteData: false,
      canExportExcel: true,
      canViewAI: true,
      canAccessDiagnostics: false,
    },
  },
];

export const APP_USERS = DEFAULT_USERS;

