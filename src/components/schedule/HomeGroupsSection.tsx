import { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { eachDayOfInterval, parseISO, format, max, min } from 'date-fns';
import type { AppState, HomeGroup, HomeGroupPeriod, Shift } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { isHomeGroupBlocked } from '../../utils/validation';

interface Props {
  state: AppState;
  dates: string[];
  homeGroupPeriods: HomeGroupPeriod[];
}

function getGroupDayStatus(
  date: string,
  groupId: string,
  homeGroups: HomeGroup[],
  homeGroupPeriods: HomeGroupPeriod[],
  shifts: Shift[],
): 'full' | 'partial' | null {
  const activePeriod = homeGroupPeriods.find(p => {
    if (p.groupId !== groupId) return false;
    return date >= p.startDate && date <= p.endDate;
  });
  if (!activePeriod) return null;

  if (date > activePeriod.startDate && date < activePeriod.endDate) return 'full';

  const anyBlocked = shifts.some(shift =>
    isHomeGroupBlocked(date, shift, [groupId], homeGroups, homeGroupPeriods)
  );
  if (!anyBlocked) return null;

  const allBlocked = shifts.length > 0 && shifts.every(shift =>
    isHomeGroupBlocked(date, shift, [groupId], homeGroups, homeGroupPeriods)
  );
  return allBlocked ? 'full' : 'partial';
}

export function HomeGroupsSection({ state, dates, homeGroupPeriods }: Props) {
  const lang = langFromDir(state.dir);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  if (state.homeGroups.length === 0) return null;

  const activeGroups = state.homeGroups.filter(g =>
    homeGroupPeriods.some(p => p.groupId === g.id)
  );

  if (activeGroups.length === 0) return null;

  // Extend the date range to cover any home group periods that go beyond the schedule end date
  const extendedDates = useMemo(() => {
    if (dates.length === 0) return dates;
    const scheduleStart = parseISO(dates[0]);
    const scheduleEnd = parseISO(dates[dates.length - 1]);
    const periodDates = homeGroupPeriods.flatMap(p => [parseISO(p.startDate), parseISO(p.endDate)]);
    if (periodDates.length === 0) return dates;
    const rangeStart = min([scheduleStart, ...periodDates]);
    const rangeEnd = max([scheduleEnd, ...periodDates]);
    if (rangeStart >= scheduleStart && rangeEnd <= scheduleEnd) return dates;
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'));
  }, [dates, homeGroupPeriods]);

  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr className="bg-blue-700 dark:bg-blue-900 text-white">
              <th className="sticky start-0 z-20 bg-blue-700 dark:bg-blue-900 px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide w-28 shrink-0">
                {t('homeGroupsSection', lang)}
              </th>
              {extendedDates.map(date => {
                const d = new Date(date + 'T12:00:00');
                return (
                  <th key={date} className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap">
                    {d.getDate()}/{d.getMonth() + 1}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeGroups.map((group, idx) => {
              const isEven = idx % 2 === 0;
              const rowBg = isEven
                ? 'bg-white dark:bg-slate-900'
                : 'bg-slate-50 dark:bg-slate-800/60';
              const members = state.people.filter(p => (p.homeGroupIds ?? []).includes(group.id)).map(p => p.name);
              const isExpanded = expandedGroupId === group.id;

              return (
                <>
                  <tr key={group.id} className={`border-b border-slate-100 dark:border-slate-700/60 ${rowBg}`}>
                    <td className={`sticky start-0 z-10 px-3 py-1.5 border-e border-slate-100 dark:border-slate-700/60 ${rowBg}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{group.name}</span>
                        <button
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                          title={lang === 'he' ? 'הצג חברים' : 'Show members'}
                          className={`inline-flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium transition-colors duration-150 shrink-0 ${
                            isExpanded
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          <span>{members.length}</span>
                        </button>
                      </div>
                    </td>
                    {extendedDates.map(date => {
                      const status = getGroupDayStatus(date, group.id, state.homeGroups, homeGroupPeriods, state.shifts);

                      let cellClass = '';
                      let title = '';
                      let label = '';

                      if (status === 'full') {
                        cellClass = 'bg-blue-200 dark:bg-blue-800/50';
                        title = lang === 'he' ? 'כל הקבוצה בבית' : 'Whole group at home';
                      } else if (status === 'partial') {
                        const period = homeGroupPeriods.find(p =>
                          p.groupId === group.id && date >= p.startDate && date <= p.endDate
                        );
                        const isDeparture = period?.startDate === date;
                        cellClass = 'bg-blue-100 dark:bg-blue-900/30';
                        title = isDeparture
                          ? t('tooltipHomeGroupDeparture', lang)
                          : t('tooltipHomeGroupReturn', lang);
                        label = isDeparture
                          ? (lang === 'he' ? 'יציאה' : 'dep.')
                          : (lang === 'he' ? 'חזרה' : 'ret.');
                      }

                      return (
                        <td
                          key={date}
                          className={`border-e border-slate-100 dark:border-slate-700/60 px-2 py-1.5 h-7 text-center whitespace-nowrap ${cellClass}`}
                          title={title || undefined}
                        >
                          {label && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold leading-none">
                              {label}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {isExpanded && (
                    <tr key={`${group.id}-members`} className="bg-blue-50 dark:bg-blue-950/30 border-b border-slate-100 dark:border-slate-700/60">
                      <td colSpan={extendedDates.length + 1} className="px-4 py-2.5">
                        {members.length === 0 ? (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            {lang === 'he' ? 'אין חברים בקבוצה' : 'No members in this group'}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {members.map(name => (
                              <span key={name} className="text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
