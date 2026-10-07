import * as XLSX from 'xlsx';
import { RawWorkerRow } from '../types';

const NAME_SYNONYMS = [
  'trabajador', 'personal', 'nombre', 'nombres', 'colaborador',
  'empleado', 'operario', 'nombre completo', 'apellidos y nombres',
  'apellidos_nombres', 'apellidosynombres', 'nombre y apellidos',
  'nombreyapellidos', 'persona', 'obrero', 'nom_empleado', 'nom empleado',
  'nombre empleado', 'nombre_empleado', 'nombres y apellidos',
  'nombre y apellido', 'trabajador nombre', 'colaborador nombre',
  'descripcion trabajador', 'desc_trabajador'
];

export const COD_EMPLEADO_SYNONYMS = [
  'cod.empleado', 'cod empleado', 'codempleado', 'codigo empleado', 'codigoempleado',
  'cod. empleado', 'cod_empleado', 'código empleado', 'códigoempleado', 'cod de empleado',
  'codigo de empleado', 'código de empleado', 'cod emp', 'cod. emp', 'cod_emp',
  'codigo emp', 'codtrabajador', 'cod.trabajador', 'cod trabajador', 'cod_trabajador',
  'codigo trabajador', 'código trabajador', 'codcolaborador', 'cod.colaborador',
  'cod colaborador', 'cod_colaborador', 'codigo colaborador', 'codoperario',
  'cod. operario', 'cod operario', 'cod_operario', 'fotocheck', 'fotochek',
  'dni', 'documento', 'doc', 'identificacion', 'numdoc', 'numerodocumento',
  'codigo', 'código', 'cod', 'id'
];

const DATE_SYNONYMS = [
  'fecha', 'dia', 'día', 'date', 'jornal', 'fecha programada', 'fecha asistencia',
  'fec', 'fec_asistencia', 'fec.asistencia', 'fec asistencia', 'fecha tareo',
  'fec_jornal', 'fec jornal', 'fecha_jornal', 'fec_tareo', 'fecha_programada'
];

const AREA_SYNONYMS = [
  'actividad', 'subactividad', 'area', 'área', 'departamento', 'seccion', 'sección', 'gerencia', 'labor'
];

export const CFC_SYNONYMS = [
  'codigo cadena', 'código cadena', 'cod. cadena', 'cod cadena', 'cod.cadena', 'codcadena',
  'codigo_cadena', 'cadena', 'cadena cfc', 'cfc cadena', 'cod cadena cfc',
  'cfc', 'c.f.c', 'c.f.c.', 'c_f_c', 'cfcs', 'cfc_cod', 'cfc_nombre',
  'centro de costo', 'ceco', 'c_costo', 'centro_costo', 'centro costo',
  'centro_de_costo', 'ce_co', 'nomcfc', 'nom_cfc', 'desc_cfc', 'desccfc'
];

/**
 * Specifically finds the column header representing WORKER NAME
 */
export function findWorkerNameHeader(headers: string[]): string | null {
  // 1. Strict match in NAME_SYNONYMS
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (
      norm.startsWith('cod') ||
      norm.startsWith('id') ||
      norm === 'dni' ||
      norm.startsWith('numdoc') ||
      norm.startsWith('nrodoc') ||
      norm.startsWith('documento')
    ) {
      continue;
    }
    for (const syn of NAME_SYNONYMS) {
      if (norm === normalizeHeader(syn)) return h;
    }
  }

  // 2. Partial match
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (
      norm.includes('cfc') ||
      norm.includes('cadena') ||
      norm.includes('supervisor') ||
      norm.includes('area') ||
      norm.includes('labor') ||
      norm.includes('cargo') ||
      norm.includes('cuadrilla') ||
      norm.startsWith('cod') ||
      norm.startsWith('id') ||
      norm === 'dni' ||
      norm.startsWith('numdoc')
    ) {
      continue;
    }

    if (
      norm.includes('trabajad') ||
      norm.includes('emplead') ||
      norm.includes('colaborad') ||
      norm.includes('apellid') ||
      norm.includes('nombre') ||
      norm.includes('operari') ||
      norm === 'persona' ||
      norm === 'personal'
    ) {
      return h;
    }
  }

  return null;
}

/**
 * Specifically finds the column header representing COD EMPLEADO with absolute priority:
 * 1. Explicit 'cod empleado' / 'codigo empleado' / 'cod trabajador' / 'fotocheck'
 * 2. Generic 'codigo'
 * 3. Fallback to 'dni' / 'documento'
 */
