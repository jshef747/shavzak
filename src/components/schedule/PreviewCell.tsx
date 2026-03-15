import type { AppState, Assignment, CellAddress, CellStatus, HomeGroupPeriod } from '../../types';
import type { SkippedCell } from '../../utils/autoAssign';
import { computeCellStatus, computeConstraintReason } from '../../utils/validation';
import { langFromDir, t } from '../../utils/i18n';

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
  'unavailable', 'home-group', 'double-booked', 'unqualified',
  'insufficient-break', 'constraint-violation', 'oncall-short-break',
]);

interface Props {
  cell: CellAddress;
  state: AppState;
  mergedAssignments: Assignment[];
  skippedCells: SkippedCell[];
  refDate: string;
  homeGroupPeriods: HomeGroupPeriod[];
}

export function PreviewCell({ cell, state, mergedAssignments, skippedCells, refDate, homeGroupPeriods }: Props) {
  const lang = langFromDir(state.dir);

  const assignment = mergedAssignments.find(
    a => a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId
  );

  const isSkipped = !assignment && skippedCells.some(
    s => s.cell.date === cell.date && s.cell.shiftId === cell.shiftId && s.cell.positionId === cell.positionId
  );

  const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;

  const status: CellStatus = person
    ? computeCellStatus(cell, person.id, mergedAssignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions)
    : 'empty';

  const colorClass = isSkipped ? 'bg-slate-100 border-slate-300' : STATUS_CLASSES[status];

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
  };

  const warningText = person && WARNING_STATUSES.has(status)
    ? (status === 'constraint-violation'
        ? (computeConstraintReason(cell, person.id, mergedAssignments, person, state.shifts, lang) ?? statusTooltip[status])
        : statusTooltip[status])
    : '';

  return (
    <td className={`relative border px-2 py-1.5 min-w-[120px] h-10 ${colorClass}`}>
      {person && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full"
          style={{
            backgroundColor: person.colorHex + '33',
            color: person.colorHex,
            border: `1px solid ${person.colorHex}`,
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
