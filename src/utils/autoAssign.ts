import { computeCellStatus } from './validation';
import { matchesCellAddress } from './cellKey';
import { ONCALL_POSITION_ID } from '../constants';
import type { Assignment, CellAddress, Person, Position, Schedule, Shift } from '../types';

export type SkipReason =
  | 'no-qualified'
  | 'all-unavailable'
  | 'all-break'
  | 'all-constraint'
  | 'all-invalid';

export interface SkippedCell {
  cell: CellAddress;
  reasonKey: SkipReason;
}

export interface AutoAssignResult {
  proposed: Assignment[];
  skipped: SkippedCell[];
}

/**
 * Returns total weighted shift hours a person has in the given assignments array.
 * On-call assignments count at `oncallWeight` fraction of their hours.
 * Half-shift assignments count at half their shift's durationHours.
 */
function totalHours(
  personId: string,
  assignments: Assignment[],
  shifts: Shift[],
  oncallWeight: number,
): number {
  return assignments
    .filter(a => a.personId === personId)
    .reduce((sum, a) => {
      const shift = shifts.find(s => s.id === a.shiftId);
      const hours = shift?.durationHours ?? 0;
      const halfFactor = a.halfSlot ? 0.5 : 1;
      const oncallFactor = a.isOncall ? oncallWeight : 1;
      return sum + hours * halfFactor * oncallFactor;
    }, 0);
}

/**
 * Auto-assigns people to all empty cells in the schedule.
 *
 * Strategy: fairness — always pick the qualified candidate with the fewest
 * total weighted hours. On-call assignments count at `oncallWeight` fraction.
 * Tie-break: alphabetical by name.
 *
 * Half-shift cells are EXCLUDED from auto-assign (manual only).
 * On-call slots (shift.oncallSlots >= 1) are filled after all regular slots.
 *
 * Existing assignments are never removed or modified.
 */
export function autoAssign(
  schedule: Schedule,
  people: Person[],
  shifts: Shift[],
  positions: Position[],
  minBreakHours: number,
  oncallWeight: number,
): AutoAssignResult {
  const proposed: Assignment[] = [];
  const skipped: SkippedCell[] = [];

  // Working copy of assignments — updated as the algorithm assigns, so that
  // break / week-limit checks account for assignments made in this very run.
  const working: Assignment[] = [...schedule.assignments];

  // Reference date for shiftStartMins calculations (earliest schedule date).
  const refDate = schedule.startDate;

  // Collect all dates in the schedule range.
  const dates: string[] = [];
  {
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Build sorted list of all empty cells: date × shift × position.
  // Sort chronologically so that earlier slots are filled first, which gives
  // later break-check calculations the most accurate picture of the schedule.
  const sortedShifts = [...shifts].sort((a, b) => {
    // treat night shifts (startHour < 6) as occurring after midnight,
    // so sort them last within a day.
    const ha = a.startHour < 6 ? a.startHour + 24 : a.startHour;
    const hb = b.startHour < 6 ? b.startHour + 24 : b.startHour;
    return ha - hb;
  });

  // Regular empty cells — skip half-shift positions entirely (manual only)
  const regularCells: CellAddress[] = [];
  for (const date of dates) {
    for (const shift of sortedShifts) {
      if (shift.isHalfShift) continue; // half shifts are manual only
      for (const position of positions) {
        const cell: CellAddress = { date, shiftId: shift.id, positionId: position.id };
        const occupied = working.some(a => matchesCellAddress(a, cell));
        if (!occupied) {
          regularCells.push(cell);
        }
      }
    }
  }

  // On-call cells — one per shift (with oncallSlots >= 1) per day
  const oncallCells: CellAddress[] = [];
  for (const date of dates) {
    for (const shift of sortedShifts) {
      const slots = shift.oncallSlots ?? 0;
      for (let i = 0; i < slots; i++) {
        const cell: CellAddress = { date, shiftId: shift.id, positionId: ONCALL_POSITION_ID, isOncall: true };
        // Use date+shiftId+slotIndex to allow multiple on-call slots; for now slots=1 is typical
        const occupied = working.some(a => matchesCellAddress(a, cell));
        if (!occupied) {
          oncallCells.push(cell);
        }
      }
    }
  }

  // Process regular cells first, then on-call cells
  const emptyCells = [...regularCells, ...oncallCells];

  // Process each empty cell.
  for (const cell of emptyCells) {
    // Step 1: Qualified people for this position.
    // For on-call cells, all people are "qualified" (no position restriction).
    const qualified = cell.isOncall
      ? [...people]
      : people.filter(p => p.qualifiedPositions.includes(cell.positionId));

    if (qualified.length === 0) {
      skipped.push({ cell, reasonKey: 'no-qualified' });
      continue;
    }

    // Step 2: Check each qualified person's status.
    const statuses = qualified.map(person => ({
      person,
      status: computeCellStatus(cell, person.id, working, person, shifts, refDate, minBreakHours),
    }));

    const valid = statuses.filter(s => s.status === 'valid');

    if (valid.length === 0) {
      // Determine the dominant reason for skipping.
      const statusSet = new Set(statuses.map(s => s.status));
      let reasonKey: SkipReason;

      if (statusSet.has('unavailable') && !statusSet.has('insufficient-break') && !statusSet.has('constraint-violation')) {
        reasonKey = 'all-unavailable';
      } else if (statusSet.has('insufficient-break') && !statusSet.has('constraint-violation') && !statusSet.has('unavailable')) {
        reasonKey = 'all-break';
      } else if (statusSet.has('constraint-violation') && !statusSet.has('insufficient-break') && !statusSet.has('unavailable')) {
        reasonKey = 'all-constraint';
      } else {
        reasonKey = 'all-invalid';
      }

      skipped.push({ cell, reasonKey });
      continue;
    }

    // Step 3: Sort valid candidates by fairness (ascending weighted hours), then name.
    valid.sort((a, b) => {
      const hoursA = totalHours(a.person.id, working, shifts, oncallWeight);
      const hoursB = totalHours(b.person.id, working, shifts, oncallWeight);
      if (hoursA !== hoursB) return hoursA - hoursB;
      return a.person.name.localeCompare(b.person.name);
    });

    const chosen = valid[0].person;
    const newAssignment: Assignment = {
      personId: chosen.id,
      date: cell.date,
      shiftId: cell.shiftId,
      positionId: cell.positionId,
      isOncall: cell.isOncall || undefined,
    };

    proposed.push(newAssignment);
    working.push(newAssignment);
  }

  return { proposed, skipped };
}
