import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Schedule } from '../types';

export function useSchedule(state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId) ?? null;

  function createSchedule(name: string, startDate: string, endDate: string) {
    const now = new Date().toISOString();
    const schedule: Schedule = {
      id: crypto.randomUUID(),
      name,
      startDate,
      endDate,
      assignments: [],
      homeGroupPeriods: [],
      createdAt: now,
      updatedAt: now,
    };
    setState(prev => ({
      ...prev,
      schedules: [...prev.schedules, schedule],
      activeScheduleId: schedule.id,
    }));
  }

  function deleteSchedule(id: string) {
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.filter(s => s.id !== id),
      activeScheduleId: prev.activeScheduleId === id ? null : prev.activeScheduleId,
    }));
  }

  function setActiveSchedule(id: string | null) {
    setState(prev => ({ ...prev, activeScheduleId: id }));
  }

  return { activeSchedule, createSchedule, deleteSchedule, setActiveSchedule };
}
