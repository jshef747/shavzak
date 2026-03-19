import { forwardRef, useMemo } from 'react';
import type { AppState, Assignment, HomeGroupPeriod, Position } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { DaySection } from './DaySection';
import { HomeGroupsSection } from './HomeGroupsSection';

interface Props {
  state: AppState;
  dates: string[];
  assignments: Assignment[];
  homeGroupPeriods: HomeGroupPeriod[];
}

export const ScheduleView = forwardRef<HTMLDivElement, Props>(function ScheduleView(
  { state, dates, assignments, homeGroupPeriods },
  ref
) {
  if (dates.length === 0) return null;
  const refDate = dates[0];
  const lang = langFromDir(state.dir);

  const regularPositions = useMemo(() => state.positions.filter(pos => !pos.isOnCall), [state.positions]);
  const onCallPositions  = useMemo(() => state.positions.filter(pos =>  pos.isOnCall), [state.positions]);

  function renderTable(positions: Position[], headerClass: string) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden ring-1 ring-black/[0.02]">
        <table className="border-collapse text-sm min-w-max w-full">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className={headerClass}>
              <th className="sticky start-0 z-20 bg-inherit px-4 py-3 text-start text-xs font-bold uppercase tracking-wider min-w-[120px] border-b border-gray-200/80 dark:border-slate-700">
                {t('shiftCol', lang)}
              </th>
              {positions.map(pos => (
                <th key={pos.id} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-[120px] border-b border-gray-200/80 dark:border-slate-700 border-s border-gray-100/50 dark:border-slate-800">
                  {pos.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {dates.map((date, dayIndex) => (
              <DaySection
                key={date}
                date={date}
                state={state}
                assignments={assignments}
                refDate={refDate}
                dayIndex={dayIndex}
                positions={positions}
                homeGroupPeriods={homeGroupPeriods}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div ref={ref} className="overflow-auto h-full print-overflow w-full">
      <div className="flex gap-6 min-w-max flex-col pb-12">
        <div className="flex gap-6 min-w-max items-start">
          {regularPositions.length > 0 && renderTable(regularPositions, 'bg-gray-50/80 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300')}
          {onCallPositions.length > 0  && renderTable(onCallPositions,  'bg-orange-50/80 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400')}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden ring-1 ring-black/[0.02]">
          <HomeGroupsSection
            state={state}
            dates={dates}
            homeGroupPeriods={homeGroupPeriods}
          />
        </div>
      </div>
    </div>
  );
});
