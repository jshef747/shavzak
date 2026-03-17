import { memo } from 'react';
import type { CSSProperties } from 'react';
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
  isAdmin?: boolean;
  isMyCell?: boolean;
  onRequestSwap?: (cell: CellAddress) => void;
}

// Outline colors for each status (used via inline style to avoid border-collapse clipping)
// Valid cells use no outline — the person color tint is enough distinction.
// Warning statuses get a 1px outline to flag the issue without overwhelming the cell.
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
};

const STATUS_BG: Record<CellStatus, string> = {
  empty:                  'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  valid:                  '', // bg applied via inline style (person color)
  unavailable:            'bg-red-100 dark:bg-red-800/60',
  'home-group':           'bg-blue-100 dark:bg-blue-800/60',
  'double-booked':        'bg-orange-100 dark:bg-orange-800/60',
  unqualified:            'bg-yellow-100 dark:bg-yellow-700/50',
  'insufficient-break':   'bg-sky-100 dark:bg-sky-800/60',
  'constraint-violation': 'bg-purple-100 dark:bg-purple-800/60',
  'oncall-short-break':   'bg-orange-50 dark:bg-orange-800/50',
};

const WARNING_STATUSES: Set<CellStatus> = new Set([
  'unavailable', 'home-group', 'double-booked', 'unqualified', 'insufficient-break', 'constraint-violation', 'oncall-short-break',
]);

