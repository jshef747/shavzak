import { useMemo, useState } from 'react';
import type { AppState, Assignment } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { personInitials } from '../../utils/personColor';

interface Props {
  state: AppState;
  assignments: Assignment[];
}

export function HoursTracker({ state, assignments }: Props) {
  const lang = langFromDir(state.dir);

  const hoursPerPerson = useMemo(() => state.people.map(person => {
    const personAssignments = assignments.filter(a => a.personId === person.id);
    let shiftHours = 0;
    let onCallHours = 0;
    for (const a of personAssignments) {
      const shift = state.shifts.find(s => s.id === a.shiftId);
      const duration = shift?.durationHours ?? 0;
      const isOnCall = state.positions.find(p => p.id === a.positionId)?.isOnCall ?? false;
      if (isOnCall) onCallHours += duration;
      else shiftHours += duration;
    }
    return { person, shiftHours, onCallHours };
  }).filter(({ shiftHours, onCallHours }) => shiftHours + onCallHours > 0), [state.people, state.shifts, state.positions, assignments]);

  if (hoursPerPerson.length === 0) return null;

  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className="p-3">
      <div className="flex items-center gap-1 mb-2">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t('hours', lang)}
        </h3>
        <span
          className="relative w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold cursor-pointer shrink-0"
          onClick={() => setShowLegend(v => !v)}
        >
          ?
          {showLegend && (
            <div className="absolute left-5 top-0 rtl:left-auto rtl:right-5 z-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-2 w-44 text-[11px] text-slate-700 dark:text-slate-200 font-normal normal-case tracking-normal whitespace-nowrap">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-600 shrink-0" />
                {lang === 'he' ? 'שעות משמרת' : 'Shift hours'}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/40 shrink-0" />
                {lang === 'he' ? 'שעות כוננות' : 'On-call hours'}
              </div>
            </div>
          )}
        </span>
      </div>
      <div className="space-y-1.5">
        {hoursPerPerson.map(({ person, shiftHours, onCallHours }) => {
          const initials = personInitials(person.name);
          return (
            <div key={person.id} className="flex items-center gap-2 text-xs">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ backgroundColor: person.colorHex, color: '#1e293b' }}
              >
                {initials}
              </span>
              <span className="text-gray-700 dark:text-slate-300 truncate flex-1">{person.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {shiftHours > 0 && (
                  <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded px-1.5 py-0.5">{shiftHours}h</span>
                )}
                {onCallHours > 0 && (
                  <span className="font-semibold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 rounded px-1.5 py-0.5">{onCallHours}h</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
