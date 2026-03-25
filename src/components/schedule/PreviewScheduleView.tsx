import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Assignment, HomeGroupPeriod } from '../../types';
import type { SkippedCell } from '../../utils/autoAssign';
import { langFromDir, t } from '../../utils/i18n';
import { PreviewCell } from './PreviewCell';
import { computeOnCallSlotMapping } from '../../utils/cellKey';

interface Props {
  state: AppState;
  dates: string[];
  mergedAssignments: Assignment[];
  baseAssignments: Assignment[];
  skippedCells: SkippedCell[];
  homeGroupPeriods: HomeGroupPeriod[];
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(((h % 24) + 24) % 24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

export function PreviewScheduleView({ state, dates, mergedAssignments, baseAssignments, skippedCells, homeGroupPeriods }: Props) {
  if (dates.length === 0) return null;
  const refDate = dates[0];
  const lang = langFromDir(state.dir);
  const locale = state.dir === 'rtl' ? heLocale : undefined;

  const regularPositions = useMemo(() => state.positions.filter(p => !p.isOnCall), [state.positions]);
  const onCallPositions  = useMemo(() => state.positions.filter(p =>  p.isOnCall), [state.positions]);

  const dayStartHour = useMemo(() => {
    if (state.shifts.length === 0) return 0;
    return Math.min(...state.shifts.map(s => s.startHour < 6 ? s.startHour + 24 : s.startHour)) % 24;
  }, [state.shifts]);

  const totalColumnCount = regularPositions.length + onCallPositions.length + 1;

  return (
    <div className="overflow-auto">
      <table className="border-collapse text-sm min-w-max border border-slate-200 dark:border-slate-700">
        <thead>
          <tr>
            <th className="px-3 py-2 text-start text-xs uppercase tracking-wide min-w-[120px] bg-slate-800 text-slate-100">
              {t('shiftCol', lang)}
            </th>
            {regularPositions.map(pos => (
              <th key={pos.id} className="px-3 py-2 text-center text-xs uppercase tracking-wide min-w-[120px] bg-slate-800 text-slate-100">
                {pos.name}
              </th>
            ))}
            {onCallPositions.map(pos => (
              <th key={pos.id} className="px-3 py-2 text-center text-xs uppercase tracking-wide min-w-[120px] bg-orange-500 text-white">
                {pos.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date, dayIndex) => {
            const rowBg = dayIndex % 2 === 0 ? 'bg-slate-50/40 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-800';
            const slotMapping = computeOnCallSlotMapping(
              state.shifts,
              onCallPositions,
              dayStartHour,
              date,
              mergedAssignments,
              regularPositions,
            );

            return (
              <>
                <tr key={`hdr-${date}`}>
                  <td colSpan={totalColumnCount} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 border-t-2 border-slate-400 dark:border-slate-500 uppercase tracking-wide">
                    {format(parseISO(date), 'EEE, MMM d', { locale })}
                  </td>
                </tr>
                {state.shifts.map((shift, shiftIndex) => {
                  const onCallMappings = slotMapping.get(shiftIndex) ?? [];
                  return (
                    <tr key={`${date}-${shift.id}`} className={`border-b border-slate-200 dark:border-slate-700 ${rowBg}`}>
                      <td className={`px-3 py-2 text-xs text-gray-600 dark:text-slate-300 border-e border-slate-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
                        {shift.name}
                        <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">
                          {formatShiftTime(shift.startHour)}–{formatShiftTime(shift.startHour + shift.durationHours)}
                        </div>
                      </td>
                      {regularPositions.map(pos => (
                        <PreviewCell
                          key={pos.id}
                          cell={{ date, shiftId: shift.id, positionId: pos.id }}
                          state={state}
                          mergedAssignments={mergedAssignments}
                          baseAssignments={baseAssignments}
                          skippedCells={skippedCells}
                          refDate={refDate}
                          homeGroupPeriods={homeGroupPeriods}
                        />
                      ))}
                      {onCallMappings.map(({ pos, slot, rowSpan }) => (
                        <PreviewCell
                          key={pos.id}
                          cell={{ date, shiftId: slot.shiftId, positionId: pos.id }}
                          state={state}
                          mergedAssignments={mergedAssignments}
                          baseAssignments={baseAssignments}
                          skippedCells={skippedCells}
                          refDate={refDate}
                          homeGroupPeriods={homeGroupPeriods}
                          rowSpan={rowSpan > 1 ? rowSpan : undefined}
                        />
                      ))}
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
