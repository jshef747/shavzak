import { useState } from 'react';
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
      <p className="text-sm text-slate-500">{t('homeGroupsDesc', lang)}</p>

      {/* ── Groups management ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">{t('homeGroupsTitle', lang)}</h3>

        {state.homeGroups.length === 0 ? (
          <p className="text-sm text-slate-400 italic">{t('noGroupsYet', lang)}</p>
        ) : (
          <div className="space-y-2">
            {state.homeGroups.map(group => {
              const memberCount = state.people.filter(p => (p.homeGroupIds ?? []).includes(group.id)).length;
              return (
                <div
                  key={group.id}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 rtl:flex-row-reverse"
                >
                  {editingGroupId === group.id ? (
                    <input
                      className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                    <span className="flex-1 text-sm font-medium text-slate-800">
                      {group.name}
                      <span className="ms-2 text-xs font-normal text-slate-400">
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

      {/* ── People ↔ group assignment ── */}
      {state.people.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-gray-800">{t('assignGroupToEach', lang)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('assignGroupToEachDesc', lang)}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-start rtl:text-end font-semibold">{t('name', lang)}</th>
                <th className="px-4 py-2 text-start rtl:text-end font-semibold">{t('groupLabel', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.people.map(person => (
                <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-indigo-600">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-slate-800">{person.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {state.homeGroups.map(g => {
                        const active = (person.homeGroupIds ?? []).includes(g.id);
                        return (
                          <button
                            key={g.id}
                            onClick={() => onTogglePersonGroup(person.id, g.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              active
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/50'
                            }`}
                          >
                            {active && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {g.name}
                          </button>
                        );
                      })}
                      {state.homeGroups.length === 0 && (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.people.length === 0 && (
        <p className="text-sm text-slate-400 italic">{t('noPeopleYet', lang)}</p>
      )}
    </div>
    </>
  );
}
