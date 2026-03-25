import { memo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import type { AppState, Assignment, CellAddress, CellStatus, DragData, HomeGroupPeriod } from '../../types';
import { serializeCellAddress, assignmentMatchesCell } from '../../utils/cellKey';
import { computeCellStatus, computeConstraintReason } from '../../utils/validation';
import { langFromDir, t } from '../../utils/i18n';
import { PersonChip } from '../roster/PersonChip';

interface Props {
  cell: CellAddress;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  homeGroupPeriods: HomeGroupPeriod[];
  rowSpan?: number;
  isHalfShift?: boolean;
}

const STATUS_OUTLINE: Record<CellStatus, string | null> = {
  empty:                  null,
  valid:                  null,
  unavailable:            '#ef4444',
  'home-group':           '#60a5fa',
  'double-booked':        '#f97316',
  unqualified:            '#eab308',
  'insufficient-break':   '#38bdf8',
  'constraint-violation': '#a855f7',
  'oncall-short-break':   '#fb923c',
  'oncall-override':      '#65a30d',
};

const STATUS_BG: Record<CellStatus, string> = {
  empty:                  'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  valid:                  '',
  unavailable:            'bg-red-100 dark:bg-red-800/60',
  'home-group':           'bg-blue-100 dark:bg-blue-800/60',
  'double-booked':        'bg-orange-100 dark:bg-orange-800/60',
  unqualified:            'bg-yellow-100 dark:bg-yellow-700/50',
  'insufficient-break':   'bg-sky-100 dark:bg-sky-800/60',
  'constraint-violation': 'bg-purple-100 dark:bg-purple-800/60',
  'oncall-short-break':   'bg-orange-50 dark:bg-orange-800/50',
  'oncall-override':      'bg-lime-100 dark:bg-lime-800/50',
};

const WARNING_STATUSES: Set<CellStatus> = new Set([
  'unavailable', 'home-group', 'double-booked', 'unqualified', 'insufficient-break', 'constraint-violation', 'oncall-short-break', 'oncall-override',
]);

const AssignmentCellBase = function AssignmentCell({ cell, state, assignments, refDate, homeGroupPeriods, rowSpan, isHalfShift }: Props) {
  const lang = langFromDir(state.dir);
  const cellKey = serializeCellAddress(cell);
  const droppableData = useRef({ isHalfShift: !!isHalfShift });
  droppableData.current.isHalfShift = !!isHalfShift;
  const { isOver, setNodeRef } = useDroppable({ id: cellKey, data: droppableData.current });
  const { active } = useDndContext();

  const assignment = assignments.find(a => assignmentMatchesCell(a, cell));
  const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;
  const status: CellStatus = person
    ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions, state.ignoreOnCallConstraints)
    : 'empty';

  let dragOverBg = 'bg-blue-50';
  let dragOverOutline = '#93c5fd';
  let isSwapHover = false;
  const activeDragData = active?.data.current as DragData | undefined;
  const isBeingDraggedFrom = !!(
    activeDragData?.type === 'from-cell' &&
    activeDragData.sourceCell &&
    activeDragData.sourceCell.date === cell.date &&
    activeDragData.sourceCell.shiftId === cell.shiftId &&
    activeDragData.sourceCell.positionId === cell.positionId &&
    (activeDragData.sourceCell.half ?? undefined) === (cell.half ?? undefined)
  );
  if (isOver && active) {
    const dragData = active.data.current as DragData | undefined;
    if (dragData) {
      const isFromCell = dragData.type === 'from-cell' && dragData.sourceCell;
      isSwapHover = !!(isFromCell && person);
      if (isSwapHover) {
        dragOverBg = 'bg-blue-100';
        dragOverOutline = '#3b82f6';
      } else if (!isHalfShift) {
        const dragPerson = state.people.find(p => p.id === dragData.personId);
        if (dragPerson) {
          const previewAssignments = isFromCell
            ? assignments.filter(a => !(a.personId === dragData.personId && assignmentMatchesCell(a, dragData.sourceCell!)))
            : assignments;
          const previewStatus = computeCellStatus(cell, dragPerson.id, previewAssignments, dragPerson, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions, state.ignoreOnCallConstraints);
          if (previewStatus === 'valid' || previewStatus === 'empty' || previewStatus === 'oncall-short-break' || previewStatus === 'oncall-override') {
            dragOverBg = 'bg-emerald-100';
            dragOverOutline = '#10b981';
          } else {
            dragOverBg = 'bg-red-100';
            dragOverOutline = '#ef4444';
          }
        }
      } else {
        // half-shift cell hovered — just show a neutral blue highlight
        dragOverBg = 'bg-blue-100';
        dragOverOutline = '#3b82f6';
      }
    }
  }

  const bgClass = isOver ? dragOverBg : STATUS_BG[status];
  const outlineColor = isOver ? dragOverOutline : STATUS_OUTLINE[status];
  const personCellAlpha = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--person-cell-alpha').trim() || '50'
    : '50';
  const cellStyle: CSSProperties = {
    ...((!isOver && status === 'valid' && person) ? { backgroundColor: person.colorHex + personCellAlpha } : {}),
    ...(outlineColor ? { outline: `${isOver ? '2px' : '1px'} solid ${outlineColor}`, outlineOffset: isOver ? '-2px' : '-1px' } : {}),
  };

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
    'oncall-override': t('tooltipOncallOverride', lang),
  };

  const warningText = person && WARNING_STATUSES.has(status)
    ? (status === 'constraint-violation'
        ? (computeConstraintReason(cell, person.id, assignments, person, state.shifts, lang) ?? statusTooltip[status])
        : statusTooltip[status])
    : '';

  return (
    <td
      ref={setNodeRef}
      style={cellStyle}
      rowSpan={rowSpan}
      className={`relative border border-gray-200 dark:border-slate-700 px-2 py-1.5 min-w-[120px] ${rowSpan ? 'align-middle' : 'h-10'} transition-colors duration-150 ${bgClass}`}
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
      {(isSwapHover || isBeingDraggedFrom) && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12M4 17l4-4M4 17l4 4" />
            </svg>
          </span>
        </span>
      )}
      {warningText && (
        <span className="absolute top-0.5 end-0.5 z-10 group/info">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 text-[10px] font-bold text-gray-500 dark:text-slate-400 cursor-help hover:text-gray-800 dark:hover:text-slate-200 hover:border-gray-500 dark:hover:border-slate-300 transition-colors leading-none select-none">
            i
          </span>
          <span className="pointer-events-none absolute bottom-full end-0 mb-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 opacity-0 group-hover/info:opacity-100 transition-opacity duration-150 z-50 whitespace-normal leading-snug shadow-xl">
            {warningText}
          </span>
        </span>
      )}
    </td>
  );
};

