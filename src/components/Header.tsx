import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { ActiveTab, MatrixKPIs } from '../types';

interface HeaderProps {
  currentView: ActiveTab;
  onOpenUpload: () => void;
  kpis: MatrixKPIs;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenUpload,
  kpis,
}) => {
  const titles: Record<ActiveTab, string> = {
    resumen: 'Resumen',
    personal: 'Personal',
    cfc: 'Control por CFC',
    evolucion: 'Evolución',
    ai: 'Modelos de Inteligencia Artificial',
    datos: 'Archivos',
  };

  const title = titles[currentView] || 'Asistencia';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-5 py-2.5 font-sans">
      <div className="flex items-center justify-between gap-4">
        {/* Left: View Title & Clean Meta */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-800 tracking-tight">
            {title}
          </h1>

          {kpis.totalDaysLoaded > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>·</span>
              <span>{kpis.totalDaysLoaded} {kpis.totalDaysLoaded === 1 ? 'día' : 'días'}</span>
              <span>·</span>
              <span>{kpis.totalUniqueWorkers.toLocaleString()} personas</span>
            </div>
          )}
        </div>

        {/* Right side: Period date & Compact Upload Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {kpis.dateRange.start && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {kpis.dateRange.start}
                {kpis.dateRange.end && kpis.dateRange.end !== kpis.dateRange.start
                  ? ` – ${kpis.dateRange.end}`
                  : ''}
              </span>
            </div>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold rounded-md shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Día</span>
          </button>
        </div>
      </div>
    </header>
  );
};
