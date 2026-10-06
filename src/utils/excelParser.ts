import * as XLSX from 'xlsx';
import { RawWorkerRow } from '../types';

const NAME_SYNONYMS = [
  'trabajador', 'personal', 'nombre', 'nombres', 'colaborador',
  'empleado', 'operario', 'nombre completo', 'apellidos y nombres',
  'apellidos_nombres', 'nombre y apellidos', 'persona', 'obrero'
];

const DNI_SYNONYMS = [
  'cod.empleado', 'cod empleado', 'codempleado', 'codigo empleado', 'codigoempleado',
  'cod. empleado', 'cod_empleado', 'dni', 'codigo', 'código',
  'cod', 'doc', 'documento', 'fotocheck', 'fotochek', 'id', 'identificacion'
];

const DATE_SYNONYMS = [
  'fecha', 'dia', 'día', 'date', 'jornal', 'fecha programada', 'fecha asistencia',
  'fec', 'fec_asistencia', 'fec.asistencia', 'fec asistencia', 'fecha tareo'
];

const AREA_SYNONYMS = [
  'actividad', 'subactividad', 'area', 'área', 'departamento', 'seccion', 'sección', 'gerencia', 'labor'
];

export const CFC_SYNONYMS = [
  'codigo cadena', 'código cadena', 'cod. cadena', 'cod cadena', 'cod.cadena', 'codcadena',
  'codigo_cadena', 'cadena', 'cadena cfc', 'cfc cadena', 'cod cadena cfc',
  'cfc', 'c.f.c', 'c.f.c.', 'c_f_c', 'cfcs', 'cfc_cod', 'cfc_nombre',
  'centro de costo', 'ceco', 'c_costo', 'centro_costo', 'centro costo',
  'centro_de_costo', 'ce_co'
];

/**
 * Specifically finds the column header representing CFC with absolute priority
 * over Area, Labor, Fundo, etc.
 */
export function findCfcHeader(headers: string[]): string | null {
  // 1. Strict match for explicit CFC or Código Cadena / Cadena
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (
      norm === 'cfc' ||
      norm === 'cfcs' ||
      norm === 'codcfc' ||
      norm === 'cfccod' ||
      norm === 'nombrecfc' ||
      norm === 'cfcnombre' ||
      norm === 'cfcdescripcion' ||
      norm.startsWith('cfc') ||
      norm.endsWith('cfc') ||
      norm === 'codigocadena' ||
      norm === 'codcadena' ||
      norm === 'cadena' ||
      norm.includes('codigocadena') ||
      norm.includes('codcadena') ||
      norm.includes('cadena')
    ) {
      return h;
    }
  }

  // 2. Strict match for Centro de Costo / CeCo
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (
      norm === 'ceco' ||
      norm === 'centrodecosto' ||
      norm === 'centrocosto' ||
      norm === 'ccosto' ||
      norm === 'centroscosto' ||
      norm.includes('centrodecosto') ||
      norm.includes('centrocosto')
    ) {
      return h;
    }
  }

  // 3. Fallback only if no explicit CFC or Cadena column exists
  const fallbackSyns = ['cuadrilla', 'modulo', 'módulo', 'lote'];
  for (const h of headers) {
    const norm = normalizeHeader(h);
    for (const syn of fallbackSyns) {
      if (norm === normalizeHeader(syn) || norm.includes(normalizeHeader(syn))) {
        return h;
      }
    }
  }

  // 4. Last resort fallback
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (norm === 'fundo' || norm === 'campo') {
      return h;
    }
  }

  return null;
}

