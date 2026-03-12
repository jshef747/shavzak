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
    <div className="space-y-5">
      {/* People List */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('tabPeople', lang)}
              {state.people.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{state.people.length}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('peopleDesc', lang)}</p>
          </div>
        </div>

        {state.people.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-400">{t('noPeopleEmpty', lang)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.people.map(person => (
              <div key={person.id} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-600">{person.name.charAt(0).toUpperCase()}</span>
                </div>
                <input
                  className="flex-1 bg-transparent border-0 px-0 py-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 min-w-0"
                  value={person.name}
                  onChange={e => onUpdateName(person.id, e.target.value)}
                />
                <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex-shrink-0">
                  {person.qualifiedPositions.length} {t('roles', lang)}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setEditingPerson(person)} className="flex-shrink-0">
                  {t('edit', lang)}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Person */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('addPerson', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('addPersonDesc', lang)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t('personNamePlaceholder', lang)}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onAdd(newName.trim()); setNewName(''); } }}
          />
          <Button onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(''); } }} className="self-end">
            {t('addPerson', lang)}
          </Button>
        </div>
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
