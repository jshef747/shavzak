import { useState } from 'react';
import type { AppState } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  state: AppState;
  onAddGroup: (name: string) => void;
  onUpdateGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onSetPersonGroup: (personId: string, groupId: string | null) => void;
}

export function HomeGroupsTab({ state, onAddGroup, onUpdateGroup, onDeleteGroup, onSetPersonGroup }: Props) {
  const lang = langFromDir(state.dir);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

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
    if (window.confirm(t('deleteGroupConfirm', lang))) {
      onDeleteGroup(id);
      if (expandedGroupId === id) setExpandedGroupId(null);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-slate-500">{t('homeGroupsDesc', lang)}</p>

      {/* Groups list */}
      {state.homeGroups.length === 0 ? (
        <p className="text-sm text-slate-400 italic">{t('noGroupsYet', lang)}</p>
      ) : (
        <div className="space-y-2">
          {state.homeGroups.map(group => {
            const members = state.people.filter(p => p.homeGroupId === group.id);
            const isExpanded = expandedGroupId === group.id;

            return (
              <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Group header row */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rtl:flex-row-reverse">
                  {editingGroupId === group.id ? (
                    <input
                      className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editingGroupName}
                      onChange={e => setEditingGroupName(e.target.value)}
                      onBlur={() => commitEdit(group.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(group.id); if (e.key === 'Escape') setEditingGroupId(null); }}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="flex-1 text-sm font-medium text-slate-800 text-start rtl:text-end hover:text-indigo-600 transition-colors"
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                    >
                      {group.name}
                      <span className="ms-2 text-xs font-normal text-slate-400">
                        ({members.length} {t('membersLabel', lang)})
                      </span>
                    </button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => startEdit(group.id, group.name)}>
                    {t('edit', lang)}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(group.id)}>
                    {t('delete', lang)}
                  </Button>
                </div>

                {/* Members panel (expanded) */}
                {isExpanded && (
                  <div className="p-3 border-t border-slate-200 bg-white">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      {t('membersLabel', lang)}
                    </p>
                    {state.people.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">{t('noPeopleYet', lang)}</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {state.people.map(person => {
                          const inThisGroup = person.homeGroupId === group.id;
                          const inOtherGroup = person.homeGroupId !== null && person.homeGroupId !== group.id;
                          return (
                            <label
                              key={person.id}
                              className={`flex items-center gap-2 text-sm cursor-pointer rtl:flex-row-reverse ${inOtherGroup ? 'opacity-40' : ''}`}
                              title={inOtherGroup ? state.homeGroups.find(g => g.id === person.homeGroupId)?.name : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={inThisGroup}
                                disabled={inOtherGroup}
                                onChange={() => {
                                  if (inThisGroup) {
                                    onSetPersonGroup(person.id, null);
                                  } else {
                                    onSetPersonGroup(person.id, group.id);
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                              />
                              <span className={inThisGroup ? 'text-slate-800' : 'text-slate-500'}>
                                {person.name}
                              </span>
                              {inOtherGroup && (
                                <span className="text-xs text-slate-400 ms-auto">
                                  {state.homeGroups.find(g => g.id === person.homeGroupId)?.name}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add group form */}
      <div className="flex gap-2 pt-1 rtl:flex-row-reverse">
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
  );
}
