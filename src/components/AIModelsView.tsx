import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Sliders,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Cpu,
  Lightbulb,
  AlertTriangle,
  Play,
  Layers,
  ChevronRight,
  ChevronDown,
  Compass,
} from 'lucide-react';
import {
  CFCAttendanceSummary,
  DayEvolutionStat,
  WorkerAttendanceSummary,
} from '../types';
import {
  computeMarkovTransitionMatrix,
  computeWorkerRiskPredictions,
  computeStochasticForecast,
  computeCFCForecasts,
  learnBehavioralPatterns,
  getWeeklyCycleKnowledgeBase,
  simulateDayCognitiveForecast,
} from '../utils/aiPredictiveModel';
import * as XLSX from 'xlsx';

interface AIModelsViewProps {
  workers: WorkerAttendanceSummary[];
  days: DayEvolutionStat[];
  cfcList: CFCAttendanceSummary[];
  onSelectWorker: (worker: WorkerAttendanceSummary) => void;
}

export const AIModelsView: React.FC<AIModelsViewProps> = ({
  workers,
  days,
  cfcList,
  onSelectWorker,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'FORECAST' | 'COGNITIVE_ENGINE' | 'RISK_SCORING' | 'CLUSTERS' | 'GEMINI_REPORT'
  >('FORECAST');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICO' | 'MODERADO' | 'BAJO'>('CRITICO');
  const [searchRisk, setSearchRisk] = useState('');
  const [searchCfcForecast, setSearchCfcForecast] = useState('');
  const [cfcSortField, setCfcSortField] = useState<'predicted' | 'cfc' | 'delta' | 'rate'>('predicted');
  const [cfcSortAsc, setCfcSortAsc] = useState<boolean>(true); // Por defecto: de menor a mayor
  const [showBusinessPatterns, setShowBusinessPatterns] = useState<boolean>(false); // Oculto por defecto a petición del usuario

  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Simulation target date for Cognitive Engine
  const [simulatedDate, setSimulatedDate] = useState<string>('2026-10-05');

  // 1. Markov Transitions
  const markov = useMemo(() => {
    return computeMarkovTransitionMatrix(workers, days);
  }, [workers, days]);

  // 2. Behavioral Patterns Engine (Day-to-Day and Week-to-Week Learning)
  const learnedPatterns = useMemo(() => {
    return learnBehavioralPatterns(days, workers.length);
  }, [days, workers.length]);

  // 3. Risk Predictions & Clusters
  const { predictions, clusterStats, highRiskCount } = useMemo(() => {
    return computeWorkerRiskPredictions(workers, cfcList, markov);
  }, [workers, cfcList, markov]);

  // 4. Stochastic Forecast adjusted with real-data domain logic
  const forecast = useMemo(() => {
    return computeStochasticForecast(
      workers,
      days,
      markov,
      learnedPatterns.nextDaySeasonalityMultiplier,
      learnedPatterns.nextDayOfWeekName,
      learnedPatterns.paydayCycle.isNextDayPostPaydaySaturday
    );
  }, [
    workers,
    days,
    markov,
    learnedPatterns.nextDaySeasonalityMultiplier,
    learnedPatterns.nextDayOfWeekName,
    learnedPatterns.paydayCycle.isNextDayPostPaydaySaturday,
  ]);

  // 5. CFC Forecasts adjusted with real-data domain logic
  const cfcForecasts = useMemo(() => {
    return computeCFCForecasts(
      cfcList,
      markov,
      learnedPatterns.nextDaySeasonalityMultiplier,
      learnedPatterns.nextDayOfWeekName,
      learnedPatterns.paydayCycle.isNextDayPostPaydaySaturday
    );
  }, [
    cfcList,
    markov,
    learnedPatterns.nextDaySeasonalityMultiplier,
    learnedPatterns.nextDayOfWeekName,
    learnedPatterns.paydayCycle.isNextDayPostPaydaySaturday,
  ]);

  // 6. Cognitive Thinking Engine Simulation
  const cognitiveTrace = useMemo(() => {
    return simulateDayCognitiveForecast(simulatedDate, workers, days, markov);
  }, [simulatedDate, workers, days, markov]);

  const weeklyKnowledge = useMemo(() => {
    return getWeeklyCycleKnowledgeBase();
  }, []);

  const filteredCfcForecasts = useMemo(() => {
    let list = cfcForecasts;
    if (searchCfcForecast.trim()) {
      const q = searchCfcForecast.toLowerCase().trim();
      list = list.filter((c) => c.cfcName.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let comp = 0;
      if (cfcSortField === 'predicted') {
        comp = a.predictedAttendance - b.predictedAttendance;
      } else if (cfcSortField === 'cfc') {
        comp = a.cfcName.localeCompare(b.cfcName, undefined, { numeric: true });
      } else if (cfcSortField === 'delta') {
        comp = a.expectedDelta - b.expectedDelta;
      } else if (cfcSortField === 'rate') {
        comp = a.expectedRate - b.expectedRate;
      }
      return cfcSortAsc ? comp : -comp;
    });
  }, [cfcForecasts, searchCfcForecast, cfcSortField, cfcSortAsc]);

  const handleToggleCfcSort = (field: 'predicted' | 'cfc' | 'delta' | 'rate') => {
    if (cfcSortField === field) {
      setCfcSortAsc(!cfcSortAsc);
    } else {
      setCfcSortField(field);
      setCfcSortAsc(true); // de menor a mayor por defecto
    }
  };

  // Filtered Risk Table
  const filteredPredictions = useMemo(() => {
    let list = predictions;

    if (riskFilter !== 'ALL') {
      list = list.filter((p) => p.riskLevel === riskFilter);
    }

    if (searchRisk.trim()) {
      const q = searchRisk.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.dni.includes(q));
    }

    return list.sort((a, b) => b.riskScore - a.riskScore);
  }, [predictions, riskFilter, searchRisk]);

  const handleExportRiskExcel = () => {
    const data = filteredPredictions.map((p, i) => ({
      '#': i + 1,
      'Trabajador': p.name,
      'DNI': p.dni || '-',
      'CFC': p.cfc || '-',
      'Score (%)': p.riskScore,
      'Nivel': p.riskLevel,
      'Cluster': p.cluster,
      'Causa': p.primaryFactor,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riesgo_IA');
    XLSX.writeFile(wb, `Riesgo_IA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleGenerateGeminiReport = async () => {
    setIsGeneratingAi(true);
    setAiError(null);

    const contextPayload = {
      universoTotal: workers.length,
      jornadasCargadas: days.map((d) => ({
        fecha: d.formattedDate,
        asistieron: d.workersWorkingCount,
        faltaron: d.absentCount,
      })),
      matrizMarkov: {
        retencionAA: `${(markov.p_attend_attend * 100).toFixed(1)}%`,
        fugaAF: `${(markov.p_absent_attend * 100).toFixed(1)}%`,
        retornoFA: `${(markov.p_attend_absent * 100).toFixed(1)}%`,
        inerciaFF: `${(markov.p_absent_absent * 100).toFixed(1)}%`,
      },
      forecast: {
        proyeccionManana: forecast.nextDayPredictedAttendance,
        ic95: forecast.confidenceInterval95,
      },
      riesgoCritico: highRiskCount,
      clusters: {
        nucleoFiel: clusterStats.nucleoFielCount,
        intermitente: clusterStats.intermitenteCount,
        desercion: clusterStats.desercionTempranaCount,
      },
    };

    try {
      const res = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Genera un dictamen conciso, ejecutivo y técnico de maestría en IA. Sin introducciones largas ni relleno.
Estructura:
1. DIAGNÓSTICO MARKOV (Retención vs Fuga)
2. PROYECCIÓN DOTACIÓN (Estimado e IC 95%)
3. GRUPOS EN RIESGO Y DESERCIÓN
4. 3 ACCIONES PREVENTIVAS CONCRETAS`,
          summaryContext: JSON.stringify(contextPayload, null, 2),
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setAiReport(data.answer);
      } else {
        setAiReport(
          `### DIAGNÓSTICO OPERATIVO IA\n\n` +
          `• Retención $P(A|A)$: **${(markov.p_attend_attend * 100).toFixed(1)}%**\n` +
          `• Fuga diaria $P(F|A)$: **${(markov.p_absent_attend * 100).toFixed(1)}%**\n` +
          `• Proyección dotación: **${forecast.nextDayPredictedAttendance.toLocaleString()}** (IC: ${forecast.confidenceInterval95[0]}–${forecast.confidenceInterval95[1]})\n` +
          `• Población en riesgo crítico: **${highRiskCount} personas**`
        );
      }
    } catch (err: any) {
      setAiError(err.message || 'Error al conectar con el motor IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-3.5 flex flex-col space-y-3 font-sans h-full">
      {/* Header & Sub-tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">
              Modelos IA
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              · Markov & Forecast
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('FORECAST')}
              className={`px-3 py-1 rounded-md transition ${
                activeSubTab === 'FORECAST'
                  ? 'bg-white text-slate-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Forecast
            </button>
            <button
              onClick={() => setActiveSubTab('COGNITIVE_ENGINE')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                activeSubTab === 'COGNITIVE_ENGINE'
                  ? 'bg-slate-800 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Simulador</span>
            </button>
            <button
              onClick={() => setActiveSubTab('RISK_SCORING')}
              className={`px-3 py-1 rounded-md transition ${
                activeSubTab === 'RISK_SCORING'
                  ? 'bg-white text-slate-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Riesgo ({highRiskCount})
            </button>
            <button
              onClick={() => setActiveSubTab('CLUSTERS')}
              className={`px-3 py-1 rounded-md transition ${
                activeSubTab === 'CLUSTERS'
                  ? 'bg-white text-slate-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Clusters
            </button>
            <button
              onClick={() => setActiveSubTab('GEMINI_REPORT')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                activeSubTab === 'GEMINI_REPORT'
                  ? 'bg-slate-800 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Diagnóstico</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: FORECAST & MARKOV */}
      {activeSubTab === 'FORECAST' && (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Proyección {learnedPatterns.nextDayOfWeekName}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
                {forecast.nextDayPredictedAttendance.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {forecast.retentionRateForecast}% retención esperada
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Intervalo 95%
              </span>
              <div className="text-xl font-bold text-slate-800 font-mono mt-0.5">
                [{forecast.confidenceInterval95[0]} – {forecast.confidenceInterval95[1]}]
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                Rango estocástico
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Inasistencias Previstas
              </span>
              <div className="text-2xl font-bold text-rose-600 font-mono mt-0.5">
                {forecast.expectedAbsences.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                Pérdida esperada
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Escenarios
              </span>
              <div className="text-xs font-mono font-semibold text-slate-700 mt-1 space-y-0.5">
                <div className="text-emerald-600">▲ Optimista: {forecast.optimisticScenario}</div>
                <div className="text-rose-500">▼ Pesimista: {forecast.pessimisticScenario}</div>
              </div>
            </div>
          </div>

          {/* Cuadro Desplegable: Ajuste Predictivo y Patrones de Negocio (Oculto por defecto para vista limpia) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => setShowBusinessPatterns((prev) => !prev)}
              className="w-full px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-700">
                  Ajuste Predictivo y Patrones de Negocio ({learnedPatterns.nextDayOfWeekName})
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  · Multiplicador: {(learnedPatterns.nextDaySeasonalityMultiplier * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="text-[11px]">
                  {showBusinessPatterns ? 'Ocultar detalles' : 'Click para ver patrones'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showBusinessPatterns ? 'rotate-180 text-slate-800' : 'text-slate-400'
                  }`}
                />
              </div>
            </button>

            {/* Contenido desplegable con un click */}
            {showBusinessPatterns && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
                {/* Banner de Ajuste Predictivo */}
                <div className="p-3 rounded-lg bg-white border border-emerald-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-600 text-white">
                      <Brain className="w-3 h-3" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Ajuste Predictivo Aplicado ({learnedPatterns.nextDayOfWeekName})
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {learnedPatterns.appliedAdjustmentReason}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 border border-emerald-300 text-emerald-800">
                    Multiplicador IA: {(learnedPatterns.nextDaySeasonalityMultiplier * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Patrones de Negocio Aprendidos (Quincena & Dinámica Lunes-Martes) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Patrón 1: Ciclo de Cobro de Quincena */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <h3 className="text-xs font-bold text-slate-800">
                          Patrón de Quincena (Viernes de Pago → Sábado a la Baja)
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        Cada 14 días
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      Base aprendida: <strong>Viernes 02/10/2026 (Semana 40)</strong>. El personal cobra quincena y el sábado inmediatamente posterior experimenta baja por cobro salarial.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Próximo Cobro:</span>
                        <div className="font-mono font-bold text-slate-800 text-[11px] mt-0.5">
                          Viernes {learnedPatterns.paydayCycle.nextPaydayFormatted || '16/10/2026'}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">Asistencia firme</span>
                      </div>

                      <div className="p-2 rounded bg-rose-50/60 border border-rose-100">
                        <span className="text-[10px] text-rose-500 uppercase font-semibold">Sábado Pos-Quincena:</span>
                        <div className="font-mono font-bold text-rose-700 text-[11px] mt-0.5">
                          Sábado {learnedPatterns.paydayCycle.nextPostPaydayFormatted || '17/10/2026'}
                        </div>
                        <span className="text-[10px] text-rose-600 font-medium">Contracción (~-12%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Patrón 2: Dinámica Semanal (Lunes a la Baja vs Martes al Alza) */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                        <h3 className="text-xs font-bold text-slate-800">
                          Dinámica Semanal (Lunes a la Baja → Martes al Alza)
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-bold border border-sky-200">
                        Repunte Martes
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      Lunes registra ausentismo por inicio de semana ("San Lunes"), mientras que el martes produce marcado repunte y estabilización.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-amber-50/60 border border-amber-100">
                        <span className="text-[10px] text-amber-700 font-semibold uppercase">Lunes (Baja):</span>
                        <div className="font-mono font-bold text-amber-900 text-[11px] mt-0.5">
                          {learnedPatterns.weeklyDynamics.mondayAvgAttendance}% (~{learnedPatterns.weeklyDynamics.mondayWorkingCount.toLocaleString()} pers.)
                        </div>
                      </div>

                      <div className="p-2 rounded bg-emerald-50/60 border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 font-semibold uppercase">Martes (Repunte):</span>
                        <div className="font-mono font-bold text-emerald-900 text-[11px] mt-0.5">
                          {learnedPatterns.weeklyDynamics.tuesdayAvgAttendance}% (~{learnedPatterns.weeklyDynamics.tuesdayWorkingCount.toLocaleString()} pers.)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clean Markov Matrix & Forecast History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Markov Matrix */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">
                  Matriz de Transición de Markov
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {markov.totalTransitionsEvaluated.toLocaleString()} transiciones
                </span>
              </div>

              <div className="overflow-x-auto rounded border border-slate-100 text-xs">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3 text-left">Estado Actual</th>
                      <th className="py-2 px-3 text-emerald-800">→ Asistirá</th>
                      <th className="py-2 px-3 text-rose-800">→ Faltará</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2 px-3 text-left font-semibold text-slate-700">Asistió Hoy</td>
                      <td className="py-2 px-3 font-bold text-emerald-600">
                        {(markov.p_attend_attend * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 font-bold text-rose-600">
                        {(markov.p_absent_attend * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-left font-semibold text-slate-700">Faltó Hoy</td>
                      <td className="py-2 px-3 font-bold text-emerald-600">
                        {(markov.p_attend_absent * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 font-bold text-rose-600">
                        {(markov.p_absent_absent * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historical Series vs Projection */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">
                  Histórico vs Proyección
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {days.length} jornadas
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {days.map((d) => (
                  <div key={d.date} className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                    <span className="font-medium text-slate-700">
                      {d.formattedDate} <span className="text-slate-400 text-[10px]">({d.dayName})</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {d.workersWorkingCount.toLocaleString()} <span className="text-slate-400 text-[10px]">({d.attendanceRate.toFixed(1)}%)</span>
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 border border-emerald-200 font-semibold">
                  <span className="text-emerald-800">
                    Proyección Mañana
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {forecast.nextDayPredictedAttendance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Patrones Aprendidos: Día a Día y Semana a Semana */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Patrón por Día de la Semana */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">
                  Patrón por Día de la Semana
                </h3>
                {learnedPatterns.worstDayOfWeek && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                    Más faltas: {learnedPatterns.worstDayOfWeek.dayName} ({learnedPatterns.worstDayOfWeek.avgAbsenceRate}%)
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded border border-slate-100 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Día</th>
                      <th className="py-2 px-2 text-center">Jornadas</th>
                      <th className="py-2 px-2 text-right" title="Asistencia sobre dotación programada (descontando DT)">
                        Asist. Media
                      </th>
                      <th className="py-2 px-2 text-right text-rose-800" title="Inasistencias reales (no incluye descansos DT)">
                        Faltas Reales
                      </th>
                      <th className="py-2 px-2 text-right text-sky-800" title="Personal en descanso programado por la empresa (DT)">
                        En DT
                      </th>
                      <th className="py-2 px-3 text-center">Nivel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {learnedPatterns.dayOfWeekPatterns.map((p) => (
                      <tr key={p.dayName} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-3 font-medium text-slate-800 font-sans">
                          {p.dayName}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-500">
                          {p.occurrences}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-700">
                          {p.avgAttendanceRate}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-rose-600">
                          {p.avgAbsenceRate}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-sky-700">
                          {p.avgDtCount && p.avgDtCount > 0 ? (
                            <span>{p.avgDtCount.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              p.riskClassification === 'CRITICO'
                                ? 'bg-rose-50 text-rose-700'
                                : p.riskClassification === 'MODERADO'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {p.riskClassification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                * Los descansos otorgados por la empresa (DT) se descuentan de la dotación programada y no se contabilizan como faltas.
              </p>
            </div>

            {/* Comportamiento Semana a Semana */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">
                  Comportamiento Semana a Semana
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {learnedPatterns.weeklyPatterns.length} semana(s) analizadas
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {learnedPatterns.weeklyPatterns.map((w) => (
                  <div key={w.weekKey} className="flex items-center justify-between p-2 rounded bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-800">{w.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">
                        ({w.daysCount} días)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-600">
                        {w.avgWorkingDaily.toLocaleString()} pers/día
                      </span>
                      <span className="font-bold text-emerald-600">
                        {w.avgAttendanceRate}%
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-mono flex items-center justify-between mt-2">
                  <span>Próximo día proyectado: <strong>{learnedPatterns.nextDayOfWeekName}</strong></span>
                  <span className="font-bold text-emerald-700">Factor estacional: {learnedPatterns.nextDaySeasonalityMultiplier}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Proyección por CFC */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col min-h-[300px]">
            <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">
                  Proyección por CFC
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  ({cfcForecasts.length} centros)
                </span>
              </div>

              <div className="relative flex-1 min-w-[150px] max-w-xs">
                <input
                  type="text"
                  value={searchCfcForecast}
                  onChange={(e) => setSearchCfcForecast(e.target.value)}
                  placeholder="Buscar CFC..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md pl-7 pr-3 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[360px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th
                      onClick={() => handleToggleCfcSort('cfc')}
                      className="py-2.5 px-3.5 min-w-[170px] cursor-pointer hover:bg-sky-200/60 transition select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>CFC</span>
                        {cfcSortField === 'cfc' ? (
                          cfcSortAsc ? <ArrowUp className="w-3 h-3 text-sky-800" /> : <ArrowDown className="w-3 h-3 text-sky-800" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-sky-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    {days.map((d) => (
                      <th key={d.date} className="py-2.5 px-2.5 text-center min-w-[85px]">
                        <div>{d.formattedDate}</div>
                        <div className="text-[10px] text-sky-800 font-normal">{d.dayName.slice(0, 3)}</div>
                      </th>
                    ))}
                    <th
                      onClick={() => handleToggleCfcSort('predicted')}
                      className="py-2.5 px-2.5 text-center min-w-[95px] bg-emerald-100/70 text-emerald-950 font-bold border-l border-r border-emerald-200 cursor-pointer hover:bg-emerald-200/80 transition select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Proyectado</span>
                        {cfcSortField === 'predicted' ? (
                          cfcSortAsc ? <ArrowUp className="w-3 h-3 text-emerald-900" /> : <ArrowDown className="w-3 h-3 text-emerald-900" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-emerald-600 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCfcSort('delta')}
                      className="py-2.5 px-2.5 text-center min-w-[70px] cursor-pointer hover:bg-sky-200/60 transition select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Variación</span>
                        {cfcSortField === 'delta' ? (
                          cfcSortAsc ? <ArrowUp className="w-3 h-3 text-sky-800" /> : <ArrowDown className="w-3 h-3 text-sky-800" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-sky-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCfcSort('rate')}
                      className="py-2.5 px-3 text-right min-w-[80px] cursor-pointer hover:bg-sky-200/60 transition select-none"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>% Proyectado</span>
                        {cfcSortField === 'rate' ? (
                          cfcSortAsc ? <ArrowUp className="w-3 h-3 text-sky-800" /> : <ArrowDown className="w-3 h-3 text-sky-800" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-sky-400 opacity-60" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredCfcForecasts.length === 0 ? (
                    <tr>
                      <td colSpan={4 + days.length} className="py-8 text-center text-slate-400 text-xs">
                        Sin CFCs encontrados.
                      </td>
                    </tr>
                  ) : (
                    filteredCfcForecasts.map((c) => (
                      <tr key={c.cfcName} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 font-medium text-slate-800 truncate max-w-[200px]" title={c.cfcName}>
                          {c.cfcName}
                        </td>

                        {/* Asistencia día a día */}
                        {days.map((d) => {
                          const h = c.history.find((item) => item.date === d.date);
                          const isDT = !h || (h as any).isDT || h.presentCount === 0;

                          return (
                            <td key={d.date} className="py-2 px-2.5 text-center font-mono">
                              {isDT ? (
                                <span
                                  className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                                  title="Día de Turno / Descanso programado (DT). El proyectado tomó personal de un día activo."
                                >
                                  DT
                                </span>
                              ) : (
                                <span className="text-slate-700 font-semibold text-xs">
                                  {h.presentCount.toLocaleString()}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Proyectado día siguiente */}
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50 border-l border-r border-emerald-100">
                          {c.predictedAttendance.toLocaleString()}
                        </td>

                        {/* Variación */}
                        <td className="py-2 px-2.5 text-center font-mono font-semibold text-xs">
                          {c.expectedDelta > 0 ? (
                            <span className="text-emerald-600 font-bold">+{c.expectedDelta}</span>
                          ) : c.expectedDelta < 0 ? (
                            <span className="text-rose-500 font-bold">{c.expectedDelta}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* % Proyectado */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {c.expectedRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PENSAR Y FUNCIONAR (COGNITIVE ENGINE & SIMULATOR) - MINIMALISTA */}
      {activeSubTab === 'COGNITIVE_ENGINE' && (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {/* 1. Ciclo Semanal Aprendido de los Datos (Tira Limpia Compacta) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800">Ciclo Semanal Aprendido de los Datos</span>
                <span className="text-[11px] text-slate-400">· Dinámica Operativa</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Lun baja · Mar sube · Mié mantiene · Jue rotación · Vie baja · Sáb baja
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {learnedPatterns.weeklyCycleAnalysis.map((c) => (
                <div
                  key={c.dayName}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">{c.dayName}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        c.trendType === 'SUBE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.trendType === 'MANTIENE'
                          ? 'bg-sky-100 text-sky-700'
                          : c.trendType === 'VIENEN_Y_VAN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {c.trendType === 'SUBE'
                        ? 'Sube'
                        : c.trendType === 'MANTIENE'
                        ? 'Mantiene'
                        : c.trendType === 'VIENEN_Y_VAN'
                        ? 'Rotación'
                        : 'Baja'}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-bold font-mono text-slate-800">
                      {c.hasLoadedData ? `${c.empiricalAttendanceRate}%` : '—'}
                    </span>
                    {c.hasLoadedData && (
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          c.empiricalDeltaVsPrevWorkingDay > 0
                            ? 'text-emerald-600'
                            : c.empiricalDeltaVsPrevWorkingDay < 0
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {c.empiricalDeltaVsPrevWorkingDay > 0
                          ? `+${c.empiricalDeltaVsPrevWorkingDay}%`
                          : c.empiricalDeltaVsPrevWorkingDay !== 0
                          ? `${c.empiricalDeltaVsPrevWorkingDay}%`
                          : '0%'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Simulador de Inferencia Limpio */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Simular Fecha:</span>
                <input
                  type="date"
                  value={simulatedDate}
                  onChange={(e) => setSimulatedDate(e.target.value)}
                  className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setSimulatedDate(learnedPatterns.nextDayDateStr || '2026-10-05')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === (learnedPatterns.nextDayDateStr || '2026-10-05')
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Próxima ({learnedPatterns.nextDayOfWeekName})
                </button>
                <button
                  onClick={() => setSimulatedDate('2026-10-05')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === '2026-10-05'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lun 05
                </button>
                <button
                  onClick={() => setSimulatedDate('2026-10-06')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === '2026-10-06'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mar 06
                </button>
                <button
                  onClick={() => setSimulatedDate('2026-10-07')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === '2026-10-07'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mié 07
                </button>
                <button
                  onClick={() => setSimulatedDate('2026-10-08')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === '2026-10-08'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Jue 08
                </button>
                <button
                  onClick={() => setSimulatedDate('2026-10-16')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === '2026-10-16'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vie 16 (Pago)
                </button>
                <button
                  onClick={() => setSimulatedDate('2026-10-17')}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    simulatedDate === '2026-10-17'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sáb 17 (Pos-Pago)
                </button>
              </div>
            </div>

            {/* 4 KPIs Limpios */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Asistencia Prevista</span>
                <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
                  {cognitiveTrace.pointForecast.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {cognitiveTrace.expectedRate}% cumplimiento
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Inasistencias Esperadas</span>
                <div className="text-xl font-bold font-mono text-slate-700 mt-0.5">
                  {cognitiveTrace.expectedAbsences.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Rango: [{cognitiveTrace.confidenceInterval[0]} – {cognitiveTrace.confidenceInterval[1]}]
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Comportamiento del Día</span>
                <div className="text-sm font-bold text-slate-800 mt-1 truncate">
                  {cognitiveTrace.targetDayOfWeek}
                </div>
                <span className="text-[11px] text-slate-500 font-mono truncate block">
                  {cognitiveTrace.verdictSummary}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Nivel de Riesgo</span>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      cognitiveTrace.riskAssessment === 'CRITICO'
                        ? 'bg-rose-100 text-rose-800'
                        : cognitiveTrace.riskAssessment === 'MODERADO'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {cognitiveTrace.riskAssessment}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                  {cognitiveTrace.isPostPaydaySaturday ? 'Impacto por cobro' : 'Jornada regular'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Lógica de Inferencia & Directivas (Conciso y Ejecutivo) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-800">
                Lógica de Inferencia: {cognitiveTrace.targetDayOfWeek} {cognitiveTrace.targetFormatted}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Factor: {(cognitiveTrace.appliedMultiplier * 100).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-1.5 text-slate-600">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">1.</span>
                <span className="text-slate-700 leading-snug">
                  <strong>Calendario:</strong> {cognitiveTrace.steps[0].description}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">2.</span>
                <span className="text-slate-700 leading-snug">
                  <strong>Filtro DT:</strong> Descansos programados turnados de cuadrilla excluidos (sin penalización errónea).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">3.</span>
                <span className="text-slate-700 leading-snug">
                  <strong>Inercia:</strong> Retención histórica de cuadrillas calculada sobre el universo convocado.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">4.</span>
                <span className="text-slate-700 leading-snug">
                  <strong>Ajuste Operacional:</strong> {cognitiveTrace.verdictSummary}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-400 text-[11px] shrink-0">5.</span>
                <span className="text-slate-700 leading-snug">
                  <strong>Directiva de Campo:</strong> {cognitiveTrace.operationalActionPlan[0] || 'Monitoreo habitual de cuadrillas.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RISK SCORING */}
      {activeSubTab === 'RISK_SCORING' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[380px]">
          {/* Controls */}
          <div className="p-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <input
                type="text"
                value={searchRisk}
                onChange={(e) => setSearchRisk(e.target.value)}
                placeholder="Buscar trabajador o DNI..."
                className="w-full bg-slate-50 border border-slate-200 rounded-md pl-7 pr-3 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setRiskFilter('CRITICO')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  riskFilter === 'CRITICO' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Crítico ({highRiskCount})
              </button>
              <button
                onClick={() => setRiskFilter('MODERADO')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  riskFilter === 'MODERADO' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Moderado
              </button>
              <button
                onClick={() => setRiskFilter('BAJO')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  riskFilter === 'BAJO' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Bajo
              </button>
              <button
                onClick={() => setRiskFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  riskFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>

              <button
                onClick={handleExportRiskExcel}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-semibold transition ml-1"
              >
                <Download className="w-3 h-3" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Clean Risk Table */}
          <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-250px)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2 px-3">Trabajador</th>
                  <th className="py-2 px-2">DNI</th>
                  <th className="py-2 px-2">CFC</th>
                  <th className="py-2 px-2 text-right">Score</th>
                  <th className="py-2 px-2 text-center">Nivel</th>
                  <th className="py-2 px-3">Causa Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Sin registros en este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredPredictions.slice(0, 100).map((p) => (
                    <tr key={p.workerKey} className="hover:bg-slate-50 transition">
                      <td className="py-1.5 px-3 font-medium text-slate-800">{p.name}</td>
                      <td className="py-1.5 px-2 text-slate-400 font-mono text-[11px]">{p.dni || '-'}</td>
                      <td className="py-1.5 px-2 text-slate-500 font-mono text-xs">{p.cfc || '-'}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">
                        <span
                          className={
                            p.riskScore >= 60
                              ? 'text-rose-600'
                              : p.riskScore >= 30
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {p.riskScore}%
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span
                          className={`text-[10px] font-bold ${
                            p.riskLevel === 'CRITICO'
                              ? 'text-rose-600'
                              : p.riskLevel === 'MODERADO'
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {p.riskLevel}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-400 text-[11px] truncate max-w-[260px]">
                        {p.primaryFactor}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLUSTERS */}
      {activeSubTab === 'CLUSTERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Núcleo Fiel</span>
              <span className="text-xs font-mono font-bold text-emerald-600">{clusterStats.nucleoFielPct}%</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 font-mono">
              {clusterStats.nucleoFielCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Asistencia 100% constante
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Intermitente</span>
              <span className="text-xs font-mono font-bold text-amber-600">{clusterStats.intermitentePct}%</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 font-mono">
              {clusterStats.intermitenteCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Faltas alternadas entre fechas
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Deserción</span>
              <span className="text-xs font-mono font-bold text-rose-600">{clusterStats.desercionTempranaPct}%</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 font-mono">
              {clusterStats.desercionTempranaCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Inasistencias finales consecutivas
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GEMINI REPORT */}
      {activeSubTab === 'GEMINI_REPORT' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">
              Diagnóstico Ejecutivo Gemini
            </h3>

            <button
              onClick={handleGenerateGeminiReport}
              disabled={isGeneratingAi}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold shadow-2xs transition disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>{aiReport ? 'Actualizar' : 'Generar'}</span>
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {aiError}
            </div>
          )}

          {!aiReport && !isGeneratingAi && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Haz clic en Generar para obtener el diagnóstico sintético de asistencia.
            </div>
          )}

          {aiReport && (
            <div className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 p-3.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
              {aiReport}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
