import { addDays, format, parseISO } from 'date-fns';
import { computeCellStatus } from './validation';
import { assignmentMatchesCell, getOnCallSlots, isOnCallSlotShiftId } from './cellKey';
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
function onCallHours(personId: string, assignments: Assignment[], positionMap: Map<string, Position>, shiftMap: Map<string, Shift>, onCallDurationOverrides?: Record<string, Record<string, number>>): number {
  return assignments
    .filter(a => a.personId === personId && (positionMap.get(a.positionId)?.isOnCall ?? false))
    .reduce((sum, a) => {
      const pos = positionMap.get(a.positionId);
      if (pos?.isOnCall && pos.onCallDurationHours != null) {
        const effectiveDuration = onCallDurationOverrides?.[a.date]?.[a.positionId] ?? pos.onCallDurationHours;
        return sum + (a.half !== undefined ? effectiveDuration / 2 : effectiveDuration);
      }
      const shift = shiftMap.get(a.shiftId);
      if (!shift) return sum;
      return sum + (a.half !== undefined ? shift.durationHours / 2 : shift.durationHours);
    }, 0);
}

/** Returns total hours of regular (non-on-call) assignments for a person. */
function regularHours(personId: string, assignments: Assignment[], positionMap: Map<string, Position>, shiftMap: Map<string, Shift>): number {
  return assignments
    .filter(a => a.personId === personId && !(positionMap.get(a.positionId)?.isOnCall ?? false))
    .reduce((sum, a) => {
      const shift = shiftMap.get(a.shiftId);
      if (!shift) return sum;
      return sum + (a.half !== undefined ? shift.durationHours / 2 : shift.durationHours);
    }, 0);
}

/** On-call hours are weighted at 1/3 for fairness balancing:
 *  on-call is passive duty, so 24h on-call ≈ 8h of active shift work. */
const ON_CALL_HOUR_WEIGHT = 1 / 3;

/** Returns weighted total hours for fairness balancing.
 *  On-call hours are multiplied by ON_CALL_HOUR_WEIGHT (1/3) so that people
 *  who do on-call still get a fair share of regular shifts.
 *  Half-shift assignments count as half the shift's duration. */
function totalHours(personId: string, assignments: Assignment[], shiftMap: Map<string, Shift>, positionMap: Map<string, Position>, onCallDurationOverrides?: Record<string, Record<string, number>>): number {
  return assignments
    .filter(a => a.personId === personId)
    .reduce((sum, a) => {
      const pos = positionMap.get(a.positionId);
      if (pos?.isOnCall && pos.onCallDurationHours != null) {
        const effectiveDuration = onCallDurationOverrides?.[a.date]?.[a.positionId] ?? pos.onCallDurationHours;
        const raw = a.half !== undefined ? effectiveDuration / 2 : effectiveDuration;
        return sum + raw * ON_CALL_HOUR_WEIGHT;
      }
      const shift = shiftMap.get(a.shiftId);
      if (!shift) return sum;
      return sum + (a.half !== undefined ? shift.durationHours / 2 : shift.durationHours);
    }, 0);
}

/** Returns how many times a person has been assigned to a specific position. */
function positionCount(personId: string, positionId: string, assignments: Assignment[]): number {
  return assignments.filter(a => a.personId === personId && a.positionId === positionId).length;
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
  shiftStartHour: number,
  homeGroupPeriods: HomeGroupPeriod[],
): number {
  if (!person.homeGroupIds?.length) return 0;

  const isNight = shiftStartHour < 6;
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
    if (!isNight && cell.date === dayBeforeDeparture && shiftStartHour >= 12) {
      // Afternoon/evening shift the day before — penalty 3 (prefer not to, ערב should be last)
      return 3;
    }
  }
  return 0;
}

/**
 * Returns how many consecutive prior days a person had the same shiftId.
 * Looks back up to maxLookback days. Stops as soon as the streak is broken.
 * Used as a soft penalty to encourage shift variety across days.
 */
function consecutiveShiftPenalty(
  cell: CellAddress,
  personId: string,
  assignments: Assignment[],
  maxLookback = 3,
): number {
  // On-call slots use virtual shiftIds — no meaningful streak to penalise
  if (cell.shiftId.startsWith('oncall-')) return 0;
  let penalty = 0;
  const cellDate = parseISO(cell.date);
  for (let i = 1; i <= maxLookback; i++) {
    const prevDate = format(addDays(cellDate, -i), 'yyyy-MM-dd');
    const found = assignments.some(
      a => a.personId === personId && a.date === prevDate && a.shiftId === cell.shiftId,
    );
    if (found) penalty++;
    else break;
  }
  return penalty;
}