function areEqual(prev: Props, next: Props) {
  if (prev.isHalfShift !== next.isHalfShift) return false;
  if (prev.state !== next.state) return false;
  if (prev.refDate !== next.refDate) return false;
  if (prev.homeGroupPeriods !== next.homeGroupPeriods) return false;
  if (
    prev.cell.date !== next.cell.date ||
    prev.cell.positionId !== next.cell.positionId ||
    prev.cell.shiftId !== next.cell.shiftId ||
    (prev.cell.half ?? undefined) !== (next.cell.half ?? undefined)
  ) return false;

  if (prev.assignments === next.assignments) return true;

  const getPersonForCell = (assignments: Assignment[]) =>
    assignments.find(a => assignmentMatchesCell(a, prev.cell))?.personId;

  const prevPersonId = getPersonForCell(prev.assignments);
  const nextPersonId = getPersonForCell(next.assignments);
  if (prevPersonId !== nextPersonId) return false;

  if (prevPersonId) {
    const prevPersonAssignments = prev.assignments.filter(a => a.personId === prevPersonId);
    const nextPersonAssignments = next.assignments.filter(a => a.personId === prevPersonId);
    if (prevPersonAssignments.length !== nextPersonAssignments.length) return false;
    for (let i = 0; i < prevPersonAssignments.length; i++) {
      const pa = prevPersonAssignments[i];
      const na = nextPersonAssignments[i];
      if (pa.date !== na.date || pa.shiftId !== na.shiftId || pa.positionId !== na.positionId) return false;
    }
  }

  return true;
}

export const AssignmentCell = memo(AssignmentCellBase, areEqual);
