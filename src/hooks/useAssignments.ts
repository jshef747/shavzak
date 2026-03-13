import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Assignment, CellAddress } from '../types';
import { matchesCellAddress } from '../utils/cellKey';

export function useAssignments(state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  const schedule = state.schedules.find(s => s.id === state.activeScheduleId);

  function assign(cell: CellAddress, personId: string) {
    if (!schedule) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        // Remove existing assignment at this cell first
        const filtered = s.assignments.filter(a => !matchesCellAddress(a, cell));
        const newAssignment: Assignment = {
          personId,
          date: cell.date,
          shiftId: cell.shiftId,
          positionId: cell.positionId,
          halfSlot: cell.halfSlot,
          isOncall: cell.isOncall || undefined,
        };
        return { ...s, assignments: [...filtered, newAssignment], updatedAt: now };
      }),
    }));
  }

  function unassign(cell: CellAddress) {
    if (!schedule) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        return {
          ...s,
          assignments: s.assignments.filter(a => !matchesCellAddress(a, cell)),
          updatedAt: now,
        };
      }),
    }));
  }

  function moveAssignment(sourceCell: CellAddress, targetCell: CellAddress, personId: string) {
    if (!schedule) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        // Remove from source
        let assignments = s.assignments.filter(
          a => !(matchesCellAddress(a, sourceCell) && a.personId === personId)
        );
        // Remove any existing at target
        assignments = assignments.filter(a => !matchesCellAddress(a, targetCell));
        // Add at target
        const newAssignment: Assignment = {
          personId,
          date: targetCell.date,
          shiftId: targetCell.shiftId,
          positionId: targetCell.positionId,
          halfSlot: targetCell.halfSlot,
          isOncall: targetCell.isOncall || undefined,
        };
        return { ...s, assignments: [...assignments, newAssignment], updatedAt: now };
      }),
    }));
  }

  function batchAssign(newAssignments: Assignment[]) {
    if (!schedule || newAssignments.length === 0) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        return { ...s, assignments: [...s.assignments, ...newAssignments], updatedAt: now };
      }),
    }));
  }

  return { assign, unassign, moveAssignment, batchAssign, assignments: schedule?.assignments ?? [] };
}
