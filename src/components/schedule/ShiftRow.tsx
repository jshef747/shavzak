import { memo, Fragment } from 'react';
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

  if (shift.isHalfShift) {
    const midHour = shift.startHour + shift.durationHours / 2;
    return (
      <Fragment>
        {/* First half row */}
        <tr className={`border-b border-gray-100 dark:border-slate-700/60 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div className="flex items-center gap-1">
              {shift.name}
              <span className="inline-flex items-center justify-center text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded px-1 py-0.5 leading-none">½1</span>
            </div>
            <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(midHour)}</div>
          </td>
          {positions.map(pos => (
            <AssignmentCell
              key={pos.id}
              cell={{ date, shiftId: shift.id, positionId: pos.id, half: 1 }}
              state={state}
              assignments={assignments}
              refDate={refDate}
              homeGroupPeriods={homeGroupPeriods}
            />
          ))}
        </tr>
        {/* Second half row */}
        <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 dark:text-slate-500 text-[10px]">{shift.name}</span>
              <span className="inline-flex items-center justify-center text-[9px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded px-1 py-0.5 leading-none">½2</span>
            </div>
            <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(midHour)}–{formatShiftTime(endHour)}</div>
          </td>
          {positions.map(pos => (
            <AssignmentCell
              key={pos.id}
              cell={{ date, shiftId: shift.id, positionId: pos.id, half: 2 }}
              state={state}
              assignments={assignments}
              refDate={refDate}
              homeGroupPeriods={homeGroupPeriods}
            />
          ))}
        </tr>
      </Fragment>
    );
  }

  return (
    <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
      <td className={`sticky start-0  z-10 px-3 py-2 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
        <div className="flex items-center gap-1">
          {shift.name}
        </div>
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
