import { getDay, parseISO, differenceInCalendarDays, addDays, format } from 'date-fns';
import type { Assignment, CellAddress, CellStatus, HomeGroup, HomeGroupPeriod, Person, Position, Shift, DayOfWeek } from '../types';
import { type Lang, tf, DAY_LABELS_HE } from './i18n';

/**
 * Returns true if the person (by homeGroupIds) is blocked for the given date+shift
 * based on their home group periods. Applies half-day rules:
 *   - departure day: shifts starting at or after 12:00 are blocked
 *   - return day: shifts starting before 12:00 are blocked
 *   - middle days: always blocked
 *
 * Night shifts (startHour < 6) are labeled on one date but physically occur the next
 * calendar day, so we check the physical date against the home period.
 */
export function isHomeGroupBlocked(
  date: string,
  shift: Shift,
  homeGroupIds: string[],
  _homeGroups: HomeGroup[],
  homeGroupPeriods: HomeGroupPeriod[],
): boolean {
  if (!homeGroupIds || homeGroupIds.length === 0) return false;

  const isNight = shift.startHour < 6;
  // Night shifts physically run on the next calendar day
  const physicalDate = isNight
    ? format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
    : date;

  for (const homeGroupId of homeGroupIds) {
    for (const period of homeGroupPeriods) {
      if (period.groupId !== homeGroupId) continue;
      if (physicalDate < period.startDate || physicalDate > period.endDate) continue;

      if (physicalDate === period.startDate) {
        // Departure day: blocked if shift starts at or after 12:00 on the physical date.
        // Night shifts (startHour < 6) physically start in the early morning of the next
        // calendar day — that's before noon, so they are NOT blocked on departure day.
        if (!isNight && shift.startHour >= 12) return true;
      } else if (physicalDate === period.endDate) {
        // Return day: blocked if shift starts before 12:00.
        // Use the real startHour — a night shift at 00:30 is early morning and should be blocked.
        if (shift.startHour < 12) return true;
      } else {
        // Full home day
        return true;
      }
    }
  }
  return false;
}

