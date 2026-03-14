import type { AppState, HomeGroup, HomeGroupPeriod, Shift } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { isHomeGroupBlocked } from '../../utils/validation';

interface Props {
  state: AppState;
  dates: string[];
  homeGroupPeriods: HomeGroupPeriod[];
}

/**
 * Returns the "worst" blocked status for a group on a date across all shifts.
 * 'full' = blocked all day, 'partial' = blocked only some shifts (half-day), null = not home.
 */
function getGroupDayStatus(
  date: string,
  groupId: string,
  homeGroups: HomeGroup[],
  homeGroupPeriods: HomeGroupPeriod[],
  shifts: Shift[],
): 'full' | 'partial' | null {
  // Check if any period covers this date for this group
  const activePeriod = homeGroupPeriods.find(p => {
    if (p.groupId !== groupId) return false;
    return date >= p.startDate && date <= p.endDate;
  });
  if (!activePeriod) return null;

  // On a full middle day, all shifts are blocked
  if (date > activePeriod.startDate && date < activePeriod.endDate) return 'full';

  // On departure/return day, check if at least one shift is blocked
  const anyBlocked = shifts.some(shift =>
    isHomeGroupBlocked(date, shift, groupId, homeGroups, homeGroupPeriods)
  );
  if (!anyBlocked) return null;

  // Check if ALL shifts are blocked (shouldn't happen on half-days, but handle gracefully)
  const allBlocked = shifts.length > 0 && shifts.every(shift =>
    isHomeGroupBlocked(date, shift, groupId, homeGroups, homeGroupPeriods)
  );
  return allBlocked ? 'full' : 'partial';
}

export function HomeGroupsSection({ state, dates, homeGroupPeriods }: Props) {
  const lang = langFromDir(state.dir);

  if (state.homeGroups.length === 0) return null;

  // Only show groups that have at least one period in this schedule
  const activeGroups = state.homeGroups.filter(g =>
    homeGroupPeriods.some(p => p.groupId === g.id)
  );

  if (activeGroups.length === 0) return null;

  return (
    <div className="mt-4">
      <table className="border-collapse text-sm min-w-max">
        <thead className="sticky top-0 z-10 shadow-sm">
          <tr className="bg-blue-800 text-white">
            <th className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-blue-800 px-3 py-2 text-start rtl:text-end text-xs uppercase tracking-wide min-w-[120px]">
              {t('homeGroupsSection', lang)}
            </th>
            {dates.map(date => {
              const d = new Date(date + 'T12:00:00');
              const day = d.getDate();
              const month = d.getMonth() + 1;
              return (
                <th key={date} className="px-3 py-2 text-center text-xs font-semibold min-w-[120px]">
                  {day}/{month}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {activeGroups.map((group, idx) => {
            const rowBg = idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white';
            return (
              <tr key={group.id} className={`border-b ${rowBg}`}>
                <td className={`sticky left-0 rtl:left-auto rtl:right-0 z-10 px-3 py-2 text-xs text-slate-700 border-r whitespace-nowrap font-medium ${rowBg}`}>
                  {group.name}
                </td>
                {dates.map(date => {
                  const status = getGroupDayStatus(date, group.id, state.homeGroups, homeGroupPeriods, state.shifts);

                  let cellClass = '';
                  let title = '';

                  if (status === 'full') {
                    cellClass = 'bg-blue-200';
                    title = lang === 'he' ? 'כל הקבוצה בבית' : 'Whole group at home';
                  } else if (status === 'partial') {
                    // Find if it's departure or return
                    const period = homeGroupPeriods.find(p =>
                      p.groupId === group.id && date >= p.startDate && date <= p.endDate
                    );
                    const isDeparture = period?.startDate === date;
                    cellClass = 'bg-blue-100';
                    title = isDeparture
                      ? t('tooltipHomeGroupDeparture', lang)
                      : t('tooltipHomeGroupReturn', lang);
                  }

                  return (
                    <td
                      key={date}
                      className={`border px-2 py-2 min-w-[120px] h-8 ${cellClass}`}
                      title={title || undefined}
                    >
                      {status === 'partial' && (
                        <span className="text-[10px] text-blue-600 font-medium">
                          {homeGroupPeriods.find(p => p.groupId === group.id && p.startDate === date)
                            ? (lang === 'he' ? 'יציאה' : 'dep.')
                            : (lang === 'he' ? 'חזרה' : 'ret.')}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
