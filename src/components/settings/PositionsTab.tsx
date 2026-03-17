import { useState } from 'react';
import { GripVertical, Save, Trash2, Users, PlusCircle } from 'lucide-react';
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
import type { AppState, Position } from '../../types';
import { type Lang, langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  state: AppState;
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleOnCall: (id: string) => void;
  onToggleQualification: (personId: string, positionId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  positionSets: import('../../hooks/usePresets').PositionSetPreset[];
  onAddPositionSet: (name: string, positions: Position[]) => Promise<void>;
  onDeletePositionSet: (id: string) => Promise<void>;
  onLoadPositionSet: (positions: Omit<Position, 'id'>[]) => void;
  isLoggedIn: boolean;
}

function SortablePositionRow({ pos, qualifiedCount, lang, onUpdate, onDelete, onToggleOnCall, onAssign }: {
  pos: Position;
  qualifiedCount: number;
  lang: Lang;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleOnCall: (id: string) => void;
  onAssign: (pos: Position) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pos.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-3 items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500 transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-0.5 touch-none flex-shrink-0"
        title={t('dragToReorder', lang)}
        tabIndex={-1}
      >
        <GripVertical className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-blue-600">{pos.name.charAt(0).toUpperCase()}</span>
      </div>
      <input
        className="flex-1 bg-transparent border-0 px-0 py-0 text-sm font-medium text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-0 min-w-0"
        value={pos.name}
        onChange={e => onUpdate(pos.id, e.target.value)}
      />

      {/* On-Call toggle switch + label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[10px] font-medium ${pos.isOnCall ? 'text-orange-500' : 'text-gray-400 dark:text-slate-500'}`}>
          {t('onCall', lang)}
        </span>
        <button
          role="switch"
          aria-checked={pos.isOnCall}
          onClick={() => onToggleOnCall(pos.id)}
          title={t('onCall', lang)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full shrink-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
            pos.isOnCall ? 'bg-orange-400' : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            pos.isOnCall ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
          }`} />
        </button>
      </div>

      {/* People count / single-role assign button */}
      <button
        onClick={() => onAssign(pos)}
        className="flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full flex-shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        <Users className="w-3 h-3 shrink-0" strokeWidth={2} />
        <span dir="ltr">{qualifiedCount}</span>
        <span className="hidden sm:inline">{t('people', lang)}</span>
      </button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(pos.id)}
        className="text-gray-400 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" strokeWidth={2} />
      </Button>
    </div>
  );
}

