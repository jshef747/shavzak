import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { DragData, CellAddress } from '../../types';
import { serializeCellAddress } from '../../utils/cellKey';
import { personPalette, personInitials } from '../../utils/personColor';

interface Props {
  personId: string;
  name: string;
  source: 'pool' | 'cell';
  sourceCell?: CellAddress;
  variant?: 'pool' | 'cell';
  dimmed?: boolean;
}

export const PersonChip = memo(function PersonChip({ personId, name, source, sourceCell, variant = 'pool', dimmed = false }: Props) {
  const draggableId = sourceCell
    ? `${personId}::cell::${serializeCellAddress(sourceCell)}`
    : `${personId}::pool`;

  const dragData: DragData = {
    type: source === 'cell' ? 'from-cell' : 'from-pool',
    personId,
    sourceCell,
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: dragData,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const palette = personPalette(name);
  const initials = personInitials(name);

  if (variant === 'cell') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`flex rtl:flex-row-reverse items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/90 shadow-sm ring-1 ${palette.ring} text-xs font-medium cursor-grab active:cursor-grabbing select-none ${dimmed ? 'opacity-50' : ''}`}
      >
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${palette.bg} ${palette.text} shrink-0`}>
          {initials}
        </span>
        <span className="truncate text-gray-800">{name}</span>
      </div>
    );
  }

  // pool variant
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex rtl:flex-row-reverse items-center gap-2 px-2 py-1 rounded border text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-opacity ${
        dimmed ? 'opacity-40' : ''
      } ${palette.light}`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${palette.bg} ${palette.text} shrink-0`}>
        {initials}
      </span>
      {name}
    </div>
  );
});
