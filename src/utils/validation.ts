import { getDay, parseISO, differenceInCalendarDays, addDays, format } from 'date-fns';
import type { Assignment, CellAddress, CellStatus, Person, Shift, DayOfWeek } from '../types';
import { type Lang, tf, DAY_LABELS_HE } from './i18n';
import { ONCALL_POSITION_ID } from '../constants';

// Shifts with startHour < 6 (00:00–05:59) are "night shifts": in this schedule's
// convention they represent the overnight period of the PREVIOUS calendar day, so
// they physically occur one calendar day AFTER the date they are labelled with.
//
// For half-shifts, the effective window is half the duration:
//   halfSlot 1 → [shiftStart, shiftStart + dur/2)
//   halfSlot 2 → [shiftStart + dur/2, shiftStart + dur)
function shiftStartMins(date: string, shift: Shift, refDate: string, halfSlot?: 1 | 2): number {
  const dayOffset = differenceInCalendarDays(parseISO(date), parseISO(refDate));
  const nightOffset = shift.startHour < 6 ? 1 : 0;
  const baseStart = (dayOffset + nightOffset) * 1440 + shift.startHour * 60;
  if (halfSlot === 2) return baseStart + (shift.durationHours / 2) * 60;
  return baseStart;
}
function shiftEndMins(date: string, shift: Shift, refDate: string, halfSlot?: 1 | 2): number {
  const start = shiftStartMins(date, shift, refDate, halfSlot);
  const effectiveDuration = halfSlot ? shift.durationHours / 2 : shift.durationHours;
  return start + effectiveDuration * 60;
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
): CellStatus {
  const targetShift = shifts.find(s => s.id === cell.shiftId);
  if (!targetShift) return 'empty';

  const personAssignments = assignments.filter(a => a.personId === personId);

  // 1. Double-booked checks
  //    a) Same date+shiftId in a different regular position (or different halfSlot of same position)
  //    b) On-call blocks regular: if assigning regular position, person can't be on-call same shift/date
  //    c) Regular blocks on-call: if assigning on-call slot, person can't have a regular assignment same shift/date
  for (const a of personAssignments) {
    if (a.date !== cell.date || a.shiftId !== cell.shiftId) continue;

    // Skip the exact same cell
    if (
      a.positionId === cell.positionId &&
      (a.halfSlot ?? undefined) === (cell.halfSlot ?? undefined) &&
      !!(a.isOncall) === !!(cell.isOncall)
    ) continue;

    // On-call mutual exclusion: on-call and regular assignments on same shift/date are incompatible
    if (!!(a.isOncall) !== !!(cell.isOncall)) return 'double-booked';

    // Different regular position → double-booked
    if (!a.isOncall && !cell.isOncall && a.positionId !== cell.positionId) return 'double-booked';

    // Same position, different halfSlot → double-booked (can't be in both halves)
    if (
      a.positionId === cell.positionId &&
      (a.halfSlot ?? undefined) !== (cell.halfSlot ?? undefined)
    ) return 'double-booked';
  }

  // 2. Unavailable
  const unavailable = person.unavailability.some(
    u => u.date === cell.date && u.shiftId === cell.shiftId
  );
  if (unavailable) return 'unavailable';

  // 3. Unqualified (on-call slots use ONCALL_POSITION_ID — no position qualification needed)
  if (!cell.isOncall && !person.qualifiedPositions.includes(cell.positionId)) return 'unqualified';

  // 4. Insufficient break
  const targetStart = shiftStartMins(cell.date, targetShift, refDate, cell.halfSlot);
  const targetEnd = shiftEndMins(cell.date, targetShift, refDate, cell.halfSlot);

  for (const a of personAssignments) {
    if (a.date === cell.date && a.shiftId === cell.shiftId) continue; // same shift, skip
    const existingShift = shifts.find(s => s.id === a.shiftId);
    if (!existingShift) continue;
    const existingStart = shiftStartMins(a.date, existingShift, refDate, a.halfSlot);
    const existingEnd = shiftEndMins(a.date, existingShift, refDate, a.halfSlot);

    // gap between the two shifts (negative means overlap)
    const gap = Math.max(targetStart - existingEnd, existingStart - targetEnd);
    // gap == 0: directly adjacent (allowed for back-to-back half shifts)
    // gap < 0: overlap (always forbidden)
    // 0 < gap < minBreak: too close but not overlapping (forbidden)
    if (gap < 0 || (gap > 0 && gap < minBreakHours * 60)) return 'insufficient-break';
  }

  // 5. Repeating constraint violation (not applied to on-call assignments — on-call is flexible by nature)
  if (!cell.isOncall && person.constraints) {
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

    // 5c. Max per week (rolling 7-day window) — count only regular assignments
    if (c.maxShiftsPerWeek != null) {
      const cellDate = parseISO(cell.date);
      const weekAssignments = personAssignments.filter(a => {
        if (a.isOncall) return false; // on-call don't count toward weekly limit
        if (a.date === cell.date && a.shiftId === cell.shiftId) return false;
        const diff = Math.abs(differenceInCalendarDays(parseISO(a.date), cellDate));
        return diff < 7;
      });
      if (weekAssignments.length >= c.maxShiftsPerWeek) {
        return 'constraint-violation';
      }
    }

    // 5d. Max total — count only regular assignments
    if (c.maxShiftsTotal != null) {
      const otherAssignments = personAssignments.filter(
        a => !a.isOncall && !(a.date === cell.date && a.shiftId === cell.shiftId)
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
          .filter(a => !a.isOncall && !(a.date === cell.date && a.shiftId === cell.shiftId))
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
        if (a.isOncall) continue; // on-call don't trigger rest-day requirement
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
  if (!person.constraints || cell.isOncall) return null;
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
      if (a.isOncall) return false;
      if (a.date === cell.date && a.shiftId === cell.shiftId) return false;
      return Math.abs(differenceInCalendarDays(parseISO(a.date), cellDate)) < 7;
    });
    if (weekAssignments.length >= c.maxShiftsPerWeek) {
      return tf.maxWeek(lang, c.maxShiftsPerWeek);
    }
  }

  if (c.maxShiftsTotal != null) {
    const otherAssignments = personAssignments.filter(
      a => !a.isOncall && !(a.date === cell.date && a.shiftId === cell.shiftId)
    );
    if (otherAssignments.length >= c.maxShiftsTotal) {
      return tf.maxTotal(lang, c.maxShiftsTotal);
    }
  }

  if (c.maxConsecutiveDays != null) {
    const cellDate = parseISO(cell.date);
    const assignedDateSet = new Set(
      personAssignments
        .filter(a => !a.isOncall && !(a.date === cell.date && a.shiftId === cell.shiftId))
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
      if (a.isOncall) continue;
      if (a.date === cell.date && a.shiftId === cell.shiftId) continue;
      const gap = Math.abs(differenceInCalendarDays(cellDate, parseISO(a.date)));
      if (gap > 0 && gap <= c.minRestDays) {
        return tf.minRest(lang, c.minRestDays);
      }
    }
  }

  return null;
}

// Re-export ONCALL_POSITION_ID for convenience in components
export { ONCALL_POSITION_ID };
