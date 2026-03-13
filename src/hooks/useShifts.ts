import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Shift } from '../types';

export function useShifts(_state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  function addShift(name: string, startHour: number, durationHours: number, isHalfShift?: boolean, oncallSlots?: number) {
    const shift: Shift = {
      id: crypto.randomUUID(),
      name,
      startHour,
      durationHours,
      isHalfShift: isHalfShift || undefined,
      oncallSlots: oncallSlots || undefined,
    };
    setState(prev => ({ ...prev, shifts: [...prev.shifts, shift] }));
  }

  function updateShift(id: string, updates: Partial<Omit<Shift, 'id'>>) {
    setState(prev => ({
      ...prev,
      shifts: prev.shifts.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }

  function deleteShift(id: string) {
    setState(prev => ({
      ...prev,
      shifts: prev.shifts.filter(s => s.id !== id),
      schedules: prev.schedules.map(sched => ({
        ...sched,
        assignments: sched.assignments.filter(a => a.shiftId !== id),
      })),
    }));
  }

  function reorderShifts(orderedIds: string[]) {
    setState(prev => {
      const map = new Map(prev.shifts.map(s => [s.id, s]));
      const reordered = orderedIds.map(id => map.get(id)).filter(Boolean) as typeof prev.shifts;
      return { ...prev, shifts: reordered };
    });
  }

  return { addShift, updateShift, deleteShift, reorderShifts };
}
