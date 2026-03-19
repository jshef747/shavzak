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
import { langFromDir } from '../../utils/i18n';

interface Props {
  state: AppState;
  assignments: Assignment[];
  refDate: string;
  children: ReactNode;
  onAssign: (cell: CellAddress, personId: string) => void;
  onUnassign: (cell: CellAddress) => void;
  onMove: (source: CellAddress, target: CellAddress, personId: string) => void;
  onSwap: (cellA: CellAddress, cellB: CellAddress) => void;
  onDragStart?: () => void;
}

interface PendingHalfDrop {
  personId: string;
  sourceCell?: CellAddress;
  targetCell: CellAddress;
}

export function DndProvider({ state, assignments, refDate: _refDate, children, onAssign, onUnassign, onMove, onSwap, onDragStart }: Props) {
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [pendingHalfDrop, setPendingHalfDrop] = useState<PendingHalfDrop | null>(null);
  const lang = langFromDir(state.dir);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    setActiveDragData(data ?? null);
    onDragStart?.();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    const dragData = active.data.current as DragData | undefined;
    setActiveDragData(null);

    if (!dragData) return;

    if (!over) {
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

    const overId = over.id as string;
    const isHalf = !!(over.data.current as { isHalfShift?: boolean } | undefined)?.isHalfShift;
    const targetCell = deserializeCellAddress(overId);

    if (isHalf) {
      // Show the dialog to ask full / h1 / h2
      setPendingHalfDrop({
        personId: dragData.personId,
        sourceCell: dragData.type === 'from-cell' ? dragData.sourceCell : undefined,
        targetCell,
      });
      return;
    }

    if (dragData.type === 'from-cell' && dragData.sourceCell) {
      const src = dragData.sourceCell;
      if (
        src.date === targetCell.date &&
        src.shiftId === targetCell.shiftId &&
        src.positionId === targetCell.positionId
      ) return;

      const targetOccupied = assignments.some(
        a => a.date === targetCell.date && a.shiftId === targetCell.shiftId && a.positionId === targetCell.positionId
      );
      if (targetOccupied) {
        onSwap(src, targetCell);
      } else {
        onMove(src, targetCell, dragData.personId);
      }
    } else {
      onAssign(targetCell, dragData.personId);
    }
  }

  function commitHalfDrop(zone: 'full' | 'h1' | 'h2') {
    if (!pendingHalfDrop) return;
    const { personId, sourceCell, targetCell } = pendingHalfDrop;
    setPendingHalfDrop(null);
    if (sourceCell) onUnassign(sourceCell);
    if (zone === 'full') {
      onAssign({ ...targetCell, half: 1 }, personId);
      onAssign({ ...targetCell, half: 2 }, personId);
    } else if (zone === 'h1') {
      onAssign({ ...targetCell, half: 1 }, personId);
    } else {
      onAssign({ ...targetCell, half: 2 }, personId);
    }
  }

  const person = pendingHalfDrop ? state.people.find(p => p.id === pendingHalfDrop.personId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>
        <DragOverlayContent dragData={activeDragData} state={state} />
      </DragOverlay>

      {pendingHalfDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setPendingHalfDrop(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 w-72 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
              {person?.name} — {lang === 'he' ? 'בחר חלק משמרת' : 'Choose shift part'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => commitHalfDrop('full')}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors"
              >
                {lang === 'he' ? 'משמרת מלאה' : 'Full shift'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => commitHalfDrop('h1')}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors"
                >
                  {lang === 'he' ? 'חצי ראשון' : 'First half'}
                </button>
                <button
                  onClick={() => commitHalfDrop('h2')}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors"
                >
                  {lang === 'he' ? 'חצי שני' : 'Second half'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
