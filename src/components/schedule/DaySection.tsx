import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Assignment } from '../../types';
import { ShiftRow } from './ShiftRow';

interface Props {
  date: string;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
}

export function DaySection({ date, state, assignments, refDate, dayIndex }: Props) {
  const locale = state.dir === 'rtl' ? heLocale : undefined;
  const label = format(parseISO(date), 'EEE, MMM d', { locale });

  return (
    <>
      <tr>
        <td
          colSpan={state.positions.length + 1}
          className="px-3 py-2 bg-slate-100 text-sm font-bold text-slate-800 border-t-2 border-slate-400 uppercase tracking-wide"
        >
          {label}
        </td>
      </tr>
      {state.shifts.map(shift => (
        <ShiftRow
          key={shift.id}
          date={date}
          shift={shift}
          state={state}
          assignments={assignments}
          refDate={refDate}
          dayIndex={dayIndex}
        />
      ))}
    </>
  );
}
