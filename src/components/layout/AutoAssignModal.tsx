import { useState } from 'react';
import type { AppState, Assignment, Shift } from '../../types';
import type { AutoAssignResult, SkipReason } from '../../utils/autoAssign';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  result: AutoAssignResult | null;
  reassign: boolean;
  state: AppState;
  onConfirmReassign: () => void;
  onApply: () => void;
}

function personName(personId: string, state: AppState): string {
  return state.people.find(p => p.id === personId)?.name ?? personId;
}

function shiftName(shiftId: string, shifts: Shift[]): string {
  return shifts.find(s => s.id === shiftId)?.name ?? shiftId;
}

function positionName(positionId: string, state: AppState): string {
  return state.positions.find(p => p.id === positionId)?.name ?? positionId;
}

function formatDate(dateStr: string, lang: 'en' | 'he'): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const SKIP_REASON_KEY: Record<SkipReason, { reason: string; suggestion: string }> = {
  'no-qualified': { reason: 'skipNoQualified', suggestion: 'suggestNoQualified' },
  'all-unavailable': { reason: 'skipAllUnavailable', suggestion: 'suggestInvalid' },
  'all-break': { reason: 'skipAllBreak', suggestion: 'suggestBreak' },
  'all-constraint': { reason: 'skipAllConstraint', suggestion: 'suggestConstraint' },
  'all-invalid': { reason: 'skipAllInvalid', suggestion: 'suggestInvalid' },
};

export function AutoAssignModal({ open, onClose, result, reassign, state, onConfirmReassign, onApply }: Props) {
  const [skippedExpanded, setSkippedExpanded] = useState(false);
  const lang = langFromDir(state.dir);

  if (!open) return null;

  // Confirmation screen: shown when reassign=true and result not yet computed
  if (reassign && !result) {
    return (
      <Modal open={open} onClose={onClose} title={t('autoAssignReassignTitle', lang)} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('autoAssignReassignBody', lang)}
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t rtl:flex-row-reverse">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('cancel', lang)}
            </Button>
            <Button variant="danger" size="sm" onClick={onConfirmReassign}>
              {t('autoAssignReassignBtn', lang)}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (!result) return null;

  const { proposed, skipped } = result;
  const allFilled = proposed.length === 0 && skipped.length === 0;

  function groupByPerson(assignments: Assignment[]): Map<string, Assignment[]> {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (!map.has(a.personId)) map.set(a.personId, []);
      map.get(a.personId)!.push(a);
    }
    return map;
  }

  const byPerson = groupByPerson(proposed);

  function handleApply() {
    onApply();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('autoAssignTitle', lang)}
      size="lg"
    >
      <div className="space-y-4">
        {allFilled ? (
          <div className="text-center py-8 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base font-medium">{t('autoAssignAllFilled', lang)}</p>
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div className="flex gap-3 flex-wrap rtl:flex-row-reverse">
              {proposed.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {proposed.length} {lang === 'he' ? 'שיבוצים מוצעים' : 'to assign'}
                </span>
              )}
              {skipped.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {skipped.length} {lang === 'he' ? 'תאים דולגו' : 'skipped'}
                </span>
              )}
            </div>

            {/* Proposed assignments */}
            {proposed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 rtl:text-right">
                  {t('autoAssignProposedHeader', lang)}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-start text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {lang === 'he' ? 'אדם' : 'Person'}
                          </th>
                          <th className="px-3 py-2 text-start text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {lang === 'he' ? 'תאריך' : 'Date'}
                          </th>
                          <th className="px-3 py-2 text-start text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {lang === 'he' ? 'משמרת' : 'Shift'}
                          </th>
                          <th className="px-3 py-2 text-start text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {lang === 'he' ? 'תפקיד' : 'Position'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {proposed.map((a, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-800 rtl:text-right">
                              {personName(a.personId, state)}
                            </td>
                            <td className="px-3 py-2 text-slate-600 rtl:text-right">
                              {formatDate(a.date, lang)}
                            </td>
                            <td className="px-3 py-2 text-slate-600 rtl:text-right">
                              {shiftName(a.shiftId, state.shifts)}
                            </td>
                            <td className="px-3 py-2 text-slate-600 rtl:text-right">
                              {positionName(a.positionId, state)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Per-person hours summary */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(byPerson.entries()).map(([pid, assigns]) => (
                    <span key={pid} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {personName(pid, state)}: +{assigns.length} {lang === 'he' ? 'משמרות' : 'shifts'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped cells */}
            {skipped.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-900 rtl:flex-row-reverse"
                  aria-expanded={skippedExpanded}
                  onClick={() => setSkippedExpanded(v => !v)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 transition-transform ${skippedExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {t('autoAssignSkippedHeader', lang)} ({skipped.length})
                </button>

                {skippedExpanded && (
                  <div className="mt-2 border border-amber-200 rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-amber-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-start text-xs font-medium text-amber-700 uppercase tracking-wide">
                              {lang === 'he' ? 'תאריך' : 'Date'}
                            </th>
                            <th className="px-3 py-2 text-start text-xs font-medium text-amber-700 uppercase tracking-wide">
                              {lang === 'he' ? 'משמרת' : 'Shift'}
                            </th>
                            <th className="px-3 py-2 text-start text-xs font-medium text-amber-700 uppercase tracking-wide">
                              {lang === 'he' ? 'תפקיד' : 'Position'}
                            </th>
                            <th className="px-3 py-2 text-start text-xs font-medium text-amber-700 uppercase tracking-wide">
                              {lang === 'he' ? 'סיבה / הצעה' : 'Reason / Suggestion'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {skipped.map((s, i) => {
                            const keys = SKIP_REASON_KEY[s.reasonKey];
                            return (
                              <tr key={i} className="hover:bg-amber-50/50">
                                <td className="px-3 py-2 text-slate-600 rtl:text-right">
                                  {formatDate(s.cell.date, lang)}
                                </td>
                                <td className="px-3 py-2 text-slate-600 rtl:text-right">
                                  {shiftName(s.cell.shiftId, state.shifts)}
                                </td>
                                <td className="px-3 py-2 text-slate-600 rtl:text-right">
                                  {positionName(s.cell.positionId, state)}
                                </td>
                                <td className="px-3 py-2 rtl:text-right">
                                  <span className="block text-amber-800 font-medium">
                                    {t(keys.reason, lang)}
                                  </span>
                                  <span className="block text-slate-500 text-xs mt-0.5">
                                    💡 {t(keys.suggestion, lang)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-2 border-t rtl:flex-row-reverse">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('cancel', lang)}
          </Button>
          {proposed.length > 0 && (
            <Button variant="primary" size="sm" onClick={handleApply}>
              {t('autoAssignApply', lang)} ({proposed.length})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
