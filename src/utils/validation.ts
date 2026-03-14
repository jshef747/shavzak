import { getDay, parseISO, differenceInCalendarDays, addDays, format } from 'date-fns';
import type { Assignment, CellAddress, CellStatus, HomeGroup, HomeGroupPeriod, Person, Shift, DayOfWeek } from '../types';
import { type Lang, tf, DAY_LABELS_HE } from './i18n';

/**
 * Returns true if the person (by homeGroupId) is blocked for the given date+shift
 * based on their home group periods. Applies half-day rules:
 *   - departure day: shifts starting at or after 12:00 are blocked
 *   - return day: shifts starting before 12:00 are blocked
 *   - middle days: always blocked
 */
export function isHomeGroupBlocked(
  date: string,
  shift: Shift,
  homeGroupId: string | null,
  homeGroups: HomeGroup[],
  homeGroupPeriods: HomeGroupPeriod[],
): boolean {
  if (!homeGroupId) return false;
  const group = homeGroups.find(g => g.id === homeGroupId);
  if (!group) return false;

  for (const period of homeGroupPeriods) {
    if (period.groupId !== homeGroupId) continue;
    if (date < period.startDate || date > period.endDate) continue;

    if (date === period.startDate) {
      // Departure day: shifts starting at or after 12 are blocked
      if (shift.startHour >= 12) return true;
    } else if (date === period.endDate) {
      // Return day: shifts starting before 12 are blocked
      if (shift.startHour < 12) return true;
    } else {
      // Full home day
      return true;
    }
  }
  return false;
}

// Shifts with startHour < 6 (00:00–05:59) are "night shifts": in this schedule's
// convention they represent the overnight period of the PREVIOUS calendar day, so
// they physically occur one calendar day AFTER the date they are labelled with.
function shiftStartMins(date: string, shift: Shift, refDate: string): number {
  const dayOffset = differenceInCalendarDays(parseISO(date), parseISO(refDate));
  const nightOffset = shift.startHour < 6 ? 1 : 0;
  return (dayOffset + nightOffset) * 1440 + shift.startHour * 60;
}
function shiftEndMins(date: string, shift: Shift, refDate: string): number {
  return shiftStartMins(date, shift, refDate) + shift.durationHours * 60;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
): CellStatus {
  const targetShift = shifts.find(s => s.id === cell.shiftId);
  if (!targetShift) return 'empty';

  const personAssignments = assignments.filter(a => a.personId === personId);

  // 1. Double-booked: same person, same date, same shiftId, different position
  const doubleBooked = personAssignments.some(
    a => a.date === cell.date && a.shiftId === cell.shiftId && a.positionId !== cell.positionId
  );
  if (doubleBooked) return 'double-booked';

  // 2. Unavailable
  const unavailable = person.unavailability.some(
    u => u.date === cell.date && u.shiftId === cell.shiftId
  );
  if (unavailable) return 'unavailable';

  // 2b. Home group
  if (isHomeGroupBlocked(cell.date, targetShift, person.homeGroupId ?? null, homeGroups, homeGroupPeriods)) {
    return 'home-group';
  }

  // 3. Unqualified
  if (!person.qualifiedPositions.includes(cell.positionId)) return 'unqualified';

  // 4. Insufficient break
  const targetStart = shiftStartMins(cell.date, targetShift, refDate);
  const targetEnd = shiftEndMins(cell.date, targetShift, refDate);

  for (const a of personAssignments) {
    if (a.date === cell.date && a.shiftId === cell.shiftId) continue; // same slot, skip
    const existingShift = shifts.find(s => s.id === a.shiftId);
    if (!existingShift) continue;
    const existingStart = shiftStartMins(a.date, existingShift, refDate);
    const existingEnd = shiftEndMins(a.date, existingShift, refDate);

    // gap between the two shifts (negative means overlap)
    const gap = Math.max(targetStart - existingEnd, existingStart - targetEnd);
    if (gap < minBreakHours * 60) return 'insufficient-break';
  }

  // 5. Repeating constraint violation
  if (person.constraints) {
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
      if (weekAssignments.length >= c.maxShiftsPerWeek) {
        return 'constraint-violation';
      }
    }

    // 5d. Max total
    if (c.maxShiftsTotal != null) {
      const otherAssignments = personAssignments.filter(
        a => !(a.date === cell.date && a.shiftId === cell.shiftId)
      );
      if (otherAssignments.length >= c.maxShiftsTotal) {
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
    if (weekAssignments.length >= c.maxShiftsPerWeek) {
      return tf.maxWeek(lang, c.maxShiftsPerWeek);
    }
  }

  if (c.maxShiftsTotal != null) {
    const otherAssignments = personAssignments.filter(
      a => !(a.date === cell.date && a.shiftId === cell.shiftId)
    );
    if (otherAssignments.length >= c.maxShiftsTotal) {
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
