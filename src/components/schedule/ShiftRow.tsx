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

    // A position needs splitting when: different people in each half, OR only one half is assigned.
    const splitPositionIds = new Set(
      positions
        .filter(pos => {
          const h1 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 1);
          const h2 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 2);
          if (!h1 && !h2) return false; // empty — keep merged
          if (h1 && h2 && h1.personId === h2.personId) return false; // same person both halves — keep merged
          return true; // one half only, or different people
        })
        .map(pos => pos.id)
    );

    if (splitPositionIds.size === 0) {
      // All positions are merged — render as a normal single row with full time range.
      return (
        <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-2 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div>{shift.name}</div>
            <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(endHour)}</div>
          </td>
          {positions.map(pos => {
            const h1 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 1);
            const h2 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 2);
            const displayHalf = (h2 && !h1) ? 2 : 1;
            return (
              <AssignmentCell
                key={pos.id}
                cell={{ date, shiftId: shift.id, positionId: pos.id, half: displayHalf }}
                state={state}
                assignments={assignments}
                refDate={refDate}
                homeGroupPeriods={homeGroupPeriods}
                isHalfShift
              />
            );
          })}
        </tr>
      );
    }

    // Some positions are split — render two rows.
    return (
      <Fragment>
        <tr className={`border-b border-gray-100 dark:border-slate-700/60 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div>{shift.name}</div>
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
              rowSpan={!splitPositionIds.has(pos.id) ? 2 : undefined}
            />
          ))}
        </tr>
        <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div className="text-gray-400 dark:text-slate-500 text-[10px]">{shift.name}</div>
            <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(midHour)}–{formatShiftTime(endHour)}</div>
          </td>
          {positions.map(pos =>
            splitPositionIds.has(pos.id) ? (
              <AssignmentCell
                key={pos.id}
                cell={{ date, shiftId: shift.id, positionId: pos.id, half: 2 }}
                state={state}
                assignments={assignments}
                refDate={refDate}
                homeGroupPeriods={homeGroupPeriods}
              />
            ) : null
          )}
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