export function extractCfcFromRow(rawRow?: Record<string, any>, fallback?: string): string {
  if (!rawRow) return fallback || 'CFC General';

  // 1. Strict search: exact 'cfc', 'c.f.c', 'código cadena', 'cadena'
  for (const [key, val] of Object.entries(rawRow)) {
    const normKey = normalizeHeader(key);
    if (
      normKey === 'cfc' ||
      normKey === 'cfcs' ||
      normKey === 'codcfc' ||
      normKey === 'cfccod' ||
      normKey === 'cfcnombre' ||
      normKey.startsWith('cfc') ||
      normKey.endsWith('cfc') ||
      normKey === 'codigocadena' ||
      normKey === 'codcadena' ||
      normKey === 'cadena' ||
      normKey.includes('codigocadena') ||
      normKey.includes('codcadena') ||
      normKey.includes('cadena')
    ) {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  // 2. Strict search: CeCo / Centro de Costo
  for (const [key, val] of Object.entries(rawRow)) {
    const normKey = normalizeHeader(key);
    if (
      normKey === 'ceco' ||
      normKey.includes('centrodecosto') ||
      normKey.includes('centrocosto') ||
      normKey === 'ccosto'
    ) {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  // 3. Fallback: Cuadrilla / Modulo / Lote
  for (const [key, val] of Object.entries(rawRow)) {
    const normKey = normalizeHeader(key);
    if (
      normKey.includes('cuadrilla') ||
      normKey.includes('modulo') ||
      normKey.includes('lote')
    ) {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  // 4. Last resort: Fundo
  for (const [key, val] of Object.entries(rawRow)) {
    const normKey = normalizeHeader(key);
    if (normKey === 'fundo' || normKey === 'campo') {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  return fallback || 'CFC General';
}

function normalizeHeader(h: any): string {
  if (h === null || h === undefined) return '';
  return String(h)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findMatchingHeader(headers: string[], synonyms: string[]): string | null {
  const normSynonyms = synonyms.map((s) => normalizeHeader(s));

  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (normSynonyms.includes(norm)) return h;
  }

  for (const h of headers) {
    const norm = normalizeHeader(h);
    for (const syn of normSynonyms) {
      if (norm.includes(syn) || syn.includes(norm)) return h;
    }
  }

  return null;
}

export function parseDateValue(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof val === 'number') {
    if (val > 30000 && val < 60000) {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return String(val);
  }

  const str = String(val).trim();

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }

  // DD/MM/YYYY
  const latMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (latMatch) {
    return `${latMatch[3]}-${String(latMatch[2]).padStart(2, '0')}-${String(latMatch[1]).padStart(2, '0')}`;
  }

  return str;
}

// Extract potential date from filename (e.g. "Tareo_01_10_2026.xlsx", "2026-10-01.xlsx", etc.)
export function extractDateFromFileName(fileName: string): string {
  const matchIso = fileName.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  }

  const matchLat = fileName.match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/);
  if (matchLat) {
    return `${matchLat[3]}-${matchLat[2]}-${matchLat[1]}`;
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseExcelTareoFile(
  file: File,
  fallbackDate?: string
): Promise<{
  rowsByDate: Record<string, RawWorkerRow[]>;
  detectedDates: string[];
  totalRows: number;
  fileName: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          throw new Error('El archivo no contiene hojas válidas.');
        }

        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        });

        if (rawRows.length === 0) {
          throw new Error('La hoja seleccionada está vacía.');
        }

        const headers = Object.keys(rawRows[0] || {});
        const nameHeader = findMatchingHeader(headers, NAME_SYNONYMS);
        const dniHeader = findMatchingHeader(headers, DNI_SYNONYMS);
        const dateHeader = findMatchingHeader(headers, DATE_SYNONYMS);
        const areaHeader = findMatchingHeader(headers, AREA_SYNONYMS);
        const cfcHeader = findCfcHeader(headers);

        if (!nameHeader && !dniHeader) {
          throw new Error(
            'No se encontró una columna con el nombre o DNI de las personas en el archivo.'
          );
        }

        const defaultDate = fallbackDate || extractDateFromFileName(file.name);
        const rowsByDate: Record<string, RawWorkerRow[]> = {};
        const datesSet = new Set<string>();
        let validRowsCount = 0;

        rawRows.forEach((row, idx) => {
          const rawName = nameHeader ? String(row[nameHeader] || '').trim() : '';
          const rawDni = dniHeader ? String(row[dniHeader] || '').trim() : '';

          if (!rawName && !rawDni) return;

          const upperName = rawName.toUpperCase();
          if (
            upperName === 'TOTAL' ||
            upperName === 'TOTAL GENERAL' ||
            upperName.startsWith('TOTAL ') ||
            upperName.startsWith('SUBTOTAL') ||
            upperName.includes('RESUMEN')
          ) {
            return;
          }

          const workerName = rawName || `Empleado ${rawDni}`;
          const dni = rawDni;

          let rowDate = defaultDate;
          if (dateHeader && row[dateHeader]) {
            const parsed = parseDateValue(row[dateHeader]);
            if (parsed) rowDate = parsed;
          }

          datesSet.add(rowDate);

          if (!rowsByDate[rowDate]) {
            rowsByDate[rowDate] = [];
          }

          const area = areaHeader ? String(row[areaHeader] || '').trim() : undefined;
          let cfc: string | undefined = undefined;
          if (cfcHeader && row[cfcHeader] !== undefined && row[cfcHeader] !== null) {
            const sVal = String(row[cfcHeader]).trim();
            if (sVal) cfc = sVal;
          }
          if (!cfc) {
            const extracted = extractCfcFromRow(row);
            if (extracted && extracted !== 'CFC General') {
              cfc = extracted;
            }
          }

          rowsByDate[rowDate].push({
            originalRowNumber: idx + 2,
            workerName,
            dni,
            date: rowDate,
            area,
            cfc: cfc || undefined,
            rawRow: row,
          });

          validRowsCount++;
        });

        const detectedDates = Array.from(datesSet).sort();

        resolve({
          rowsByDate,
          detectedDates,
          totalRows: validRowsCount,
          fileName: file.name,
        });
      } catch (err: any) {
        reject(new Error(err?.message || 'Error al procesar el archivo Excel.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo seleccionado.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