// Shifts with startHour < 6 (00:00–05:59) are "night shifts": in this schedule's
// convention they represent the overnight period of the PREVIOUS calendar day, so
// they physically occur one calendar day AFTER the date they are labelled with.
// For half-shift assignments (half=1 or half=2), the effective start is offset by
// half the duration for the second half.
function shiftStartMins(date: string, shift: Shift, refDate: string, half?: 1 | 2): number {
  const dayOffset = differenceInCalendarDays(parseISO(date), parseISO(refDate));
  const nightOffset = shift.startHour < 6 ? 1 : 0;
  const halfOffset = (half === 2 && shift.isHalfShift) ? shift.durationHours / 2 * 60 : 0;
  return (dayOffset + nightOffset) * 1440 + shift.startHour * 60 + halfOffset;
}
function shiftEndMins(date: string, shift: Shift, refDate: string, half?: 1 | 2): number {
  const duration = (half !== undefined && shift.isHalfShift) ? shift.durationHours / 2 : shift.durationHours;
  return shiftStartMins(date, shift, refDate, half) + duration * 60;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftWeight(shift: Shift): number {
  return shift.isHalfShift ? 0.5 : 1;
}

function countConsecutiveStreak(cellDate: Date, assignedDateSet: Set<string>): number {
  let streak = 1;
  let back = 1;
  while (assignedDateSet.has(format(addDays(cellDate, -back), 'yyyy-MM-dd'))) {
    streak++;
    back++;
  }
  let fwd = 1;
  while (assignedDateSet.has(format(addDays(cellDate, fwd), 'yyyy-MM-dd'))) {
    streak++;
    fwd++;
  }
  return streak;
}

type ConstraintViolation =
  | { type: 'allowedShift'; shiftName: string }
  | { type: 'blockedShift'; shiftName: string }
  | { type: 'allowedDay' }
  | { type: 'blockedDay'; dayIndex: DayOfWeek }
  | { type: 'maxWeek'; limit: number }
  | { type: 'maxTotal'; limit: number }
  | { type: 'maxConsecutive'; limit: number }
  | { type: 'minRest'; limit: number };

/**
 * Checks all repeating constraints for a given cell+person and returns the first
 * violation found, or null if none. Used by both computeCellStatus and
 * computeConstraintReason to avoid duplicating this logic.
 */
function checkConstraints(
  cell: CellAddress,
  personAssignments: Assignment[],
  constraints: NonNullable<Person['constraints']>,
  shifts: Shift[],
  targetShift: Shift,
): ConstraintViolation | null {
  const c = constraints;

  if (c.allowedShiftIds?.length && !c.allowedShiftIds.includes(cell.shiftId)) {
    const shift = shifts.find(s => s.id === cell.shiftId);
    return { type: 'allowedShift', shiftName: shift?.name ?? cell.shiftId };
  }

  if (c.blockedShiftIds?.length && c.blockedShiftIds.includes(cell.shiftId)) {
    const shift = shifts.find(s => s.id === cell.shiftId);
    return { type: 'blockedShift', shiftName: shift?.name ?? cell.shiftId };
  }

  if (c.allowedDaysOfWeek?.length) {
    const dow = getDay(parseISO(cell.date)) as DayOfWeek;
    if (!c.allowedDaysOfWeek.includes(dow)) {
      return { type: 'allowedDay' };
    }
  }

  if (c.blockedDaysOfWeek?.length) {
    const dow = getDay(parseISO(cell.date)) as DayOfWeek;
    if (c.blockedDaysOfWeek.includes(dow)) {
      return { type: 'blockedDay', dayIndex: dow };
    }
  }

  if (c.maxShiftsPerWeek != null) {
    const cellDate = parseISO(cell.date);
    const weekLoad = personAssignments
      .filter(a => {
        if (a.date === cell.date && a.shiftId === cell.shiftId) return false;
        return Math.abs(differenceInCalendarDays(parseISO(a.date), cellDate)) < 7;
      })
      .reduce((sum, a) => {
        const s = shifts.find(sh => sh.id === a.shiftId);
        return sum + (s ? shiftWeight(s) : 1);
      }, 0) + shiftWeight(targetShift);
    if (weekLoad > c.maxShiftsPerWeek) {
      return { type: 'maxWeek', limit: c.maxShiftsPerWeek };
    }
  }

  if (c.maxShiftsTotal != null) {
    const totalLoad = personAssignments
      .filter(a => !(a.date === cell.date && a.shiftId === cell.shiftId))
      .reduce((sum, a) => {
        const s = shifts.find(sh => sh.id === a.shiftId);
        return sum + (s ? shiftWeight(s) : 1);
      }, 0) + shiftWeight(targetShift);
    if (totalLoad > c.maxShiftsTotal) {
      return { type: 'maxTotal', limit: c.maxShiftsTotal };
    }
  }

  if (c.maxConsecutiveDays != null) {
    const cellDate = parseISO(cell.date);
    const assignedDateSet = new Set(
      personAssignments
        .filter(a => !(a.date === cell.date && a.shiftId === cell.shiftId))
        .map(a => a.date)
    );
    assignedDateSet.add(cell.date);
    if (countConsecutiveStreak(cellDate, assignedDateSet) > c.maxConsecutiveDays) {
      return { type: 'maxConsecutive', limit: c.maxConsecutiveDays };
    }
  }

  if (c.minRestDays != null) {
    const cellDate = parseISO(cell.date);
    for (const a of personAssignments) {
      if (a.date === cell.date && a.shiftId === cell.shiftId) continue;
      const gap = Math.abs(differenceInCalendarDays(cellDate, parseISO(a.date)));
      if (gap > 0 && gap <= c.minRestDays) {
        return { type: 'minRest', limit: c.minRestDays };
      }
    }
  }

  return null;
}

export function computeCellStatus(
  cell: CellAddress,
  personId: string,
  assignments: Assignment[],
  person: Person,
  shifts: Shift[],
  refDate: string,
  minBreakHours = 12,
  homeGroups: HomeGroup[] = [],
  homeGroupPeriods: HomeGroupPeriod[] = [],
  positions: Position[] = [],
  ignoreOnCallConstraints = false,
): CellStatus {
  const targetShift = shifts.find(s => s.id === cell.shiftId);
  if (!targetShift) return 'empty';

  const targetPosition = positions.find(p => p.id === cell.positionId);
  const isOnCallCell = targetPosition?.isOnCall ?? false;
  // When ignoreOnCallConstraints is on, unavailability and shift constraints are bypassed
  // for on-call cells, but home group and double-booking are always enforced.
  const bypassSoft = ignoreOnCallConstraints && isOnCallCell;

  const personAssignments = assignments.filter(a => a.personId === personId);

  // 1. Double-booked: same person, same date, same shiftId, same half, different position
  const doubleBooked = personAssignments.some(
    a => a.date === cell.date && a.shiftId === cell.shiftId &&
         (a.half ?? undefined) === (cell.half ?? undefined) && a.positionId !== cell.positionId
  );
  if (doubleBooked) return 'double-booked';

  // 2. Unavailable — always respected; bypass only when ignoreOnCallConstraints is on
  if (!bypassSoft) {
    const unavailable = person.unavailability.some(u => {
      if (u.date !== cell.date || u.shiftId !== cell.shiftId) return false;
      if (cell.half === undefined) return u.half === undefined;
      return u.half === cell.half || u.half === undefined;
    });
    if (unavailable) return 'unavailable';
  }

  // 2b. Home group — always respected regardless of toggle
  if (isHomeGroupBlocked(cell.date, targetShift, person.homeGroupIds ?? [], homeGroups, homeGroupPeriods)) {
    return 'home-group';
  }

  // 3. Unqualified — bypassed for on-call when toggle is on
  if (!bypassSoft && !person.qualifiedPositions.includes(cell.positionId)) return 'unqualified';

  // 4. Insufficient break
  const targetStart = shiftStartMins(cell.date, targetShift, refDate, cell.half);
  const targetEnd = shiftEndMins(cell.date, targetShift, refDate, cell.half);

  let shortBreakOnCall = false; // tracks if we hit an on-call reduced-break situation
  let breakOverride = false;    // tracks break violation bypassed by ignoreOnCallConstraints

  for (const a of personAssignments) {
    // Skip any assignment to the same shift on the same date — both halves form
    // one continuous block, so no break is required between them.
    if (a.date === cell.date && a.shiftId === cell.shiftId) continue;
    const existingShift = shifts.find(s => s.id === a.shiftId);
    if (!existingShift) continue;
    const existingStart = shiftStartMins(a.date, existingShift, refDate, a.half);
    const existingEnd = shiftEndMins(a.date, existingShift, refDate, a.half);

    // gap between the two shifts (negative means overlap)
    const gap = Math.max(targetStart - existingEnd, existingStart - targetEnd);
    if (gap < minBreakHours * 60) {
      const existingPosition = positions.find(p => p.id === a.positionId);
      if (targetPosition?.isOnCall && existingPosition?.isOnCall) {
        // On-call: consecutive shifts (gap ≥ 0) are allowed with a warning.
        // Only an actual time overlap (gap < 0) is a hard block.
        if (gap >= 0) {
          shortBreakOnCall = true;
        } else {
          return 'insufficient-break'; // actual overlap — hard block even with toggle
        }
      } else if (bypassSoft && gap >= 0) {
        // Break violation on on-call cell with toggle on: allowed as last resort with override warning
        breakOverride = true;
      } else {
        return 'insufficient-break';
      }
    }
  }

  if (shortBreakOnCall) return 'oncall-short-break';
  if (breakOverride) return 'oncall-override';

  // 5. Repeating constraint violation — bypassed for on-call when toggle is on
  if (person.constraints) {
    const violation = checkConstraints(cell, personAssignments, person.constraints, shifts, targetShift);
    if (violation) {
      if (!bypassSoft) return 'constraint-violation';
      return 'oncall-override';
    }
  }

  // Also mark as override if unavailability was bypassed
  if (bypassSoft) {
    const unavailable = person.unavailability.some(u => {
      if (u.date !== cell.date || u.shiftId !== cell.shiftId) return false;
      if (cell.half === undefined) return u.half === undefined;
      return u.half === cell.half || u.half === undefined;
    });
    if (unavailable) return 'oncall-override';
  }

  return 'valid';
}

export function computeConstraintReason(
  cell: CellAddress,
  personId: string,
  assignments: Assignment[],
  person: Person,
  shifts: Shift[],
  lang: Lang = 'en',
): string | null {
  if (!person.constraints) return null;
  const targetShift = shifts.find(s => s.id === cell.shiftId);
  if (!targetShift) return null;

  const personAssignments = assignments.filter(a => a.personId === personId);
  const violation = checkConstraints(cell, personAssignments, person.constraints, shifts, targetShift);
  if (!violation) return null;

  switch (violation.type) {
    case 'allowedShift': return tf.shiftNotAllowed(lang, violation.shiftName);
    case 'blockedShift': return tf.blockedShift(lang, violation.shiftName);
    case 'allowedDay': return tf.dayNotAllowed(lang);
    case 'blockedDay': {
      const dayName = lang === 'he' ? DAY_LABELS_HE[violation.dayIndex] : DAY_NAMES[violation.dayIndex];
      return tf.blockedDay(lang, dayName);
    }
    case 'maxWeek': return tf.maxWeek(lang, violation.limit);
    case 'maxTotal': return tf.maxTotal(lang, violation.limit);
    case 'maxConsecutive': return tf.maxConsecutive(lang, violation.limit);
    case 'minRest': return tf.minRest(lang, violation.limit);
  }
}
