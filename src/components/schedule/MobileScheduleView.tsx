import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Assignment, CellAddress, CellStatus, HomeGroupPeriod } from '../../types';
import { computeCellStatus, computeConstraintReason } from '../../utils/validation';
import { langFromDir, t } from '../../utils/i18n';
import { BottomSheet } from '../ui/BottomSheet';

interface Props {
  state: AppState;
  dates: string[];
  assignments: Assignment[];
  homeGroupPeriods: HomeGroupPeriod[];
  onAssign: (cell: CellAddress, personId: string) => void;
  onUnassign: (cell: CellAddress) => void;
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
  'oncall-short-break':   null,
};

const STATUS_SORT_ORDER: Record<CellStatus, number> = {
  valid: 0,
  'oncall-short-break': 1,
  'insufficient-break': 2,
  'home-group': 3,
  unavailable: 4,
  unqualified: 5,
  'constraint-violation': 6,
  'double-booked': 7,
  empty: 8,
};

function formatTime(h: number): string {
  const totalMin = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

interface ActiveCell {
  cell: CellAddress;
  shiftName: string;
  positionName: string;
  dateLabel: string;
}

export function MobileScheduleView({ state, dates, assignments, homeGroupPeriods, onAssign, onUnassign }: Props) {
  const [dayIndex, setDayIndex] = useState(0);
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(() => new Set());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);

  function toggleShift(shiftId: string) {
    setExpandedShifts(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) next.delete(shiftId);
      else next.add(shiftId);
      return next;
    });
  }

  const lang = langFromDir(state.dir);
  const isRtl = state.dir === 'rtl';
  const locale = isRtl ? heLocale : undefined;

  const refDate = dates[0] ?? '';
  const regularPositions = useMemo(() => state.positions.filter(p => !p.isOnCall), [state.positions]);
  const onCallPositions  = useMemo(() => state.positions.filter(p => p.isOnCall),  [state.positions]);

  const currentDate = dates[dayIndex] ?? '';
  const dateLabel = currentDate
    ? format(parseISO(currentDate), isRtl ? 'EEE, d MMM yyyy' : 'EEE, MMM d, yyyy', { locale })
    : '';

  // Person statuses for the active cell bottom sheet
  const personStatuses = useMemo(() => {
    if (!activeCell) return [];
    const cell = activeCell.cell;
    const previewAssignments = assignments.filter(
      a => !(a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId)
    );
    return state.people
      .map(person => {
        const status = computeCellStatus(
          cell, person.id, previewAssignments, person,
          state.shifts, refDate, state.minBreakHours,
          state.homeGroups, homeGroupPeriods, state.positions
        );
        return { person, status };
      })
      .sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);
  }, [activeCell, state.people, state.shifts, state.homeGroups, state.positions, state.minBreakHours, assignments, homeGroupPeriods, refDate]);

  const activeCellOccupant = activeCell
    ? assignments.find(a =>
        a.date === activeCell.cell.date &&
        a.shiftId === activeCell.cell.shiftId &&
        a.positionId === activeCell.cell.positionId
      )
    : null;

  function handleAssign(personId: string) {
    if (!activeCell) return;
    onAssign(activeCell.cell, personId);
    setActiveCell(null);
  }

  function handleClear() {
    if (!activeCell) return;
    onUnassign(activeCell.cell);
    setActiveCell(null);
  }

  function prevDay() { setDayIndex(i => Math.max(0, i - 1)); setExpandedShifts(new Set()); }
  function nextDay() { setDayIndex(i => Math.min(dates.length - 1, i + 1)); setExpandedShifts(new Set()); }

  function renderPositionRow(pos: typeof state.positions[0], shift: typeof state.shifts[0], isOnCall: boolean) {
    const cell: CellAddress = { date: currentDate, shiftId: shift.id, positionId: pos.id };
    const assignment = assignments.find(
      a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id
    );
    const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;
    const status: CellStatus = person
      ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions)
      : 'empty';

    const outlineColor = STATUS_OUTLINE[status];
    const personBg = person ? person.colorHex + '40' : undefined;
    const rowBg = personBg ?? (isOnCall ? '#fff7ed' : '#ffffff');

    return (
      <button
        key={pos.id}
        onClick={() => setActiveCell({ cell, shiftName: shift.name, positionName: pos.name, dateLabel })}
        className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 text-start active:bg-gray-50 transition-colors"
        style={{
          backgroundColor: rowBg,
          ...(outlineColor ? { boxShadow: `inset ${isRtl ? '-' : ''}3px 0 0 ${outlineColor}` } : {}),
        }}
      >
        {/* Color dot / indicator */}
        {person ? (
          <span
            className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: person.colorHex }}
          >
            {person.name.charAt(0)}
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full shrink-0 border-2 border-dashed border-gray-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
        )}

        {/* Position name + person name */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 leading-none mb-0.5">{pos.name}</p>
          <p className={`text-sm font-semibold leading-tight truncate ${person ? 'text-gray-800' : 'text-gray-300'}`}>
            {person ? person.name : t('tapToAssign', lang)}
          </p>
        </div>

        {/* Chevron */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 shrink-0 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  if (dates.length === 0) return null;

  return (
    <>
      <div className="flex flex-col overflow-hidden flex-1 min-h-0" dir={state.dir}>

        {/* Day navigation bar */}
        <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 gap-2">
          <button
            onClick={prevDay}
            disabled={dayIndex === 0}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-gray-800">{dateLabel}</p>
            <p className="text-[11px] text-gray-400" dir="ltr">{dayIndex + 1} / {dates.length}</p>
          </div>

          <button
            onClick={nextDay}
            disabled={dayIndex >= dates.length - 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Shifts for this day */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3 pb-24">
          {state.positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <p className="text-sm text-gray-400">{t('noPositions', lang)}</p>
              <p className="text-xs text-gray-300">{t('noPositionsHint', lang)}</p>
            </div>
          ) : (
            state.shifts.map(shift => {
              const endHour = shift.startHour + shift.durationHours;
              const isExpanded = expandedShifts.has(shift.id);
              const totalCells = state.positions.length;
              const filledCells = state.positions.filter(pos =>
                assignments.some(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id)
              ).length;

              return (
                <div key={shift.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Shift header — tappable */}
                  <button
                    className="w-full px-4 py-3 bg-slate-800 flex items-center justify-between gap-3 text-start active:bg-slate-700 transition-colors"
                    onClick={() => toggleShift(shift.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{shift.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{formatTime(shift.startHour)}–{formatTime(endHour)}</p>
                    </div>
                    {/* Fill badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      filledCells === totalCells && totalCells > 0
                        ? 'bg-emerald-500 text-white'
                        : filledCells > 0
                          ? 'bg-amber-400 text-white'
                          : 'bg-slate-600 text-slate-300'
                    }`} dir="ltr">
                      {filledCells}/{totalCells}
                    </span>
                    {/* Chevron */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expandable positions */}
                  {isExpanded && (
                    <>
                      {regularPositions.length > 0 && (
                        <div>
                          {regularPositions.map(pos => renderPositionRow(pos, shift, false))}
                        </div>
                      )}
                      {onCallPositions.length > 0 && (
                        <div className="border-t border-orange-100 bg-orange-50/40">
                          <p className="px-4 pt-2 text-[10px] font-semibold text-orange-400 uppercase tracking-wide">
                            {t('onCall', lang)}
                          </p>
                          {onCallPositions.map(pos => renderPositionRow(pos, shift, true))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Assignment bottom sheet */}
      <BottomSheet
        open={!!activeCell}
        onClose={() => setActiveCell(null)}
        title={activeCell ? `${activeCell.shiftName} · ${activeCell.positionName}` : ''}
      >
        {activeCell && (
          <div>
            <p className="px-4 py-1.5 text-[11px] text-gray-400">{activeCell.dateLabel}</p>

            {/* Clear option */}
            {activeCellOccupant && (
              <button
                onClick={handleClear}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-red-50 transition-colors text-start"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-red-500">{t('clearAssignment', lang)}</span>
              </button>
            )}

            {/* People list */}
            {personStatuses.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('noPeopleYet', lang)}</p>
            ) : personStatuses.map(({ person, status }) => {
              const isCurrent = activeCellOccupant?.personId === person.id;
              const outlineColor = STATUS_OUTLINE[status];
              const isBlocked = status === 'double-booked';

              const statusLabels: Partial<Record<CellStatus, string>> = {
                unavailable:            t('tooltipUnavailable', lang),
                'home-group':           t('tooltipHomeGroup', lang),
                'double-booked':        t('tooltipDoubleBooked', lang),
                unqualified:            t('tooltipUnqualified', lang),
                'insufficient-break':   t('tooltipBreak', lang),
                'oncall-short-break':   t('tooltipOncallShortBreak', lang),
                'constraint-violation': status === 'constraint-violation'
                  ? (computeConstraintReason(activeCell!.cell, person.id, assignments, person, state.shifts, lang) ?? t('tooltipConstraint', lang))
                  : '',
              };
              const statusLabel = statusLabels[status];

              return (
                <button
                  key={person.id}
                  onClick={() => !isBlocked && handleAssign(person.id)}
                  disabled={isBlocked}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 text-start transition-colors
                    ${isCurrent ? 'bg-blue-50' : ''}
                    ${isBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 active:bg-gray-100'}
                  `}
                >
                  <span
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
                    style={{ backgroundColor: person.colorHex }}
                  >
                    {person.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium leading-tight">{person.name}</p>
                    {statusLabel && (
                      <p
                        className="text-[11px] mt-0.5 leading-snug font-medium"
                        style={{ color: outlineColor ?? '#6b7280' }}
                      >
                        {statusLabel}
                      </p>
                    )}
                  </div>
                  {isCurrent && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
