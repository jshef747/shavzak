import type { AppState, Assignment, CellAddress, CellStatus, HomeGroupPeriod } from '../../types';
import type { SkippedCell } from '../../utils/autoAssign';
import { computeCellStatus, computeConstraintReason } from '../../utils/validation';
import { langFromDir, t } from '../../utils/i18n';

const STATUS_CLASSES: Record<CellStatus, string> = {
  empty:                  'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  valid:                  'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
  unavailable:            'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-700',
  'home-group':           'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  'double-booked':        'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-700',
  unqualified:            'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700',
  'insufficient-break':   'bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-700',
  'constraint-violation': 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-700',
  'oncall-short-break':   'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700',
  'oncall-override':      'bg-lime-50 dark:bg-lime-900/20 border-lime-400 dark:border-lime-700',
};

const WARNING_STATUSES: Set<CellStatus> = new Set([
  'unavailable', 'home-group', 'double-booked', 'unqualified',
  'insufficient-break', 'constraint-violation', 'oncall-short-break', 'oncall-override',
]);

interface Props {
  cell: CellAddress;
  state: AppState;
  mergedAssignments: Assignment[];
  baseAssignments: Assignment[];
  skippedCells: SkippedCell[];
  refDate: string;
  homeGroupPeriods: HomeGroupPeriod[];
  rowSpan?: number;
}

export function PreviewCell({ cell, state, mergedAssignments, baseAssignments, skippedCells, refDate, homeGroupPeriods, rowSpan }: Props) {
  const lang = langFromDir(state.dir);

  const assignment = mergedAssignments.find(
    a => a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId
  );

  const isSkipped = !assignment && skippedCells.some(
    s => s.cell.date === cell.date && s.cell.shiftId === cell.shiftId && s.cell.positionId === cell.positionId
  );

  const isExisting = !!assignment && baseAssignments.some(
    a => a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId && a.personId === assignment.personId
  );

  const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;

  const status: CellStatus = person
    ? computeCellStatus(cell, person.id, mergedAssignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions, state.ignoreOnCallConstraints)
    : 'empty';

  // Existing assignments shown in blue, new in green, warnings in their own color
  const colorClass = isSkipped
    ? 'bg-slate-100 dark:bg-slate-700'
    : (status !== 'empty' && WARNING_STATUSES.has(status))
      ? STATUS_CLASSES[status]
      : isExisting
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        : STATUS_CLASSES[status];

  const statusTooltip: Record<CellStatus, string> = {
    empty:                  '',
    valid:                  t('tooltipValid', lang),
    unavailable:            t('tooltipUnavailable', lang),
    'home-group':           t('tooltipHomeGroup', lang),
    'double-booked':        t('tooltipDoubleBooked', lang),
    unqualified:            t('tooltipUnqualified', lang),
    'insufficient-break':   t('tooltipBreak', lang),
    'constraint-violation': t('tooltipConstraint', lang),
    'oncall-short-break':   t('tooltipOncallShortBreak', lang),
    'oncall-override':      t('tooltipOncallOverride', lang),
  };

  const warningText = person && WARNING_STATUSES.has(status)
    ? (status === 'constraint-violation'
        ? (computeConstraintReason(cell, person.id, mergedAssignments, person, state.shifts, lang) ?? statusTooltip[status])
        : statusTooltip[status])
    : '';

  return (
    <td rowSpan={rowSpan} className={`relative border px-2 py-1.5 min-w-[120px] ${rowSpan ? '' : 'h-10'} ${colorClass}`}>
      {person && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold truncate max-w-full"
          style={{
            backgroundColor: person.colorHex,
            color: '#1e293b',
          }}
        >
          {person.name}
        </span>
      )}
      {isSkipped && (
        <span className="text-xs text-slate-400 italic select-none">
          {lang === 'he' ? 'לא ניתן לשבץ' : "can't assign"}
        </span>
      )}
      {warningText && (
        <span className="absolute top-0.5 end-0.5   z-10 group/info">
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white border border-gray-300 text-[10px] font-bold text-gray-500 cursor-help hover:text-gray-800 hover:border-gray-500 transition-colors leading-none select-none">
            i
          </span>
          <span className="pointer-events-none absolute bottom-full end-0   mb-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-2 opacity-0 group-hover/info:opacity-100 transition-opacity duration-150 z-50 whitespace-normal leading-snug shadow-xl">
            {warningText}
          </span>
        </span>
      )}
    </td>
  );
}
