import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import type { AppState, Assignment, HomeGroupPeriod, Position } from '../../types';
import { ShiftRow } from './ShiftRow';
import { computeOnCallSlotMapping, resolvePositionsForDate } from '../../utils/cellKey';
import { Modal } from '../ui/Modal';
import { langFromDir } from '../../utils/i18n';

interface Props {
  date: string;
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  dayIndex: number;
  regularPositions: Position[];
  onCallPositions: Position[];
  homeGroupPeriods: HomeGroupPeriod[];
  dayStartHour: number;
  totalColumnCount: number;
  onCallDurationOverrides?: Record<string, Record<string, number>>;
  onSetOnCallDuration: (date: string, positionId: string, hours: number | undefined) => void;
}

export const DaySection = memo(function DaySection({ date, state, assignments, refDate, dayIndex, regularPositions, onCallPositions, homeGroupPeriods, dayStartHour, totalColumnCount, onCallDurationOverrides, onSetOnCallDuration }: Props) {
  const locale = state.dir === 'rtl' ? heLocale : undefined;
  const lang = langFromDir(state.dir);
  const label = format(parseISO(date), 'EEE, MMM d', { locale });
  const [durationModalOpen, setDurationModalOpen] = useState(false);

  // Resolve on-call positions for this date (applying any per-day overrides)
  const resolvedOnCallPositions = resolvePositionsForDate(onCallPositions, date, onCallDurationOverrides);

  const slotMapping = computeOnCallSlotMapping(
    state.shifts,
    resolvedOnCallPositions,
    dayStartHour,
    date,
    assignments,
    regularPositions,
  );

  const dayOverrides = onCallDurationOverrides?.[date] ?? {};
  const hasOverride = onCallPositions.some(p => dayOverrides[p.id] != null);

  return (
    <>
      <tr>
        <td
          colSpan={totalColumnCount}
          className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 border-t border-gray-300 dark:border-slate-600 uppercase tracking-wide"
        >
          <div className="flex items-center gap-2">
            <span>{label}</span>
            {onCallPositions.length > 0 && (
              <button
                onClick={() => setDurationModalOpen(true)}
                title={lang === 'he' ? 'שעות כוננות לפי יום' : 'On-call hours for this day'}
                className={`inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors duration-150 ${
                  hasOverride
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40'
                    : 'text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                }`}
              >
                <Clock className="w-3 h-3" strokeWidth={2} />
                {hasOverride && (
                  <span className="text-[10px] font-bold leading-none">
                    {lang === 'he' ? 'מותאם' : 'custom'}
                  </span>
                )}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* On-call duration modal — rendered via portal to avoid invalid table DOM nesting */}
      {durationModalOpen && createPortal(
        <Modal
          open={durationModalOpen}
          onClose={() => setDurationModalOpen(false)}
          title={`${lang === 'he' ? 'שעות כוננות' : 'On-Call Hours'} — ${label}`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {lang === 'he'
                ? 'קבע מספר שעות כוננות לכל תפקיד ליום זה בלבד. ריק = ברירת מחדל לפי הגדרות התפקיד.'
                : 'Set on-call duration per position for this day only. Leave blank to use the position default.'}
            </p>
            <div className="space-y-3">
              {onCallPositions.map(pos => {
                const overrideVal = dayOverrides[pos.id];
                const isCustom = overrideVal != null;
                return (
                  <div key={pos.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate block">{pos.name}</span>
                      {!isCustom && pos.onCallDurationHours != null && (
                        <span className="text-[11px] text-gray-400 dark:text-slate-500">
                          {lang === 'he' ? `ברירת מחדל: ${pos.onCallDurationHours}h` : `Default: ${pos.onCallDurationHours}h`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0.5} max={48} step={0.5}
                        placeholder={pos.onCallDurationHours != null ? String(pos.onCallDurationHours) : '–'}
                        value={overrideVal ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? undefined : Math.max(0.5, parseFloat(e.target.value) || 0.5);
                          onSetOnCallDuration(date, pos.id, val);
                        }}
                        className={`w-16 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 transition-shadow dark:bg-slate-700 dark:text-slate-100 ${
                          isCustom
                            ? 'border-orange-300 dark:border-orange-600 focus:ring-orange-400 text-orange-700 dark:text-orange-300'
                            : 'border-gray-200 dark:border-slate-600 focus:ring-blue-400'
                        }`}
                      />
                      {isCustom && (
                        <button
                          onClick={() => onSetOnCallDuration(date, pos.id, undefined)}
                          title={lang === 'he' ? 'אפס לברירת מחדל' : 'Reset to default'}
                          className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-150 underline"
                        >
                          {lang === 'he' ? 'אפס' : 'reset'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setDurationModalOpen(false)}
                className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
              >
                {lang === 'he' ? 'סגור' : 'Done'}
              </button>
            </div>
          </div>
        </Modal>,
        document.body
      )}

      {state.shifts.map((shift, shiftIndex) => (
        <ShiftRow
          key={shift.id}
          date={date}
          shift={shift}
          state={state}
          assignments={assignments}
          refDate={refDate}
          dayIndex={dayIndex}
          positions={regularPositions}
          homeGroupPeriods={homeGroupPeriods}
          shiftIndex={shiftIndex}
          totalShifts={state.shifts.length}
          onCallSlots={slotMapping.get(shiftIndex) ?? []}
        />
      ))}
    </>
  );
});