export function findWorkerCodeHeader(headers: string[]): string | null {
  // 1. Absolute Priority: Explicit "COD EMPLEADO" / "CÓDIGO EMPLEADO" / "COD TRABAJADOR" / "FOTOCHECK"
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (
      norm === 'codempleado' ||
      norm === 'codigoempleado' ||
      norm === 'coddeempleado' ||
      norm === 'codigodeempleado' ||
      norm === 'codemp' ||
      norm === 'codigoemp' ||
      norm === 'idempleado' ||
      norm === 'empleadoid' ||
      norm === 'codtrabajador' ||
      norm === 'codigotrabajador' ||
      norm === 'codtrab' ||
      norm === 'idtrabajador' ||
      norm === 'trabajadorid' ||
      norm === 'codcolaborador' ||
      norm === 'codigocolaborador' ||
      norm === 'codcolab' ||
      norm === 'codpersonal' ||
      norm === 'codigopersonal' ||
      norm === 'codoperario' ||
      norm === 'codigooperario' ||
      norm === 'codop' ||
      norm === 'fotocheck' ||
      norm === 'fotochek' ||
      norm === 'legajo' ||
      norm === 'matricula' ||
      norm === 'ficha' ||
      norm.includes('codemplead') ||
      norm.includes('codigoemplead') ||
      norm.includes('codtrabajad') ||
      norm.includes('codigotrabajad') ||
      norm.includes('codcolaborad') ||
      norm.includes('codpersonal') ||
      norm.includes('codoperari') ||
      (norm.startsWith('cod') &&
        (norm.includes('emp') ||
          norm.includes('trab') ||
          norm.includes('pers') ||
          norm.includes('colab') ||
          norm.includes('oper')))
    ) {
      return h;
    }
  }

  // 2. Generic "CODIGO" / "COD" (excluding CFC / Cadena / Area / Fundo headers)
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (
      norm.includes('cfc') ||
      norm.includes('cadena') ||
      norm.includes('ceco') ||
      norm.includes('costo') ||
      norm.includes('cuadrilla') ||
      norm.includes('fundo') ||
      norm.includes('lote') ||
      norm.includes('cultivo') ||
      norm.includes('area') ||
      norm.includes('labor')
    ) {
      continue;
    }
    if (
      norm === 'codigo' ||
      norm === 'cod' ||
      norm === 'id' ||
      norm === 'codpersona' ||
      norm === 'codigopersona' ||
      norm === 'codigounico' ||
      norm === 'codunico'
    ) {
      return h;
    }
  }

  // 3. Fallback to DNI / Documento / Identificación
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (
      norm === 'dni' ||
      norm === 'documento' ||
      norm === 'doc' ||
      norm === 'numdoc' ||
      norm === 'nrodoc' ||
      norm === 'numerodocumento' ||
      norm === 'nrodocumento' ||
      norm === 'identificacion' ||
      norm === 'cedula' ||
      norm === 'docidentidad' ||
      norm.includes('numdoc') ||
      norm.includes('nrodoc') ||
      norm.includes('documento')
    ) {
      return h;
    }
  }

  return null;
}

