import { addDays, format, parseISO } from 'date-fns';
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

/** Returns total hours of on-call assignments for a person. */
function onCallHours(personId: string, assignments: Assignment[], positions: Position[], shifts: Shift[]): number {
  return assignments
    .filter(a => a.personId === personId && (positions.find(p => p.id === a.positionId)?.isOnCall ?? false))
    .reduce((sum, a) => {
      const shift = shifts.find(s => s.id === a.shiftId);
      if (!shift) return sum;
      return sum + (a.half !== undefined ? shift.durationHours / 2 : shift.durationHours);
    }, 0);
}

/** Returns total hours of regular (non-on-call) assignments for a person. */
function regularHours(personId: string, assignments: Assignment[], positions: Position[], shifts: Shift[]): number {
  return assignments
    .filter(a => a.personId === personId && !(positions.find(p => p.id === a.positionId)?.isOnCall ?? false))
    .reduce((sum, a) => {
      const shift = shifts.find(s => s.id === a.shiftId);
      if (!shift) return sum;
      return sum + (a.half !== undefined ? shift.durationHours / 2 : shift.durationHours);
    }, 0);
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

/** Returns the fraction of a person's hours that are on-call (0–1). */
function onCallRatio(personId: string, assignments: Assignment[], positions: Position[], shifts: Shift[]): number {
  const total = totalHours(personId, assignments, shifts);
  if (total === 0) return 0;
  return onCallHours(personId, assignments, positions, shifts) / total;
}

/**
 * Returns the sum of squared deviations from the mean on-call ratio,
 * considering only people who are qualified for at least one on-call AND
 * one regular position (so the target ratio is meaningful for them).
 */
function ratioVariance(personIds: string[], assignments: Assignment[], positions: Position[], shifts: Shift[]): number {
  const ratios = personIds.map(id => onCallRatio(id, assignments, positions, shifts));
  const mean = ratios.reduce((s, r) => s + r, 0) / (ratios.length || 1);
  return ratios.reduce((s, r) => s + (r - mean) ** 2, 0);
}

const MAX_SWAP_PASSES = 3;
const ACCEPTABLE_SWAP_STATUSES = new Set(['valid', 'oncall-short-break', 'oncall-override']);

/**
 * Post-assignment balancing pass: swaps people between on-call and regular
 * assignments to reduce variance in each person's on-call ratio.
 * Only operates on newly proposed assignments.
 *
 * A swap exchanges the personIds of two proposed assignments where one is
 * on an on-call position and the other is on a regular position. The two
 * assignments can be on any date/shift — both are re-validated after the swap.
 *
 * Mutates `working` and `proposed` in place (same object references).
 */
function balanceSwaps(
  working: Assignment[],
  proposed: Assignment[],
  people: Person[],
  shifts: Shift[],
  positions: Position[],
  minBreakHours: number,
  homeGroups: HomeGroup[],
  homeGroupPeriods: HomeGroupPeriod[],
  refDate: string,
  ignoreOnCallConstraints: boolean,
): void {
  const personById = new Map(people.map(p => [p.id, p]));

  // Fingerprint: identity of a proposed assignment slot (not person-specific)
  const slotFp = (a: Assignment) => `${a.date}::${a.shiftId}::${a.positionId}`;

  // Build set of proposed slot fingerprints (non-half only) for quick lookup
  const proposedSlots = new Set(proposed.filter(a => a.half === undefined).map(slotFp));

  // Working candidates: only non-half proposed assignments
  const candidates = proposed.filter(a => a.half === undefined);

  // Split into on-call and regular buckets
  const isOnCallAssignment = (a: Assignment) => positions.find(p => p.id === a.positionId)?.isOnCall ?? false;
  const onCallCandidates = candidates.filter(isOnCallAssignment);
  const regularCandidates = candidates.filter(a => !isOnCallAssignment(a));

  // All assigned person IDs for global variance calculation
  const allAssignedIds = [...new Set(working.map(a => a.personId))];

  for (let pass = 0; pass < MAX_SWAP_PASSES; pass++) {
    let changed = false;

    // For each on-call assignment paired with each regular assignment,
    // try swapping the two people and keep the swap if it reduces global variance.
    for (const ocAsg of onCallCandidates) {
      if (!proposedSlots.has(slotFp(ocAsg))) continue; // was removed by prior swap

      for (const regAsg of regularCandidates) {
        if (!proposedSlots.has(slotFp(regAsg))) continue;
        if (ocAsg.personId === regAsg.personId) continue;

        const varianceBefore = ratioVariance(allAssignedIds, working, positions, shifts);

        // Tentative swap of personIds
        const oldOcPerson = ocAsg.personId;
        const oldRegPerson = regAsg.personId;
        ocAsg.personId = oldRegPerson;
        regAsg.personId = oldOcPerson;

        const varianceAfter = ratioVariance(allAssignedIds, working, positions, shifts);

        if (varianceAfter >= varianceBefore) {
          // Not beneficial — revert
          ocAsg.personId = oldOcPerson;
          regAsg.personId = oldRegPerson;
          continue;
        }

        // Validate both assignments with their new people
        const personOc = personById.get(ocAsg.personId);
        const personReg = personById.get(regAsg.personId);
        if (!personOc || !personReg) {
          ocAsg.personId = oldOcPerson;
          regAsg.personId = oldRegPerson;
          continue;
        }

        const statusOc = computeCellStatus(
          { date: ocAsg.date, shiftId: ocAsg.shiftId, positionId: ocAsg.positionId },
          ocAsg.personId, working, personOc, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, positions, ignoreOnCallConstraints,
        );
        const statusReg = computeCellStatus(
          { date: regAsg.date, shiftId: regAsg.shiftId, positionId: regAsg.positionId },
          regAsg.personId, working, personReg, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, positions, ignoreOnCallConstraints,
        );

        if (ACCEPTABLE_SWAP_STATUSES.has(statusOc) && ACCEPTABLE_SWAP_STATUSES.has(statusReg)) {
          changed = true;
        } else {
          // Revert
          ocAsg.personId = oldOcPerson;
          regAsg.personId = oldRegPerson;
        }
      }
    }

    if (!changed) break;
  }
}

/**
 * Returns a soft departure-proximity penalty for assigning a person to a cell.
 *
 * Preference order (lower = more preferred):
 *   0 — no departure soon, assign freely
 *   1 — shift is בוקר (morning, startHour < 12, non-night) on departure day (last resort)
 *   2 — shift is לילה (night, startHour < 6) the day before departure, i.e. physically departure morning
 *   3 — shift is צהריים or later (startHour >= 12) on the day before departure
 *
 * Shifts on departure day at noon or later are hard-blocked by isHomeGroupBlocked and
 * never reach the candidate list, so we don't need to handle those here.
 */
function departurePenalty(
  cell: CellAddress,
  person: Person,
  shift: Shift,
  homeGroupPeriods: HomeGroupPeriod[],
): number {
  if (!person.homeGroupIds?.length) return 0;

  const isNight = shift.startHour < 6;
  // Physical date this shift actually runs on
  const physicalDate = isNight
    ? format(addDays(parseISO(cell.date), 1), 'yyyy-MM-dd')
    : cell.date;

  for (const groupId of person.homeGroupIds) {
    const period = homeGroupPeriods.find(p => p.groupId === groupId);
    if (!period) continue;
    const departure = period.startDate;

    if (physicalDate === departure) {
      // Shift physically runs on departure day
      if (isNight) {
        // לילה labeled day-before: physically departure morning — penalty 2
        return 2;
      }
      // Non-night morning shift on departure day — penalty 1 (lowest priority)
      return 1;
    }

    // Day before departure (labeled date, non-night shifts)
    const dayBeforeDeparture = format(addDays(parseISO(departure), -1), 'yyyy-MM-dd');
    if (!isNight && cell.date === dayBeforeDeparture && shift.startHour >= 12) {
      // Afternoon/evening shift the day before — penalty 3 (prefer not to, ערב should be last)
      return 3;
    }
  }
  return 0;
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
  ignoreOnCallConstraints = false,
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
  // Within each group, interleave by date round-robin (slot 0 of all dates, then
  // slot 1 of all dates, …) so the load spreads evenly across the schedule rather
  // than front-loading the first days.
  const sortedShifts = [...shifts].sort((a, b) => {
    // treat night shifts (startHour < 6) as occurring after midnight
    const ha = a.startHour < 6 ? a.startHour + 24 : a.startHour;
    const hb = b.startHour < 6 ? b.startHour + 24 : b.startHour;
    return ha - hb;
  });

  // Build per-date slot lists first, then interleave across dates.
  type SlotList = CellAddress[];
  const fullByDate: SlotList[] = dates.map(() => []);
  const halfByDate: SlotList[] = dates.map(() => []);

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
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
            if (half !== undefined) halfByDate[di].push(cell);
            else fullByDate[di].push(cell);
          }
        }
      }
    }
  }

  // Interleave: take slot[i] from each date before moving to slot[i+1]
  function interleave(byDate: SlotList[]): CellAddress[] {
    const result: CellAddress[] = [];
    const maxLen = Math.max(0, ...byDate.map(d => d.length));
    for (let i = 0; i < maxLen; i++) {
      for (const slots of byDate) {
        if (i < slots.length) result.push(slots[i]);
      }
    }
    return result;
  }

  // Full shifts first (interleaved), then half shifts (interleaved)
  const emptyCells = [...interleave(fullByDate), ...interleave(halfByDate)];

  // Process each empty cell.
  for (const cell of emptyCells) {
    // Re-check occupancy: cell may have been filled while processing its paired half.
    if (working.some(a => assignmentMatchesCell(a, cell))) continue;

    // Step 1: Qualified people for this position (skip anyone marked neverAutoAssign).
    const qualified = people.filter(p => !p.neverAutoAssign && p.qualifiedPositions.includes(cell.positionId));

    if (qualified.length === 0) {
      skipped.push({ cell, reasonKey: 'no-qualified' });
      continue;
    }

    // Step 2: Check each qualified person's status.
    const statuses = qualified.map(person => ({
      person,
      status: computeCellStatus(cell, person.id, working, person, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, positions, ignoreOnCallConstraints),
    }));

    const valid = statuses.filter(s => s.status === 'valid');
    const oncallWarn = statuses.filter(s => s.status === 'oncall-short-break');
    const isOnCallPosition = positions.find(p => p.id === cell.positionId)?.isOnCall ?? false;
    // oncall-override: constraints bypassed by ignoreOnCallConstraints toggle — last resort
    const oncallOverride = (valid.length === 0 && oncallWarn.length === 0 && isOnCallPosition)
      ? statuses.filter(s => s.status === 'oncall-override')
      : [];
    const candidates = valid.length > 0 ? valid : oncallWarn.length > 0 ? oncallWarn : oncallOverride;

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
    //   2. Departure proximity penalty (asc) — avoid assigning close to home-group departure
    //   3. Primary hours for this cell type (asc) — balance on-call vs regular separately
    //   4. Total hours normalized by number of qualified positions (asc) — fair share load
    //   5. Times assigned to THIS specific position (asc) — rotation across positions
    //   6. Random — avoids alphabetical bias
    const cellShift = shifts.find(s => s.id === cell.shiftId)!;
    const withRand = candidates.map(c => ({ ...c, rand: Math.random() }));
    withRand.sort((a, b) => {
      const fA = a.person.forceMinimum ? 0 : 1;
      const fB = b.person.forceMinimum ? 0 : 1;
      if (fA !== fB) return fA - fB;
      const penA = departurePenalty(cell, a.person, cellShift, homeGroupPeriods);
      const penB = departurePenalty(cell, b.person, cellShift, homeGroupPeriods);
      if (penA !== penB) return penA - penB;
      // Balance by the relevant hour type first: on-call hours for on-call cells,
      // regular hours for regular cells. This prevents stacking one type on the same person.
      const primaryA = isOnCallPosition
        ? onCallHours(a.person.id, working, positions, shifts)
        : regularHours(a.person.id, working, positions, shifts);
      const primaryB = isOnCallPosition
        ? onCallHours(b.person.id, working, positions, shifts)
        : regularHours(b.person.id, working, positions, shifts);
      if (Math.abs(primaryA - primaryB) > 0.01) return primaryA - primaryB;
      // Normalize total hours by number of positions the person qualifies for,
      // so people with fewer qualified positions aren't unfairly over-assigned.
      const qualA = Math.max(1, a.person.qualifiedPositions.length);
      const qualB = Math.max(1, b.person.qualifiedPositions.length);
      const normA = totalHours(a.person.id, working, shifts) / qualA;
      const normB = totalHours(b.person.id, working, shifts) / qualB;
      if (Math.abs(normA - normB) > 0.01) return normA - normB;
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

    // If we just assigned half=1, try to assign half=2 to the same person
    // so both halves go to the same person unless constraints prevent it.
    if (cell.half === 1) {
      const half2Cell: CellAddress = { date: cell.date, shiftId: cell.shiftId, positionId: cell.positionId, half: 2 };
      const alreadyFilled = working.some(a => assignmentMatchesCell(a, half2Cell));
      if (!alreadyFilled) {
        const status2 = computeCellStatus(half2Cell, chosen.id, working, chosen, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, positions, ignoreOnCallConstraints);
        if (status2 === 'valid' || status2 === 'oncall-short-break' || status2 === 'oncall-override') {
          const a2: Assignment = { personId: chosen.id, date: cell.date, shiftId: cell.shiftId, positionId: cell.positionId, half: 2 };
          proposed.push(a2);
          working.push(a2);
        }
      }
    }
  }

  balanceSwaps(working, proposed, people, shifts, positions, minBreakHours, homeGroups, homeGroupPeriods, refDate, ignoreOnCallConstraints);

  return { proposed, skipped };
}
