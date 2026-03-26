import { useState, useMemo, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { ChevronDown, UserPlus, Check, X } from 'lucide-react';
import type { AppState, Assignment, CellAddress, CellStatus, HomeGroupPeriod } from '../../types';
import { computeCellStatus, computeConstraintReason } from '../../utils/validation';
import { assignmentMatchesCell } from '../../utils/cellKey';
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
  'home-group':           '#3b82f6',
  'double-booked':        '#f97316',
  unqualified:            '#eab308',
  'insufficient-break':   '#0ea5e9',
  'constraint-violation': '#a855f7',
  'oncall-short-break':   null,
  'oncall-override':      '#65a30d',
};

const STATUS_BADGE: Record<CellStatus, string | null> = {
  empty:                  null,
  valid:                  null,
  unavailable:            'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  'home-group':           'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  'double-booked':        'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  unqualified:            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  'insufficient-break':   'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
  'constraint-violation': 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  'oncall-short-break':   'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
  'oncall-override':      'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400',
};

const STATUS_SORT_ORDER: Record<CellStatus, number> = {
  valid: 0,
  'oncall-short-break': 1,
  'oncall-override': 1,
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

export function NewMobileScheduleView({ state, dates, assignments, homeGroupPeriods, onAssign, onUnassign }: Props) {
  const [dayIndex, setDayIndex] = useState(0);
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(() => new Set());
  const [expandedOnCall, setExpandedOnCall] = useState<Set<string>>(() => new Set());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const activeDateRef = useRef<HTMLButtonElement>(null);

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

  // Scroll active date pill into view when dayIndex changes
  useEffect(() => {
    activeDateRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [dayIndex]);

  function toggleShift(shiftId: string) {
    setExpandedShifts(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) next.delete(shiftId); else next.add(shiftId);
      return next;
    });
  }

  function toggleOnCall(key: string) {
    setExpandedOnCall(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function goToDay(idx: number) {
    setDayIndex(idx);
    setExpandedShifts(new Set());
    setExpandedOnCall(new Set());
  }

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
          state.homeGroups, homeGroupPeriods, state.positions, state.ignoreOnCallConstraints
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

  function renderPositionRow(pos: typeof state.positions[0], shift: typeof state.shifts[0], isOnCall: boolean, half?: 1 | 2) {
    const cell: CellAddress = { date: currentDate, shiftId: shift.id, positionId: pos.id, ...(half !== undefined ? { half } : {}) };
    const assignment = assignments.find(a => assignmentMatchesCell(a, cell));
    const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;
    const status: CellStatus = person
      ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions, state.ignoreOnCallConstraints)
      : 'empty';

    const outlineColor = STATUS_OUTLINE[status];
    const personBg = person ? `${person.colorHex}28` : undefined;

    return (
      <button
        key={pos.id}
        onClick={() => setActiveCell({ cell, shiftName: shift.name, positionName: pos.name, dateLabel })}
        className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 text-start active:bg-gray-50 dark:active:bg-slate-700/30 transition-colors"
        style={{
          backgroundColor: personBg ?? (isOnCall ? 'rgba(255,247,237,0.5)' : undefined),
          ...(outlineColor ? { boxShadow: `inset ${isRtl ? '-' : ''}3px 0 0 ${outlineColor}` } : {}),
        }}
      >
        {/* Avatar with status dot */}
        <div className="relative shrink-0">
          {person ? (
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: person.colorHex }}
            >
              {person.name.charAt(0)}
            </span>
          ) : (
            <span className="w-9 h-9 rounded-full border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5 text-gray-300 dark:text-slate-500" strokeWidth={2} />
            </span>
          )}
          {outlineColor && (
            <span
              className="absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800"
              style={{ backgroundColor: outlineColor }}
            />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-none mb-1 uppercase tracking-wide font-semibold">
            {pos.name}
          </p>
          <p className={`text-sm font-semibold leading-tight truncate ${
            person ? 'text-gray-800 dark:text-slate-100' : 'text-gray-300 dark:text-slate-600'
          }`}>
            {person ? person.name : t('tapToAssign', lang)}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0 -rotate-90 rtl:rotate-90"
          strokeWidth={2}
        />
      </button>
    );
  }

  if (dates.length === 0) return null;

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden animate-fade-in" dir={state.dir}>

        {/* Date carousel */}
        <div
          className="shrink-0 flex gap-2 px-3 py-2.5 overflow-x-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-slate-700/50 scrollbar-hide"
        >
          {dates.map((date, idx) => {
            const d = parseISO(date);
            const dayAbbr = format(d, 'EEE', { locale });
            const dayNum  = format(d, 'd');
            const isActive = idx === dayIndex;
            return (
              <button
                key={date}
                ref={isActive ? activeDateRef : undefined}
                onClick={() => goToDay(idx)}
                className={`shrink-0 flex flex-col items-center rounded-2xl px-3 py-2 min-w-[52px] transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                    : 'bg-white/60 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/60 active:scale-95'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider leading-none mb-1 ${
                  isActive ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'
                }`}>
                  {dayAbbr}
                </span>
                <span className={`text-base font-bold leading-none ${
                  isActive ? 'text-white' : 'text-gray-800 dark:text-slate-100'
                }`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shift cards */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
          {state.positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <p className="text-sm text-gray-400 dark:text-slate-500">{t('noPositions', lang)}</p>
              <p className="text-xs text-gray-300 dark:text-slate-600">{t('noPositionsHint', lang)}</p>
            </div>
          ) : (
            state.shifts.map(shift => {
              const endHour = shift.startHour + shift.durationHours;
              const isExpanded = expandedShifts.has(shift.id);
              const totalCells = state.positions.length;
              const filledCells = state.positions.filter(pos =>
                assignments.some(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id)
              ).length;
              const isFullyFilled = filledCells === totalCells && totalCells > 0;
              const isPartial = filledCells > 0 && !isFullyFilled;
              const midHour = shift.startHour + shift.durationHours / 2;

              // For half-shifts: determine which regular positions need two separate rows
              // (different person per half, or only one half filled). Same logic as desktop ShiftRow.
              const splitRegularIds: Set<string> = shift.isHalfShift
                ? new Set(
                    regularPositions
                      .filter(pos => {
                        const h1 = assignments.find(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id && a.half === 1);
                        const h2 = assignments.find(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id && a.half === 2);
                        if (!h1 && !h2) return false;
                        if (h1 && h2 && h1.personId === h2.personId) return false;
                        return true;
                      })
                      .map(p => p.id)
                  )
                : new Set<string>();

              // On-call section (rendered once regardless of halves)
              const onCallSection = onCallPositions.length > 0 ? (
                <div className="border-t border-orange-100 dark:border-orange-900/30">
                  <button
                    className="w-full px-4 py-2.5 bg-orange-50/60 dark:bg-orange-900/20 flex items-center justify-between text-start active:bg-orange-100 dark:active:bg-orange-900/30 transition-colors"
                    onClick={() => toggleOnCall(shift.id)}
                  >
                    <span className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest">
                      {t('onCall', lang)}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-orange-400 shrink-0 transition-transform duration-200 ${
                        expandedOnCall.has(shift.id) ? 'rotate-180' : ''
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                  {expandedOnCall.has(shift.id) && (
                    <div className="bg-orange-50/40 dark:bg-orange-900/10">
                      {onCallPositions.map(pos => renderPositionRow(pos, shift, true, undefined))}
                    </div>
                  )}
                </div>
              ) : null;

              // Half-label banner helper
              function halfBanner(n: 1 | 2) {
                const label = n === 1
                  ? `${t('half1', lang)} · ${formatTime(shift.startHour)}–${formatTime(midHour)}`
                  : `${t('half2', lang)} · ${formatTime(midHour)}–${formatTime(endHour)}`;
                return (
                  <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-100 dark:border-orange-900/30 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center text-[9px] font-bold bg-orange-400 text-white rounded px-1 py-0.5 leading-none">
                      {n === 1 ? '½1' : '½2'}
                    </span>
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400" dir="ltr">
                      {label}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={shift.id}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-slate-700/40 overflow-hidden shadow-sm"
                >
                  {/* Shift header */}
                  <button
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-700 dark:to-slate-600 flex items-center justify-between gap-3 text-start active:from-slate-700 active:to-slate-600 transition-colors"
                    onClick={() => toggleShift(shift.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white leading-tight tracking-tight">
                          {shift.name}
                        </p>
                        {shift.isHalfShift && (
                          <span className="inline-flex items-center justify-center text-[9px] font-bold bg-orange-400 text-white rounded-md px-1.5 py-0.5 leading-none shrink-0">
                            ½
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium" dir="ltr">
                        {formatTime(shift.startHour)}–{formatTime(endHour)}
                      </p>
                    </div>

                    {/* Fill badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 transition-colors ${
                        isFullyFilled
                          ? 'bg-emerald-500 text-white'
                          : isPartial
                            ? 'bg-amber-400 text-white'
                            : 'bg-slate-600 text-slate-300'
                      }`}
                      dir="ltr"
                    >
                      {filledCells}/{totalCells}
                    </span>

                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      strokeWidth={2}
                    />
                  </button>

                  {/* Accordion body — grid-rows trick for smooth height transition */}
                  <div className={`accordion-grid ${isExpanded ? 'open' : 'closed'}`}>
                    <div className="overflow-hidden">
                      {shift.isHalfShift && splitRegularIds.size === 0 ? (
                        // All same-person (or empty) both halves — single merged row per position
                        <div>
                          {regularPositions.length > 0 && (
                            <div>
                              {regularPositions.map(pos => {
                                const h1 = assignments.find(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id && a.half === 1);
                                const h2 = assignments.find(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id && a.half === 2);
                                const displayHalf: 1 | 2 = (h2 && !h1) ? 2 : 1;
                                return renderPositionRow(pos, shift, false, displayHalf);
                              })}
                            </div>
                          )}
                          {onCallSection}
                        </div>
                      ) : shift.isHalfShift ? (
                        // Some positions are split across halves
                        <div>
                          {/* Half 1 — all regular positions */}
                          {halfBanner(1)}
                          {regularPositions.length > 0 && (
                            <div>
                              {regularPositions.map(pos => renderPositionRow(pos, shift, false, 1))}
                            </div>
                          )}
                          {/* Half 2 — only split positions */}
                          {halfBanner(2)}
                          {regularPositions.filter(pos => splitRegularIds.has(pos.id)).map(pos =>
                            renderPositionRow(pos, shift, false, 2)
                          )}
                          {onCallSection}
                        </div>
                      ) : (
                        // Normal (non-half) shift
                        <div>
                          {regularPositions.length > 0 && (
                            <div>
                              {regularPositions.map(pos => renderPositionRow(pos, shift, false, undefined))}
                            </div>
                          )}
                          {onCallSection}
                        </div>
                      )}
                    </div>
                  </div>
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
            <p className="px-4 py-2 text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
              {activeCell.dateLabel}
            </p>

            {activeCellOccupant && (
              <button
                onClick={handleClear}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-slate-700/60 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-start"
              >
                <span className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 flex items-center justify-center shrink-0">
                  <X className="w-4 h-4 text-red-400" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                  {t('clearAssignment', lang)}
                </span>
              </button>
            )}

            {personStatuses.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-slate-500 text-center">
                {t('noPeopleYet', lang)}
              </p>
            ) : personStatuses.map(({ person, status }) => {
              const isCurrent = activeCellOccupant?.personId === person.id;
              const outlineColor = STATUS_OUTLINE[status];
              const badgeClass = STATUS_BADGE[status];
              const isBlocked = status === 'double-booked';

              const statusLabels: Partial<Record<CellStatus, string>> = {
                unavailable:            t('tooltipUnavailable', lang),
                'home-group':           t('tooltipHomeGroup', lang),
                'double-booked':        t('tooltipDoubleBooked', lang),
                unqualified:            t('tooltipUnqualified', lang),
                'insufficient-break':   t('tooltipBreak', lang),
                'oncall-short-break':   t('tooltipOncallShortBreak', lang),
                'oncall-override':      t('tooltipOncallOverride', lang),
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
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-slate-700/40 text-start transition-colors
                    ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${isBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-slate-700/30 active:bg-gray-100 dark:active:bg-slate-700/50'}
                  `}
                >
                  <span
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: person.colorHex }}
                  >
                    {person.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-slate-100 font-semibold leading-tight">
                      {person.name}
                    </p>
                    {statusLabel && (
                      <span
                        className={`inline-block text-[10px] mt-1 px-2 py-0.5 rounded-full font-semibold leading-snug ${badgeClass ?? ''}`}
                        style={badgeClass ? undefined : { color: outlineColor ?? '#6b7280' }}
                      >
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  {isCurrent && (
                    <Check className="w-5 h-5 text-blue-500 shrink-0" strokeWidth={2.5} />
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
