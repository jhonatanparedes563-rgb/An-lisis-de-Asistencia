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
  const [activeSubTab, setActiveSubTab] = useState<'FORECAST' | 'RISK_SCORING' | 'CLUSTERS' | 'GEMINI_REPORT'>('FORECAST');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICO' | 'MODERADO' | 'BAJO'>('CRITICO');
  const [searchRisk, setSearchRisk] = useState('');
  const [searchCfcForecast, setSearchCfcForecast] = useState('');
  const [cfcSortField, setCfcSortField] = useState<'predicted' | 'cfc' | 'delta' | 'rate'>('predicted');
  const [cfcSortAsc, setCfcSortAsc] = useState<boolean>(true); // Por defecto: de menor a mayor

  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  // 4. Stochastic Forecast adjusted with learned day-of-week seasonality
  const forecast = useMemo(() => {
    return computeStochasticForecast(
      workers,
      days,
      markov,
      learnedPatterns.nextDaySeasonalityMultiplier
    );
  }, [workers, days, markov, learnedPatterns.nextDaySeasonalityMultiplier]);

  // 5. CFC Forecasts adjusted with learned day-of-week seasonality
  const cfcForecasts = useMemo(() => {
    return computeCFCForecasts(
      cfcList,
      markov,
      learnedPatterns.nextDaySeasonalityMultiplier
    );
  }, [cfcList, markov, learnedPatterns.nextDaySeasonalityMultiplier]);

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
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Proyección Mañana
              </span>
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
                Rango de confianza
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
                Pérdida estimada
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
                      <th className="py-2 px-2 text-right">Asistencia Media</th>
                      <th className="py-2 px-2 text-right text-rose-800">Inasistencia</th>
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
