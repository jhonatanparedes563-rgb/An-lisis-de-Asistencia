import React, { useState } from 'react';
import {
  Trash2,
  Download,
  Plus,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { DayAttendanceBatch, RawWorkerRow, AppUser } from '../types';
import * as XLSX from 'xlsx';

interface DatosViewProps {
  batches: DayAttendanceBatch[];
  rawRowsByDate: Record<string, RawWorkerRow[]>;
  onDeleteBatch: (date: string) => void;
  onClearAll: () => void;
  onOpenUpload: () => void;
  currentUser?: AppUser;
  onOpenUserModal?: () => void;
}

export const DatosView: React.FC<DatosViewProps> = ({
  batches,
  rawRowsByDate,
  onDeleteBatch,
  onClearAll,
  onOpenUpload,
  currentUser,
  onOpenUserModal,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    batches[0]?.date || ''
  );

  const isAdmin = currentUser ? currentUser.role === 'ADMIN' : true;
  const activeRows = rawRowsByDate[selectedDate] || [];

  const handleExportFullExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = batches.map((b) => ({
      'Fecha': b.formattedDate,
      'Día': b.dayName,
      'Archivo': b.fileName,
      'Personal': b.workersCount,
    }));
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Jornadas');

    const detailedData: any[] = [];
    batches.forEach((b) => {
      const rows = rawRowsByDate[b.date] || [];
      rows.forEach((r) => {
        detailedData.push({
          'Fecha': b.formattedDate,
          'Fila': r.originalRowNumber,
          'Trabajador': r.workerName,
          'DNI': r.dni || '-',
          ...(r.area ? { 'Área': r.area } : {}),
        });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');

    XLSX.writeFile(wb, `Consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="w-full px-4 sm:px-6 py-3.5 flex flex-col space-y-3 font-sans h-full">
      {/* Banner de Modo Consulta si no es Administrador */}
      {!isAdmin && (
        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Modo Consulta (Usuario):</strong> Las funciones de carga y eliminación de fechas están restringidas exclusivamente al perfil de Administrador.
            </span>
          </div>
          {onOpenUserModal && (
            <button
              onClick={onOpenUserModal}
              className="text-[11px] font-bold text-sky-700 underline hover:text-sky-900 shrink-0"
            >
              Cambiar a Admin
            </button>
          )}
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">
            Jornadas Cargadas
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            ({batches.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {isAdmin ? (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-semibold rounded-md shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cargar Día</span>
            </button>
          ) : (
            <button
              onClick={onOpenUserModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-md border border-slate-200 cursor-pointer"
              title="Solo Administrador"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Cargar (Solo Admin)</span>
            </button>
          )}

          <button
            onClick={handleExportFullExcel}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Todo</span>
          </button>

          {isAdmin && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-md border border-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Todo</span>
            </button>
          )}
        </div>
      </div>

      {/* Batches Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {batches.map((b) => (
          <div
            key={b.date}
            onClick={() => setSelectedDate(b.date)}
            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              selectedDate === b.date
                ? 'bg-emerald-50/50 border-emerald-500 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-bold text-slate-800">
                  {b.formattedDate}
                </span>
                <span className="text-xs text-slate-400 block font-mono">
                  {b.dayName}
                </span>
              </div>

              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBatch(b.date);
                  }}
                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                  title="Eliminar esta jornada"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="my-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Asistieron:</span>
              <strong className="text-lg font-bold text-emerald-600 font-mono">
                {b.workersCount.toLocaleString()}
              </strong>
            </div>

            <div className="text-[11px] text-slate-400 font-mono truncate">
              {b.fileName}
            </div>
          </div>
        ))}
      </div>

      {/* Inspection Table of Selected Day */}
      {selectedDate && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[300px]">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Registros del {batches.find((b) => b.date === selectedDate)?.formattedDate || selectedDate}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {activeRows.length.toLocaleString()} filas
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-320px)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Trabajador</th>
                  <th className="py-2 px-3">CFC</th>
                  <th className="py-2 px-3">DNI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeRows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">
                      {r.originalRowNumber}
                    </td>
                    <td className="py-1.5 px-3 font-medium text-slate-800">
                      {r.workerName}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        {r.cfc || r.area || 'Sin Asignar'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">
                      {r.dni || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