export function extractWorkerCodeFromRow(rawRow?: Record<string, any>): string {
  if (!rawRow) return '';
  // 1. Check for explicit cod empleado keys
  for (const [key, val] of Object.entries(rawRow)) {
    const norm = normalizeHeader(key);
    if (
      norm === 'codempleado' ||
      norm === 'codigoempleado' ||
      norm === 'coddeempleado' ||
      norm === 'codigodeempleado' ||
      norm === 'codemp' ||
      norm === 'codigoemp' ||
      norm.includes('codemplead') ||
      norm.includes('codigoemplead') ||
      norm === 'codtrabajador' ||
      norm === 'codigotrabajador' ||
      norm.includes('codtrabajad') ||
      norm.includes('codigotrabajad') ||
      norm === 'codcolaborador' ||
      norm.includes('codcolaborad') ||
      norm === 'fotocheck' ||
      norm === 'fotochek'
    ) {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  // 2. Check for generic codigo
  for (const [key, val] of Object.entries(rawRow)) {
    const norm = normalizeHeader(key);
    if (norm === 'codigo' || norm === 'cod' || norm === 'codpersona' || norm === 'codigopersona') {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  // 3. Fallback to dni / documento
  for (const [key, val] of Object.entries(rawRow)) {
    const norm = normalizeHeader(key);
    if (norm === 'dni' || norm === 'documento' || norm === 'doc' || norm === 'numdoc') {
      const sVal = String(val || '').trim();
      if (sVal) return sVal;
    }
  }

  return '';
}

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
    // SheetJS dates are stored in UTC; use UTC components to avoid timezone day shifts
    const year = val.getUTCFullYear();
    const month = String(val.getUTCMonth() + 1).padStart(2, '0');
    const day = String(val.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 30000 && Number(val) < 65000)) {
    const num = Number(val);
    if (num > 30000 && num < 65000) {
      const dateObj = XLSX.SSF.parse_date_code(num);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  const str = String(val).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }

  // D/M/YYYY, DD/MM/YYYY, D/M/YY, DD/MM/YY, M/D/YY, MM/DD/YY
  const slashMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (slashMatch) {
    const p1 = Number(slashMatch[1]);
    const p2 = Number(slashMatch[2]);
    let p3 = Number(slashMatch[3]);
    if (p3 < 100) {
      p3 = p3 <= 50 ? 2000 + p3 : 1900 + p3;
    }

    let day = p1;
    let month = p2;

    // Disambiguation
    if (p1 > 12) {
      // 28/9/2026 -> p1 is day
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      // 9/28/2026 -> p2 is day
      day = p2;
      month = p1;
    } else if (p1 === 10 && p2 <= 6) {
      // October (e.g. 10/6/26 in US format) -> Month 10, Day 6
      month = 10;
      day = p2;
    } else if (p2 === 10 && p1 <= 6) {
      // October in LatAm format (e.g. 6/10/26) -> Day 6, Month 10
      month = 10;
      day = p1;
    } else if (p1 === 9 && p2 <= 5) {
      // September in US format -> Month 9
      month = 9;
      day = p2;
    } else if (p2 === 9 && p1 <= 5) {
      // September in LatAm format -> Month 9
      month = 9;
      day = p1;
    } else {
      // Default Peruvian standard: DD/MM/YYYY
      day = p1;
      month = p2;
    }

    const sM = String(month).padStart(2, '0');
    const sD = String(day).padStart(2, '0');
    return `${p3}-${sM}-${sD}`;
  }

  // Check for month names in Spanish (e.g. "06-oct-2026")
  const spanishMonths: Record<string, string> = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', set: '09', oct: '10', nov: '11', dic: '12'
  };
  const lower = str.toLowerCase();
  for (const [mPrefix, mNum] of Object.entries(spanishMonths)) {
    if (lower.includes(mPrefix)) {
      const nums = str.match(/\d+/g);
      if (nums && nums.length >= 2) {
        const d = String(nums[0]).padStart(2, '0');
        let y = Number(nums[1]);
        if (y < 100) y += 2000;
        return `${y}-${mNum}-${d}`;
      }
    }
  }

  return str;
}

// Extract potential date from filename (e.g. "Tareo_01_10_2026.xlsx", "2026-10-01.xlsx", etc.)
export function extractDateFromFileName(fileName: string): string {
  const matchIso = fileName.match(/(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/);
  if (matchIso) {
    return `${matchIso[1]}-${String(matchIso[2]).padStart(2, '0')}-${String(matchIso[3]).padStart(2, '0')}`;
  }

  const matchLat = fileName.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/);
  if (matchLat) {
    let day = Number(matchLat[1]);
    let month = Number(matchLat[2]);
    if (day <= 12 && month > 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    return `${matchLat[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const matchShort = fileName.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{2})/);
  if (matchShort) {
    let p1 = Number(matchShort[1]);
    let p2 = Number(matchShort[2]);
    let y = Number(matchShort[3]) + 2000;
    let day = p1;
    let month = p2;
    if (p1 === 10 && p2 <= 6) { month = 10; day = p2; }
    else if (p2 === 10 && p1 <= 6) { month = 10; day = p1; }
    else if (p1 > 12) { day = p1; month = p2; }
    else if (p2 > 12) { day = p2; month = p1; }
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo no contiene hojas válidas.');
        }

        // Multi-sheet and dynamic header row scan
        let bestRows2D: any[][] = [];
        let bestHeaderRowIdx = -1;
        let bestScore = -1;
        let bestHeaders: string[] = [];
        let detectedNameH: string | null = null;
        let detectedDniH: string | null = null;
        let detectedDateH: string | null = null;
        let detectedAreaH: string | null = null;
        let detectedCfcH: string | null = null;

        for (const sName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sName];
          if (!sheet) continue;
          const rows2D: any[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            raw: false,
          });
          if (rows2D.length === 0) continue;

          const maxScan = Math.min(35, rows2D.length);
          for (let rIdx = 0; rIdx < maxScan; rIdx++) {
            const rawCells = (rows2D[rIdx] || []).map((c) =>
              String(c !== undefined && c !== null ? c : '').trim()
            );
            const nonEmpty = rawCells.filter((c) => c !== '');
            if (nonEmpty.length === 0) continue;

            const nameH = findWorkerNameHeader(rawCells);
            const dniH = findWorkerCodeHeader(rawCells);
            const cfcH = findCfcHeader(rawCells);
            const dateH = findMatchingHeader(rawCells, DATE_SYNONYMS);
            const areaH = findMatchingHeader(rawCells, AREA_SYNONYMS);

            let score = 0;
            if (dniH) score += 5;
            if (nameH) score += 4;
            if (cfcH) score += 3;
            if (dateH) score += 2;
            if (areaH) score += 1;

            if (score > bestScore) {
              bestScore = score;
              bestRows2D = rows2D;
              bestHeaderRowIdx = rIdx;
              bestHeaders = rawCells;
              detectedNameH = nameH;
              detectedDniH = dniH;
              detectedCfcH = cfcH;
              detectedDateH = dateH;
              detectedAreaH = areaH;
            }
          }
        }

        // If no sheet had header keywords, pick the first sheet with data
        if (bestRows2D.length === 0) {
          for (const sName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sName];
            if (!sheet) continue;
            const rows2D: any[][] = XLSX.utils.sheet_to_json(sheet, {
              header: 1,
              defval: '',
              raw: false,
            });
            if (rows2D.length > 0) {
              bestRows2D = rows2D;
              bestHeaderRowIdx = 0;
              bestHeaders = (rows2D[0] || []).map((c, idx) =>
                String(c || `Col_${idx + 1}`).trim()
              );
              break;
            }
          }
        }

        if (bestRows2D.length === 0) {
          throw new Error('La hoja seleccionada está vacía.');
        }

        const dataRows2D = bestRows2D.slice(bestHeaderRowIdx + 1);

        // Content-based inference fallback if headers weren't found
        if (!detectedDniH || !detectedNameH) {
          const sampleRows = dataRows2D.slice(0, 15);
          const colCount = Math.max(bestHeaders.length, ...sampleRows.map((r) => r.length));

          for (let col = 0; col < colCount; col++) {
            const headerName = bestHeaders[col] || `Col_${col + 1}`;
            if (
              headerName === detectedDniH ||
              headerName === detectedNameH ||
              headerName === detectedCfcH
            ) {
              continue;
            }

            const sampleVals = sampleRows
              .map((r) => String(r[col] || '').trim())
              .filter((v) => v !== '' && !v.toUpperCase().startsWith('TOTAL'));

            if (sampleVals.length === 0) continue;

            // Check if column is worker code (e.g. 3-15 digit numbers or alphanumeric without spaces)
            if (!detectedDniH) {
              const numericCount = sampleVals.filter(
                (v) => /^[a-zA-Z0-9-]{3,15}$/.test(v) && !v.includes(' ')
              ).length;
              if (numericCount >= sampleVals.length * 0.6) {
                detectedDniH = headerName;
                continue;
              }
            }

            // Check if column is worker name (contains letters, has spaces, length > 4)
            if (!detectedNameH) {
              const nameCount = sampleVals.filter(
                (v) => v.includes(' ') && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}/.test(v)
              ).length;
              if (nameCount >= sampleVals.length * 0.5) {
                detectedNameH = headerName;
                continue;
              }
            }
          }
        }

        // Guaranteed fallback if still not identified:
        if (!detectedNameH && !detectedDniH) {
          if (bestHeaders.length > 1) {
            detectedDniH = bestHeaders[0];
            detectedNameH = bestHeaders[1];
          } else if (bestHeaders.length === 1) {
            detectedDniH = bestHeaders[0];
          }
        }

        const nameHeader = detectedNameH;
        const dniHeader = detectedDniH;
        const dateHeader = detectedDateH;
        const areaHeader = detectedAreaH;
        const cfcHeader = detectedCfcH;

        // Build object rows
        const rawRows: Record<string, any>[] = [];
        dataRows2D.forEach((rowArr) => {
          if (!rowArr || rowArr.length === 0) return;
          const hasAny = rowArr.some(
            (c: any) => String(c !== undefined && c !== null ? c : '').trim() !== ''
          );
          if (!hasAny) return;

          const obj: Record<string, any> = {};
          bestHeaders.forEach((h, colIdx) => {
            const key = h || `COL_${colIdx + 1}`;
            obj[key] =
              rowArr[colIdx] !== undefined && rowArr[colIdx] !== null ? rowArr[colIdx] : '';
          });
          rawRows.push(obj);
        });

        if (rawRows.length === 0) {
          throw new Error('El archivo no contiene filas de datos para procesar.');
        }

        const defaultDate = fallbackDate || extractDateFromFileName(file.name);
        const rowsByDate: Record<string, RawWorkerRow[]> = {};
        const datesSet = new Set<string>();
        let validRowsCount = 0;

        rawRows.forEach((row, idx) => {
          const rawName = nameHeader ? String(row[nameHeader] || '').trim() : '';
          let rawDni =
            dniHeader && row[dniHeader] !== undefined && row[dniHeader] !== null
              ? String(row[dniHeader]).trim()
              : '';

          if (!rawDni) {
            rawDni = extractWorkerCodeFromRow(row);
          }

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

          let rowDate = parseDateValue(defaultDate) || defaultDate;
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
            originalRowNumber: bestHeaderRowIdx + idx + 2,
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
