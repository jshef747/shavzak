import { useState, useRef, useEffect } from 'react';
import type { AppState } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  state: AppState;
  onAddGroup: (name: string) => void;
  onUpdateGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onTogglePersonGroup: (personId: string, groupId: string) => void;
}

interface PersonGroupCardProps {
  person: AppState['people'][number];
  groups: AppState['homeGroups'];
  onToggle: (groupId: string) => void;
  lang: 'he' | 'en';
}

function PersonGroupCard({ person, groups, onToggle, lang }: PersonGroupCardProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeGroups = groups.filter(g => (person.homeGroupIds ?? []).includes(g.id));

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const placeholder = lang === 'he' ? 'ללא קבוצה' : 'No group';

  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
      {/* Avatar + name — first in DOM = right side in RTL */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
            {person.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{person.name}</span>
      </div>

      {/* Group dropdown — second in DOM = left side in RTL */}
      <div className="relative flex-shrink-0" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeGroups.length > 0
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-400'
          }`}
        >
          <span className="max-w-[80px] truncate">
            {activeGroups.length === 0
              ? placeholder
              : activeGroups.length === 1
              ? activeGroups[0].name
              : `${activeGroups.length} ${lang === 'he' ? 'קבוצות' : 'groups'}`}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && groups.length > 0 && (
          <div className="absolute z-50 mt-1 end-0 min-w-[140px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl py-1">
            {groups.map(g => {
              const active = (person.homeGroupIds ?? []).includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => onToggle(g.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-start hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-500'
                  }`}>
                    {active && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`font-medium ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>{g.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function HomeGroupsTab({ state, onAddGroup, onUpdateGroup, onDeleteGroup, onTogglePersonGroup }: Props) {
  const lang = langFromDir(state.dir);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleAdd() {
    const name = newGroupName.trim();
    if (!name) return;
    onAddGroup(name);
    setNewGroupName('');
  }

  function startEdit(id: string, name: string) {
    setEditingGroupId(id);
    setEditingGroupName(name);
  }

  function commitEdit(id: string) {
    const name = editingGroupName.trim();
    if (name) onUpdateGroup(id, name);
    setEditingGroupId(null);
  }

  function handleDelete(id: string) {
    setPendingDeleteId(id);
  }

  return (
    <>
    <ConfirmDialog
      open={!!pendingDeleteId}
      message={t('deleteGroupConfirm', lang)}
      onConfirm={() => { if (pendingDeleteId) { onDeleteGroup(pendingDeleteId); } setPendingDeleteId(null); }}
      onCancel={() => setPendingDeleteId(null)}
      lang={lang}
    />
    <div className="space-y-5 pt-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('homeGroupsDesc', lang)}</p>

      {/* ── Groups management ── */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{t('homeGroupsTitle', lang)}</h3>

        {state.homeGroups.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('noGroupsYet', lang)}</p>
        ) : (
          <div className="space-y-2">
            {state.homeGroups.map(group => {
              const memberCount = state.people.filter(p => (p.homeGroupIds ?? []).includes(group.id)).length;
              return (
                <div
                  key={group.id}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                >
                  {editingGroupId === group.id ? (
                    <input
                      className="flex-1 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editingGroupName}
                      onChange={e => setEditingGroupName(e.target.value)}
                      onBlur={() => commitEdit(group.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(group.id);
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {group.name}
                      <span className="ms-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                        ({memberCount} {t('membersLabel', lang)})
                      </span>
                    </span>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => startEdit(group.id, group.name)}>
                    {t('edit', lang)}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(group.id)}>
                    {t('delete', lang)}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add group */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder={t('groupNamePlaceholder', lang)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className="flex-1"
          />
          <Button variant="primary" onClick={handleAdd} disabled={!newGroupName.trim()}>
            {t('addGroup', lang)}
          </Button>
        </div>
      </div>

      {/* ── People ↔ group assignment ── */}
      {state.people.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 rounded-t-xl">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{t('assignGroupToEach', lang)}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('assignGroupToEachDesc', lang)}</p>
          </div>
          <div className="p-4 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {state.people.map(person => (
              <PersonGroupCard
                key={person.id}
                person={person}
                groups={state.homeGroups}
                onToggle={(gid) => onTogglePersonGroup(person.id, gid)}
                lang={lang}
              />
            ))}
          </div>
        </div>
      )}

      {state.people.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('noPeopleYet', lang)}</p>
      )}
    </div>
    </>
  );
}
