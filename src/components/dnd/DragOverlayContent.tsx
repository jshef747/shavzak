import type { DragData, AppState } from '../../types';
import { personPalette, personInitials } from '../../utils/personColor';

interface Props {
  dragData: DragData | null;
  state: AppState;
}

export function DragOverlayContent({ dragData, state }: Props) {
  if (!dragData) return null;
  const person = state.people.find(p => p.id === dragData.personId);
  if (!person) return null;
  const palette = personPalette(person.name);
  const initials = personInitials(person.name);
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shadow-2xl text-sm font-medium scale-105 ${palette.light}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${palette.bg} ${palette.text} shrink-0`}>
        {initials}
      </span>
      {person.name}
    </div>
  );
}
