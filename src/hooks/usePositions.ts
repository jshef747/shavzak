import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Position } from '../types';

export function usePositions(_state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  function addPosition(name: string) {
    const position: Position = { id: crypto.randomUUID(), name };
    setState(prev => ({ ...prev, positions: [...prev.positions, position] }));
  }

  function updatePosition(id: string, name: string) {
    setState(prev => ({
      ...prev,
      positions: prev.positions.map(p => p.id === id ? { ...p, name } : p),
    }));
  }

  function deletePosition(id: string) {
    if (window.confirm('Delete this position? All assignments to it will be removed.')) {
      setState(prev => ({
        ...prev,
        positions: prev.positions.filter(p => p.id !== id),
        people: prev.people.map(person => ({
          ...person,
          qualifiedPositions: person.qualifiedPositions.filter(qp => qp !== id),
        })),
        schedules: prev.schedules.map(sched => ({
          ...sched,
          assignments: sched.assignments.filter(a => a.positionId !== id),
        })),
      }));
    }
  }

  return { addPosition, updatePosition, deletePosition };
}
