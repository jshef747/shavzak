import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import type { AppState, Assignment, HomeGroupPeriod, Position } from '../../types';
import type { SkippedCell } from '../../utils/autoAssign';
import { langFromDir, t } from '../../utils/i18n';
import { PreviewCell } from './PreviewCell';

interface Props {
  state: AppState;
  dates: string[];
  mergedAssignments: Assignment[];
  baseAssignments: Assignment[];
  skippedCells: SkippedCell[];
  homeGroupPeriods: HomeGroupPeriod[];
}

function formatShiftTime(h: number) {
  const totalMin = Math.round(h * 60) % (24 * 60);
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

  function renderTable(positions: Position[], headerClass: string) {
    return (
      <table className="border-collapse text-sm min-w-max border border-slate-200 dark:border-slate-700">
        <thead>
          <tr className={headerClass}>
            <th className="px-3 py-2 text-start  text-xs uppercase tracking-wide min-w-[120px]">
              {t('shiftCol', lang)}
            </th>
            {positions.map(pos => (
              <th key={pos.id} className="px-3 py-2 text-center text-xs uppercase tracking-wide min-w-[120px]">
                {pos.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date, dayIndex) => (
            <>
              <tr key={`hdr-${date}`}>
                <td
                  colSpan={positions.length + 1}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 border-t-2 border-slate-400 dark:border-slate-500 uppercase tracking-wide"
                >
                  {format(parseISO(date), 'EEE, MMM d', { locale })}
                </td>
              </tr>
              {state.shifts.map((shift, shiftIndex) => {
                const rowBg = dayIndex % 2 === 0
                  ? 'bg-slate-50/40 dark:bg-slate-800/60'
                  : 'bg-white dark:bg-slate-800';
                const firstShiftId = state.shifts[0]?.id;
                return (
                  <tr key={`${date}-${shift.id}`} className={`border-b border-slate-200 dark:border-slate-700 ${rowBg}`}>
                    <td className={`px-3 py-2 text-xs text-gray-600 dark:text-slate-300 border-e border-slate-200 dark:border-slate-700 whitespace-nowrap font-medium ${rowBg}`}>
                      {shift.name}
                      <div dir="ltr" className="text-gray-400 dark:text-slate-500 font-normal">
                        {formatShiftTime(shift.startHour)}–{formatShiftTime(shift.startHour + shift.durationHours)}
                      </div>
                    </td>
                    {positions.map(pos => {
                      if (pos.isOnCall && pos.onCallDurationHours != null) {
                        if (shiftIndex > 0) return null;
                        const onCallAssignment = mergedAssignments.find(a => a.date === date && a.positionId === pos.id);
                        const onCallShiftId = onCallAssignment?.shiftId ?? firstShiftId ?? shift.id;
                        return (
                          <PreviewCell
                            key={pos.id}
                            cell={{ date, shiftId: onCallShiftId, positionId: pos.id }}
                            state={state}
                            mergedAssignments={mergedAssignments}
                            baseAssignments={baseAssignments}
                            skippedCells={skippedCells}
                            refDate={refDate}
                            homeGroupPeriods={homeGroupPeriods}
                            rowSpan={state.shifts.length > 1 ? state.shifts.length : undefined}
                          />
                        );
                      }
                      return (
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
                      );
                    })}
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="overflow-auto">
      <div className="flex gap-4 min-w-max">
        {regularPositions.length > 0 && renderTable(regularPositions, 'bg-slate-800 text-slate-100')}
        {onCallPositions.length  > 0 && renderTable(onCallPositions,  'bg-orange-500 text-white')}
      </div>
    </div>
  );
}
