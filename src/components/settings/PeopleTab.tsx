import { useState } from 'react';
import type { AppState, Person, UnavailabilityEntry, DayOfWeek } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PersonEditor } from './PersonEditor';

interface Props {
  state: AppState;
  dates: string[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onToggleQualification: (personId: string, positionId: string) => void;
  onToggleUnavailability: (personId: string, entry: UnavailabilityEntry) => void;
  onToggleConstraintShift: (personId: string, shiftId: string) => void;
  onToggleConstraintBlockedShift: (personId: string, shiftId: string) => void;
  onToggleConstraintDay: (personId: string, day: DayOfWeek) => void;
  onToggleConstraintBlockedDay: (personId: string, day: DayOfWeek) => void;
  onUpdateConstraintMaxWeek: (personId: string, max: number | null) => void;
  onUpdateConstraintMaxTotal: (personId: string, max: number | null) => void;
  onUpdateConstraintMaxConsecutive: (personId: string, max: number | null) => void;
  onUpdateConstraintMinRest: (personId: string, min: number | null) => void;
}

export function PeopleTab({
  state, dates, onAdd, onDelete, onUpdateName,
  onToggleQualification, onToggleUnavailability,
  onToggleConstraintShift, onToggleConstraintBlockedShift,
  onToggleConstraintDay, onToggleConstraintBlockedDay,
  onUpdateConstraintMaxWeek, onUpdateConstraintMaxTotal,
  onUpdateConstraintMaxConsecutive, onUpdateConstraintMinRest,
}: Props) {
  const [newName, setNewName] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const lang = langFromDir(state.dir);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {t('tabPeople', lang)} ({state.people.length})
        </h3>
        {state.people.length === 0 && <p className="text-sm text-gray-400">{t('noPeopleYet', lang)}</p>}
        <div className="space-y-2">
          {state.people.map(person => (
            <div key={person.id} className="flex gap-2 items-center p-2 bg-gray-50 rounded border">
              <input
                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                value={person.name}
                onChange={e => onUpdateName(person.id, e.target.value)}
              />
              <span className="text-xs text-gray-400">{person.qualifiedPositions.length} roles</span>
              <Button variant="secondary" size="sm" onClick={() => setEditingPerson(person)}>
                {t('edit', lang)}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4 flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder={t('personNamePlaceholder', lang)}
          className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onAdd(newName.trim()); setNewName(''); } }}
        />
        <Button onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(''); } }}>
          {t('addPerson', lang)}
        </Button>
      </div>

      {editingPerson && (
        <Modal
          open={!!editingPerson}
          onClose={() => setEditingPerson(null)}
          title={`${t('edit', lang)}: ${editingPerson.name}`}
          size="lg"
        >
          <PersonEditor
            person={state.people.find(p => p.id === editingPerson.id) ?? editingPerson}
            state={state}
            dates={dates}
            onToggleQualification={onToggleQualification}
            onToggleUnavailability={onToggleUnavailability}
            onToggleConstraintShift={onToggleConstraintShift}
            onToggleConstraintBlockedShift={onToggleConstraintBlockedShift}
            onToggleConstraintDay={onToggleConstraintDay}
            onToggleConstraintBlockedDay={onToggleConstraintBlockedDay}
            onUpdateConstraintMaxWeek={onUpdateConstraintMaxWeek}
            onUpdateConstraintMaxTotal={onUpdateConstraintMaxTotal}
            onUpdateConstraintMaxConsecutive={onUpdateConstraintMaxConsecutive}
            onUpdateConstraintMinRest={onUpdateConstraintMinRest}
            onDelete={onDelete}
            onClose={() => setEditingPerson(null)}
          />
        </Modal>
      )}
    </div>
  );
}
