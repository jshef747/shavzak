import { memo } from 'react';
import type { AppState, HomeGroupPeriod, Shift, Assignment, Position } from '../../types';
import { AssignmentCell } from './AssignmentCell';

interface Props {
  date: string;
  shift: Shift;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
  positions: Position[];
  homeGroupPeriods: HomeGroupPeriod[];
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export const ShiftRow = memo(function ShiftRow({ date, shift, state, assignments, refDate, dayIndex, positions, homeGroupPeriods }: Props) {
  const endHour = shift.startHour + shift.durationHours;
  const rowBg = dayIndex % 2 === 0
    ? 'bg-gray-50 dark:bg-slate-800'
    : 'bg-white dark:bg-slate-900';

  return (
    <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
      <td className={`sticky start-0  z-10 px-3 py-2 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
        {shift.name}
        <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(endHour)}</div>
      </td>
      {positions.map(pos => (
        <AssignmentCell
          key={pos.id}
          cell={{ date, shiftId: shift.id, positionId: pos.id }}
          state={state}
          assignments={assignments}
          refDate={refDate}
          homeGroupPeriods={homeGroupPeriods}
        />
      ))}
    </tr>
  );
});
