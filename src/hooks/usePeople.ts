import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Person, ShiftConstraint, UnavailabilityEntry, DayOfWeek } from '../types';

export function usePeople(_state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  function addPerson(name: string) {
    const person: Person = {
      id: crypto.randomUUID(),
      name,
      homeGroupId: null,
      qualifiedPositions: [],
      unavailability: [],
      constraints: null,
    };
    setState(prev => ({ ...prev, people: [...prev.people, person] }));
  }

  function deletePerson(id: string) {
    setState(prev => ({
      ...prev,
      people: prev.people.filter(p => p.id !== id),
      schedules: prev.schedules.map(sched => ({
        ...sched,
        assignments: sched.assignments.filter(a => a.personId !== id),
      })),
    }));
  }

  function updatePersonName(id: string, name: string) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => p.id === id ? { ...p, name } : p),
    }));
  }

  function toggleQualification(personId: string, positionId: string) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const has = p.qualifiedPositions.includes(positionId);
        return {
          ...p,
          qualifiedPositions: has
            ? p.qualifiedPositions.filter(q => q !== positionId)
            : [...p.qualifiedPositions, positionId],
        };
      }),
    }));
  }

  function toggleUnavailability(personId: string, entry: UnavailabilityEntry) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const exists = p.unavailability.some(u => u.date === entry.date && u.shiftId === entry.shiftId);
        return {
          ...p,
          unavailability: exists
            ? p.unavailability.filter(u => !(u.date === entry.date && u.shiftId === entry.shiftId))
            : [...p.unavailability, entry],
        };
      }),
    }));
  }

  const NULL_CONSTRAINTS = {
    allowedShiftIds: null,
    blockedShiftIds: null,
    allowedDaysOfWeek: null,
    blockedDaysOfWeek: null,
    maxShiftsPerWeek: null,
    maxShiftsTotal: null,
    maxConsecutiveDays: null,
    minRestDays: null,
  };

  function patchConstraints(personId: string, patch: Partial<ShiftConstraint>) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        return { ...p, constraints: { ...(p.constraints ?? NULL_CONSTRAINTS), ...patch } };
      }),
    }));
  }

  function toggleConstraintShift(personId: string, shiftId: string) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const current = p.constraints?.allowedShiftIds ?? [];
        const has = current.includes(shiftId);
        const next = has ? current.filter(s => s !== shiftId) : [...current, shiftId];
        return { ...p, constraints: { ...(p.constraints ?? NULL_CONSTRAINTS), allowedShiftIds: next.length === 0 ? null : next } };
      }),
    }));
  }

  function toggleConstraintBlockedShift(personId: string, shiftId: string) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const current = p.constraints?.blockedShiftIds ?? [];
        const has = current.includes(shiftId);
        const next = has ? current.filter(s => s !== shiftId) : [...current, shiftId];
        return { ...p, constraints: { ...(p.constraints ?? NULL_CONSTRAINTS), blockedShiftIds: next.length === 0 ? null : next } };
      }),
    }));
  }

  function toggleConstraintDay(personId: string, day: DayOfWeek) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const current = p.constraints?.allowedDaysOfWeek ?? [];
        const has = current.includes(day);
        const next = has ? current.filter(d => d !== day) : [...current, day];
        return { ...p, constraints: { ...(p.constraints ?? NULL_CONSTRAINTS), allowedDaysOfWeek: next.length === 0 ? null : (next as DayOfWeek[]) } };
      }),
    }));
  }

  function toggleConstraintBlockedDay(personId: string, day: DayOfWeek) {
    setState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (p.id !== personId) return p;
        const current = p.constraints?.blockedDaysOfWeek ?? [];
        const has = current.includes(day);
        const next = has ? current.filter(d => d !== day) : [...current, day];
        return { ...p, constraints: { ...(p.constraints ?? NULL_CONSTRAINTS), blockedDaysOfWeek: next.length === 0 ? null : (next as DayOfWeek[]) } };
      }),
    }));
  }

  function updateConstraintMaxWeek(personId: string, max: number | null) {
    patchConstraints(personId, { maxShiftsPerWeek: max });
  }

  function updateConstraintMaxTotal(personId: string, max: number | null) {
    patchConstraints(personId, { maxShiftsTotal: max });
  }

  function updateConstraintMaxConsecutive(personId: string, max: number | null) {
    patchConstraints(personId, { maxConsecutiveDays: max });
  }

  function updateConstraintMinRest(personId: string, min: number | null) {
    patchConstraints(personId, { minRestDays: min });
  }

  return {
    addPerson,
    deletePerson,
    updatePersonName,
    toggleQualification,
    toggleUnavailability,
    toggleConstraintShift,
    toggleConstraintBlockedShift,
    toggleConstraintDay,
    toggleConstraintBlockedDay,
    updateConstraintMaxWeek,
    updateConstraintMaxTotal,
    updateConstraintMaxConsecutive,
    updateConstraintMinRest,
  };
}
