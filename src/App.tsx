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
  formatISODate,
} from './utils/matrixAnalytics';
import { parseDateValue } from './utils/excelParser';
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
import { UsuariosView } from './components/UsuariosView';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { CargarExcelModal } from './components/CargarExcelModal';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import {
  extractAvailableWeeks,
  filterAttendanceData,
  GlobalFilterState,
} from './utils/filterUtils';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { AppUser, DEFAULT_USERS } from './types';
import * as XLSX from 'xlsx';

export function App() {
  const [batches, setBatches] = useState<DayAttendanceBatch[]>([]);
  const [rawRowsByDate, setRawRowsByDate] = useState<Record<string, RawWorkerRow[]>>({});
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return (localStorage.getItem('attendance_active_tab') as ActiveTab) || 'resumen';
  });
  const [selectedWorker, setSelectedWorker] = useState<WorkerAttendanceSummary | null>(null);
  const [selectedGroupColumn, setSelectedGroupColumn] = useState<string>(() => {
    return localStorage.getItem('attendance_group_col') || '';
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  // User Accounts Database in LocalStorage
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('camposol_users_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_USERS;
  });

  // Current Logged-in User Session (null means at Login Screen)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedSessionId = localStorage.getItem('camposol_current_session');
      if (savedSessionId) {
        const savedUsers = localStorage.getItem('camposol_users_db');
        const userList: AppUser[] = savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;
        const matched = userList.find((u) => u.id === savedSessionId);
        if (matched) return matched;
      }
    } catch (e) {
      console.error(e);
    }
    // Default to admin for immediate access
    return DEFAULT_USERS[0];
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('camposol_current_session', user.id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('camposol_current_session');
    setIsUserModalOpen(false);
  };

  const handleSelectUser = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('camposol_current_session', user.id);
  };

  const handleCreateUser = (newUser: AppUser) => {
    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem('camposol_users_db', JSON.stringify(updated));
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === 'admin') return; // Proteger administrador principal
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    localStorage.setItem('camposol_users_db', JSON.stringify(updated));
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updated);
    localStorage.setItem('camposol_users_db', JSON.stringify(updated));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleOpenUpload = () => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      setIsUserModalOpen(true);
      return;
    }
    setIsUploadModalOpen(true);
  };

  // Sync activeTab & group column to localStorage
  useEffect(() => {
    localStorage.setItem('attendance_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedGroupColumn) {
      localStorage.setItem('attendance_group_col', selectedGroupColumn);
    }
  }, [selectedGroupColumn]);

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
    const normalizeBatchList = (list: DayAttendanceBatch[]) => {
      const map = new Map<string, DayAttendanceBatch>();
      list.forEach((b) => {
        const iso = parseDateValue(b.date) || b.date;
        const { formatted, dayName } = formatISODate(iso);
        map.set(iso, {
          ...b,
          date: iso,
          formattedDate: formatted,
          dayName,
        });
      });
      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    };

    const normalizeRawRows = (rowsMap: Record<string, RawWorkerRow[]>) => {
      const result: Record<string, RawWorkerRow[]> = {};
      Object.entries(rowsMap).forEach(([d, rows]) => {
        const iso = parseDateValue(d) || d;
        result[iso] = rows.map((r) => ({
          ...r,
          date: parseDateValue(r.date) || iso,
        }));
      });
      return result;
    };

    let updatedBatches: DayAttendanceBatch[] = [];
    let updatedRawRows: Record<string, RawWorkerRow[]> = {};

    const cleanNewBatches = normalizeBatchList(newBatches);
    const cleanNewRows = normalizeRawRows(newRawRows);

    if (mode === 'append') {
      const cleanCurrentBatches = normalizeBatchList(batches);
      const cleanCurrentRows = normalizeRawRows(rawRowsByDate);

      const map = new Map<string, DayAttendanceBatch>();
      cleanCurrentBatches.forEach((b) => map.set(b.date, b));
      cleanNewBatches.forEach((b) => map.set(b.date, b));
      updatedBatches = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

      updatedRawRows = { ...cleanCurrentRows, ...cleanNewRows };
    } else {
      updatedBatches = cleanNewBatches;
      updatedRawRows = cleanNewRows;
    }

    setBatches(updatedBatches);
    setRawRowsByDate(updatedRawRows);
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
        'Cód. Empleado': w.dni || '-',
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

  // Si no hay sesión iniciada, mostrar la Pantalla de Login con Usuario y Contraseña
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans">
      {/* Vertical Navigation Sidebar */}
      <Sidebar
        currentView={activeTab}
        onSelectView={setActiveTab}
        onOpenUpload={handleOpenUpload}
        onExportExcel={handleExportExcel}
        kpis={filteredKpis}
        currentUser={currentUser}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentView={activeTab}
          onOpenUpload={handleOpenUpload}
          kpis={filteredKpis}
          currentUser={currentUser}
          onOpenUserModal={() => setIsUserModalOpen(true)}
          onLogout={handleLogout}
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
              onOpenUpload={handleOpenUpload}
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

          {activeTab === 'usuarios' && (
            <UsuariosView
              users={users}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUser={handleUpdateUser}
              onSelectUser={handleSelectUser}
            />
          )}

          {activeTab === 'datos' && (
            <DatosView
              batches={batches}
              rawRowsByDate={rawRowsByDate}
              onDeleteBatch={handleDeleteBatch}
              onClearAll={handleClearAll}
              onOpenUpload={handleOpenUpload}
              currentUser={currentUser}
              onOpenUserModal={() => setIsUserModalOpen(true)}
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

      {/* Upload New Excel Modal (Exclusivo Administrador) */}
      {isUploadModalOpen && currentUser.role === 'ADMIN' && (
        <CargarExcelModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onBatchLoaded={handleBatchLoaded}
          existingDatesCount={batches.length}
        />
      )}

      {/* User Management & Role Creation Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
        users={users}
        onCreateUser={handleCreateUser}
        onDeleteUser={handleDeleteUser}
        onLogout={handleLogout}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}

export default App;
