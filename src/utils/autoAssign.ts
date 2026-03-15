import { computeCellStatus } from './validation';
import type { Assignment, CellAddress, HomeGroup, Person, Position, Schedule, Shift } from '../types';

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

/** Returns total shift hours a person has in the given assignments array. */
function totalHours(personId: string, assignments: Assignment[], shifts: Shift[]): number {
  return assignments
    .filter(a => a.personId === personId)
    .reduce((sum, a) => {
      const shift = shifts.find(s => s.id === a.shiftId);
      return sum + (shift?.durationHours ?? 0);
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

  const emptyCells: CellAddress[] = [];
  for (const date of dates) {
    for (const shift of sortedShifts) {
      for (const position of positions) {
        const occupied = working.some(
          a => a.date === date && a.shiftId === shift.id && a.positionId === position.id,
        );
        if (!occupied) {
          emptyCells.push({ date, shiftId: shift.id, positionId: position.id });
        }
      }
    }
  }

  // Process each empty cell.
  for (const cell of emptyCells) {
    // Step 1: Qualified people for this position.
    const qualified = people.filter(p => p.qualifiedPositions.includes(cell.positionId));

    if (qualified.length === 0) {
      skipped.push({ cell, reasonKey: 'no-qualified' });
      continue;
    }

    // Step 2: Check each qualified person's status.
    const statuses = qualified.map(person => ({
      person,
      status: computeCellStatus(cell, person.id, working, person, shifts, refDate, minBreakHours, homeGroups, schedule.homeGroupPeriods ?? [], positions),
    }));

    const valid = statuses.filter(s => s.status === 'valid');
    // On-call short-break candidates are allowed but only used as a last resort
    const oncallWarn = statuses.filter(s => s.status === 'oncall-short-break');
    const candidates = valid.length > 0 ? valid : oncallWarn;

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

    // Step 3: Sort candidates by fairness:
    //   1. Total assigned hours (asc) — load balancing
    //   2. Times assigned to THIS specific position (asc) — rotation across positions
    //   3. Name alphabetically (asc) — stable tiebreaker
    candidates.sort((a, b) => {
      const hoursA = totalHours(a.person.id, working, shifts);
      const hoursB = totalHours(b.person.id, working, shifts);
      if (hoursA !== hoursB) return hoursA - hoursB;
      const posA = positionCount(a.person.id, cell.positionId, working);
      const posB = positionCount(b.person.id, cell.positionId, working);
      if (posA !== posB) return posA - posB;
      return a.person.name.localeCompare(b.person.name);
    });

    const chosen = candidates[0].person;
    const newAssignment: Assignment = {
      personId: chosen.id,
      date: cell.date,
      shiftId: cell.shiftId,
      positionId: cell.positionId,
    };

    proposed.push(newAssignment);
    working.push(newAssignment);
  }

  return { proposed, skipped };
}
