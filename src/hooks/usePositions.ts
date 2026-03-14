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

  function toggleOnCall(id: string) {
    setState(prev => ({
      ...prev,
      positions: prev.positions.map(p => p.id === id ? { ...p, isOnCall: !p.isOnCall } : p),
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

  function reorderPositions(orderedIds: string[]) {
    setState(prev => {
      const map = new Map(prev.positions.map(p => [p.id, p]));
      const reordered = orderedIds.map(id => map.get(id)).filter(Boolean) as typeof prev.positions;
      return { ...prev, positions: reordered };
    });
  }

  return { addPosition, updatePosition, deletePosition, toggleOnCall, reorderPositions };
}
