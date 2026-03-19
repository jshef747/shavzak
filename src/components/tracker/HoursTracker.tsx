import { useMemo } from 'react';
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
    const total = assignments
      .filter(a => a.personId === person.id)
      .reduce((sum, a) => {
        const shift = state.shifts.find(s => s.id === a.shiftId);
        return sum + (shift?.durationHours ?? 0);
      }, 0);
    return { person, total };
  }).filter(({ total }) => total > 0), [state.people, state.shifts, assignments]);

  if (hoursPerPerson.length === 0) return null;

  return (
    <div className="p-3">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {t('hours', lang)}
      </h3>
      <div className="space-y-1.5">
        {hoursPerPerson.map(({ person, total }) => {
          const initials = personInitials(person.name);
          return (
            <div key={person.id} className="flex  items-center gap-2 text-xs">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ backgroundColor: person.colorHex, color: '#1e293b' }}
              >
                {initials}
              </span>
              <span className="text-gray-700 dark:text-slate-300 truncate flex-1">{person.name}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded px-1.5 py-0.5 shrink-0">{total}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
