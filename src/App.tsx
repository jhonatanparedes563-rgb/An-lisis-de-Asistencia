import React, { useState, useEffect, useMemo } from 'react';
import {
  ActiveTab,
  DayAttendanceBatch,
  RawWorkerRow,
  WorkerAttendanceSummary,
} from './types';
import {
  computeAttendanceMatrix,
  computeCFCAttendanceMatrix,
} from './utils/matrixAnalytics';
import {
  clearAllBatches,
  loadBatchesFromStorage,
  saveBatchesToStorage,
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ResumenView } from './components/ResumenView';
import { PersonalView } from './components/PersonalView';
import { CFCView } from './components/CFCView';
import { EvolucionView } from './components/EvolucionView';
import { DatosView } from './components/DatosView';
import { AIModelsView } from './components/AIModelsView';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { CargarExcelModal } from './components/CargarExcelModal';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import {
  extractAvailableWeeks,
  filterAttendanceData,
  GlobalFilterState,
} from './utils/filterUtils';
import * as XLSX from 'xlsx';

export function App() {
  const [batches, setBatches] = useState<DayAttendanceBatch[]>([]);
  const [rawRowsByDate, setRawRowsByDate] = useState<Record<string, RawWorkerRow[]>>({});
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const [selectedWorker, setSelectedWorker] = useState<WorkerAttendanceSummary | null>(null);
  const [selectedGroupColumn, setSelectedGroupColumn] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  // Global Attendance Filters (Día, Semana, Estado)
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterState>({
    week: 'all',
    date: 'all',
    status: 'all',
  });

  // Load previously saved batches from IndexedDB
  useEffect(() => {
    loadBatchesFromStorage().then(({ batches: storedBatches, rawRowsByDate: storedRows }) => {
      if (storedBatches && storedBatches.length > 0) {
        setBatches(storedBatches);
        setRawRowsByDate(storedRows || {});
      }
      setIsLoadedFromStorage(true);
    });
  }, []);

  // Compute Cross-Date Attendance Matrix (Deterministic Math, Rule #19)
  const { workers, daysEvolution, kpis } = useMemo(() => {
    return computeAttendanceMatrix(batches, rawRowsByDate);
  }, [batches, rawRowsByDate]);

  // Compute CFC-Level Matrix
  const { cfcList, bestCfc, worstCfc, totalCfcs, availableColumns } = useMemo(() => {
    return computeCFCAttendanceMatrix(workers, daysEvolution, rawRowsByDate, selectedGroupColumn);
  }, [workers, daysEvolution, rawRowsByDate, selectedGroupColumn]);

  // Extract available weeks
  const availableWeeks = useMemo(() => {
    return extractAvailableWeeks(daysEvolution);
  }, [daysEvolution]);

  // Filter attendance data across all modules
  const {
    filteredWorkers,
    filteredDays,
    filteredCfcList,
    filteredKpis,
    isFilterActive,
  } = useMemo(() => {
    return filterAttendanceData(
      workers,
      daysEvolution,
      cfcList,
      globalFilter,
      availableWeeks
    );
  }, [workers, daysEvolution, cfcList, globalFilter, availableWeeks]);

  const filteredBestCfc = useMemo(() => {
    if (filteredCfcList.length === 0) return null;
    return [...filteredCfcList].sort((a, b) => b.attendanceRate - a.attendanceRate)[0] || null;
  }, [filteredCfcList]);

  const filteredWorstCfc = useMemo(() => {
    if (filteredCfcList.length === 0) return null;
    return [...filteredCfcList].sort((a, b) => a.attendanceRate - b.attendanceRate)[0] || null;
  }, [filteredCfcList]);

  const handleResetFilters = () => {
    setGlobalFilter({
      week: 'all',
      date: 'all',
      status: 'all',
    });
  };

  // Handle Loading new file(s)
  const handleBatchLoaded = (
    newBatches: DayAttendanceBatch[],
    newRawRows: Record<string, RawWorkerRow[]>,
    mode: 'append' | 'replace'
  ) => {
    let updatedBatches: DayAttendanceBatch[] = [];
    let updatedRawRows: Record<string, RawWorkerRow[]> = {};

    if (mode === 'append') {
      // Merge: replace any batch with matching date, append new ones
      const map = new Map<string, DayAttendanceBatch>();
      batches.forEach((b) => map.set(b.date, b));
      newBatches.forEach((b) => map.set(b.date, b));
      updatedBatches = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

      updatedRawRows = { ...rawRowsByDate, ...newRawRows };
    } else {
      updatedBatches = [...newBatches].sort((a, b) => a.date.localeCompare(b.date));
      updatedRawRows = newRawRows;
    }

    setBatches(updatedBatches);
    setRawRowsByDate(updatedRawRows);
    setActiveTab('resumen');
    saveBatchesToStorage(updatedBatches, updatedRawRows);
  };

  // Delete a specific day batch
  const handleDeleteBatch = (dateToDelete: string) => {
    const updatedBatches = batches.filter((b) => b.date !== dateToDelete);
    const updatedRawRows = { ...rawRowsByDate };
    delete updatedRawRows[dateToDelete];

    setBatches(updatedBatches);
    setRawRowsByDate(updatedRawRows);
    saveBatchesToStorage(updatedBatches, updatedRawRows);
  };

  // Clear all data
  const handleClearAll = async () => {
    await clearAllBatches();
    setBatches([]);
    setRawRowsByDate({});
    setSelectedWorker(null);
    setActiveTab('resumen');
  };

  // Quick export matrix to Excel
  const handleExportExcel = () => {
    if (workers.length === 0) return;

    const data = workers.map((w, i) => {
      const rowObj: Record<string, any> = {
        '#': i + 1,
        'Persona / Trabajador': w.name,
        'DNI / Código': w.dni || '-',
        'CFC': w.cfc || w.area || '-',
        'Días que Asistió': w.attendedDaysCount,
        'Días que Faltó': w.absentDaysCount,
        '% Asistencia': Number(w.attendanceRate.toFixed(1)),
      };

      daysEvolution.forEach((d) => {
        const h = w.history.find((item) => item.date === d.date);
        rowObj[d.formattedDate] = h?.attended ? 'ASISTIÓ' : 'FALTÓ';
      });

      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Asistencia');
    XLSX.writeFile(wb, `Control_Asistencia_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isLoadedFromStorage) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans text-xs text-slate-400">
        Iniciando Control de Asistencia...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans">
      {/* Vertical Navigation Sidebar */}
      <Sidebar
        currentView={activeTab}
        onSelectView={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onExportExcel={handleExportExcel}
        kpis={filteredKpis}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentView={activeTab}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          kpis={filteredKpis}
        />

        {/* Global Attendance Filter Bar (Día, Semana, Estado) */}
        {daysEvolution.length > 0 && (
          <GlobalFilterBar
            weeks={availableWeeks}
            days={daysEvolution}
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
            onReset={handleResetFilters}
            isFilterActive={isFilterActive}
            totalWorkersCount={workers.length}
            filteredWorkersCount={filteredWorkers.length}
            totalDaysCount={daysEvolution.length}
            filteredDaysCount={filteredDays.length}
          />
        )}

        {/* Active Tab View */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'resumen' && (
            <ResumenView
              kpis={filteredKpis}
              workers={filteredWorkers}
              days={filteredDays}
              onSelectWorker={setSelectedWorker}
              onGoToView={setActiveTab}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {activeTab === 'personal' && (
            <PersonalView
              workers={filteredWorkers}
              days={filteredDays}
              onSelectWorker={setSelectedWorker}
              onGoToCFCView={() => setActiveTab('cfc')}
            />
          )}

          {activeTab === 'cfc' && (
            <CFCView
              cfcList={filteredCfcList}
              bestCfc={filteredBestCfc}
              worstCfc={filteredWorstCfc}
              days={filteredDays}
              onSelectWorker={setSelectedWorker}
              onGoToPersonalView={() => setActiveTab('personal')}
              availableColumns={availableColumns}
              selectedGroupColumn={selectedGroupColumn}
              onSelectGroupColumn={setSelectedGroupColumn}
            />
          )}

          {activeTab === 'evolucion' && (
            <EvolucionView
              days={filteredDays}
              kpis={filteredKpis}
              cfcList={filteredCfcList}
            />
          )}

          {activeTab === 'ai' && (
            <AIModelsView
              workers={filteredWorkers}
              days={filteredDays}
              cfcList={filteredCfcList}
              onSelectWorker={setSelectedWorker}
            />
          )}

          {activeTab === 'datos' && (
            <DatosView
              batches={batches}
              rawRowsByDate={rawRowsByDate}
              onDeleteBatch={handleDeleteBatch}
              onClearAll={handleClearAll}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Individual Worker Profile History Modal */}
      {selectedWorker && (
        <WorkerDetailModal
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
        />
      )}

      {/* Upload New Excel Modal */}
      {isUploadModalOpen && (
        <CargarExcelModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onBatchLoaded={handleBatchLoaded}
          existingDatesCount={batches.length}
        />
      )}
    </div>
  );
}

export default App;
