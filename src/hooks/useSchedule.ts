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

  function setOnCallDurationOverride(date: string, positionId: string, hours: number | undefined) {
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== prev.activeScheduleId) return s;
        const existing = s.onCallDurationOverrides ?? {};
        let dayOverrides = { ...(existing[date] ?? {}) };
        if (hours == null) {
          delete dayOverrides[positionId];
        } else {
          dayOverrides = { ...dayOverrides, [positionId]: hours };
        }
        const newOverrides = { ...existing, [date]: dayOverrides };
        // Clean up empty day entries
        if (Object.keys(newOverrides[date]).length === 0) delete newOverrides[date];
        return { ...s, onCallDurationOverrides: newOverrides, updatedAt: new Date().toISOString() };
      }),
    }));
  }

  return { activeSchedule, createSchedule, deleteSchedule, setActiveSchedule, setOnCallDurationOverride };
}
