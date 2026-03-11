import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AppState, Shift } from '../../types';
import { type Lang, langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  state: AppState;
  onAdd: (name: string, startHour: number, durationHours: number) => void;
  onUpdate: (id: string, updates: Partial<Omit<Shift, 'id'>>) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onUpdateMinBreakHours: (hours: number) => void;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }
function hourToTime(h: number) {
  const totalMin = Math.round(h * 60);
  return `${pad(Math.floor(totalMin / 60) % 24)}:${pad(totalMin % 60)}`;
}
function timeToHour(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h + (m ?? 0) / 60;
}

function SortableShiftRow({ shift, canDelete, lang, onUpdate, onDelete }: {
  shift: Shift;
  canDelete: boolean;
  lang: Lang;
  onUpdate: (id: string, updates: Partial<Omit<Shift, 'id'>>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shift.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleDelete() {
    if (window.confirm(t('deleteShiftConfirm', lang))) {
      onDelete(shift.id);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 items-center p-2 bg-gray-50 rounded border"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1 touch-none"
        title={t('dragToReorder', lang)}
        tabIndex={-1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <input
        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0"
        value={shift.name}
        onChange={e => onUpdate(shift.id, { name: e.target.value })}
        placeholder={t('shiftNamePlaceholder', lang)}
      />
      <input
        type="time"
        dir="ltr"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
        value={hourToTime(shift.startHour)}
        onChange={e => onUpdate(shift.id, { startHour: timeToHour(e.target.value) })}
      />
      <input
        type="number"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
        value={shift.durationHours}
        min={0.5} max={24} step={0.5}
        onChange={e => onUpdate(shift.id, { durationHours: parseFloat(e.target.value) || 0.5 })}
      />
      <span dir="ltr" className="text-xs text-gray-500 whitespace-nowrap">
        h → {hourToTime(shift.startHour + shift.durationHours)}
      </span>
      <Button
        variant="danger"
        size="sm"
        disabled={!canDelete}
        onClick={handleDelete}
      >
        {t('delete', lang)}
      </Button>
    </div>
  );
}

export function ShiftsTab({ state, onAdd, onUpdate, onDelete, onReorder, onUpdateMinBreakHours }: Props) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState<number>(8);
  const lang = langFromDir(state.dir);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), timeToHour(startTime), duration);
    setName('');
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = state.shifts.map(s => s.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {t('currentShifts', lang)}
          {state.shifts.length > 1 && (
            <span className="ml-2 text-xs font-normal text-gray-400">{t('dragToReorder', lang)}</span>
          )}
        </h3>
        {state.shifts.length === 0 && <p className="text-sm text-gray-400">{t('noShifts', lang)}</p>}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={state.shifts.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {state.shifts.map(shift => (
                <SortableShiftRow
                  key={shift.id}
                  shift={shift}
                  canDelete={state.shifts.length > 1}
                  lang={lang}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('addShift', lang)}</h3>
        <div className="flex gap-2 items-end flex-wrap">
          <Input
            label={t('shiftNameLabel', lang)}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('shiftExample', lang)}
            className="w-32"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Input
            label={t('startTime', lang)}
            type="time"
            dir="ltr"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-28"
          />
          <Input
            label={t('durationH', lang)}
            type="number"
            value={duration}
            min={0.5} max={24} step={0.5}
            onChange={e => setDuration(parseFloat(e.target.value) || 0.5)}
            className="w-20"
          />
          <Button onClick={handleAdd} variant="primary" size="sm" className="self-end">
            {t('addShift', lang)}
          </Button>
        </div>
      </div>

      <div className="border-t pt-4 flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700 flex-1">
          {t('minBreakHoursLabel', lang)}
        </label>
        <input
          type="number"
          dir="ltr"
          className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
          value={state.minBreakHours}
          min={1} max={48} step={0.5}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (v >= 1) onUpdateMinBreakHours(v);
          }}
        />
        <span className="text-sm text-gray-500">h</span>
      </div>
    </div>
  );
}
