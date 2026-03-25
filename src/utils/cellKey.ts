import type { Assignment, CellAddress, Position, Shift } from '../types';

export interface OnCallSlot {
  slotIndex: number;
  shiftId: string;       // virtual: 'oncall-{positionId}-{slotIndex}'
  startHour: number;
  endHour: number;       // may exceed 24 — caller should mod if displaying
  durationHours: number;
}

/** For on-call positions with onCallDurationHours, return the time slots that
 *  divide the 24h day starting from dayStartHour.
 *  E.g. 18h starting at 6.5 → [{6.5–24.5h (18h)}, {24.5–30.5h (6h)}]. */
export function getOnCallSlots(position: Position, dayStartHour = 0): OnCallSlot[] {
  const dur = position.onCallDurationHours;
  if (!position.isOnCall || dur == null || dur <= 0) return [];
  const slots: OnCallSlot[] = [];
  let hour = dayStartHour;
  let idx = 0;
  const dayEnd = dayStartHour + 24;
  while (hour < dayEnd) {
    const slotDur = Math.min(dur, dayEnd - hour);
    slots.push({
      slotIndex: idx,
      shiftId: `oncall-${position.id}-${idx}`,
      startHour: hour,
      endHour: hour + slotDur,
      durationHours: slotDur,
    });
    hour += slotDur;
    idx++;
  }
  return slots;
}

/** Returns true if a shiftId is a virtual on-call slot id. */
export function isOnCallSlotShiftId(shiftId: string): boolean {
  return shiftId.startsWith('oncall-');
}

export function serializeCellAddress(cell: CellAddress): string {
  const halfSuffix = cell.half !== undefined ? `::${cell.half}` : '';
  return `${cell.date}::${cell.shiftId}::${cell.positionId}${halfSuffix}`;
}

export function deserializeCellAddress(key: string): CellAddress {
  const [date, shiftId, positionId, halfStr] = key.split('::');
  const half = halfStr ? (parseInt(halfStr) as 1 | 2) : undefined;
  return { date, shiftId, positionId, ...(half !== undefined ? { half } : {}) };
}

export interface OnCallSlotMapping {
  pos: Position;
  slot: OnCallSlot;
  rowSpan: number;
}

/** For each on-call position, map each slot to the shiftIndex of the first overlapping shift.
 *  Returns a Map<shiftIndex, OnCallSlotMapping[]> so ShiftRow knows which on-call cells to render.
 *  rowSpan accounts for half-shifts that may produce 2 HTML rows when split. */
export function computeOnCallSlotMapping(
  shifts: Shift[],
  onCallPositions: Position[],
  dayStartHour: number,
  date: string,
  assignments: Assignment[],
  regularPositions: Position[],
): Map<number, OnCallSlotMapping[]> {
  const result = new Map<number, OnCallSlotMapping[]>();
  if (shifts.length === 0 || onCallPositions.length === 0) return result;

  // Normalized start hour for each shift (night shifts <6 treated as 24+)
  const normStart = shifts.map(s => s.startHour < 6 ? s.startHour + 24 : s.startHour);

  // HTML row count per shift: half-shifts that have a split assignment produce 2 rows
  const htmlRowCount = shifts.map((s, _i) => {
    if (!s.isHalfShift) return 1;
    const hasSplit = regularPositions.some(pos => {
      if (pos.isOnCall) return false;
      const h1 = assignments.find(a => a.date === date && a.shiftId === s.id && a.positionId === pos.id && a.half === 1);
      const h2 = assignments.find(a => a.date === date && a.shiftId === s.id && a.positionId === pos.id && a.half === 2);
      if (!h1 && !h2) return false;
      if (h1 && h2 && h1.personId === h2.personId) return false;
      return true;
    });
    return hasSplit ? 2 : 1;
  });

  for (const pos of onCallPositions) {
    if (!pos.isOnCall || pos.onCallDurationHours == null) continue;
    const slots = getOnCallSlots(pos, dayStartHour);
    for (const slot of slots) {
      // Find all shifts that overlap this slot
      const overlapping: number[] = [];
      for (let i = 0; i < shifts.length; i++) {
        const start = normStart[i];
        const end = start + shifts[i].durationHours;
        if (start < slot.endHour && end > slot.startHour) {
          overlapping.push(i);
        }
      }
      if (overlapping.length === 0) continue;
      // Sort by normalized start to find the first one
      overlapping.sort((a, b) => normStart[a] - normStart[b]);
      const firstIdx = overlapping[0];
      const rowSpan = overlapping.reduce((sum, i) => sum + htmlRowCount[i], 0);
      if (!result.has(firstIdx)) result.set(firstIdx, []);
      result.get(firstIdx)!.push({ pos, slot, rowSpan });
    }
  }

  return result;
}

/** Returns true if an assignment matches a cell address (including half). */
export function assignmentMatchesCell(
  a: { date: string; shiftId: string; positionId: string; half?: 1 | 2 },
  cell: CellAddress,
): boolean {
  return (
    a.date === cell.date &&
    a.shiftId === cell.shiftId &&
    a.positionId === cell.positionId &&
    (a.half ?? undefined) === (cell.half ?? undefined)
  );
}
