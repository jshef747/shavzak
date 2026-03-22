import type { Dispatch, SetStateAction } from 'react';
import type { AppState, Assignment, CellAddress } from '../types';
import { assignmentMatchesCell } from '../utils/cellKey';

export function useAssignments(state: AppState, setState: Dispatch<SetStateAction<AppState>>) {
  const schedule = state.schedules.find(s => s.id === state.activeScheduleId);

  function assign(cell: CellAddress, personId: string) {
    if (!schedule) return;
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      schedules: prev.schedules.map(s => {
        if (s.id !== state.activeScheduleId) return s;
        const filtered = s.assignments.filter(a => !assignmentMatchesCell(a, cell));
        const newAssignment: Assignment = {
          personId,
          date: cell.date,
          shiftId: cell.shiftId,
          positionId: cell.positionId,
          ...(cell.half !== undefined ? { half: cell.half } : {}),
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
        // If this is a half-shift cell, also remove the other half for the same person
        const personId = s.assignments.find(a => assignmentMatchesCell(a, cell))?.personId;
        const filtered = s.assignments.filter(a => {
          if (assignmentMatchesCell(a, cell)) return false;
          // Remove the other half too if same person/date/shift/position
          if (
            cell.half !== undefined &&
            personId &&
            a.personId === personId &&
            a.date === cell.date &&
            a.shiftId === cell.shiftId &&
            a.positionId === cell.positionId &&
            a.half !== undefined &&
            a.half !== cell.half
          ) return false;
          return true;
        });
        return { ...s, assignments: filtered, updatedAt: now };
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
          a => !(assignmentMatchesCell(a, sourceCell) && a.personId === personId)
        );
        // Remove any existing at target
        assignments = assignments.filter(a => !assignmentMatchesCell(a, targetCell));
        // Add at target
        const newAssignment: Assignment = {
          personId,
          date: targetCell.date,
          shiftId: targetCell.shiftId,
          positionId: targetCell.positionId,
          ...(targetCell.half !== undefined ? { half: targetCell.half } : {}),
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
        const assignA = s.assignments.find(a => assignmentMatchesCell(a, cellA));
        const assignB = s.assignments.find(a => assignmentMatchesCell(a, cellB));
        if (!assignA || !assignB) return s;

        // For half-shift cells: also check if the paired half has the same person (merged display).
        // If so, swap the paired half too so the whole merged cell moves together.
        const pairedHalfOf = (cell: CellAddress, personId: string) => {
          if (cell.half === undefined) return null;
          const otherHalf: 1 | 2 = cell.half === 1 ? 2 : 1;
          const paired = s.assignments.find(
            a => a.date === cell.date && a.shiftId === cell.shiftId &&
                 a.positionId === cell.positionId && a.half === otherHalf &&
                 a.personId === personId
          );
          return paired ?? null;
        };

        const pairedA = pairedHalfOf(cellA, assignA.personId);
        const pairedB = pairedHalfOf(cellB, assignB.personId);

        // Remove all involved assignments
        const toRemove = [cellA, cellB];
        if (pairedA) toRemove.push({ ...cellA, half: pairedA.half });
        if (pairedB) toRemove.push({ ...cellB, half: pairedB.half });

        const without = s.assignments.filter(
          a => !toRemove.some(c => assignmentMatchesCell(a, c))
        );

        const added: Assignment[] = [
          // Person B goes to cellA's slot(s)
          { personId: assignB.personId, date: cellA.date, shiftId: cellA.shiftId, positionId: cellA.positionId, ...(cellA.half !== undefined ? { half: cellA.half } : {}) },
          // Person A goes to cellB's slot(s)
          { personId: assignA.personId, date: cellB.date, shiftId: cellB.shiftId, positionId: cellB.positionId, ...(cellB.half !== undefined ? { half: cellB.half } : {}) },
        ];
        // Also move the paired halves across
        if (pairedA) added.push({ personId: assignB.personId, date: cellA.date, shiftId: cellA.shiftId, positionId: cellA.positionId, half: pairedA.half });
        if (pairedB) added.push({ personId: assignA.personId, date: cellB.date, shiftId: cellB.shiftId, positionId: cellB.positionId, half: pairedB.half });

        return { ...s, assignments: [...without, ...added], updatedAt: now };
      }),
    }));
  }

  return { assign, unassign, moveAssignment, swapAssignments, batchAssign, clearAndBatchAssign, assignments: schedule?.assignments ?? [] };
}
