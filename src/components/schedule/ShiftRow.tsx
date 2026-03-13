import type { AppState, Shift, Assignment, CellAddress } from '../../types';
import { AssignmentCell } from './AssignmentCell';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  date: string;
  shift: Shift;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function ShiftRow({ date, shift, state, assignments, refDate, dayIndex }: Props) {
  const lang = langFromDir(state.dir);
  const endHour = shift.startHour + shift.durationHours;
  const midHour = shift.startHour + shift.durationHours / 2;
  const rowBg = dayIndex % 2 === 0 ? 'bg-slate-50/40' : 'bg-white';

  return (
    <tr className={`border-b ${rowBg}`}>
      <td className={`sticky left-0 rtl:left-auto rtl:right-0 z-10 px-3 py-2 text-xs text-gray-600 border-r whitespace-nowrap font-medium ${rowBg}`}>
        {shift.name}
        {shift.isHalfShift && (
          <span className="ml-1 rtl:mr-1 rtl:ml-0 text-[9px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 rounded px-0.5">
            {t('halfBadge', lang)}
          </span>
        )}
        <div dir="ltr" className="text-gray-400 font-normal">{formatShiftTime(shift.startHour)}–{formatShiftTime(endHour)}</div>
      </td>
      {state.positions.map(pos => {
        if (shift.isHalfShift) {
          // Split into two stacked half-slot cells inside one <td>
          const cell1: CellAddress = { date, shiftId: shift.id, positionId: pos.id, halfSlot: 1 };
          const cell2: CellAddress = { date, shiftId: shift.id, positionId: pos.id, halfSlot: 2 };
          return (
            <td key={pos.id} className="border p-0 min-w-[120px]">
              <div className="flex flex-col divide-y divide-slate-200">
                <AssignmentCell
                  cell={cell1}
                  state={state}
                  assignments={assignments}
                  refDate={refDate}
                  asTd={false}
                  slotLabel={`${formatShiftTime(shift.startHour)}–${formatShiftTime(midHour)}`}
                />
                <AssignmentCell
                  cell={cell2}
                  state={state}
                  assignments={assignments}
                  refDate={refDate}
                  asTd={false}
                  slotLabel={`${formatShiftTime(midHour)}–${formatShiftTime(endHour)}`}
                />
              </div>
            </td>
          );
        }
        return (
          <AssignmentCell
            key={pos.id}
            cell={{ date, shiftId: shift.id, positionId: pos.id }}
            state={state}
            assignments={assignments}
            refDate={refDate}
          />
        );
      })}
    </tr>
  );
}
