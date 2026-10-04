import { DayAttendanceBatch, RawWorkerRow } from '../types';

const DB_NAME = 'AttendanceTareoMatrixDB';
const DB_VERSION = 3;
const STORE_BATCHES = 'batches';
const STORE_ROWS = 'raw_rows';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BATCHES)) {
        db.createObjectStore(STORE_BATCHES, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORE_ROWS)) {
        db.createObjectStore(STORE_ROWS, { keyPath: 'date' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBatchesToStorage(
  batches: DayAttendanceBatch[],
  rawRowsByDate?: Record<string, RawWorkerRow[]>
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_BATCHES, STORE_ROWS], 'readwrite');
    const bStore = tx.objectStore(STORE_BATCHES);
    const rStore = tx.objectStore(STORE_ROWS);

    bStore.clear();
    for (const b of batches) {
      bStore.put(b);
    }

    if (rawRowsByDate) {
      rStore.clear();
      for (const [d, rows] of Object.entries(rawRowsByDate)) {
        rStore.put({ date: d, rows });
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving batches to storage:', err);
  }
}

export async function loadBatchesFromStorage(): Promise<{
  batches: DayAttendanceBatch[];
  rawRowsByDate: Record<string, RawWorkerRow[]>;
}> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_BATCHES, STORE_ROWS], 'readonly');
    const bStore = tx.objectStore(STORE_BATCHES);
    const rStore = tx.objectStore(STORE_ROWS);

    const batchesPromise = new Promise<DayAttendanceBatch[]>((resolve) => {
      const req = bStore.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const rowsPromise = new Promise<Record<string, RawWorkerRow[]>>((resolve) => {
      const req = rStore.getAll();
      req.onsuccess = () => {
        const result: Record<string, RawWorkerRow[]> = {};
        (req.result || []).forEach((item: any) => {
          if (item && item.date) {
            result[item.date] = item.rows;
          }
        });
        resolve(result);
      };
      req.onerror = () => resolve({});
    });

    const [batches, rawRowsByDate] = await Promise.all([batchesPromise, rowsPromise]);
    return { batches, rawRowsByDate };
  } catch (err) {
    console.error('Error loading batches:', err);
    return { batches: [], rawRowsByDate: {} };
  }
}

export async function clearAllBatches(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_BATCHES, STORE_ROWS], 'readwrite');
    tx.objectStore(STORE_BATCHES).clear();
    tx.objectStore(STORE_ROWS).clear();
  } catch (err) {
    console.error('Error clearing batches:', err);
  }
}
