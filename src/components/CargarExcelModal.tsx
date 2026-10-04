import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Layers,
  PlusCircle,
} from 'lucide-react';
import { DayAttendanceBatch, RawWorkerRow } from '../types';
import { parseExcelTareoFile } from '../utils/excelParser';
import { formatISODate } from '../utils/matrixAnalytics';

interface CargarExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchLoaded: (
    newBatches: DayAttendanceBatch[],
    rawRowsByDate: Record<string, RawWorkerRow[]>,
    mode: 'append' | 'replace'
  ) => void;
  existingDatesCount: number;
  isInitialScreen?: boolean;
}

export const CargarExcelModal: React.FC<CargarExcelModalProps> = ({
  isOpen,
  onClose,
  onBatchLoaded,
  existingDatesCount,
  isInitialScreen = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected date for files without explicit date columns
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [processedResult, setProcessedResult] = useState<{
    batches: DayAttendanceBatch[];
    rawRowsByDate: Record<string, RawWorkerRow[]>;
    totalWorkers: number;
    fileName: string;
  } | null>(null);

  if (!isOpen && !isInitialScreen) return null;

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setProcessedResult(null);

    try {
      const parsed = await parseExcelTareoFile(file, selectedDate);
      const batches: DayAttendanceBatch[] = [];
      let totalCount = 0;

      for (const [dateStr, rows] of Object.entries(parsed.rowsByDate)) {
        // Collect distinct workers for this date (1 worker = 1 count)
        const workerKeysSet = new Set<string>();

        rows.forEach((r) => {
          const keyId = r.dni ? r.dni.trim() : r.workerName.trim().toLowerCase();
          const encoded = `${keyId}||${r.workerName.trim()}||${r.area || ''}||${r.cfc || ''}`;
          workerKeysSet.add(encoded);
        });

        const uniqueKeys = Array.from(workerKeysSet);
        const { formatted, dayName } = formatISODate(dateStr);

        batches.push({
          date: dateStr,
          formattedDate: formatted,
          dayName,
          fileName: file.name,
          workersCount: uniqueKeys.length,
          workerKeys: uniqueKeys,
        });

        totalCount += uniqueKeys.length;
      }

      setProcessedResult({
        batches,
        rawRowsByDate: parsed.rowsByDate,
        totalWorkers: totalCount,
        fileName: file.name,
      });
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el archivo Excel. Verifica el formato.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = (mode: 'append' | 'replace') => {
    if (processedResult) {
      onBatchLoaded(processedResult.batches, processedResult.rawRowsByDate, mode);
      setProcessedResult(null);
      onClose();
    }
  };

  const containerContent = (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 font-sans">
      {/* Title */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            CARGA DE ASISTENCIA DIARIA
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sube el archivo de personal que laboró en la jornada.
          </p>
        </div>
        {!isInitialScreen && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Date selector if file has no dates */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#16A34A]" />
          <span className="text-slate-600 font-medium">Fecha de esta jornada:</span>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#22C55E]"
        />
      </div>

      {/* Processed Success State */}
      {processedResult ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>✓ Archivo leído correctamente</span>
            </div>

            <div className="divide-y divide-emerald-200/60 text-xs text-slate-700 pt-1 space-y-2">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Archivo:</span>
                <strong className="font-mono text-slate-800 text-right truncate max-w-[240px]">
                  {processedResult.fileName}
                </strong>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Personal trabajando:</span>
                <strong className="font-bold text-emerald-700 text-sm font-mono">
                  {processedResult.totalWorkers.toLocaleString()} personas
                </strong>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Fechas detectadas:</span>
                <strong className="font-bold text-slate-800">
                  {processedResult.batches.map((b) => b.formattedDate).join(', ')}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setProcessedResult(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-4 py-2"
            >
              Cambiar archivo
            </button>

            {existingDatesCount > 0 ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleConfirm('append')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-full text-xs font-bold shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Agregar a los días previos</span>
                </button>

                <button
                  onClick={() => handleConfirm('replace')}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-xs font-bold transition"
                  title="Reemplaza todos los días anteriores con este nuevo archivo"
                >
                  Reemplazar todo
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConfirm('replace')}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-full text-xs font-bold shadow-sm transition"
              >
                Procesar Asistencia
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Dropzone & File Picker */
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              isDragging
                ? 'border-[#22C55E] bg-emerald-50/60'
                : 'border-slate-300 bg-slate-50/50 hover:border-[#22C55E] hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-xs">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              {isLoading ? 'Leyendo asistencia...' : '📁 SELECCIONAR O ARRASTRAR EXCEL'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Sube el archivo Excel con las personas que están trabajando en el día.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-[11px] text-slate-400 text-center leading-relaxed">
            💡 Puedes subir hoy 800 personas, mañana 700 y pasado 900. El sistema comparará automáticamente entre fechas quién asistió y quién faltó.
          </div>
        </div>
      )}
    </div>
  );

  if (isInitialScreen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        {containerContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {containerContent}
    </div>
  );
};
