import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import type { AppState, Schedule } from '../types';

function formatTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function exportToExcel(state: AppState, schedule: Schedule, dates: string[]) {
  const { shifts, positions, people } = state;
  const assignments = schedule.assignments;

  const headers = ['Date', 'Shift', ...positions.map(p => p.name)];
  const rows: (string | number)[][] = [headers];

  for (const date of dates) {
    const dateLabel = format(parseISO(date), 'MMM d, yyyy (EEE)');
    for (const shift of shifts) {
      const endHour = (shift.startHour + shift.durationHours) % 24;
      const shiftLabel = `${shift.name} (${formatTime(shift.startHour)}–${formatTime(endHour)})`;
      const row: (string | number)[] = [dateLabel, shiftLabel];
      for (const pos of positions) {
        const assignment = assignments.find(
          a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id
        );
        if (assignment) {
          const person = people.find(p => p.id === assignment.personId);
          row.push(person ? person.name : '');
        } else {
          row.push('');
        }
      }
      rows.push(row);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule');

  // Add constraints sheet if any person has constraints
  const constrainedPeople = people.filter(p => p.constraints);
  if (constrainedPeople.length > 0) {
    const cHeaders = ['Person', 'Allowed Shifts', 'Allowed Days', 'Max/Week', 'Max Total'];
    const cRows: (string | number)[][] = [cHeaders];
    for (const person of constrainedPeople) {
      const c = person.constraints!;
      const allowedShifts = c.allowedShiftIds
        ? c.allowedShiftIds.map(id => shifts.find(s => s.id === id)?.name ?? id).join(', ')
        : 'Any';
      const allowedDays = c.allowedDaysOfWeek
        ? c.allowedDaysOfWeek.map(d => DAY_NAMES[d]).join(', ')
        : 'Any';
      cRows.push([
        person.name,
        allowedShifts,
        allowedDays,
        c.maxShiftsPerWeek ?? 'No limit',
        c.maxShiftsTotal ?? 'No limit',
      ]);
    }
    const ws2 = XLSX.utils.aoa_to_sheet(cRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Constraints');
  }

  XLSX.writeFile(wb, `${schedule.name}.xlsx`);
}