/**
 * Returns how many times a person has been assigned a specific shiftId.
 * On-call virtual shiftIds (oncall-*) return 0 — variety scoring is
 * not meaningful for on-call slots.
 * Half-shift assignments count as 0.5.
 */
function shiftTypeCount(
  personId: string,
  shiftId: string,
  assignments: Assignment[],
): number {
  if (shiftId.startsWith('oncall-')) return 0;
  return assignments
    .filter(a => a.personId === personId && a.shiftId === shiftId)
    .reduce((sum, a) => sum + (a.half !== undefined ? 0.5 : 1), 0);
}

/**
 * Returns the number of on-call assignments a person has, regardless of slot index.
 * Used to spread on-call duty evenly across qualified people.
 */
function onCallAssignmentCount(
  personId: string,
  assignments: Assignment[],
  positionMap: Map<string, Position>,
): number {
  return assignments.filter(
    a => a.personId === personId && (positionMap.get(a.positionId)?.isOnCall ?? false),
  ).length;
}

/**
 * Auto-assigns people to all empty cells in the schedule.
 *
 * Strategy: fairness — always pick the qualified candidate with the fewest
 * total assigned hours. Tie-break: shift variety, then consecutive-shift
 * avoidance, then primary-hour balance, then position rotation, then random.
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
  avoidHalfShifts = false,
  onCallDurationOverrides?: Record<string, Record<string, number>>,
): AutoAssignResult {
  const proposed: Assignment[] = [];
  const skipped: SkippedCell[] = [];

  // Working copy of assignments — updated as the algorithm assigns, so that
  // break / week-limit checks account for assignments made in this very run.
  // When reassign=true, we start from scratch (ignore existing assignments).
  const working: Assignment[] = reassign ? [] : [...schedule.assignments];

  // Reference date for shiftStartMins calculations (earliest schedule date).
  const refDate = schedule.startDate;

  // Pre-build lookup maps to avoid O(n) array searches inside hot loops.
  const shiftMap = new Map(shifts.map(s => [s.id, s]));
  const positionMap = new Map(positions.map(p => [p.id, p]));
  // Virtual on-call slot start hours (built after dayStartHour is known, placeholder here).
  const onCallSlotStartHour = new Map<string, number>();

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

  // Day start hour = earliest shift (same logic as display)
  const dayStartHour = shifts.length > 0
    ? Math.min(...shifts.map(s => s.startHour < 6 ? s.startHour + 24 : s.startHour)) % 24
    : 0;

  // Build per-date slot lists first, then interleave across dates.
  type SlotList = CellAddress[];
  const fullByDate: SlotList[] = dates.map(() => []);
  const halfByDate: SlotList[] = dates.map(() => []);

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];

    // Collect on-call and regular cells separately, then zip them together
    // so the algorithm alternates between on-call and regular assignments.
    // This prevents all on-call from being processed before any regular shifts.
    const onCallCells: CellAddress[] = [];
    const regularCells: CellAddress[] = [];

    // On-call positions: use per-day override if present, otherwise fall back to
    // the position's global onCallDurationHours. Skip only if neither is defined.
    const dayOverrides = onCallDurationOverrides?.[date];
    for (const position of positions) {
      if (!position.isOnCall) continue;
      const explicitDuration = dayOverrides?.[position.id];
      const duration = explicitDuration ?? position.onCallDurationHours;
      if (duration == null) continue; // no duration available → skip
      const slotPosition = { ...position, onCallDurationHours: duration };
      const slots = getOnCallSlots(slotPosition, dayStartHour);
      // Populate start-hour map so departure-penalty scoring uses correct times per day
      for (const slot of slots) onCallSlotStartHour.set(slot.shiftId, slot.startHour % 24);
      for (const slot of slots) {
        const cell: CellAddress = { date, shiftId: slot.shiftId, positionId: position.id };
        const occupied = working.some(a => assignmentMatchesCell(a, cell));
        if (!occupied) onCallCells.push(cell);
      }
    }

    // Regular positions: iterate shifts as before
    for (const shift of sortedShifts) {
      const halves: Array<1 | 2 | undefined> = shift.isHalfShift ? [1, 2] : [undefined];
      for (const half of halves) {
        if (avoidHalfShifts && half !== undefined) continue;
        for (const position of positions) {
          if (position.isOnCall && position.onCallDurationHours != null) continue; // handled above
          const cell: CellAddress = {
            date,
            shiftId: shift.id,
            positionId: position.id,
            ...(half !== undefined ? { half } : {}),
          };
          const occupied = working.some(a => assignmentMatchesCell(a, cell));
          if (!occupied) {
            if (half !== undefined) halfByDate[di].push(cell);
            else regularCells.push(cell);
          }
        }
      }
    }

    // Zip on-call and regular cells: [oncall-0, regular-0, oncall-1, regular-1, ...]
    const maxLen = Math.max(onCallCells.length, regularCells.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < onCallCells.length) fullByDate[di].push(onCallCells[i]);
      if (i < regularCells.length) fullByDate[di].push(regularCells[i]);
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
    // Build positions with the explicit per-day override applied (same logic used when building cells).
    const cellDayOverrides = onCallDurationOverrides?.[cell.date];
    const cellPositions = positions.map(p =>
      p.isOnCall && cellDayOverrides?.[p.id] != null
        ? { ...p, onCallDurationHours: cellDayOverrides[p.id] }
        : p
    );
    const statuses = qualified.map(person => ({
      person,
      status: computeCellStatus(cell, person.id, working, person, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, cellPositions, ignoreOnCallConstraints, onCallDurationOverrides),
    }));

    const isOnCallPosition = positionMap.get(cell.positionId)?.isOnCall ?? false;
    const valid = statuses.filter(s => s.status === 'valid');
    const oncallWarn = statuses.filter(s => s.status === 'oncall-short-break');
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
    //   3. Raw total hours (asc) — primary fairness metric
    //   4. On-call count (asc, on-call cells only) — spread on-call duty evenly
    //   5. Shift type count for this shiftId (asc) — encourage even distribution across shift types
    //   6. Consecutive same-shift penalty (asc) — avoid back-to-back same shifts
    //   7. Primary hours for this cell type (asc) — balance on-call vs regular separately
    //   8. Times assigned to THIS specific position (asc) — rotation across positions
    //   9. Random — avoids alphabetical bias
    const cellStartHour = isOnCallSlotShiftId(cell.shiftId)
      ? (onCallSlotStartHour.get(cell.shiftId) ?? 0)
      : (shiftMap.get(cell.shiftId)?.startHour ?? 0);
    const withRand = candidates.map(c => ({ ...c, rand: Math.random() }));
    withRand.sort((a, b) => {
      const fA = a.person.forceMinimum ? 0 : 1;
      const fB = b.person.forceMinimum ? 0 : 1;
      if (fA !== fB) return fA - fB;
      const penA = departurePenalty(cell, a.person, cellStartHour, homeGroupPeriods);
      const penB = departurePenalty(cell, b.person, cellStartHour, homeGroupPeriods);
      if (penA !== penB) return penA - penB;
      // Raw total hours — primary fairness metric (no normalization)
      const totA = totalHours(a.person.id, working, shiftMap, positionMap, onCallDurationOverrides);
      const totB = totalHours(b.person.id, working, shiftMap, positionMap, onCallDurationOverrides);
      if (Math.abs(totA - totB) > 0.01) return totA - totB;
      // On-call count — for on-call cells, prefer people with fewer on-call assignments
      if (isOnCallPosition) {
        const occA = onCallAssignmentCount(a.person.id, working, positionMap);
        const occB = onCallAssignmentCount(b.person.id, working, positionMap);
        if (occA !== occB) return occA - occB;
      }
      // Shift type count — prefer assigning to a shift type the person has had less of
      const stcA = shiftTypeCount(a.person.id, cell.shiftId, working);
      const stcB = shiftTypeCount(b.person.id, cell.shiftId, working);
      if (Math.abs(stcA - stcB) > 0.01) return stcA - stcB;
      const cspA = consecutiveShiftPenalty(cell, a.person.id, working);
      const cspB = consecutiveShiftPenalty(cell, b.person.id, working);
      if (cspA !== cspB) return cspA - cspB;
      // Balance by the relevant hour type: on-call hours for on-call cells,
      // regular hours for regular cells.
      const primaryA = isOnCallPosition
        ? onCallHours(a.person.id, working, positionMap, shiftMap, onCallDurationOverrides)
        : regularHours(a.person.id, working, positionMap, shiftMap);
      const primaryB = isOnCallPosition
        ? onCallHours(b.person.id, working, positionMap, shiftMap, onCallDurationOverrides)
        : regularHours(b.person.id, working, positionMap, shiftMap);
      if (Math.abs(primaryA - primaryB) > 0.01) return primaryA - primaryB;
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
        const status2 = computeCellStatus(half2Cell, chosen.id, working, chosen, shifts, refDate, minBreakHours, homeGroups, homeGroupPeriods, positions, ignoreOnCallConstraints, onCallDurationOverrides);
        if (status2 === 'valid' || status2 === 'oncall-short-break' || status2 === 'oncall-override') {
          const a2: Assignment = { personId: chosen.id, date: cell.date, shiftId: cell.shiftId, positionId: cell.positionId, half: 2 };
          proposed.push(a2);
          working.push(a2);
        }
      }
    }
  }

  return { proposed, skipped };
}
