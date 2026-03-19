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
  onApply: () => void;
}

export function AutoAssignModal({ open, onClose, result, reassign, state, dates, baseAssignments, homeGroupPeriods, onConfirmReassign, onApply }: Props) {
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
  const allFilled = proposed.length === 0 && skipped.length === 0;

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
            <div className="flex gap-3 flex-wrap ">
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
                  {skipped.length} {lang === 'he' ? 'תאים דולגו' : 'cells could not be filled'}
                </span>
              )}
            </div>

            {/* Full schedule preview */}
            <PreviewScheduleView
              state={state}
              dates={dates}
              mergedAssignments={mergedAssignments}
              skippedCells={skipped}
              homeGroupPeriods={homeGroupPeriods}
            />
          </>
        )}

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-2 border-t ">
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
