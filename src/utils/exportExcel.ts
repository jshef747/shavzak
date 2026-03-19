import * as XLSX from 'xlsx-js-style';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Schedule } from '../types';
import { langFromDir, t } from './i18n';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(h: number): string {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

// Strip leading '#' from a hex color for xlsx-js-style (expects 6-char hex, no #)
function toXlsxRgb(hex: string): string {
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

// ─── Style presets ──────────────────────────────────────────────────────────

const STYLE_HEADER = {
  fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } }, // slate-800
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const STYLE_HEADER_ONCALL = {
  fill: { patternType: 'solid', fgColor: { rgb: 'C2410C' } }, // orange-700
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  alignment: { horizontal: 'center', vertical: 'center' },
};

function styleDateRow(isRtl: boolean) {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
    font: { bold: true, color: { rgb: '1E293B' }, sz: 11 },
    alignment: { horizontal: isRtl ? 'right' : 'left', vertical: 'center' },
  };
}

function styleShiftLabel(isRtl: boolean) {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
    font: { color: { rgb: '475569' }, sz: 10 },
    alignment: { horizontal: isRtl ? 'right' : 'left', vertical: 'center', wrapText: true },
  };
}

const STYLE_EMPTY_CELL = {
  font: { color: { rgb: '000000' }, sz: 10 },
  alignment: { horizontal: 'center', vertical: 'center' },
};

function personStyle(colorHex: string) {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: toXlsxRgb(colorHex) } },
    font: { color: { rgb: '1F2937' }, sz: 10 }, // slate-800, always readable on pastels
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}

function cell(value: string, style: object): XLSX.CellObject {
  return { v: value, t: 's', s: style };
}

// ─── Main export ────────────────────────────────────────────────────────────

export function exportToExcel(state: AppState, schedule: Schedule, dates: string[]) {
  const { shifts, positions, people } = state;
  const assignments = schedule.assignments;
  const lang = langFromDir(state.dir);
  const isRtl = state.dir === 'rtl';
  const locale = isRtl ? heLocale : undefined;

  const totalCols = 1 + positions.length; // shift label col + one col per position

  // In RTL: shift label is column 0 (physically leftmost = visually rightmost in RTL Excel),
  //         positions go left→right physically (= right→left visually)
  // In LTR: shift label is column 0 (leftmost), positions go left→right
  function colIndex(positionIndex: number | 'shift'): number {
    if (isRtl) {
      return positionIndex === 'shift' ? 0 : (positionIndex as number) + 1;
    }
    return positionIndex === 'shift' ? 0 : (positionIndex as number) + 1;
  }

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  // ── Row 0: Column header ──────────────────────────────────────────────────
  let rowIndex = 0;

  ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex('shift') })] = cell(t('shiftCol', lang), STYLE_HEADER);
  for (let ci = 0; ci < positions.length; ci++) {
    const headerStyle = positions[ci].isOnCall ? STYLE_HEADER_ONCALL : STYLE_HEADER;
    ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex(ci) })] = cell(positions[ci].name, headerStyle);
  }
  rowIndex++;

  // ── Rows per date ──────────────────────────────────────────────────────────
  for (const date of dates) {
    const dateLabel = format(parseISO(date), isRtl ? 'EEE, d MMM yyyy' : 'EEE, MMM d, yyyy', { locale });
    for (let ci = 0; ci < totalCols; ci++) {
      ws[XLSX.utils.encode_cell({ r: rowIndex, c: ci })] = cell(ci === 0 ? dateLabel : '', styleDateRow(isRtl));
    }
    merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: totalCols - 1 } });
    rowIndex++;

    // Shift rows
    for (const shift of shifts) {
      const endHour = shift.startHour + shift.durationHours;
      const shiftLabel = `${shift.name}\n${formatTime(shift.startHour)}–${formatTime(endHour)}`;
      ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex('shift') })] = cell(shiftLabel, styleShiftLabel(isRtl));

      for (let ci = 0; ci < positions.length; ci++) {
        const pos = positions[ci];
        const assignment = assignments.find(
          a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id
        );
        if (assignment) {
          const person = people.find(p => p.id === assignment.personId);
          const name = person?.name ?? '';
          ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex(ci) })] = cell(name, personStyle(person?.colorHex ?? '#e2e8f0'));
        } else {
          ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex(ci) })] = cell('', STYLE_EMPTY_CELL);
        }
      }
      rowIndex++;
    }
  }

  // ── Sheet metadata ─────────────────────────────────────────────────────────
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIndex - 1, c: totalCols - 1 } });
  ws['!merges'] = merges;
  // Shift col is always first (col 0), positions follow
  ws['!cols'] = [{ wch: 22 }, ...positions.map(() => ({ wch: 18 }))];
  ws['!rows'] = [{ hpt: 22 }];
  // ── Workbook ───────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isRtl ? 'לוח' : 'Schedule');
  if (isRtl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wb as any).Workbook = { Views: [{ RTL: true }] };
  }

  // Constraints sheet (unchanged, plain text)
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const constrainedPeople = people.filter(p => p.constraints);
  if (constrainedPeople.length > 0) {
    const cHeaders = ['Person', 'Allowed Shifts', 'Allowed Days', 'Max/Week', 'Max Total'];
    const cRows: (string | number)[][] = [cHeaders];
    for (const person of constrainedPeople) {
      const c = person.constraints!;
      const allowedShifts = c.allowedShiftIds?.length
        ? c.allowedShiftIds.map(id => shifts.find(s => s.id === id)?.name ?? id).join(', ')
        : 'Any';
      const allowedDays = c.allowedDaysOfWeek?.length
        ? c.allowedDaysOfWeek.map(d => DAY_NAMES[d]).join(', ')
        : 'Any';
      cRows.push([
        person.name,
        allowedShifts,
        allowedDays,
        c.maxShiftsPerWeek ?? 'No limit',
        c.maxShiftsTotal ?? 'No limit',
      ]);
    }
    const ws2 = XLSX.utils.aoa_to_sheet(cRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Constraints');
  }

  XLSX.writeFile(wb, `${schedule.name}.xlsx`);
}