const AssignmentCellBase = function AssignmentCell({
  cell, state, assignments, refDate, homeGroupPeriods,
  isAdmin = true, isMyCell = false, onRequestSwap,
}: Props) {
  const lang = langFromDir(state.dir);
  const cellKey = serializeCellAddress(cell);
  const { isOver, setNodeRef } = useDroppable({ id: cellKey, disabled: !isAdmin });
  const { active } = useDndContext();

  const assignment = assignments.find(
    a => a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId
  );

  const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;

  const status: CellStatus = person
    ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions)
    : 'empty';

  // Detect drag-over scenario (only relevant when isAdmin)
  let dragOverBg = 'bg-blue-50';
  let dragOverOutline = '#93c5fd'; // blue-300 — DnD keeps 2px to be clearly visible
  let isSwapHover = false;
  if (isOver && active) {
    const dragData = active.data.current as DragData | undefined;
    if (dragData) {
      const isFromCell = dragData.type === 'from-cell' && dragData.sourceCell;
      isSwapHover = !!(isFromCell && person);

      if (isSwapHover) {
        dragOverBg = 'bg-blue-100';
        dragOverOutline = '#3b82f6'; // blue-500
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
          if (previewStatus === 'valid' || previewStatus === 'empty' || previewStatus === 'oncall-short-break') {
            dragOverBg = 'bg-emerald-100';
            dragOverOutline = '#10b981'; // emerald-500
          } else {
            dragOverBg = 'bg-red-100';
            dragOverOutline = '#ef4444'; // red-500
          }
        }
      }
    }
  }

  const bgClass = isOver ? dragOverBg : STATUS_BG[status];
  const outlineColor = isOver ? dragOverOutline : STATUS_OUTLINE[status];
  // For valid cells, tint background with person's color; drag-over and warning statuses use their own bg
  const personCellAlpha = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--person-cell-alpha').trim() || '50'
    : '50';
  const cellStyle: CSSProperties = {
    ...((!isOver && status === 'valid' && person) ? { backgroundColor: person.colorHex + personCellAlpha } : {}),
    ...(outlineColor
      ? { outline: `${isOver ? '2px' : '1px'} solid ${outlineColor}`, outlineOffset: isOver ? '-2px' : '-1px' }
      : {}),
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
      className={`relative border border-gray-200 dark:border-slate-700 px-2 py-1.5 min-w-[120px] h-10 transition-colors duration-150 ${bgClass} ${isMyCell && !isAdmin ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
    >
      {person && (
        <PersonChip
          personId={person.id}
          name={person.name}
          colorHex={person.colorHex}
          source="cell"
          sourceCell={cell}
          variant="cell"
          draggable={isAdmin}
        />
      )}

      {isSwapHover && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12M4 17l4-4M4 17l4 4" />
          </svg>
        </span>
      )}

      {/* Swap request button — shown only on user's own cell when not admin */}
      {!isAdmin && isMyCell && person && onRequestSwap && (
        <button
          onClick={() => onRequestSwap(cell)}
          title={t('requestSwap', lang)}
          className="absolute bottom-0.5 right-0.5 rtl:right-auto rtl:left-0.5 z-10 p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors opacity-0 group-hover/cell:opacity-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12M4 17l4-4M4 17l4 4" />
          </svg>
        </button>
      )}

      {warningText && (
        <span className="absolute top-0.5 right-0.5 rtl:right-auto rtl:left-0.5 z-10 group/info">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-500 text-[10px] font-bold text-gray-500 dark:text-slate-400 cursor-help hover:text-gray-800 dark:hover:text-slate-200 hover:border-gray-500 dark:hover:border-slate-300 transition-colors leading-none select-none">
            i
          </span>
          <span className="pointer-events-none absolute bottom-full right-0 rtl:right-auto rtl:left-0 mb-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 opacity-0 group-hover/info:opacity-100 transition-opacity duration-150 z-50 whitespace-normal leading-snug shadow-xl">
            {warningText}
          </span>
        </span>
      )}
    </td>
  );
};

// Custom areEqual to prevent massive grid re-renders on every assignment change
function areEqual(prev: Props, next: Props) {
  if (prev.state !== next.state) return false;
  if (prev.refDate !== next.refDate) return false;
  if (prev.homeGroupPeriods !== next.homeGroupPeriods) return false;
  if (prev.isAdmin !== next.isAdmin) return false;
  if (prev.isMyCell !== next.isMyCell) return false;
  if (prev.onRequestSwap !== next.onRequestSwap) return false;
  if (
    prev.cell.date !== next.cell.date ||
    prev.cell.positionId !== next.cell.positionId ||
    prev.cell.shiftId !== next.cell.shiftId
  ) return false;

  // Have assignments changed? We only care if:
  // 1. The assignment for THIS cell changed
  // 2. OR the assignments for the person CURRENTLY in this cell changed (which might alter their validity)
  if (prev.assignments === next.assignments) return true;

  const getPersonForCell = (assignments: Assignment[]) =>
    assignments.find(a => a.date === prev.cell.date && a.shiftId === prev.cell.shiftId && a.positionId === prev.cell.positionId)?.personId;

  const prevPersonId = getPersonForCell(prev.assignments);
  const nextPersonId = getPersonForCell(next.assignments);

  // Someone was added, removed, or changed in this exact cell
  if (prevPersonId !== nextPersonId) return false;

  // If there's a person in this cell, check if ANY of their other assignments changed
  // (which could trigger constraint violations like max-per-week or consecutive days)
  if (prevPersonId) {
    const prevPersonAssignments = prev.assignments.filter(a => a.personId === prevPersonId);
    const nextPersonAssignments = next.assignments.filter(a => a.personId === prevPersonId);
    // Rough check: did the total number of assignments for this person change?
    if (prevPersonAssignments.length !== nextPersonAssignments.length) return false;

    // Deep check: did the specific dates/shifts change?
    for (let i = 0; i < prevPersonAssignments.length; i++) {
        const pa = prevPersonAssignments[i];
        const na = nextPersonAssignments[i];
        if (pa.date !== na.date || pa.shiftId !== na.shiftId || pa.positionId !== na.positionId) return false;
    }
  }

  // If this cell is empty, it doesn't care about other people's assignments changing.
  return true;
}

export const AssignmentCell = memo(AssignmentCellBase, areEqual);
