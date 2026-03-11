import { useState, type ReactNode } from 'react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Assignment, DragData, AppState, CellAddress } from '../../types';
import { deserializeCellAddress } from '../../utils/cellKey';
import { DragOverlayContent } from './DragOverlayContent';

interface Props {
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  children: ReactNode;
  onAssign: (cell: CellAddress, personId: string) => void;
  onUnassign: (cell: CellAddress) => void;
  onMove: (source: CellAddress, target: CellAddress, personId: string) => void;
}

export function DndProvider({ state, assignments: _assignments, refDate: _refDate, children, onAssign, onUnassign, onMove }: Props) {
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    setActiveDragData(data ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    const dragData = active.data.current as DragData | undefined;
    setActiveDragData(null);

    if (!dragData) return;

    if (!over) {
      // Dropped outside — if from cell, unassign
      if (dragData.type === 'from-cell' && dragData.sourceCell) {
        onUnassign(dragData.sourceCell);
      }
      return;
    }

    if (over.id === 'pool') {
      if (dragData.type === 'from-cell' && dragData.sourceCell) {
        onUnassign(dragData.sourceCell);
      }
      return;
    }

    // Dropped on a cell
    const targetCell = deserializeCellAddress(over.id as string);

    if (dragData.type === 'from-cell' && dragData.sourceCell) {
      const src = dragData.sourceCell;
      if (
        src.date === targetCell.date &&
        src.shiftId === targetCell.shiftId &&
        src.positionId === targetCell.positionId
      ) return; // same cell, no-op

      onMove(src, targetCell, dragData.personId);
    } else {
      onAssign(targetCell, dragData.personId);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        <DragOverlayContent dragData={activeDragData} state={state} />
      </DragOverlay>
    </DndContext>
  );
}
