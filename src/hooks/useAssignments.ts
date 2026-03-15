import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Assignment, CellAddress } from '../types';

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
        const filtered = s.assignments.filter(
          a => !(a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId)
        );
        const newAssignment: Assignment = {
          personId,
          date: cell.date,
          shiftId: cell.shiftId,
          positionId: cell.positionId,
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
          assignments: s.assignments.filter(
            a => !(a.date === cell.date && a.shiftId === cell.shiftId && a.positionId === cell.positionId)
          ),
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
          a => !(a.date === sourceCell.date && a.shiftId === sourceCell.shiftId && a.positionId === sourceCell.positionId && a.personId === personId)
        );
        // Remove any existing at target
        assignments = assignments.filter(
          a => !(a.date === targetCell.date && a.shiftId === targetCell.shiftId && a.positionId === targetCell.positionId)
        );
        // Add at target
        const newAssignment: Assignment = {
          personId,
          date: targetCell.date,
          shiftId: targetCell.shiftId,
          positionId: targetCell.positionId,
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

  function clearAndBatchAssign(newAssignments: Assignment[]) {
    if (!schedule) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        return { ...s, assignments: newAssignments, updatedAt: now };
      }),
    }));
  }

  function swapAssignments(cellA: CellAddress, cellB: CellAddress) {
    if (!schedule) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        const assignA = s.assignments.find(a => a.date === cellA.date && a.shiftId === cellA.shiftId && a.positionId === cellA.positionId);
        const assignB = s.assignments.find(a => a.date === cellB.date && a.shiftId === cellB.shiftId && a.positionId === cellB.positionId);
        if (!assignA || !assignB) return s;
        const without = s.assignments.filter(
          a => !(a.date === cellA.date && a.shiftId === cellA.shiftId && a.positionId === cellA.positionId) &&
               !(a.date === cellB.date && a.shiftId === cellB.shiftId && a.positionId === cellB.positionId)
        );
        return {
          ...s,
          assignments: [
            ...without,
            { personId: assignB.personId, date: cellA.date, shiftId: cellA.shiftId, positionId: cellA.positionId },
            { personId: assignA.personId, date: cellB.date, shiftId: cellB.shiftId, positionId: cellB.positionId },
          ],
          updatedAt: now,
        };
      }),
    }));
  }

  return { assign, unassign, moveAssignment, swapAssignments, batchAssign, clearAndBatchAssign, assignments: schedule?.assignments ?? [] };
}