export function PositionsTab({ state, onAdd, onUpdate, onDelete, onToggleOnCall, onToggleQualification, onReorder, positionSets, onAddPositionSet, onDeletePositionSet, onLoadPositionSet, isLoggedIn }: Props) {
  const [name, setName] = useState('');
  const [assigningPosition, setAssigningPosition] = useState<Position | null>(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
  const lang = langFromDir(state.dir);

  function closeDialog() { setDialog({ open: false, message: '', onConfirm: () => {} }); }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function handleConfirmSave(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) return;
    setSaving(true);
    await onAddPositionSet(templateName.trim(), state.positions);
    setSavingTemplate(false);
    setTemplateName('');
    setSaving(false);
  }

  function handleRequestDeletePosition(id: string) {
    setDialog({ open: true, message: t('deletePositionConfirm', lang), onConfirm: () => { onDelete(id); closeDialog(); } });
  }

  function handleLoadTemplate(positions: Omit<Position, 'id'>[]) {
    const msg = lang === 'he'
      ? 'טעינת התבנית תחליף את כל התפקידים הקיימים. האם להמשיך?'
      : 'Loading this template will replace ALL current positions. Are you sure?';
    setDialog({ open: true, message: msg, onConfirm: () => { onLoadPositionSet(positions); closeDialog(); } });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = state.positions.map(p => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <>
    <ConfirmDialog open={dialog.open} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={closeDialog} lang={lang} />
    <div className="space-y-5">
      {/* Current Positions */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t('currentPositions', lang)}
              {state.positions.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{state.positions.length}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('positionsDesc', lang)}</p>
          </div>
          {isLoggedIn && state.positions.length > 0 && !savingTemplate && (
            <Button variant="secondary" size="sm" onClick={() => setSavingTemplate(true)} className="flex-shrink-0 flex items-center gap-1.5" title={t('saveAsPreset', lang)}>
              <Save className="w-3.5 h-3.5" strokeWidth={2} />
              {lang === 'he' ? 'שמור כתבנית' : 'Save as Template'}
            </Button>
          )}
          {/* Bulk Assign button */}
          {state.positions.length > 0 && state.people.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowBulkAssign(true)} className="flex-shrink-0 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" strokeWidth={2} />
              {t('bulkAssign', lang)}
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
              className="flex-1 text-sm border border-blue-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-start"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!templateName.trim() || saving}>
              {saving ? '...' : t('save', lang)}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSavingTemplate(false); setTemplateName(''); }}>
              {t('cancel', lang)}
            </Button>
          </form>
        )}

        {positionSets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">{t('quickPresets', lang)}</span>
            {positionSets.map(set => (
              <div key={set.id} className="inline-flex items-center bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 shadow-sm rounded-full overflow-hidden">
                <button
                  onClick={() => handleLoadTemplate(set.positions)}
                  className="text-xs px-2.5 py-1 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                >
                  {set.name}
                </button>
                <button
                  onClick={() => onDeletePositionSet(set.id)}
                  className="px-1.5 py-1 text-blue-400 dark:text-blue-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border-l border-blue-100 dark:border-slate-600"
                  title={t('delete', lang)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {state.positions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-600 rounded-lg">
            <Users className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-gray-400 dark:text-slate-500">{t('noPositionsEmpty', lang)}</p>
          </div>
        ) : (
          <>
            {state.positions.length > 1 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                {t('dragToReorder', lang)}
              </p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={state.positions.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {state.positions.map(pos => {
                    const qualifiedCount = state.people.filter(p => p.qualifiedPositions.includes(pos.id)).length;
                    return (
                      <SortablePositionRow
                        key={pos.id}
                        pos={pos}
                        qualifiedCount={qualifiedCount}
                        lang={lang}
                        onUpdate={onUpdate}
                        onDelete={handleRequestDeletePosition}
                        onToggleOnCall={onToggleOnCall}
                        onAssign={setAssigningPosition}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Add Position */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <PlusCircle className="w-5 h-5 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('addPosition', lang)}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('addPositionDesc', lang)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('positionNamePlaceholder', lang)}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); setName(''); } }}
          />
          <div className="flex gap-2 self-end">
            <Button onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }}>
              {t('add', lang)}
            </Button>
          </div>
        </div>
      </div>

      {/* Single-role Assign People Modal */}
      {assigningPosition && (
        <Modal
          open={!!assigningPosition}
          onClose={() => setAssigningPosition(null)}
          title={`${t('assignPeopleTitle', lang)}: ${assigningPosition.name}`}
          size="md"
        >
          <div className="space-y-3">
            {state.people.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">{t('noPeopleForRole', lang)}</p>
            ) : (
              <div className="space-y-2">
                {state.people.map(person => {
                  const isQualified = person.qualifiedPositions.includes(assigningPosition.id);
                  return (
                    <label
                      key={person.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isQualified
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-slate-700 border-gray-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isQualified}
                        onChange={() => onToggleQualification(person.id, assigningPosition.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-600">{person.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className={`text-sm font-medium ${isQualified ? 'text-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-slate-300'}`}>
                        {person.name}
                      </span>
                      {isQualified && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 ms-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setAssigningPosition(null)}>{t('close', lang)}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Assign Matrix Modal */}
      <Modal
        open={showBulkAssign}
        onClose={() => setShowBulkAssign(false)}
        title={t('bulkAssignTitle', lang)}
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">{t('bulkAssignDesc', lang)}</p>
          {state.people.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">{t('noPeopleOrPositions', lang)}</p>
          ) : (() => {
            const regularPositions = state.positions.filter(p => !p.isOnCall);
            const onCallPositions = state.positions.filter(p => p.isOnCall);

            const renderTable = (positions: typeof state.positions, headerBg: string) => (
              <div className="overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${headerBg} text-white`}>
                      <th className={`sticky start-0 ${headerBg} px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide min-w-[140px]`}>
                        {t('name', lang)}
                      </th>
                      {positions.map(pos => (
                        <th key={pos.id} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide min-w-[110px]">
                          {pos.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {state.people.map((person, i) => (
                      <tr key={person.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-700/50'}>
                        <td className="sticky start-0 bg-inherit px-4 py-3 font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-blue-600">{person.name.charAt(0).toUpperCase()}</span>
                            </div>
                            {person.name}
                          </div>
                        </td>
                        {positions.map(pos => {
                          const isQualified = person.qualifiedPositions.includes(pos.id);
                          return (
                            <td key={pos.id} className={`px-4 py-3 text-center transition-colors ${isQualified ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isQualified}
                                onChange={() => onToggleQualification(person.id, pos.id)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

            return (
              <div className="space-y-5">
                {regularPositions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('currentPositions', lang)}</p>
                    {renderTable(regularPositions, 'bg-gray-700')}
                  </div>
                )}
                {onCallPositions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">{t('onCall', lang)}</p>
                    {renderTable(onCallPositions, 'bg-orange-700')}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowBulkAssign(false)}>{t('close', lang)}</Button>
          </div>
        </div>
      </Modal>
    </div>
    </>
  );
}
