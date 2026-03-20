import { useState } from 'react';
import { GripVertical, Pencil, Check, X } from 'lucide-react';
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
import type { AppState, HomeGroupPeriod } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DateRangePicker } from '../ui/DateRangePicker';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { langFromDir, t } from '../../utils/i18n';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onAddPeriod: (groupId: string, startDate: string, endDate: string) => void;
  onUpdatePeriod: (periodId: string, startDate: string, endDate: string) => void;
  onDeletePeriod: (periodId: string) => void;
  onReorderPeriods: (orderedIds: string[]) => void;
}

function SortablePeriodRow({
  period,
  groupName,
  formatDate,
  lang,
  onEdit,
  onDelete,
}: {
  period: HomeGroupPeriod;
  groupName: string;
  formatDate: (iso: string) => string;
  lang: 'he' | 'en';
  onEdit: (period: HomeGroupPeriod) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: period.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <td className="px-2 py-2 w-6">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{groupName}</td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(period.startDate)}</td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(period.endDate)}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(period)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(period.id)}>
            {t('delete', lang)}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function HomePeriodsModal({ open, onClose, state, onAddPeriod, onUpdatePeriod, onDeletePeriod, onReorderPeriods }: Props) {
  const lang = langFromDir(state.dir);
  const locale = state.dir === 'rtl' ? heLocale : undefined;

  const [newGroupId, setNewGroupId] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<HomeGroupPeriod | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const periods = state.homeGroupPeriods ?? [];

  function formatDate(iso: string) {
    try { return format(parseISO(iso), 'dd/MM/yyyy', { locale }); } catch { return iso; }
  }

  function getGroupName(groupId: string) {
    return state.homeGroups.find(g => g.id === groupId)?.name ?? groupId;
  }

  function handleAdd() {
    if (!newGroupId || !newStart || !newEnd) return;
    if (newEnd < newStart) return;
    onAddPeriod(newGroupId, newStart, newEnd);
    setNewGroupId('');
    setNewStart('');
    setNewEnd('');
  }

  function handleStartEdit(period: HomeGroupPeriod) {
    setEditingPeriod(period);
    setEditStart(period.startDate);
    setEditEnd(period.endDate);
  }

  function handleSaveEdit() {
    if (!editingPeriod || !editStart || !editEnd || editEnd < editStart) return;
    onUpdatePeriod(editingPeriod.id, editStart, editEnd);
    setEditingPeriod(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = periods.findIndex(p => p.id === active.id);
    const newIndex = periods.findIndex(p => p.id === over.id);
    const reordered = arrayMove(periods, oldIndex, newIndex);
    onReorderPeriods(reordered.map(p => p.id));
  }

  const canAdd = !!newGroupId && !!newStart && !!newEnd && newEnd >= newStart;
  const canSaveEdit = !!editStart && !!editEnd && editEnd >= editStart;

  return (
    <Modal open={open} onClose={onClose} title={t('homePeriodsTitle', lang)} size="lg">
      <div className="space-y-5">
        <p className="text-sm text-slate-500">{t('homePeriodsDesc', lang)}</p>

        {/* Existing periods table */}
        {periods.length === 0 ? (
          <p className="text-sm text-slate-400 italic">{t('noPeriodsYet', lang)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">
                  <th className="px-2 py-2 w-6" />
                  <th className="px-3 py-2 text-start font-semibold">{t('groupLabel', lang)}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('departure', lang)}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('returnDate', lang)}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={periods.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {periods.map(period => (
                      <SortablePeriodRow
                        key={period.id}
                        period={period}
                        groupName={getGroupName(period.groupId)}
                        formatDate={formatDate}
                        lang={lang}
                        onEdit={handleStartEdit}
                        onDelete={setPendingDeletePeriodId}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        )}

        {/* Inline edit form */}
        {editingPeriod && (
          <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                {lang === 'he' ? `עריכה: ${getGroupName(editingPeriod.groupId)}` : `Edit: ${getGroupName(editingPeriod.groupId)}`}
              </p>
              <button onClick={() => setEditingPeriod(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <DateRangePicker
                startDate={editStart}
                endDate={editEnd}
                onStartChange={setEditStart}
                onEndChange={setEditEnd}
                dir={state.dir}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditingPeriod(null)}>
                {t('cancel', lang)}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={!canSaveEdit}>
                <Check className="w-4 h-4" />
                {lang === 'he' ? 'שמור' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Add period form */}
        {state.homeGroups.length > 0 ? (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('addPeriod', lang)}</p>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">{t('groupLabel', lang)}</label>
              <select
                value={newGroupId}
                onChange={e => setNewGroupId(e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">— {t('groupLabel', lang)} —</option>
                {state.homeGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <DateRangePicker
                startDate={newStart}
                endDate={newEnd}
                onStartChange={setNewStart}
                onEndChange={setNewEnd}
                dir={state.dir}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleAdd} disabled={!canAdd}>
                {t('addPeriod', lang)}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded px-3 py-2">
            {lang === 'he'
              ? 'צור קבוצות תחילה בהגדרות → קבוצות'
              : 'Create groups first in Settings → Groups'}
          </p>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingDeletePeriodId}
        message={t('deletePeriodConfirm', lang)}
        onConfirm={() => { if (pendingDeletePeriodId) { onDeletePeriod(pendingDeletePeriodId); } setPendingDeletePeriodId(null); }}
        onCancel={() => setPendingDeletePeriodId(null)}
        lang={lang}
      />
    </Modal>
  );
}
