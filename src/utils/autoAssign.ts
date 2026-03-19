import { computeCellStatus } from './validation';
import { assignmentMatchesCell } from './cellKey';
import type { Assignment, CellAddress, HomeGroup, HomeGroupPeriod, Person, Position, Schedule, Shift } from '../types';

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

/** Returns the number of on-call assignments a person has in the given list. */
function onCallCount(personId: string, assignments: Assignment[], positions: Position[]): number {
  return assignments.filter(
    a => a.personId === personId && (positions.find(p => p.id === a.positionId)?.isOnCall ?? false)
  ).length;
}

/** Returns total shift hours a person has in the given assignments array.
 *  Half-shift assignments count as half the shift's duration. */
function totalHours(personId: string, assignments: Assignment[], shifts: Shift[]): number {
  return assignments
    .filter(a => a.personId === personId)
    .reduce((sum, a) => {
      const shift = shifts.find(s => s.id === a.shiftId);
      if (!shift) return sum;
      const hours = a.half !== undefined ? shift.durationHours / 2 : shift.durationHours;
      return sum + hours;
    }, 0);
}

/** Returns how many times a person has been assigned to a specific position. */
function positionCount(personId: string, positionId: string, assignments: Assignment[]): number {
  return assignments.filter(a => a.personId === personId && a.positionId === positionId).length;
}

/**
 * Auto-assigns people to all empty cells in the schedule.
 *
 * Strategy: fairness — always pick the qualified candidate with the fewest
 * total assigned hours. Tie-break: alphabetical by name.
 *
 * Full-shift cells are processed before half-shift cells (half shifts are
 * last-resort — prefer filling full shifts first).
 *
 * When no valid candidate exists for a cell, it is skipped and a SkipReason
 * is recorded explaining why.
 *
 * Existing assignments are never removed or modified.
 */
export function autoAssign(
  schedule: Schedule,
  people: Person[],
  shifts: Shift[],
  positions: Position[],
  minBreakHours: number,
  homeGroups: HomeGroup[] = [],
  reassign = false,
  homeGroupPeriods: HomeGroupPeriod[] = [],
): AutoAssignResult {
  const proposed: Assignment[] = [];
  const skipped: SkippedCell[] = [];

  // Working copy of assignments — updated as the algorithm assigns, so that
  // break / week-limit checks account for assignments made in this very run.
  // When reassign=true, we start from scratch (ignore existing assignments).
  const working: Assignment[] = reassign ? [] : [...schedule.assignments];

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
  // Full-shift cells come first; half-shift cells (half=1 and half=2) come last.
  // Within each group, sort chronologically so earlier slots are filled first.
  const sortedShifts = [...shifts].sort((a, b) => {
    // treat night shifts (startHour < 6) as occurring after midnight
    const ha = a.startHour < 6 ? a.startHour + 24 : a.startHour;
    const hb = b.startHour < 6 ? b.startHour + 24 : b.startHour;
    return ha - hb;
  });

  const fullCells: CellAddress[] = [];
  const halfCells: CellAddress[] = [];

  for (const date of dates) {
    for (const shift of sortedShifts) {
      const halves: Array<1 | 2 | undefined> = shift.isHalfShift ? [1, 2] : [undefined];
      for (const half of halves) {
        for (const position of positions) {
          const cell: CellAddress = {
            date,
            shiftId: shift.id,
            positionId: position.id,
            ...(half !== undefined ? { half } : {}),
          };
          const occupied = working.some(a => assignmentMatchesCell(a, cell));
          if (!occupied) {
            if (half !== undefined) halfCells.push(cell);
            else fullCells.push(cell);
          }
        }
      }
    }
  }

  // Full shifts first, then half shifts
  const emptyCells = [...fullCells, ...halfCells];

  // Process each empty cell.
  for (const cell of emptyCells) {
    // Step 1: Qualified people for this position (skip anyone marked neverAutoAssign).
    const qualified = people.filter(p => !p.neverAutoAssign && p.qualifiedPositions.includes(cell.positionId));

    if (qualified.length === 0) {
      skipped.push({ cell, reasonKey: 'no-qualified' });
      continue;
    }

    // Step 2: Check each qualified person's status.
    const statuses = qualified.map(person => ({
      person,
      status: computeCellStatus(cell, person.id, working, person, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, positions),
    }));

    const valid = statuses.filter(s => s.status === 'valid');
    // On-call short-break candidates are allowed but only used as a last resort
    const oncallWarn = statuses.filter(s => s.status === 'oncall-short-break');
    // Constraint-violated persons allowed as final fallback only for on-call positions
    const isOnCallPosition = positions.find(p => p.id === cell.positionId)?.isOnCall ?? false;
    const constraintFallback = (valid.length === 0 && oncallWarn.length === 0 && isOnCallPosition)
      ? statuses.filter(s => s.status === 'constraint-violation')
      : [];
    const candidates = valid.length > 0 ? valid : oncallWarn.length > 0 ? oncallWarn : constraintFallback;

    if (candidates.length === 0) {
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

    // Step 3: Sort candidates by priority:
    //   1. forceMinimum persons first (higher duty priority tier)
    //   2. On-call interleave (count-based)
    //   3. Total assigned hours (asc) — load balancing
    //   4. Times assigned to THIS specific position (asc) — rotation across positions
    //   5. Random — avoids alphabetical bias
    const cellIsOnCall = isOnCallPosition;
    const withRand = candidates.map(c => ({ ...c, rand: Math.random() }));
    withRand.sort((a, b) => {
      const fA = a.person.forceMinimum ? 0 : 1;
      const fB = b.person.forceMinimum ? 0 : 1;
      if (fA !== fB) return fA - fB;
      const ocA = onCallCount(a.person.id, working, positions);
      const ocB = onCallCount(b.person.id, working, positions);
      if (ocA !== ocB) {
        return cellIsOnCall ? ocA - ocB : ocB - ocA;
      }
      const hoursA = totalHours(a.person.id, working, shifts);
      const hoursB = totalHours(b.person.id, working, shifts);
      if (hoursA !== hoursB) return hoursA - hoursB;
      const posA = positionCount(a.person.id, cell.positionId, working);
      const posB = positionCount(b.person.id, cell.positionId, working);
      if (posA !== posB) return posA - posB;
      return a.rand - b.rand;
    });

    const chosen = withRand[0].person;
    const newAssignment: Assignment = {
      personId: chosen.id,
      date: cell.date,
      shiftId: cell.shiftId,
      positionId: cell.positionId,
      ...(cell.half !== undefined ? { half: cell.half } : {}),
    };

    proposed.push(newAssignment);
    working.push(newAssignment);
  }

  return { proposed, skipped };
}
