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
  onSetPersonHomeGroup: (personId: string, groupId: string | null) => void;
}

export function PeopleTab({
  state, dates, onAdd, onDelete, onUpdateName,
  onToggleQualification, onToggleUnavailability,
  onToggleConstraintShift, onToggleConstraintBlockedShift,
  onToggleConstraintDay, onToggleConstraintBlockedDay,
  onUpdateConstraintMaxWeek, onUpdateConstraintMaxTotal,
  onUpdateConstraintMaxConsecutive, onUpdateConstraintMinRest,
  onSetPersonHomeGroup,
}: Props) {
  const [newName, setNewName] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [showBulkRoles, setShowBulkRoles] = useState(false);
  const [showBulkGroup, setShowBulkGroup] = useState(false);
  const lang = langFromDir(state.dir);

  const allSelected = state.people.length > 0 && state.people.every(p => selectedPeople.has(p.id));
  const someSelected = selectedPeople.size > 0;

  function togglePerson(id: string) {
    setSelectedPeople(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedPeople(new Set());
    } else {
      setSelectedPeople(new Set(state.people.map(p => p.id)));
    }
  }

  function closeBulkRoles() {
    setShowBulkRoles(false);
    setSelectedPeople(new Set());
  }

  function handleBulkAssignGroup(groupId: string | null) {
    for (const personId of selectedPeople) {
      onSetPersonHomeGroup(personId, groupId);
    }
    setShowBulkGroup(false);
    setSelectedPeople(new Set());
  }

  // For a given position: how many selected people have it
  function qualifiedCount(posId: string): number {
    return state.people.filter(p => selectedPeople.has(p.id) && p.qualifiedPositions.includes(posId)).length;
  }

  // Click on a position in the bulk modal: if all have it → remove; otherwise → add to those who don't
  function handleBulkToggle(posId: string) {
    const selected = state.people.filter(p => selectedPeople.has(p.id));
    const allHaveIt = selected.every(p => p.qualifiedPositions.includes(posId));
    for (const person of selected) {
      const hasIt = person.qualifiedPositions.includes(posId);
      if (allHaveIt && hasIt) onToggleQualification(person.id, posId);      // remove from all
      if (!allHaveIt && !hasIt) onToggleQualification(person.id, posId);    // add to those missing
    }
  }

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
            {/* Select-all row */}
            <div className="flex items-center gap-3 px-3 py-1.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-gray-400 select-none">
                {someSelected ? `${selectedPeople.size} ${t('selected', lang)}` : t('selectAll', lang)}
              </span>
              {someSelected && (
                <div className="flex items-center gap-2 ml-auto rtl:mr-auto rtl:ml-0 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowBulkRoles(true)}
                    className="flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('assignRolesToSelected', lang)}
                  </Button>
                  {state.homeGroups.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBulkGroup(true)}
                      className="flex items-center gap-1.5 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {t('assignGroupToSelected', lang)}
                    </Button>
                  )}
                  <button
                    onClick={() => setSelectedPeople(new Set())}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {t('clearSelection', lang)}
                  </button>
                </div>
              )}
            </div>

            {/* Person rows */}
            {state.people.map(person => {
              const isSelected = selectedPeople.has(person.id);
              return (
                <div
                  key={person.id}
                  className={`flex gap-3 items-center p-3 rounded-lg border transition-colors group ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePerson(person.id)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                  />
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
                  {person.homeGroupId && (
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full flex-shrink-0">
                      {state.homeGroups.find(g => g.id === person.homeGroupId)?.name ?? ''}
                    </span>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setEditingPerson(person)} className="flex-shrink-0">
                    {t('edit', lang)}
                  </Button>
                </div>
              );
            })}
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

      {/* Single-person Edit Modal */}
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

      {/* Bulk Group Assignment Modal */}
      <Modal
        open={showBulkGroup}
        onClose={() => setShowBulkGroup(false)}
        title={`${t('assignGroupToSelected', lang)} — ${selectedPeople.size} ${t('selected', lang)}`}
        size="sm"
      >
        <div className="space-y-2 py-1">
          <p className="text-sm text-slate-500 mb-3">{t('assignGroupToSelectedDesc', lang)}</p>
          <button
            onClick={() => handleBulkAssignGroup(null)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-start rtl:text-end transition-colors"
          >
            <span className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
            <span className="text-sm text-slate-500 italic">{t('noGroup', lang)}</span>
          </button>
          {state.homeGroups.map(group => (
            <button
              key={group.id}
              onClick={() => handleBulkAssignGroup(group.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 text-start rtl:text-end transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-800">{group.name}</span>
            </button>
          ))}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowBulkGroup(false)}>{t('cancel', lang)}</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Role Assignment Modal */}
      <Modal
        open={showBulkRoles}
        onClose={closeBulkRoles}
        title={`${t('bulkRolesTitle', lang)} — ${selectedPeople.size} ${t('selected', lang)}`}
        size="md"
      >
        <div className="space-y-3">
          {state.positions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{t('noPositionsEmpty', lang)}</p>
          ) : (
            <div className="space-y-2">
              {state.positions.map(pos => {
                const count = qualifiedCount(pos.id);
                const total = selectedPeople.size;
                const allHave = count === total;
                const someHave = count > 0 && count < total;

                return (
                  <button
                    key={pos.id}
                    onClick={() => handleBulkToggle(pos.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      allHave
                        ? 'bg-indigo-50 border-indigo-200'
                        : someHave
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* State indicator */}
                    <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border text-xs font-bold ${
                      allHave
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : someHave
                        ? 'bg-amber-400 border-amber-400 text-white'
                        : 'bg-white border-gray-300 text-transparent'
                    }`}>
                      {allHave ? '✓' : someHave ? '–' : ''}
                    </span>

                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-indigo-600">{pos.name.charAt(0).toUpperCase()}</span>
                    </div>

                    <span className={`text-sm font-medium flex-1 ${allHave ? 'text-indigo-900' : someHave ? 'text-amber-900' : 'text-gray-700'}`}>
                      {pos.name}
                      {pos.isOnCall && (
                        <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                          {t('onCall', lang)}
                        </span>
                      )}
                    </span>

                    <span className={`text-xs flex-shrink-0 ${allHave ? 'text-indigo-500' : someHave ? 'text-amber-600' : 'text-gray-400'}`}>
                      {count}/{total}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={closeBulkRoles}>{t('close', lang)}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
