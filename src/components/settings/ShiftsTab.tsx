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
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  state: AppState;
  onAdd: (name: string, startHour: number, durationHours: number) => void;
  onUpdate: (id: string, updates: Partial<Omit<Shift, 'id'>>) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onUpdateMinBreakHours: (hours: number) => void;
  shiftSets: import('../../hooks/usePresets').ShiftSetPreset[];
  onAddShiftSet: (name: string, shifts: Shift[]) => Promise<void>;
  onDeleteShiftSet: (id: string) => Promise<void>;
  onLoadShiftSet: (shifts: Omit<Shift, 'id'>[]) => void;
  isLoggedIn: boolean;
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
    onDelete(shift.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 items-center p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm hover:shadow transition-shadow"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 px-0.5 touch-none flex-shrink-0"
        title={t('dragToReorder', lang)}
        tabIndex={-1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <input
          className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-indigo-500 transition-shadow"
          value={shift.name}
          onChange={e => onUpdate(shift.id, { name: e.target.value })}
          placeholder={t('shiftNamePlaceholder', lang)}
        />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('startTime', lang)}</span>
          <input
            type="time"
            dir="ltr"
            className="border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-indigo-500 transition-shadow"
            value={hourToTime(shift.startHour)}
            onChange={e => onUpdate(shift.id, { startHour: timeToHour(e.target.value) })}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('durationH', lang)}</span>
          <input
            type="number"
            className="border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-indigo-500 transition-shadow"
            value={shift.durationHours}
            min={0.5} max={24} step={0.5}
            onChange={e => onUpdate(shift.id, { durationHours: parseFloat(e.target.value) || 0.5 })}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">End</span>
          <span dir="ltr" className="text-sm text-gray-500 dark:text-slate-400 py-1 px-2">
            {hourToTime(shift.startHour + shift.durationHours)}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={!canDelete}
        onClick={handleDelete}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </Button>
    </div>
  );
}

export function ShiftsTab({ state, onAdd, onUpdate, onDelete, onReorder, onUpdateMinBreakHours, shiftSets, onAddShiftSet, onDeleteShiftSet, onLoadShiftSet, isLoggedIn }: Props) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState<number>(8);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
  const lang = langFromDir(state.dir);

  function closeDialog() { setDialog({ open: false, message: '', onConfirm: () => {} }); }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), timeToHour(startTime), duration);
    setName('');
  }

  async function handleConfirmSave(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) return;
    setSaving(true);
    await onAddShiftSet(templateName.trim(), state.shifts);
    setSavingTemplate(false);
    setTemplateName('');
    setSaving(false);
  }

  function handleRequestDeleteShift(id: string) {
    setDialog({ open: true, message: t('deleteShiftConfirm', lang), onConfirm: () => { onDelete(id); closeDialog(); } });
  }

  function handleLoadTemplate(shifts: Omit<Shift, 'id'>[]) {
    const msg = lang === 'he'
      ? 'טעינת התבנית תחליף את כל המשמרות הקיימות. האם להמשיך?'
      : 'Loading this template will replace ALL current shifts. Are you sure?';
    setDialog({ open: true, message: msg, onConfirm: () => { onLoadShiftSet(shifts); closeDialog(); } });
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
    <>
    <ConfirmDialog open={dialog.open} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={closeDialog} lang={lang} />
    <div className="space-y-5">
      {/* Current Shifts */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t('currentShifts', lang)}
              {state.shifts.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{state.shifts.length}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('shiftsDesc', lang)}</p>
          </div>
          {isLoggedIn && state.shifts.length > 0 && !savingTemplate && (
            <Button variant="secondary" size="sm" onClick={() => setSavingTemplate(true)} className="flex-shrink-0 flex items-center gap-1.5" title={t('saveAsPreset', lang)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {lang === 'he' ? 'שמור כתבנית' : 'Save as Template'}
            </Button>
          )}
        </div>

        {savingTemplate && (
          <form onSubmit={handleConfirmSave} className="flex items-center gap-2 mb-4">
            <input
              autoFocus
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder={lang === 'he' ? 'שם התבנית...' : 'Template name...'}
              className="flex-1 text-sm border border-blue-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!templateName.trim() || saving}>
              {saving ? '...' : t('save', lang)}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSavingTemplate(false); setTemplateName(''); }}>
              {t('cancel', lang)}
            </Button>
          </form>
        )}

        {shiftSets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">{t('quickPresets', lang)}</span>
            {shiftSets.map(set => (
              <div key={set.id} className="inline-flex items-center bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 shadow-sm rounded-full overflow-hidden">
                <button
                  onClick={() => handleLoadTemplate(set.shifts)}
                  className="text-xs px-2.5 py-1 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                >
                  {set.name}
                </button>
                <button 
                  onClick={() => onDeleteShiftSet(set.id)}
                  className="px-1.5 py-1 text-blue-400 dark:text-blue-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border-l border-blue-100 dark:border-slate-600"
                  title={t('delete', lang)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {state.shifts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-400 dark:text-slate-500">{t('noShiftsEmpty', lang)}</p>
          </div>
        ) : (
          <>
            {state.shifts.length > 1 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                {t('dragToReorder', lang)}
              </p>
            )}
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
                      onDelete={handleRequestDeleteShift}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Add Shift */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('addShift', lang)}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('addShiftDesc', lang)}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <Input
            label={t('shiftNameLabel', lang)}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('shiftExample', lang)}
            className="sm:w-36"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Input
            label={t('startTime', lang)}
            type="time"
            dir="ltr"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="sm:w-28"
          />
          <Input
            label={t('durationH', lang)}
            type="number"
            value={duration}
            min={0.5} max={24} step={0.5}
            onChange={e => setDuration(parseFloat(e.target.value) || 0.5)}
            className="sm:w-24"
          />
          <Button onClick={handleAdd} variant="primary" size="sm" className="sm:self-end">
            {t('addShift', lang)}
          </Button>
        </div>
      </div>

      {/* Min Break Hours */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('minBreakHoursLabel', lang)}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('minBreakDesc', lang)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="number"
              dir="ltr"
              className="border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm w-20 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-indigo-500 transition-shadow"
              value={state.minBreakHours}
              min={1} max={48} step={0.5}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (v >= 1) onUpdateMinBreakHours(v);
              }}
            />
            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">h</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
