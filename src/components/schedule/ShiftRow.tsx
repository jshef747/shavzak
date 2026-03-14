import type { AppState, Shift, Assignment, Position } from '../../types';
import { AssignmentCell } from './AssignmentCell';

interface Props {
  date: string;
  shift: Shift;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
  positions: Position[];
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function ShiftRow({ date, shift, state, assignments, refDate, dayIndex, positions }: Props) {
  const endHour = shift.startHour + shift.durationHours;
  const rowBg = dayIndex % 2 === 0 ? 'bg-slate-50/40' : 'bg-white';

  return (
    <tr className={`border-b ${rowBg}`}>
      <td className={`sticky left-0 rtl:left-auto rtl:right-0 z-10 px-3 py-2 text-xs text-gray-600 border-r whitespace-nowrap font-medium ${rowBg}`}>
        {shift.name}
        <div dir="ltr" className="text-gray-400 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(endHour)}</div>
      </td>
      {positions.map(pos => (
        <AssignmentCell
          key={pos.id}
          cell={{ date, shiftId: shift.id, positionId: pos.id }}
          state={state}
          assignments={assignments}
          refDate={refDate}
        />
      ))}
    </tr>
  );
}
