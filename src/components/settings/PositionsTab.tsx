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
import type { AppState, Position } from '../../types';
import { type Lang, langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

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
      className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-0.5 touch-none flex-shrink-0"
        title={t('dragToReorder', lang)}
        tabIndex={-1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-indigo-600">{pos.name.charAt(0).toUpperCase()}</span>
      </div>
      <input
        className="flex-1 bg-transparent border-0 px-0 py-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 min-w-0"
        value={pos.name}
        onChange={e => onUpdate(pos.id, e.target.value)}
      />

      {/* On-Call toggle */}
      <button
        onClick={() => onToggleOnCall(pos.id)}
        title={t('onCall', lang)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
          pos.isOnCall
            ? 'bg-orange-50 border-orange-300 text-orange-700'
            : 'bg-gray-100 border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-500'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {t('onCall', lang)}
      </button>

      {/* People count / single-role assign button */}
      <button
        onClick={() => onAssign(pos)}
        className="flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex-shrink-0 hover:bg-indigo-100 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {qualifiedCount} {t('people', lang)}
      </button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(pos.id)}
        className="text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
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
  const lang = langFromDir(state.dir);

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

  function handleLoadTemplate(positions: Omit<Position, 'id'>[]) {
    const msg = lang === 'he' 
      ? 'טעינת התבנית תחליף את כל התפקידים הקיימים. האם להמשיך?'
      : 'Loading this template will replace ALL current positions. Are you sure?';
    if (window.confirm(msg)) {
      onLoadPositionSet(positions);
    }
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
    <div className="space-y-5">
      {/* Current Positions */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('currentPositions', lang)}
              {state.positions.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{state.positions.length}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('positionsDesc', lang)}</p>
          </div>
          {isLoggedIn && state.positions.length > 0 && !savingTemplate && (
            <Button variant="secondary" size="sm" onClick={() => setSavingTemplate(true)} className="flex-shrink-0 flex items-center gap-1.5" title={t('saveAsPreset', lang)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {lang === 'he' ? 'שמור כתבנית' : 'Save as Template'}
            </Button>
          )}
          {/* Bulk Assign button */}
          {state.positions.length > 0 && state.people.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowBulkAssign(true)} className="flex-shrink-0 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
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
              className="flex-1 text-sm border border-indigo-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
            <span className="text-xs font-medium text-indigo-800">{t('quickPresets', lang)}</span>
            {positionSets.map(set => (
              <div key={set.id} className="inline-flex items-center bg-white border border-indigo-200 shadow-sm rounded-full overflow-hidden">
                <button
                  onClick={() => handleLoadTemplate(set.positions)}
                  className="text-xs px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  {set.name}
                </button>
                <button
                  onClick={() => onDeletePositionSet(set.id)}
                  className="px-1.5 py-1 text-indigo-400 hover:text-red-500 hover:bg-red-50 transition-colors border-l border-indigo-100"
                  title={t('delete', lang)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {state.positions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">{t('noPositionsEmpty', lang)}</p>
          </div>
        ) : (
          <>
            {state.positions.length > 1 && (
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
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
                        onDelete={onDelete}
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('addPosition', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('addPositionDesc', lang)}</p>
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
              <p className="text-sm text-gray-400 text-center py-6">{t('noPeopleForRole', lang)}</p>
            ) : (
              <div className="space-y-2">
                {state.people.map(person => {
                  const isQualified = person.qualifiedPositions.includes(assigningPosition.id);
                  return (
                    <label
                      key={person.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isQualified
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isQualified}
                        onChange={() => onToggleQualification(person.id, assigningPosition.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{person.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className={`text-sm font-medium ${isQualified ? 'text-indigo-900' : 'text-gray-700'}`}>
                        {person.name}
                      </span>
                      {isQualified && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <p className="text-xs text-gray-500">{t('bulkAssignDesc', lang)}</p>
          {state.people.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('noPeopleOrPositions', lang)}</p>
          ) : (() => {
            const regularPositions = state.positions.filter(p => !p.isOnCall);
            const onCallPositions = state.positions.filter(p => p.isOnCall);

            const renderTable = (positions: typeof state.positions, headerBg: string) => (
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${headerBg} text-white`}>
                      <th className={`sticky left-0 ${headerBg} px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide min-w-[140px]`}>
                        {t('name', lang)}
                      </th>
                      {positions.map(pos => (
                        <th key={pos.id} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide min-w-[110px]">
                          {pos.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.people.map((person, i) => (
                      <tr key={person.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="sticky left-0 bg-inherit px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-indigo-600">{person.name.charAt(0).toUpperCase()}</span>
                            </div>
                            {person.name}
                          </div>
                        </td>
                        {positions.map(pos => {
                          const isQualified = person.qualifiedPositions.includes(pos.id);
                          return (
                            <td key={pos.id} className={`px-4 py-3 text-center transition-colors ${isQualified ? 'bg-indigo-50' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isQualified}
                                onChange={() => onToggleQualification(person.id, pos.id)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('currentPositions', lang)}</p>
                    {renderTable(regularPositions, 'bg-slate-700')}
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
  );
}
