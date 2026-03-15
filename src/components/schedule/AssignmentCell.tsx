import { useDroppable, useDndContext } from '@dnd-kit/core';
import type { AppState, Assignment, CellAddress, CellStatus, DragData, HomeGroupPeriod } from '../../types';
import { serializeCellAddress } from '../../utils/cellKey';
import { computeCellStatus, computeConstraintReason } from '../../utils/validation';
import { langFromDir, t } from '../../utils/i18n';
import { PersonChip } from '../roster/PersonChip';

interface Props {
  cell: CellAddress;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  homeGroupPeriods: HomeGroupPeriod[];
}

const STATUS_CLASSES: Record<CellStatus, string> = {
  empty:                  'bg-white border-slate-200',
  valid:                  'bg-emerald-100 border-emerald-400',
  unavailable:            'bg-red-100 border-red-500',
  'home-group':           'bg-blue-100 border-blue-400',
  'double-booked':        'bg-orange-100 border-orange-500',
  unqualified:            'bg-yellow-100 border-yellow-500',
  'insufficient-break':   'bg-sky-100 border-sky-500',
  'constraint-violation': 'bg-purple-100 border-purple-500',
  'oncall-short-break':   'bg-orange-50 border-orange-400',
};

const WARNING_STATUSES: Set<CellStatus> = new Set([
  'unavailable', 'home-group', 'double-booked', 'unqualified', 'insufficient-break', 'constraint-violation', 'oncall-short-break',
]);

export function AssignmentCell({ cell, state, assignments, refDate, homeGroupPeriods }: Props) {
  const lang = langFromDir(state.dir);
  const cellKey = serializeCellAddress(cell);
  const { isOver, setNodeRef } = useDroppable({ id: cellKey });
  const { active } = useDndContext();

  const assignment = assignments.find(
    a => a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId
  );

  const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;

  const status: CellStatus = person
    ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions)
    : 'empty';

  // Detect drag-over scenario
  let dragOverClass = 'bg-indigo-50 border-indigo-400';
  let isSwapHover = false;
  if (isOver && active) {
    const dragData = active.data.current as DragData | undefined;
    if (dragData) {
      const isFromCell = dragData.type === 'from-cell' && dragData.sourceCell;
      isSwapHover = !!(isFromCell && person);

      if (isSwapHover) {
        // Swap: show indigo indicator regardless of validity
        dragOverClass = 'bg-indigo-100 border-indigo-500 ring-1 ring-indigo-400';
      } else {
        const dragPerson = state.people.find(p => p.id === dragData.personId);
        if (dragPerson) {
          const previewAssignments = isFromCell
            ? assignments.filter(a => !(
                a.personId === dragData.personId &&
                a.date === dragData.sourceCell!.date &&
                a.shiftId === dragData.sourceCell!.shiftId &&
                a.positionId === dragData.sourceCell!.positionId
              ))
            : assignments;
          const previewStatus = computeCellStatus(cell, dragPerson.id, previewAssignments, dragPerson, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions);
          dragOverClass = (previewStatus === 'valid' || previewStatus === 'empty' || previewStatus === 'oncall-short-break')
            ? 'bg-emerald-100 border-emerald-500 ring-1 ring-emerald-400'
            : 'bg-red-100 border-red-500 ring-1 ring-red-400';
        }
      }
    }
  }

  const colorClass = isOver ? dragOverClass : STATUS_CLASSES[status];

  const statusTooltip: Record<CellStatus, string> = {
    empty: '',
    valid: t('tooltipValid', lang),
    unavailable: t('tooltipUnavailable', lang),
    'home-group': t('tooltipHomeGroup', lang),
    'double-booked': t('tooltipDoubleBooked', lang),
    unqualified: t('tooltipUnqualified', lang),
    'insufficient-break': t('tooltipBreak', lang),
    'constraint-violation': t('tooltipConstraint', lang),
    'oncall-short-break': t('tooltipOncallShortBreak', lang),
  };

  const warningText = person && WARNING_STATUSES.has(status)
    ? (status === 'constraint-violation'
        ? (computeConstraintReason(cell, person.id, assignments, person, state.shifts, lang) ?? statusTooltip[status])
        : statusTooltip[status])
    : '';

  return (
    <td
      ref={setNodeRef}
      className={`relative border px-2 py-1.5 min-w-[120px] h-10 transition-colors ${colorClass}`}
    >
      {person && (
        <PersonChip
          personId={person.id}
          name={person.name}
          colorHex={person.colorHex}
          source="cell"
          sourceCell={cell}
          variant="cell"
        />
      )}

      {isSwapHover && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12M4 17l4-4M4 17l4 4" />
          </svg>
        </span>
      )}

      {warningText && (
        <span className="absolute top-0.5 right-0.5 rtl:right-auto rtl:left-0.5 z-10 group/info">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white border border-gray-300 text-[10px] font-bold text-gray-500 cursor-help hover:text-gray-800 hover:border-gray-500 transition-colors leading-none select-none">
            i
          </span>
          <span className="pointer-events-none absolute bottom-full right-0 rtl:right-auto rtl:left-0 mb-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 opacity-0 group-hover/info:opacity-100 transition-opacity duration-150 z-50 whitespace-normal leading-snug shadow-xl">
            {warningText}
          </span>
        </span>
      )}
    </td>
  );
}
