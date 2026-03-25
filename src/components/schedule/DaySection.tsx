import { memo } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Assignment, HomeGroupPeriod, Position } from '../../types';
import { ShiftRow } from './ShiftRow';

interface Props {
  date: string;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
  positions: Position[];
  homeGroupPeriods: HomeGroupPeriod[];
}

export const DaySection = memo(function DaySection({ date, state, assignments, refDate, dayIndex, positions, homeGroupPeriods }: Props) {
  const locale = state.dir === 'rtl' ? heLocale : undefined;
  const label = format(parseISO(date), 'EEE, MMM d', { locale });

  return (
    <>
      <tr>
        <td
          colSpan={positions.length + 1}
          className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 border-t border-gray-300 dark:border-slate-600 uppercase tracking-wide"
        >
          {label}
        </td>
      </tr>
      {state.shifts.map((shift, shiftIndex) => (
        <ShiftRow
          key={shift.id}
          date={date}
          shift={shift}
          state={state}
          assignments={assignments}
          refDate={refDate}
          dayIndex={dayIndex}
          positions={positions}
          homeGroupPeriods={homeGroupPeriods}
          shiftIndex={shiftIndex}
          totalShifts={state.shifts.length}
        />
      ))}
    </>
  );
});
