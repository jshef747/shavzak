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
  homeGroups: HomeGroup[],
  homeGroupPeriods: HomeGroupPeriod[],
): boolean {
  if (!homeGroupIds || homeGroupIds.length === 0) return false;

  // Night shifts (startHour < 6) physically run on the next calendar day
  const physicalDate = shift.startHour < 6
    ? format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
    : date;
  // The effective start hour for half-day boundary checks is still the labeled hour,
  // but shifted by 24 so it's always treated as "after noon" (i.e. always blocks on
  // departure day and never blocks on return day — the person is away that whole physical day).
  const effectiveStartHour = shift.startHour < 6 ? shift.startHour + 24 : shift.startHour;

  for (const homeGroupId of homeGroupIds) {
    const group = homeGroups.find(g => g.id === homeGroupId);
    if (!group) continue;

    for (const period of homeGroupPeriods) {
      if (period.groupId !== homeGroupId) continue;
      if (physicalDate < period.startDate || physicalDate > period.endDate) continue;

      if (physicalDate === period.startDate) {
        // Departure day: shifts starting at or after 12 are blocked
        if (effectiveStartHour >= 12) return true;
      } else if (physicalDate === period.endDate) {
        // Return day: shifts starting before 12 are blocked
        if (effectiveStartHour < 12) return true;
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
  if (!bypassSoft && person.constraints) {
    const c = person.constraints;

    // 5a. Allowed shifts
    if (c.allowedShiftIds && c.allowedShiftIds.length > 0 && !c.allowedShiftIds.includes(cell.shiftId)) {
      return 'constraint-violation';
    }

    // 5b. Allowed days of week
    if (c.allowedDaysOfWeek && c.allowedDaysOfWeek.length > 0) {
      const dow = getDay(parseISO(cell.date)) as DayOfWeek;
      if (!c.allowedDaysOfWeek.includes(dow)) {
        return 'constraint-violation';
      }
    }

    // 5c. Max per week (rolling 7-day window)
    if (c.maxShiftsPerWeek != null) {
      const cellDate = parseISO(cell.date);
      const weekAssignments = personAssignments.filter(a => {
        if (a.date === cell.date && a.shiftId === cell.shiftId) return false; // same slot
        const diff = Math.abs(differenceInCalendarDays(parseISO(a.date), cellDate));
        return diff < 7;
      });
      const weekLoad = weekAssignments.reduce((sum, a) => {
        const s = shifts.find(sh => sh.id === a.shiftId);
        return sum + (s ? shiftWeight(s) : 1);
      }, 0) + shiftWeight(targetShift);
      if (weekLoad > c.maxShiftsPerWeek) {
        return 'constraint-violation';
      }
    }

    // 5d. Max total
    if (c.maxShiftsTotal != null) {
      const otherAssignments = personAssignments.filter(
        a => !(a.date === cell.date && a.shiftId === cell.shiftId)
      );
      const totalLoad = otherAssignments.reduce((sum, a) => {
        const s = shifts.find(sh => sh.id === a.shiftId);
        return sum + (s ? shiftWeight(s) : 1);
      }, 0) + shiftWeight(targetShift);
      if (totalLoad > c.maxShiftsTotal) {
        return 'constraint-violation';
      }
    }

    // 5e. Blocked shifts
    if (c.blockedShiftIds?.length && c.blockedShiftIds.includes(cell.shiftId)) {
      return 'constraint-violation';
    }

    // 5f. Blocked days of week
    if (c.blockedDaysOfWeek?.length) {
      const dow = getDay(parseISO(cell.date)) as DayOfWeek;
      if (c.blockedDaysOfWeek.includes(dow)) {
        return 'constraint-violation';
      }
    }

    // 5g. Max consecutive days
    if (c.maxConsecutiveDays != null) {
      const cellDate = parseISO(cell.date);
      const assignedDateSet = new Set(
        personAssignments
          .filter(a => !(a.date === cell.date && a.shiftId === cell.shiftId))
          .map(a => a.date)
      );
      assignedDateSet.add(cell.date);
      const streak = countConsecutiveStreak(cellDate, assignedDateSet);
      if (streak > c.maxConsecutiveDays) {
        return 'constraint-violation';
      }
    }

    // 5h. Min rest days between shifts
    if (c.minRestDays != null) {
      const cellDate = parseISO(cell.date);
      for (const a of personAssignments) {
        if (a.date === cell.date && a.shiftId === cell.shiftId) continue;
        const gap = Math.abs(differenceInCalendarDays(cellDate, parseISO(a.date)));
        if (gap > 0 && gap <= c.minRestDays) {
          return 'constraint-violation';
        }
      }
    }
  } else if (bypassSoft && person.constraints) {
    // Constraints exist but are being bypassed — flag with override warning
    const c = person.constraints;
    const wouldViolate =
      (c.allowedShiftIds?.length && !c.allowedShiftIds.includes(cell.shiftId)) ||
      (c.blockedShiftIds?.length && c.blockedShiftIds.includes(cell.shiftId)) ||
      (c.allowedDaysOfWeek?.length && !c.allowedDaysOfWeek.includes(getDay(parseISO(cell.date)) as DayOfWeek)) ||
      (c.blockedDaysOfWeek?.length && c.blockedDaysOfWeek.includes(getDay(parseISO(cell.date)) as DayOfWeek)) ||
      (() => {
        if (c.maxShiftsPerWeek == null) return false;
        const cellDate = parseISO(cell.date);
        const weekLoad = personAssignments
          .filter(a => !(a.date === cell.date && a.shiftId === cell.shiftId) && Math.abs(differenceInCalendarDays(parseISO(a.date), cellDate)) < 7)
          .reduce((sum, a) => { const s = shifts.find(sh => sh.id === a.shiftId); return sum + (s ? shiftWeight(s) : 1); }, 0) + shiftWeight(targetShift);
        return weekLoad > c.maxShiftsPerWeek;
      })() ||
      (() => {
        if (c.maxShiftsTotal == null) return false;
        const totalLoad = personAssignments.filter(a => !(a.date === cell.date && a.shiftId === cell.shiftId))
          .reduce((sum, a) => { const s = shifts.find(sh => sh.id === a.shiftId); return sum + (s ? shiftWeight(s) : 1); }, 0) + shiftWeight(targetShift);
        return totalLoad > c.maxShiftsTotal;
      })() ||
      (() => {
        if (c.maxConsecutiveDays == null) return false;
        const cellDate = parseISO(cell.date);
        const assignedDateSet = new Set(personAssignments.filter(a => !(a.date === cell.date && a.shiftId === cell.shiftId)).map(a => a.date));
        assignedDateSet.add(cell.date);
        return countConsecutiveStreak(cellDate, assignedDateSet) > c.maxConsecutiveDays;
      })() ||
      (() => {
        if (c.minRestDays == null) return false;
        const cellDate = parseISO(cell.date);
        return personAssignments.some(a => {
          if (a.date === cell.date && a.shiftId === cell.shiftId) return false;
          const gap = Math.abs(differenceInCalendarDays(cellDate, parseISO(a.date)));
          return gap > 0 && gap <= c.minRestDays!;
        });
      })();
    if (wouldViolate) return 'oncall-override';
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
  const c = person.constraints;
  const personAssignments = assignments.filter(a => a.personId === personId);

  if (c.allowedShiftIds?.length && !c.allowedShiftIds.includes(cell.shiftId)) {
    const shift = shifts.find(s => s.id === cell.shiftId);
    return tf.shiftNotAllowed(lang, shift?.name ?? cell.shiftId);
  }

  if (c.blockedShiftIds?.length && c.blockedShiftIds.includes(cell.shiftId)) {
    const shift = shifts.find(s => s.id === cell.shiftId);
    return tf.blockedShift(lang, shift?.name ?? cell.shiftId);
  }

  if (c.allowedDaysOfWeek?.length) {
    const dow = getDay(parseISO(cell.date)) as DayOfWeek;
    if (!c.allowedDaysOfWeek.includes(dow)) {
      return tf.dayNotAllowed(lang);
    }
  }

  if (c.blockedDaysOfWeek?.length) {
    const dow = getDay(parseISO(cell.date)) as DayOfWeek;
    if (c.blockedDaysOfWeek.includes(dow)) {
      const dayName = lang === 'he' ? DAY_LABELS_HE[dow] : DAY_NAMES[dow];
      return tf.blockedDay(lang, dayName);
    }
  }

  if (c.maxShiftsPerWeek != null) {
    const cellDate = parseISO(cell.date);
    const weekAssignments = personAssignments.filter(a => {
      if (a.date === cell.date && a.shiftId === cell.shiftId) return false;
      return Math.abs(differenceInCalendarDays(parseISO(a.date), cellDate)) < 7;
    });
    const targetShift = shifts.find(s => s.id === cell.shiftId);
    const weekLoad = weekAssignments.reduce((sum, a) => {
      const s = shifts.find(sh => sh.id === a.shiftId);
      return sum + (s ? shiftWeight(s) : 1);
    }, 0) + (targetShift ? shiftWeight(targetShift) : 1);
    if (weekLoad > c.maxShiftsPerWeek) {
      return tf.maxWeek(lang, c.maxShiftsPerWeek);
    }
  }

  if (c.maxShiftsTotal != null) {
    const otherAssignments = personAssignments.filter(
      a => !(a.date === cell.date && a.shiftId === cell.shiftId)
    );
    const targetShift = shifts.find(s => s.id === cell.shiftId);
    const totalLoad = otherAssignments.reduce((sum, a) => {
      const s = shifts.find(sh => sh.id === a.shiftId);
      return sum + (s ? shiftWeight(s) : 1);
    }, 0) + (targetShift ? shiftWeight(targetShift) : 1);
    if (totalLoad > c.maxShiftsTotal) {
      return tf.maxTotal(lang, c.maxShiftsTotal);
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
    const streak = countConsecutiveStreak(cellDate, assignedDateSet);
    if (streak > c.maxConsecutiveDays) {
      return tf.maxConsecutive(lang, c.maxConsecutiveDays);
    }
  }

  if (c.minRestDays != null) {
    const cellDate = parseISO(cell.date);
    for (const a of personAssignments) {
      if (a.date === cell.date && a.shiftId === cell.shiftId) continue;
      const gap = Math.abs(differenceInCalendarDays(cellDate, parseISO(a.date)));
      if (gap > 0 && gap <= c.minRestDays) {
        return tf.minRest(lang, c.minRestDays);
      }
    }
  }

  return null;
}
