import type { AppState, Assignment, HomeGroupPeriod } from '../../types';
import type { AutoAssignResult } from '../../utils/autoAssign';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { langFromDir, t } from '../../utils/i18n';
import { PreviewScheduleView } from '../schedule/PreviewScheduleView';

interface Props {
  open: boolean;
  onClose: () => void;
  result: AutoAssignResult | null;
  reassign: 'partial' | 'full' | null;
  state: AppState;
  dates: string[];
  baseAssignments: Assignment[];
  homeGroupPeriods: HomeGroupPeriod[];
  onConfirmReassign: () => void;
  onRequestReassign: (mode: 'partial' | 'full') => void;
  onApply: () => void;
}

export function AutoAssignModal({ open, onClose, result, reassign, state, dates, baseAssignments, homeGroupPeriods, onConfirmReassign, onRequestReassign, onApply }: Props) {
  const lang = langFromDir(state.dir);

  if (!open) return null;

  // Confirmation screen: shown when reassign mode is set and result not yet computed
  if (reassign && !result) {
    const bodyKey = reassign === 'full' ? 'autoAssignReassignBodyFull' : 'autoAssignReassignBodyPartial';
    return (
      <Modal open={open} onClose={onClose} title={t('autoAssignReassignTitle', lang)} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {t(bodyKey, lang)}
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t ">
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
  const alreadyAssigned = baseAssignments.length;
  const nothingNew = proposed.length === 0 && skipped.length === 0;

  // For the preview, show: existing assignments (if adding, not replacing) + proposed
  const baseForPreview = reassign ? [] : baseAssignments;
  const mergedAssignments = [...baseForPreview, ...proposed];

  function handleApply() {
    onApply();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('autoAssignTitle', lang)}
      size="xl"
    >
      <div className="space-y-4">
        {nothingNew ? (
          <div className="text-center py-6 text-slate-500 space-y-4">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base font-medium">
                {alreadyAssigned > 0
                  ? (lang === 'he' ? 'אין תאים פנויים לשיבוץ' : 'No empty cells to assign')
                  : (lang === 'he' ? 'כל התאים כבר מאויישים' : 'All cells are already filled')}
              </p>
              {alreadyAssigned > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'he'
                    ? `${alreadyAssigned} שיבוצים קיימים`
                    : `${alreadyAssigned} existing assignments`}
                </p>
              )}
            </div>
            {alreadyAssigned > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2 text-start">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  {lang === 'he' ? 'שיבוץ מחדש' : 'Reassign'}
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onRequestReassign('partial')}>
                    {lang === 'he' ? 'מלא תאים ריקים בלבד (החלף חלקית)' : 'Fill gaps only (partial reassign)'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onRequestReassign('full')}>
                    {lang === 'he' ? 'נקה הכל ושבץ מחדש' : 'Clear all & reassign from scratch'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div className="flex gap-2 flex-wrap">
              {proposed.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {proposed.length} {lang === 'he' ? 'שיבוצים חדשים' : 'new assignments'}
                </span>
              )}
              {alreadyAssigned > 0 && !reassign && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m-6 4h12" />
                  </svg>
                  {alreadyAssigned} {lang === 'he' ? 'קיימים (לא שונו)' : 'existing (kept)'}
                </span>
              )}
              {skipped.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {skipped.length} {lang === 'he' ? 'לא ניתן למלא' : 'could not fill'}
                </span>
              )}
            </div>

            {/* Full schedule preview */}
            <PreviewScheduleView
              state={state}
              dates={dates}
              mergedAssignments={mergedAssignments}
              baseAssignments={baseForPreview}
              skippedCells={skipped}
              homeGroupPeriods={homeGroupPeriods}
            />
          </>
        )}

        {/* Footer actions */}
        <div className="flex justify-between gap-2 pt-2 border-t">
          <div className="flex gap-2">
            {!nothingNew && !reassign && alreadyAssigned > 0 && (
              <Button variant="danger" size="sm" onClick={() => onRequestReassign('full')}>
                {lang === 'he' ? 'שבץ מחדש' : 'Reassign all'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
      </div>
    </Modal>
  );
}
