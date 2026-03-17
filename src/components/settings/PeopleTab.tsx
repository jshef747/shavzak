import { useState } from 'react';
import { Users, UserPlus, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import type { AppState, Person, UnavailabilityEntry, DayOfWeek } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
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
  onTogglePersonHomeGroup: (personId: string, groupId: string) => void;
  onUpdateForceMinimum: (personId: string, value: boolean) => void;
}

export function PeopleTab({
  state, dates, onAdd, onDelete, onUpdateName,
  onToggleQualification, onToggleUnavailability,
  onToggleConstraintShift, onToggleConstraintBlockedShift,
  onToggleConstraintDay, onToggleConstraintBlockedDay,
  onUpdateConstraintMaxWeek, onUpdateConstraintMaxTotal,
  onUpdateConstraintMaxConsecutive, onUpdateConstraintMinRest,
  onTogglePersonHomeGroup, onUpdateForceMinimum,
}: Props) {
  const [newName, setNewName] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [showBulkRoles, setShowBulkRoles] = useState(false);
  const [showBulkGroup, setShowBulkGroup] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
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

  function handleBulkToggleGroup(groupId: string) {
    const selected = state.people.filter(p => selectedPeople.has(p.id));
    const allHaveIt = selected.every(p => (p.homeGroupIds ?? []).includes(groupId));
    for (const person of selected) {
      const has = (person.homeGroupIds ?? []).includes(groupId);
      if (allHaveIt && has) onTogglePersonHomeGroup(person.id, groupId); // remove from all
      if (!allHaveIt && !has) onTogglePersonHomeGroup(person.id, groupId); // add to those missing
    }
    setShowBulkGroup(false);
    setSelectedPeople(new Set());
  }

  function handleBulkForceMinimum() {
    const selected = state.people.filter(p => selectedPeople.has(p.id));
    const allHaveIt = selected.every(p => p.forceMinimum);
    for (const person of selected) {
      onUpdateForceMinimum(person.id, !allHaveIt);
    }
    setSelectedPeople(new Set());
  }

  function handleBulkDelete() {
    for (const id of selectedPeople) {
      onDelete(id);
    }
    setSelectedPeople(new Set());
    setShowBulkDeleteConfirm(false);
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
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        message={lang === 'he'
          ? `האם למחוק ${selectedPeople.size} אנשים? פעולה זו לא ניתנת לביטול.`
          : `Delete ${selectedPeople.size} ${selectedPeople.size === 1 ? 'person' : 'people'}? This cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        lang={lang}
        variant="danger"
      />
      {/* People List */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t('tabPeople', lang)}
              {state.people.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{state.people.length}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('peopleDesc', lang)}</p>
          </div>
        </div>

        {state.people.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-600 rounded-lg">
            <Users className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-gray-400 dark:text-slate-500">{t('noPeopleEmpty', lang)}</p>
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
              <span className="text-xs text-gray-400 dark:text-slate-500 select-none">
                {someSelected ? `${selectedPeople.size} ${t('selected', lang)}` : t('selectAll', lang)}
              </span>
              {someSelected && (
                <div className="flex items-center gap-2 ms-auto   flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowBulkRoles(true)}
                    className="flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
                    {t('assignRolesToSelected', lang)}
                  </Button>
                  {state.homeGroups.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBulkGroup(true)}
                      className="flex items-center gap-1.5 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Users className="w-3.5 h-3.5" strokeWidth={2} />
                      {t('assignGroupToSelected', lang)}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleBulkForceMinimum}
                    className="flex items-center gap-1.5 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  >
                    <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
                    {t('forceMinimumBulk', lang)}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    {lang === 'he' ? `מחק ${selectedPeople.size}` : `Delete ${selectedPeople.size}`}
                  </Button>
                  <button
                    onClick={() => setSelectedPeople(new Set())}
                    className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
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
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700'
                      : 'bg-gray-50 dark:bg-slate-700 border-gray-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePerson(person.id)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">{person.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <input
                    className="flex-1 bg-transparent border-0 px-0 py-0 text-sm font-medium text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-0 min-w-0"
                    value={person.name}
                    onChange={e => onUpdateName(person.id, e.target.value)}
                  />
                  <span className="text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full flex-shrink-0">
                    {person.qualifiedPositions.length} {t('roles', lang)}
                  </span>
                  {(person.homeGroupIds ?? []).length > 0 && (
                    <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full flex-shrink-0">
                      {(person.homeGroupIds ?? []).map(id => state.homeGroups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
                    </span>
                  )}
                  
                  {/* Force Minimum Toggle */}
                  <div className="flex items-center gap-1.5 ms-2 shrink-0 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-2 py-1 rounded-full">
                    <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${person.forceMinimum ? 'text-amber-600 dark:text-amber-500' : 'text-gray-400 dark:text-slate-500'}`} title={t('forceMinimumDesc', lang)}>
                      {lang === 'he' ? 'מינימום' : 'MINIMUM'}
                    </span>
                    <button
                      role="switch"
                      aria-checked={!!person.forceMinimum}
                      onClick={() => onUpdateForceMinimum(person.id, !person.forceMinimum)}
                      title={t('forceMinimumLabel', lang)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
                        person.forceMinimum ? 'bg-amber-400' : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        person.forceMinimum ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-1 rtl:-translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <Button variant="secondary" size="sm" onClick={() => setEditingPerson(person)} className="flex-shrink-0 ms-1">
                    {t('edit', lang)}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Person */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('addPerson', lang)}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('addPersonDesc', lang)}</p>
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
            onUpdateForceMinimum={onUpdateForceMinimum}
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('assignGroupToSelectedDesc', lang)}</p>
          {state.homeGroups.map(group => {
            const count = state.people.filter(p => selectedPeople.has(p.id) && (p.homeGroupIds ?? []).includes(group.id)).length;
            const total = selectedPeople.size;
            const allHave = count === total;
            const someHave = count > 0 && count < total;
            return (
              <button
                key={group.id}
                onClick={() => handleBulkToggleGroup(group.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-start  transition-colors ${
                  allHave ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700' : someHave ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700' : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border text-xs font-bold ${
                  allHave ? 'bg-emerald-600 border-emerald-600 text-white' : someHave ? 'bg-amber-400 border-amber-400 text-white' : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-transparent'
                }`}>
                  {allHave ? '✓' : someHave ? '–' : ''}
                </span>
                <span className={`text-sm font-medium flex-1 ${allHave ? 'text-emerald-900 dark:text-emerald-300' : someHave ? 'text-amber-900 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {group.name}
                </span>
                <span className={`text-xs flex-shrink-0 ${allHave ? 'text-emerald-500' : someHave ? 'text-amber-600' : 'text-slate-400 dark:text-slate-500'}`}>
                  {count}/{total}
                </span>
              </button>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowBulkGroup(false)}>{t('close', lang)}</Button>
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
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">{t('noPositionsEmpty', lang)}</p>
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
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700'
                        : someHave
                        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
                        : 'bg-gray-50 dark:bg-slate-700 border-gray-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500'
                    }`}
                  >
                    {/* State indicator */}
                    <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border text-xs font-bold ${
                      allHave
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : someHave
                        ? 'bg-amber-400 border-amber-400 text-white'
                        : 'bg-white dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-transparent'
                    }`}>
                      {allHave ? '✓' : someHave ? '–' : ''}
                    </span>

                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-indigo-600">{pos.name.charAt(0).toUpperCase()}</span>
                    </div>

                    <span className={`text-sm font-medium flex-1 ${allHave ? 'text-indigo-900 dark:text-indigo-300' : someHave ? 'text-amber-900 dark:text-amber-300' : 'text-gray-700 dark:text-slate-300'}`}>
                      {pos.name}
                      {pos.isOnCall && (
                        <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                          {t('onCall', lang)}
                        </span>
                      )}
                    </span>

                    <span className={`text-xs flex-shrink-0 ${allHave ? 'text-indigo-500' : someHave ? 'text-amber-600' : 'text-gray-400 dark:text-slate-500'}`}>
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
