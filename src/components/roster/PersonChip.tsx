import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { DragData, CellAddress } from '../../types';
import { serializeCellAddress } from '../../utils/cellKey';
import { personInitials } from '../../utils/personColor';

interface Props {
  personId: string;
  name: string;
  colorHex: string;
  source: 'pool' | 'cell';
  sourceCell?: CellAddress;
  variant?: 'pool' | 'cell';
  dimmed?: boolean;
}

export const PersonChip = memo(function PersonChip({ personId, name, colorHex, source, sourceCell, variant = 'pool', dimmed = false }: Props) {
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

  const initials = personInitials(name);

  if (variant === 'cell') {
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const chipStyle = isDarkMode
      ? { ...style, backgroundColor: colorHex, borderColor: colorHex }
      : style;
    return (
      <div
        ref={setNodeRef}
        style={chipStyle}
        {...attributes}
        {...listeners}
        className={`flex rtl:flex-row-reverse items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/90 dark:border shadow-sm text-xs font-medium cursor-grab active:cursor-grabbing select-none ${dimmed ? 'opacity-50' : ''}`}
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.20)' : colorHex, color: '#1e293b' }}
        >
          {initials}
        </span>
        <span className="flex-1 truncate text-right text-gray-800" style={{ color: isDarkMode ? '#1e293b' : undefined }}>{name}</span>
      </div>
    );
  }

  // pool variant
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: colorHex, borderColor: colorHex }}
      {...attributes}
      {...listeners}
      className={`flex rtl:flex-row-reverse items-center gap-2 px-2 py-1 rounded border text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-opacity ${dimmed ? 'opacity-40' : ''}`}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.15)', color: '#1e293b' }}
      >
        {initials}
      </span>
      <span className="flex-1 text-right" style={{ color: '#1e293b' }}>{name}</span>
    </div>
  );
});
