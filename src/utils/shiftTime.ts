import { differenceInDays, parseISO } from 'date-fns';
import type { Shift } from '../types';

export function assignmentStartMinutes(date: string, shift: Shift, refDate: string): number {
  const dayOffset = differenceInDays(parseISO(date), parseISO(refDate));
  return dayOffset * 1440 + shift.startHour * 60;
}

export function assignmentEndMinutes(date: string, shift: Shift, refDate: string): number {
  return assignmentStartMinutes(date, shift, refDate) + shift.durationHours * 60;
}
