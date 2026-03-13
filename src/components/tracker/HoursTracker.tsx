import type { AppState, Assignment } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { personPalette, personInitials } from '../../utils/personColor';

interface Props {
  state: AppState;
  assignments: Assignment[];
}

export function HoursTracker({ state, assignments }: Props) {
  const lang = langFromDir(state.dir);
  const oncallWeight = state.oncallWeight;

  const hoursPerPerson = state.people.map(person => {
    let total = 0;
    let oncallHours = 0;
    assignments.filter(a => a.personId === person.id).forEach(a => {
      const shift = state.shifts.find(s => s.id === a.shiftId);
      const raw = shift?.durationHours ?? 0;
      const halfFactor = a.halfSlot ? 0.5 : 1;
      const effective = raw * halfFactor;
      if (a.isOncall) {
        oncallHours += effective;
        total += effective * oncallWeight;
      } else {
        total += effective;
      }
    });
    return { person, total, oncallHours };
  }).filter(({ total, oncallHours }) => total > 0 || oncallHours > 0);

  if (hoursPerPerson.length === 0) return null;

  return (
    <div className="p-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {t('hours', lang)}
      </h3>
      <div className="space-y-1.5">
        {hoursPerPerson.map(({ person, total, oncallHours }) => {
          const palette = personPalette(person.name);
          const initials = personInitials(person.name);
          return (
            <div key={person.id} className="flex rtl:flex-row-reverse items-center gap-2 text-xs">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${palette.bg} ${palette.text} shrink-0`}>
                {initials}
              </span>
              <span className="text-gray-700 truncate flex-1">{person.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-semibold text-slate-800 bg-slate-200 rounded px-1.5 py-0.5">
                  {Math.round(total * 10) / 10}h
                </span>
                {oncallHours > 0 && (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 text-[9px] font-medium">
                    +{Math.round(oncallHours * 10) / 10}h {t('oncallBadge', lang)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
