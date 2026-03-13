import { forwardRef } from 'react';
import type { AppState, Assignment } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { DaySection } from './DaySection';
import { OncallTable } from './OncallTable';

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

  return (
    <div ref={ref} className="overflow-auto h-full print-overflow">
      <table className="border-collapse text-sm min-w-max">
        <thead className="sticky top-0 z-10 shadow-sm">
          <tr className="bg-slate-800 text-slate-100">
            <th className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-slate-800 px-3 py-2 text-left rtl:text-right text-xs uppercase tracking-wide min-w-[120px]">
              {t('shiftCol', lang)}
            </th>
            {state.positions.map(pos => (
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
            />
          ))}
        </tbody>
      </table>

      <OncallTable
        state={state}
        dates={dates}
        assignments={assignments}
        refDate={refDate}
      />
    </div>
  );
});
