import * as XLSX from 'xlsx-js-style';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Schedule } from '../types';
import { langFromDir, t } from './i18n';
import { getOnCallSlots, resolvePositionsForDate } from './cellKey';

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

  // On-call slot layout helpers
  const dayStartHour = shifts.length > 0
    ? Math.min(...shifts.map(s => s.startHour < 6 ? s.startHour + 24 : s.startHour)) % 24
    : 0;
  const normShiftStart = shifts.map(s => s.startHour < 6 ? s.startHour + 24 : s.startHour);
  // In Excel, half-shifts always produce 2 rows (merged when same person)
  const excelRowsPerShift = shifts.map(s => s.isHalfShift ? 2 : 1);

  type OnCallCellData = { type: 'start'; slotShiftId: string; excelRows: number } | { type: 'covered' };

  function buildOnCallCellMap(date: string): Map<string, OnCallCellData> {
    const map = new Map<string, OnCallCellData>();
    const resolvedPositions = resolvePositionsForDate(positions, date, schedule.onCallDurationOverrides);
    for (const pos of resolvedPositions) {
      if (!pos.isOnCall) continue;
      for (const slot of getOnCallSlots(pos, dayStartHour)) {
        const overlapping: number[] = [];
        for (let i = 0; i < shifts.length; i++) {
          const sEnd = normShiftStart[i] + shifts[i].durationHours;
          if (normShiftStart[i] < slot.endHour && sEnd > slot.startHour) overlapping.push(i);
        }
        if (overlapping.length === 0) continue;
        overlapping.sort((a, b) => normShiftStart[a] - normShiftStart[b]);
        const firstIdx = overlapping[0];
        const startKey = `${pos.id}-${firstIdx}`;
        if (!map.has(startKey)) {
          const totalExcelRows = overlapping.reduce((sum, i) => sum + excelRowsPerShift[i], 0);
          map.set(startKey, { type: 'start', slotShiftId: slot.shiftId, excelRows: totalExcelRows });
          let seen = excelRowsPerShift[firstIdx];
          for (let i = firstIdx + 1; i < shifts.length && seen < totalExcelRows; i++) {
            map.set(`${pos.id}-${i}`, { type: 'covered' });
            seen += excelRowsPerShift[i];
          }
        }
      }
    }
    return map;
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

    // Build on-call slot → shift-index mapping for this date
    const onCallCellMap = buildOnCallCellMap(date);

    // Helper: write an on-call position cell at `r` for shift index `si`, position index `ci`
    function writeOnCallCell(r: number, si: number, ci: number) {
      const pos = positions[ci];
      const cellData = onCallCellMap.get(`${pos.id}-${si}`);
      if (cellData?.type === 'start') {
        const asgn = assignments.find(a => a.date === date && a.shiftId === cellData.slotShiftId && a.positionId === pos.id);
        const person = asgn ? people.find(p => p.id === asgn.personId) : null;
        ws[XLSX.utils.encode_cell({ r, c: colIndex(ci) })] = cell(
          person?.name ?? '', person ? personStyle(person.colorHex ?? '#e2e8f0') : STYLE_EMPTY_CELL
        );
        if (cellData.excelRows > 1) {
          merges.push({ s: { r, c: colIndex(ci) }, e: { r: r + cellData.excelRows - 1, c: colIndex(ci) } });
        }
      } else {
        // covered by a merge from an earlier slot, or no slot overlaps this shift
        ws[XLSX.utils.encode_cell({ r, c: colIndex(ci) })] = cell('', STYLE_EMPTY_CELL);
      }
    }

    // Shift rows
    for (let si = 0; si < shifts.length; si++) {
      const shift = shifts[si];
      const endHour = shift.startHour + shift.durationHours;

      if (shift.isHalfShift) {
        const halfDur = shift.durationHours / 2;
        const half1Label = `${shift.name} (½א)\n${formatTime(shift.startHour)}–${formatTime(shift.startHour + halfDur)}`;
        const half2Label = `${shift.name} (½ב)\n${formatTime(shift.startHour + halfDur)}–${formatTime(endHour)}`;
        const fullLabel = `${shift.name}\n${formatTime(shift.startHour)}–${formatTime(endHour)}`;

        // Pre-compute per regular-position: same person for both halves?
        const posPersons = positions.map(pos => {
          if (pos.isOnCall) return { a1: undefined, a2: undefined, sameFullPerson: false };
          const a1 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 1);
          const a2 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 2);
          return { a1, a2, sameFullPerson: !!(a1 && a2 && a1.personId === a2.personId) };
        });

        const allSame = posPersons.every((p, i) => positions[i].isOnCall || p.sameFullPerson || (!p.a1 && !p.a2));

        // Write both rows
        for (const [halfNum, halfLabel] of [[1, half1Label], [2, half2Label]] as [1 | 2, string][]) {
          const labelToWrite = allSame ? (halfNum === 1 ? fullLabel : '') : halfLabel;
          ws[XLSX.utils.encode_cell({ r: rowIndex + halfNum - 1, c: colIndex('shift') })] = cell(labelToWrite, styleShiftLabel(isRtl));
          for (let ci = 0; ci < positions.length; ci++) {
            if (positions[ci].isOnCall) {
              // On-call columns: only write at the first half row; the merge handles spanning
              if (halfNum === 1) writeOnCallCell(rowIndex, si, ci);
              else ws[XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex(ci) })] = cell('', STYLE_EMPTY_CELL);
              continue;
            }
            const { a1, a2, sameFullPerson } = posPersons[ci];
            if (sameFullPerson) {
              // Write name only in first row; second row left blank (will be merged)
              if (halfNum === 1) {
                const person = people.find(p => p.id === a1!.personId);
                ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex(ci) })] = cell(person?.name ?? '', personStyle(person?.colorHex ?? '#e2e8f0'));
              } else {
                ws[XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex(ci) })] = cell('', STYLE_EMPTY_CELL);
              }
            } else {
              const a = halfNum === 1 ? a1 : a2;
              if (a) {
                const person = people.find(p => p.id === a.personId);
                ws[XLSX.utils.encode_cell({ r: rowIndex + halfNum - 1, c: colIndex(ci) })] = cell(person?.name ?? '', personStyle(person?.colorHex ?? '#e2e8f0'));
              } else {
                ws[XLSX.utils.encode_cell({ r: rowIndex + halfNum - 1, c: colIndex(ci) })] = cell('', STYLE_EMPTY_CELL);
              }
            }
          }
        }

        // Merge cells for same-person regular positions (and shift label if all same)
        if (allSame) {
          merges.push({ s: { r: rowIndex, c: colIndex('shift') }, e: { r: rowIndex + 1, c: colIndex('shift') } });
        }
        for (let ci = 0; ci < positions.length; ci++) {
          if (!positions[ci].isOnCall && posPersons[ci].sameFullPerson) {
            merges.push({ s: { r: rowIndex, c: colIndex(ci) }, e: { r: rowIndex + 1, c: colIndex(ci) } });
          }
        }

        rowIndex += 2;
      } else {
        const shiftLabel = `${shift.name}\n${formatTime(shift.startHour)}–${formatTime(endHour)}`;
        ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex('shift') })] = cell(shiftLabel, styleShiftLabel(isRtl));

        for (let ci = 0; ci < positions.length; ci++) {
          const pos = positions[ci];
          if (pos.isOnCall) {
            writeOnCallCell(rowIndex, si, ci);
            continue;
          }
          const assignment = assignments.find(
            a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id
          );
          if (assignment) {
            const person = people.find(p => p.id === assignment.personId);
            ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex(ci) })] = cell(person?.name ?? '', personStyle(person?.colorHex ?? '#e2e8f0'));
          } else {
            ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex(ci) })] = cell('', STYLE_EMPTY_CELL);
          }
        }
        rowIndex++;
      }
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
