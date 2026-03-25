import { memo, Fragment } from 'react';
import type { AppState, HomeGroupPeriod, Shift, Assignment, Position } from '../../types';
import { AssignmentCell } from './AssignmentCell';
import type { OnCallSlotMapping } from '../../utils/cellKey';

interface Props {
  date: string;
  shift: Shift;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
  positions: Position[];  // regular positions only
  homeGroupPeriods: HomeGroupPeriod[];
  shiftIndex?: number;
  totalShifts?: number;
  onCallSlots?: OnCallSlotMapping[];
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export const ShiftRow = memo(function ShiftRow({ date, shift, state, assignments, refDate, dayIndex, positions, homeGroupPeriods, onCallSlots = [] }: Props) {
  const endHour = shift.startHour + shift.durationHours;
  const rowBg = dayIndex % 2 === 0
    ? 'bg-gray-50 dark:bg-slate-800'
    : 'bg-white dark:bg-slate-900';

  function renderPositionCell(pos: Position, cellProps: { shiftId: string; half?: 1 | 2; rowSpan?: number; isHalfShift?: boolean }) {
    return (
      <AssignmentCell
        key={pos.id}
        cell={{ date, shiftId: cellProps.shiftId, positionId: pos.id, half: cellProps.half }}
        state={state}
        assignments={assignments}
        refDate={refDate}
        homeGroupPeriods={homeGroupPeriods}
        rowSpan={cellProps.rowSpan}
        isHalfShift={cellProps.isHalfShift}
      />
    );
  }

  function renderOnCallCells() {
    return onCallSlots.map(({ pos, slot, rowSpan }) => (
      <AssignmentCell
        key={pos.id}
        cell={{ date, shiftId: slot.shiftId, positionId: pos.id }}
        state={state}
        assignments={assignments}
        refDate={refDate}
        homeGroupPeriods={homeGroupPeriods}
        rowSpan={rowSpan > 1 ? rowSpan : undefined}
      />
    ));
  }

  if (shift.isHalfShift) {
    const midHour = shift.startHour + shift.durationHours / 2;

    const splitPositionIds = new Set(
      positions
        .filter(pos => {
          const h1 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 1);
          const h2 = assignments.find(a => a.date === date && a.shiftId === shift.id && a.positionId === pos.id && a.half === 2);
          if (!h1 && !h2) return false;
          if (h1 && h2 && h1.personId === h2.personId) return false;
          return true;
        })
        .map(pos => pos.id)
    );

    if (splitPositionIds.size === 0) {
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
            return renderPositionCell(pos, { shiftId: shift.id, half: displayHalf, isHalfShift: true });
          })}
          {renderOnCallCells()}
        </tr>
      );
    }

    return (
      <Fragment>
        <tr className={`border-b border-gray-100 dark:border-slate-700/60 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div>{shift.name}</div>
            <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(midHour)}</div>
          </td>
          {positions.map(pos =>
            renderPositionCell(pos, { shiftId: shift.id, half: 1, rowSpan: !splitPositionIds.has(pos.id) ? 2 : undefined })
          )}
          {renderOnCallCells()}
        </tr>
        <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
          <td className={`sticky start-0 z-10 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
            <div className="text-gray-400 dark:text-slate-500 text-[10px]">{shift.name}</div>
            <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(midHour)}–{formatShiftTime(endHour)}</div>
          </td>
          {positions.map(pos =>
            splitPositionIds.has(pos.id)
              ? renderPositionCell(pos, { shiftId: shift.id, half: 2 })
              : null
          )}
        </tr>
      </Fragment>
    );
  }

  return (
    <tr className={`border-b border-gray-200 dark:border-slate-700 ${rowBg}`}>
      <td className={`sticky start-0 z-10 px-3 py-2 text-xs text-gray-600 dark:text-slate-300 border-e border-gray-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
        <div className="flex items-center gap-1">
          {shift.name}
        </div>
        <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(endHour)}</div>
      </td>
      {positions.map(pos => renderPositionCell(pos, { shiftId: shift.id }))}
      {renderOnCallCells()}
    </tr>
  );
});
