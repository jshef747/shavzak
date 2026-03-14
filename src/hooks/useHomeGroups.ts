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
      // Clear homeGroupId from all people in this group
      people: prev.people.map(p =>
        p.homeGroupId === id ? { ...p, homeGroupId: null } : p
      ),
      // Remove all periods for this group from all schedules
      schedules: prev.schedules.map(s => ({
        ...s,
        homeGroupPeriods: (s.homeGroupPeriods ?? []).filter(p => p.groupId !== id),
      })),
    }));
  }

  function setPersonHomeGroup(personId: string, groupId: string | null) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p =>
        p.id === personId ? { ...p, homeGroupId: groupId } : p
      ),
    }));
  }

  function addHomeGroupPeriod(scheduleId: string, groupId: string, startDate: string, endDate: string) {
    const period: HomeGroupPeriod = {
      id: crypto.randomUUID(),
      groupId,
      startDate,
      endDate,
    };
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s =>
        s.id === scheduleId
          ? { ...s, homeGroupPeriods: [...(s.homeGroupPeriods ?? []), period] }
          : s
      ),
    }));
  }

  function deleteHomeGroupPeriod(scheduleId: string, periodId: string) {
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s =>
        s.id === scheduleId
          ? { ...s, homeGroupPeriods: (s.homeGroupPeriods ?? []).filter(p => p.id !== periodId) }
          : s
      ),
    }));
  }

  return {
    addHomeGroup,
    updateHomeGroup,
    deleteHomeGroup,
    setPersonHomeGroup,
    addHomeGroupPeriod,
    deleteHomeGroupPeriod,
  };
}
