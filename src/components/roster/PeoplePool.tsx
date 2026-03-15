import { useDroppable } from '@dnd-kit/core';
import type { AppState } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { PersonChip } from './PersonChip';

interface Props {
  state: AppState;
  assignedPersonIds: Set<string>;
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
}

export function PeoplePool({ state, assignedPersonIds, onEditPerson, onDeletePerson }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool' });
  const lang = langFromDir(state.dir);

  function handleDelete(personId: string, name: string) {
    if (window.confirm(t('deletePersonConfirm', lang) + ` (${name})`)) {
      onDeletePerson(personId);
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`h-full p-3 transition-colors ${isOver ? 'bg-indigo-50' : 'bg-gray-50'}`}
    >
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-transparent">
        {t('roster', lang)}
      </h3>
      {state.people.length === 0 && (
        <p className="text-xs text-gray-400">{t('addPeopleHint', lang)}</p>
      )}
      <div className="flex flex-col gap-1.5">
        {state.people.map(person => (
          <div key={person.id} className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <PersonChip
                personId={person.id}
                name={person.name}
                colorHex={person.colorHex}
                source="pool"
                variant="pool"
                dimmed={assignedPersonIds.has(person.id)}
              />
            </div>
            <button
              onClick={() => onEditPerson(person.id)}
              title={t('edit', lang)}
              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(person.id, person.name)}
              title={t('deletePerson', lang)}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
