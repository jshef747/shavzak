import { useState, useMemo, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { ChevronDown, UserPlus, X, Check, Wand2, Settings, CalendarDays, Users, Home } from 'lucide-react';
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
  onAutoAssign: () => void;
  onOpenSettings: (tab?: string) => void;
  onOpenHomePeriods: () => void;
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

const STATUS_ROW_BG_LIGHT: Partial<Record<CellStatus, string>> = {
  'constraint-violation': 'rgba(228, 206, 255, 0.25)',
  'double-booked':        'rgba(250, 116, 111, 0.12)',
  unavailable:            'rgba(239, 68, 68, 0.07)',
  'home-group':           'rgba(59, 130, 246, 0.07)',
  unqualified:            'rgba(234, 179, 8, 0.08)',
  'insufficient-break':   'rgba(14, 165, 233, 0.08)',
};

const STATUS_ROW_BG_DARK: Partial<Record<CellStatus, string>> = {
  'constraint-violation': 'rgba(105, 87, 129, 0.22)',
  'double-booked':        'rgba(168, 56, 54, 0.22)',
  unavailable:            'rgba(239, 68, 68, 0.12)',
  'home-group':           'rgba(59, 130, 246, 0.12)',
  unqualified:            'rgba(234, 179, 8, 0.12)',
  'insufficient-break':   'rgba(14, 165, 233, 0.12)',
};

const STATUS_ACCENT: Partial<Record<CellStatus, string>> = {
  'constraint-violation': '#695781',
  'double-booked':        '#a83836',
  unavailable:            '#ef4444',
  'home-group':           '#3b82f6',
};

const HEBREW_DAYS = ['ר׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

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

export function MobileScheduleView({
  state, dates, assignments, homeGroupPeriods,
  onAssign, onUnassign, onAutoAssign, onOpenSettings, onOpenHomePeriods,
}: Props) {
  const [dayIndex, setDayIndex] = useState(0);
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(() => new Set());
  const [expandedOnCall, setExpandedOnCall] = useState<Set<string>>(() => new Set());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const dateStripRef = useRef<HTMLDivElement>(null);

  const lang = langFromDir(state.dir);
  const isRtl = state.dir === 'rtl';
  const isDark = state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const locale = isRtl ? heLocale : undefined;

  // Scroll active date pill into view
  useEffect(() => {
    const strip = dateStripRef.current;
    if (!strip) return;
    const pill = strip.children[dayIndex] as HTMLElement | undefined;
    if (pill) pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [dayIndex]);

  function toggleOnCall(shiftId: string) {
    setExpandedOnCall(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) next.delete(shiftId); else next.add(shiftId);
      return next;
    });
  }

  function toggleShift(shiftId: string) {
    setExpandedShifts(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) next.delete(shiftId); else next.add(shiftId);
      return next;
    });
  }

  const refDate = dates[0] ?? '';
  const regularPositions = useMemo(() => state.positions.filter(p => !p.isOnCall), [state.positions]);
  const onCallPositions  = useMemo(() => state.positions.filter(p => p.isOnCall),  [state.positions]);

  const currentDate = dates[dayIndex] ?? '';
  const dateLabel = currentDate
    ? format(parseISO(currentDate), isRtl ? 'EEE, d MMM yyyy' : 'EEE, MMM d, yyyy', { locale })
    : '';

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

  // Tonal color helpers
  const surface = isDark ? '#1e293b' : '#f7f9fb';
  const surfaceCard = isDark ? '#0f172a' : '#ffffff';
  const onSurface = isDark ? '#f1f5f9' : '#2c3437';
  const onSurfaceVariant = isDark ? '#94a3b8' : '#596064';
  const outlineVariant = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(172,179,183,0.2)';
  const primaryColor = '#005bc4';
  const shiftHeaderBg = isDark ? 'rgba(0,91,196,0.18)' : 'rgba(0,91,196,0.07)';
  const navBg = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.88)';

  function rowBg(status: CellStatus, personColorHex?: string) {
    const map = isDark ? STATUS_ROW_BG_DARK : STATUS_ROW_BG_LIGHT;
    return map[status] ?? (personColorHex ? personColorHex + '0d' : 'transparent');
  }

  function renderPositionRow(pos: typeof state.positions[0], shift: typeof state.shifts[0], _isOnCall: boolean, half?: 1 | 2) {
    const cell: CellAddress = { date: currentDate, shiftId: shift.id, positionId: pos.id, ...(half !== undefined ? { half } : {}) };
    const assignment = assignments.find(a => assignmentMatchesCell(a, cell));
    const person = assignment ? state.people.find(p => p.id === assignment.personId) : null;
    const status: CellStatus = person
      ? computeCellStatus(cell, person.id, assignments, person, state.shifts, refDate, state.minBreakHours, state.homeGroups, homeGroupPeriods, state.positions, state.ignoreOnCallConstraints)
      : 'empty';

    const outlineColor = STATUS_OUTLINE[status];
    const bg = rowBg(status, person?.colorHex);
    const accentColor = STATUS_ACCENT[status];
    const accentStyle = accentColor ? { boxShadow: `inset ${isRtl ? '-' : ''}3px 0 0 ${accentColor}` } : {};

    return (
      <button
        key={pos.id}
        onClick={() => setActiveCell({ cell, shiftName: shift.name, positionName: pos.name, dateLabel })}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-start active:opacity-70 transition-opacity"
        style={{ backgroundColor: bg, ...accentStyle }}
      >
        {person ? (
          <span
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white font-heebo"
            style={{ backgroundColor: person.colorHex }}
          >
            {person.name.charAt(0)}
          </span>
        ) : (
          <span className="w-9 h-9 rounded-full shrink-0 border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#acb3b7' }}>
            <UserPlus className="w-3.5 h-3.5" style={{ color: '#acb3b7' }} strokeWidth={2} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium leading-none mb-0.5 font-heebo" style={{ color: onSurfaceVariant }}>{pos.name}</p>
          <p className="text-sm font-bold leading-tight truncate font-heebo" style={{ color: person ? onSurface : '#acb3b7' }}>
            {person ? person.name : t('tapToAssign', lang)}
          </p>
        </div>
        {outlineColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: outlineColor }} />}
      </button>
    );
  }

  if (dates.length === 0) return null;

  return (
    <>
      <div className="flex flex-col overflow-hidden flex-1 min-h-0 font-heebo" dir={state.dir} style={{ backgroundColor: surface }}>

        {/* Horizontal date strip */}
        <div className="shrink-0 py-3 px-4" style={{ backgroundColor: surface, borderBottom: `1px solid ${outlineVariant}` }}>
          <div ref={dateStripRef} className="flex overflow-x-auto gap-2" style={{ scrollbarWidth: 'none' }}>
            {dates.map((date, i) => {
              const parsed = parseISO(date);
              const dayOfWeek = parsed.getDay();
              const hebrewLabel = HEBREW_DAYS[dayOfWeek];
              const dayNum = format(parsed, 'd');
              const isActive = i === dayIndex;
              return (
                <button
                  key={date}
                  onClick={() => { setDayIndex(i); setExpandedShifts(new Set()); setExpandedOnCall(new Set()); }}
                  className="flex flex-col items-center shrink-0 min-w-[52px] px-2 py-2 rounded-xl transition-colors duration-150 active:opacity-80"
                  style={isActive
                    ? { backgroundColor: primaryColor, color: '#f9f8ff' }
                    : { backgroundColor: surfaceCard, color: onSurfaceVariant }
                  }
                >
                  <span className="text-[10px] font-bold leading-none mb-1">{hebrewLabel}</span>
                  <span className="text-lg font-black leading-none">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current day label */}
        <div className="shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: surface }}>
          <p className="text-sm font-bold font-heebo" style={{ color: onSurface }}>{dateLabel}</p>
          <p className="text-xs font-medium font-heebo" style={{ color: onSurfaceVariant }} dir="ltr">{dayIndex + 1} / {dates.length}</p>
        </div>

        {/* Shifts list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-32 flex flex-col gap-3">
          {state.positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <p className="text-sm font-medium font-heebo" style={{ color: onSurfaceVariant }}>{t('noPositions', lang)}</p>
              <p className="text-xs font-heebo" style={{ color: '#acb3b7' }}>{t('noPositionsHint', lang)}</p>
            </div>
          ) : (
            state.shifts.map(shift => {
              const endHour = shift.startHour + shift.durationHours;
              const isExpanded = expandedShifts.has(shift.id);
              const totalCells = state.positions.length;
              const filledCells = state.positions.filter(pos =>
                assignments.some(a => a.date === currentDate && a.shiftId === shift.id && a.positionId === pos.id)
              ).length;
              const halvesToShow: Array<1 | 2 | undefined> = shift.isHalfShift ? [1, 2] : [undefined];
              const midHour = shift.startHour + shift.durationHours / 2;

              const fillStyle = filledCells === totalCells && totalCells > 0
                ? { bg: isDark ? 'rgba(22,163,74,0.2)' : '#dcfce7', text: '#16a34a' }
                : filledCells > 0
                  ? { bg: isDark ? 'rgba(161,98,7,0.2)' : '#fef9c3', text: '#a16207' }
                  : { bg: isDark ? 'rgba(148,163,184,0.1)' : '#eaeff2', text: onSurfaceVariant };

              return (
                <div
                  key={shift.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: surfaceCard, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 10px 30px rgba(44,52,55,0.06)' }}
                >
                  {/* Shift header */}
                  <button
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-start active:opacity-80 transition-opacity"
                    style={{ backgroundColor: shiftHeaderBg }}
                    onClick={() => toggleShift(shift.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold leading-tight font-heebo" style={{ color: onSurface }}>{shift.name}</p>
                        {shift.isHalfShift && (
                          <span className="inline-flex items-center justify-center text-[9px] font-bold bg-orange-400 text-white rounded px-1 py-0.5 leading-none shrink-0">½</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 font-medium font-heebo" style={{ color: onSurfaceVariant }} dir="ltr">
                        {formatTime(shift.startHour)}–{formatTime(endHour)}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: fillStyle.bg, color: fillStyle.text }} dir="ltr">
                      {filledCells}/{totalCells}
                    </span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: onSurfaceVariant }} strokeWidth={2} />
                  </button>

                  {/* Expandable positions */}
                  {isExpanded && halvesToShow.map(half => {
                    const halfLabel = half === 1
                      ? `${t('half1', lang)} · ${formatTime(shift.startHour)}–${formatTime(midHour)}`
                      : half === 2
                        ? `${t('half2', lang)} · ${formatTime(midHour)}–${formatTime(endHour)}`
                        : null;
                    return (
                      <div key={half ?? 'full'}>
                        {halfLabel && (
                          <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: isDark ? 'rgba(120,60,20,0.2)' : '#fff7ed', borderTop: `1px solid ${outlineVariant}` }}>
                            <span className="inline-flex items-center justify-center text-[9px] font-bold bg-orange-400 text-white rounded px-1 py-0.5 leading-none">
                              {half === 1 ? '½1' : '½2'}
                            </span>
                            <span className="text-xs font-bold text-orange-500 font-heebo" dir="ltr">{halfLabel}</span>
                          </div>
                        )}
                        {regularPositions.length > 0 && (
                          <div>{regularPositions.map(pos => renderPositionRow(pos, shift, false, half))}</div>
                        )}
                        {onCallPositions.length > 0 && (
                          <div style={{ borderTop: `1px solid ${outlineVariant}` }}>
                            <button
                              className="w-full px-4 py-2.5 flex items-center justify-between text-start active:opacity-80 transition-opacity"
                              style={{ backgroundColor: isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.06)' }}
                              onClick={() => toggleOnCall(shift.id + (half ?? ''))}
                            >
                              <span className="text-xs font-bold uppercase tracking-wide text-orange-500 font-heebo">{t('onCall', lang)}</span>
                              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${expandedOnCall.has(shift.id + (half ?? '')) ? 'rotate-180' : ''}`} style={{ color: '#f97316' }} strokeWidth={2} />
                            </button>
                            {expandedOnCall.has(shift.id + (half ?? '')) && (
                              <div style={{ backgroundColor: isDark ? 'rgba(251,191,36,0.04)' : 'rgba(251,191,36,0.04)' }}>
                                {onCallPositions.map(pos => renderPositionRow(pos, shift, true, half))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 start-0 end-0 z-30 flex flex-row-reverse justify-around items-center px-2 pt-2"
        style={{
          backgroundColor: navBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isDark ? '0 -4px 20px rgba(0,0,0,0.3)' : '0 -4px 20px rgba(0,0,0,0.05)',
          borderRadius: '1.5rem 1.5rem 0 0',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          borderTop: `1px solid ${outlineVariant}`,
        }}
      >
        {/* Schedule — active tab */}
        <button
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors duration-150 active:opacity-80"
          style={{ backgroundColor: 'rgba(0,91,196,0.1)', color: primaryColor }}
        >
          <CalendarDays className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-[11px] font-bold font-heebo">לוח</span>
        </button>

        {/* People → opens Settings on People tab */}
        <button
          onClick={() => onOpenSettings('People')}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors duration-150 active:opacity-80"
          style={{ color: onSurfaceVariant }}
        >
          <Users className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[11px] font-bold font-heebo">אנשים</span>
        </button>

        {/* Auto-assign FAB center */}
        <button
          onClick={onAutoAssign}
          className="flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-colors duration-150 active:opacity-80"
          style={{ color: onSurfaceVariant }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #005bc4, #4388fd)' }}>
            <Wand2 className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
        </button>

        {/* Home Periods */}
        <button
          onClick={onOpenHomePeriods}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors duration-150 active:opacity-80"
          style={{ color: onSurfaceVariant }}
        >
          <Home className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[11px] font-bold font-heebo">יציאות</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onOpenSettings()}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors duration-150 active:opacity-80"
          style={{ color: onSurfaceVariant }}
        >
          <Settings className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[11px] font-bold font-heebo">הגדרות</span>
        </button>
      </nav>

      {/* Assignment bottom sheet */}
      <BottomSheet
        open={!!activeCell}
        onClose={() => setActiveCell(null)}
        title={activeCell ? `${activeCell.shiftName} · ${activeCell.positionName}` : ''}
        isDark={isDark}
      >
        {activeCell && (
          <div dir={state.dir}>
            <p className="px-4 py-2 text-xs font-medium font-heebo" style={{ color: onSurfaceVariant }}>{activeCell.dateLabel}</p>

            {activeCellOccupant && (
              <button
                onClick={handleClear}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-start active:opacity-80 transition-opacity"
                style={{ backgroundColor: 'rgba(239,68,68,0.07)' }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' }}>
                  <X className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-bold text-red-500 font-heebo">{t('clearAssignment', lang)}</span>
              </button>
            )}

            {personStatuses.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center font-heebo" style={{ color: onSurfaceVariant }}>{t('noPeopleYet', lang)}</p>
            ) : personStatuses.map(({ person, status }) => {
              const isCurrent = activeCellOccupant?.personId === person.id;
              const outlineColor = STATUS_OUTLINE[status];
              const isBlocked = status === 'double-booked';
              const bg = rowBg(status);

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
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-start transition-opacity active:opacity-70"
                  style={{
                    backgroundColor: isCurrent ? 'rgba(0,91,196,0.08)' : (bg ?? 'transparent'),
                    opacity: isBlocked ? 0.45 : 1,
                    cursor: isBlocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5 font-heebo"
                    style={{ backgroundColor: person.colorHex }}
                  >
                    {person.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight font-heebo" style={{ color: onSurface }}>{person.name}</p>
                    {statusLabel && (
                      <p className="text-xs mt-0.5 leading-snug font-medium font-heebo" style={{ color: outlineColor ?? onSurfaceVariant }}>
                        {statusLabel}
                      </p>
                    )}
                  </div>
                  {isCurrent && <Check className="w-4 h-4 shrink-0 mt-1" style={{ color: primaryColor }} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
