import type { Dispatch, SetStateAction } from 'react';
import type { AppState, HomeGroup, HomeGroupPeriod } from '../types';

export function useHomeGroups(_state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  function addHomeGroup(name: string) {
    const group: HomeGroup = { id: crypto.randomUUID(), name };
    setState(prev => ({ ...prev, homeGroups: [...prev.homeGroups, group] }));
  }

  function updateHomeGroup(id: string, name: string) {
    setState(prev => ({
      ...prev,
      homeGroups: prev.homeGroups.map(g => g.id === id ? { ...g, name } : g),
    }));
  }

  function deleteHomeGroup(id: string) {
    setState(prev => ({
      ...prev,
      homeGroups: prev.homeGroups.filter(g => g.id !== id),
      // Remove deleted group from all people's homeGroupIds
      people: prev.people.map(p =>
        ({ ...p, homeGroupIds: (p.homeGroupIds ?? []).filter(gid => gid !== id) })
      ),
      // Remove all periods for this group globally
      homeGroupPeriods: (prev.homeGroupPeriods ?? []).filter(p => p.groupId !== id),
    }));
  }

  function togglePersonHomeGroup(personId: string, groupId: string) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const ids = p.homeGroupIds ?? [];
        const has = ids.includes(groupId);
        return { ...p, homeGroupIds: has ? ids.filter(id => id !== groupId) : [...ids, groupId] };
      }),
    }));
  }

  function addHomeGroupPeriod(groupId: string, startDate: string, endDate: string) {
    const period: HomeGroupPeriod = {
      id: crypto.randomUUID(),
      groupId,
      startDate,
      endDate,
    };
    setState(prev => ({
      ...prev,
      homeGroupPeriods: [...(prev.homeGroupPeriods ?? []), period],
    }));
  }

  function deleteHomeGroupPeriod(periodId: string) {
    setState(prev => ({
      ...prev,
      homeGroupPeriods: (prev.homeGroupPeriods ?? []).filter(p => p.id !== periodId),
    }));
  }

  return {
    addHomeGroup,
    updateHomeGroup,
    deleteHomeGroup,
    togglePersonHomeGroup,
    addHomeGroupPeriod,
    deleteHomeGroupPeriod,
  };
}
