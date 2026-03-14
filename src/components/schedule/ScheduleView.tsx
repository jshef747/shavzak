import { forwardRef } from 'react';
import type { AppState, Assignment, Position } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { DaySection } from './DaySection';

interface Props {
  state: AppState;
  dates: string[];
  assignments: Assignment[];
}

export const ScheduleView = forwardRef<HTMLDivElement, Props>(function ScheduleView(
  { state, dates, assignments },
  ref
) {
  if (dates.length === 0) return null;
  const refDate = dates[0];
  const lang = langFromDir(state.dir);

  const regularPositions = state.positions.filter(pos => !pos.isOnCall);
  const onCallPositions  = state.positions.filter(pos =>  pos.isOnCall);

  function renderTable(positions: Position[], headerClass: string) {
    return (
      <table className="border-collapse text-sm min-w-max">
        <thead className="sticky top-0 z-10 shadow-sm">
          <tr className={headerClass}>
            <th className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-inherit px-3 py-2 text-left rtl:text-right text-xs uppercase tracking-wide min-w-[120px]">
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
            <DaySection
              key={date}
              date={date}
              state={state}
              assignments={assignments}
              refDate={refDate}
              dayIndex={dayIndex}
              positions={positions}
            />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div ref={ref} className="overflow-auto h-full print-overflow">
      <div className="flex gap-4 min-w-max">
        {regularPositions.length > 0 && renderTable(regularPositions, 'bg-slate-800 text-slate-100')}
        {onCallPositions.length > 0  && renderTable(onCallPositions,  'bg-orange-500 text-white')}
      </div>
    </div>
  );
});
