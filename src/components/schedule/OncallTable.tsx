import { useDroppable, useDndContext } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import type { AppState, Assignment, CellAddress, CellStatus, DragData, Shift } from '../../types';
import { serializeCellAddress, matchesCellAddress } from '../../utils/cellKey';
import { computeCellStatus } from '../../utils/validation';
import { langFromDir, t } from '../../utils/i18n';
import { PersonChip } from '../roster/PersonChip';
import { ONCALL_POSITION_ID } from '../../constants';

interface Props {
  state: AppState;
  dates: string[];
  assignments: Assignment[];
  refDate: string;
}

const STATUS_CLASSES: Record<CellStatus, string> = {
  empty:                  'bg-white border-slate-200',
  valid:                  'bg-emerald-100 border-emerald-400',
  unavailable:            'bg-red-100 border-red-500',
  'double-booked':        'bg-orange-100 border-orange-500',
  unqualified:            'bg-yellow-100 border-yellow-500',
  'insufficient-break':   'bg-sky-100 border-sky-500',
  'constraint-violation': 'bg-purple-100 border-purple-500',
};

function OncallCell({
  cell,
  state,
  assignments,
  refDate,
}: {
  cell: CellAddress;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
}) {
  const cellKey = serializeCellAddress(cell);
  const { isOver, setNodeRef } = useDroppable({ id: cellKey });
  const { active } = useDndContext();

  const assignment = assignments.find(a => matchesCellAddress(a, cell));
  const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;

  const status: CellStatus = person
    ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours)
    : 'empty';

  let dragOverClass = 'bg-indigo-50 border-indigo-400';
  if (isOver && active) {
    const dragData = active.data.current as DragData | undefined;
    if (dragData) {
      const dragPerson = state.people.find(p => p.id === dragData.personId);
      if (dragPerson) {
        const previewAssignments = dragData.type === 'from-cell' && dragData.sourceCell
          ? assignments.filter(a => !(
              a.personId === dragData.personId &&
              matchesCellAddress(a, dragData.sourceCell!)
            ))
          : assignments;
        const previewStatus = computeCellStatus(cell, dragPerson.id, previewAssignments, dragPerson, state.shifts, refDate, state.minBreakHours);
        dragOverClass = (previewStatus === 'valid' || previewStatus === 'empty')
          ? 'bg-emerald-100 border-emerald-500 ring-1 ring-emerald-400'
          : 'bg-red-100 border-red-500 ring-1 ring-red-400';
      }
    }
  }

  const colorClass = isOver ? dragOverClass : STATUS_CLASSES[status];

  return (
    <td
      ref={setNodeRef}
      className={`relative border border-dashed px-2 py-1.5 min-w-[120px] h-10 transition-colors ${colorClass}`}
    >
      {person ? (
        <PersonChip
          personId={person.id}
          name={person.name}
          source="cell"
          sourceCell={cell}
          variant="cell"
        />
      ) : null}
    </td>
  );
}

function formatDateHeader(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE dd/MM');
  } catch {
    return dateStr;
  }
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function OncallTable({ state, dates, assignments, refDate }: Props) {
  const lang = langFromDir(state.dir);

  // Only show shifts that have at least one on-call slot
  const oncallShifts: Shift[] = state.shifts.filter(s => (s.oncallSlots ?? 0) >= 1);

  if (oncallShifts.length === 0 || dates.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          {/* Shield / standby icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t('oncallTableTitle', lang)}
        </span>
        <span className="text-xs text-gray-400">{t('oncallTableDesc', lang)}</span>
      </div>

      <div className="overflow-auto">
        <table className="border-collapse text-sm min-w-max">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-amber-700 text-amber-50">
              <th className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-amber-700 px-3 py-2 text-left rtl:text-right text-xs uppercase tracking-wide min-w-[120px]">
                {t('shiftCol', lang)}
              </th>
              {dates.map(date => (
                <th key={date} className="px-3 py-2 text-center text-xs tracking-wide min-w-[120px] whitespace-nowrap">
                  {formatDateHeader(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {oncallShifts.map((shift, idx) => {
              const rowBg = idx % 2 === 0 ? 'bg-amber-50/30' : 'bg-white';
              return (
                <tr key={shift.id} className={`border-b ${rowBg}`}>
                  <td className={`sticky left-0 rtl:left-auto rtl:right-0 z-10 px-3 py-2 text-xs text-gray-600 border-r whitespace-nowrap font-medium ${rowBg}`}>
                    {shift.name}
                    <div dir="ltr" className="text-gray-400 font-normal">
                      {formatShiftTime(shift.startHour)}–{formatShiftTime(shift.startHour + shift.durationHours)}
                    </div>
                  </td>
                  {dates.map(date => {
                    const cell: CellAddress = {
                      date,
                      shiftId: shift.id,
                      positionId: ONCALL_POSITION_ID,
                      isOncall: true,
                    };
                    return (
                      <OncallCell
                        key={date}
                        cell={cell}
                        state={state}
                        assignments={assignments}
                        refDate={refDate}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
