import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Settings2, Trash2, Zap } from 'lucide-react';
import type { AppState } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { PersonChip } from './PersonChip';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  state: AppState;
  assignedPersonIds: Set<string>;
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
}

export function PeoplePool({ state, assignedPersonIds, onEditPerson, onDeletePerson }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool' });
  const lang = langFromDir(state.dir);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
    <ConfirmDialog
      open={!!pendingDelete}
      message={`${t('deletePersonConfirm', lang)}${pendingDelete ? ` (${pendingDelete.name})` : ''}`}
      onConfirm={() => { if (pendingDelete) { onDeletePerson(pendingDelete.id); } setPendingDelete(null); }}
      onCancel={() => setPendingDelete(null)}
      lang={lang}
    />
    <div
      ref={setNodeRef}
      className={`h-full p-4 transition-colors ${isOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'bg-transparent'}`}
    >
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 sticky top-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm -mx-4 px-4 py-2 z-10 border-b border-gray-200/50 dark:border-slate-800/50 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.05)]">
        {t('roster', lang)}
      </h3>
      {state.people.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-400 dark:text-slate-500">{t('addPeopleHint', lang)}</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {state.people.map(person => (
          <div key={person.id} className="flex items-center gap-1.5 group">
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
            <span className="w-4 shrink-0 flex items-center justify-center" title={person.forceMinimum ? t('forceMinimumLabel', lang) : undefined}>
              {person.forceMinimum && (
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              )}
            </span>
            <div className="flex items-center gap-0.5 opacity-100 transition-opacity pointer-events-auto">
              <button
                onClick={() => onEditPerson(person.id)}
                title={t('edit', lang)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shrink-0"
              >
                <Settings2 className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => setPendingDelete({ id: person.id, name: person.name })}
                title={t('deletePerson', lang)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
