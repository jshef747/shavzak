import { forwardRef, useMemo } from 'react';
import type { AppState, Assignment, CellAddress, HomeGroupPeriod, Position } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { DaySection } from './DaySection';
import { HomeGroupsSection } from './HomeGroupsSection';

interface Props {
  state: AppState;
  dates: string[];
  assignments: Assignment[];
  homeGroupPeriods: HomeGroupPeriod[];
  isAdmin?: boolean;
  myPersonId?: string | null;
  onRequestSwap?: (cell: CellAddress) => void;
}

export const ScheduleView = forwardRef<HTMLDivElement, Props>(function ScheduleView(
  { state, dates, assignments, homeGroupPeriods, isAdmin = true, myPersonId, onRequestSwap },
  ref
) {
  if (dates.length === 0) return null;
  const refDate = dates[0];
  const lang = langFromDir(state.dir);

  const regularPositions = useMemo(() => state.positions.filter(pos => !pos.isOnCall), [state.positions]);
  const onCallPositions  = useMemo(() => state.positions.filter(pos =>  pos.isOnCall), [state.positions]);

  function renderTable(positions: Position[], headerClass: string) {
    return (
      <table className="border-collapse text-sm min-w-max">
        <thead className="sticky top-0 z-10 shadow-sm">
          <tr className={headerClass}>
            <th className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-inherit px-3 py-2 text-left rtl:text-right text-xs font-semibold uppercase tracking-wide min-w-[120px] border-b border-gray-200 dark:border-slate-600">
              {t('shiftCol', lang)}
            </th>
            {positions.map(pos => (
              <th key={pos.id} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide min-w-[120px]">
                {pos.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
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
              isAdmin={isAdmin}
              myPersonId={myPersonId}
              onRequestSwap={onRequestSwap}
            />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div ref={ref} className="overflow-auto h-full print-overflow">
      <div className="flex gap-4 min-w-max flex-col">
        <div className="flex gap-4 min-w-max">
          {regularPositions.length > 0 && renderTable(regularPositions, 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400')}
          {onCallPositions.length > 0  && renderTable(onCallPositions,  'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300')}
        </div>
        <HomeGroupsSection
          state={state}
          dates={dates}
          homeGroupPeriods={homeGroupPeriods}
        />
      </div>
    </div>
  );
});
