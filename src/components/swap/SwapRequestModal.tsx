import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { langFromDir, t } from '../../utils/i18n';
import { computeCellStatus } from '../../utils/validation';
import type { AppState, Assignment, CellAddress } from '../../types';
import type { NewSwapRequest } from '../../hooks/useSwapRequests';

interface Props {
  open: boolean;
  onClose: () => void;
  state: AppState;
  assignments: Assignment[];
  myPersonId: string;
  myCell: CellAddress;  // the cell the user clicked "Request Swap" on
  boardId: string;
  onSubmit: (req: NewSwapRequest) => Promise<void>;
}

export function SwapRequestModal({
  open, onClose, state, assignments, myPersonId, myCell, boardId, onSubmit,
}: Props) {
  const lang = langFromDir(state.dir);
  const [targetPersonId, setTargetPersonId] = useState('');
  const [loading, setLoading] = useState(false);

  const myShift = state.shifts.find(s => s.id === myCell.shiftId);
  const myPosition = state.positions.find(p => p.id === myCell.positionId);
  const myPerson = state.people.find(p => p.id === myPersonId);
  const locale = state.dir === 'rtl' ? heLocale : undefined;
  const myDateLabel = format(parseISO(myCell.date), 'EEE, MMM d', { locale });

  // Find target person's current assignment (if any)
  const targetAssignment = useMemo(() => {
    if (!targetPersonId) return null;
    return assignments.find(a => a.personId === targetPersonId && a.date === myCell.date && a.shiftId === myCell.shiftId) ?? null;
  }, [targetPersonId, assignments, myCell]);

  // Check for constraint warnings on either side
  const hasWarning = useMemo(() => {
    if (!targetPersonId) return false;
    const targetPerson = state.people.find(p => p.id === targetPersonId);
    if (!targetPerson) return false;
    const refDate = myCell.date;

    // Check if target person can take my cell
    const simAssignments = assignments.filter(a =>
      !(a.personId === myPersonId && a.date === myCell.date && a.shiftId === myCell.shiftId && a.positionId === myCell.positionId)
    );
    const targetInMyCell = computeCellStatus(
      myCell, targetPersonId, simAssignments, targetPerson,
      state.shifts, refDate, state.minBreakHours, state.homeGroups, [], state.positions
    );
    if (!['valid', 'empty', 'oncall-short-break'].includes(targetInMyCell)) return true;

    // If target is assigned somewhere, check if my person can take their cell
    if (targetAssignment && myPerson) {
      const targetCell: CellAddress = {
        date: targetAssignment.date,
        shiftId: targetAssignment.shiftId,
        positionId: targetAssignment.positionId,
      };
      const simAssignments2 = assignments.filter(a =>
        !(a.personId === targetPersonId && a.date === targetAssignment.date && a.shiftId === targetAssignment.shiftId && a.positionId === targetAssignment.positionId)
      );
      const myInTargetCell = computeCellStatus(
        targetCell, myPersonId, simAssignments2, myPerson,
        state.shifts, refDate, state.minBreakHours, state.homeGroups, [], state.positions
      );
      if (!['valid', 'empty', 'oncall-short-break'].includes(myInTargetCell)) return true;
    }

    return false;
  }, [targetPersonId, targetAssignment, assignments, myCell, myPersonId, myPerson, state]);

  // Other people in the schedule (excluding myself)
  const otherPeople = state.people.filter(p => p.id !== myPersonId);

  async function handleSubmit() {
    if (!targetPersonId) return;
    setLoading(true);
    try {
      await onSubmit({
        board_id: boardId,
        requester_person_id: myPersonId,
        requester_date: myCell.date,
        requester_shift_id: myCell.shiftId,
        requester_position_id: myCell.positionId,
        target_person_id: targetPersonId,
        target_date: targetAssignment?.date ?? null,
        target_shift_id: targetAssignment?.shiftId ?? null,
        target_position_id: targetAssignment?.positionId ?? null,
      });
      setTargetPersonId('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('swapRequestTitle', lang)} size="sm">
      <div className="space-y-5">
        {/* My cell summary */}
        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm space-y-1">
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{t('swapYourCell', lang)}</div>
          <div className="font-semibold text-gray-800 dark:text-slate-200">{myDateLabel}</div>
          <div className="text-gray-600 dark:text-slate-400">{myShift?.name} · {myPosition?.name}</div>
        </div>

        {/* Target person picker */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            {t('swapTargetPerson', lang)}
          </label>
          <select
            value={targetPersonId}
            onChange={e => setTargetPersonId(e.target.value)}
            className="w-full text-sm rounded-lg px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{lang === 'he' ? 'בחר אדם…' : 'Select a person…'}</option>
            {otherPeople.map(p => {
              const theirAssignment = assignments.find(a => a.personId === p.id && a.date === myCell.date && a.shiftId === myCell.shiftId);
              const label = theirAssignment
                ? `${p.name} (${state.positions.find(pos => pos.id === theirAssignment.positionId)?.name ?? ''})`
                : `${p.name} – ${t('swapUnscheduled', lang)}`;
              return <option key={p.id} value={p.id}>{label}</option>;
            })}
          </select>
        </div>

        {/* Target assignment info */}
        {targetPersonId && (
          <div className={`p-3 border rounded-lg text-sm space-y-1 ${
            hasWarning
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
              : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700'
          }`}>
            <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t('swapTargetCell', lang)}</div>
            {targetAssignment ? (
              <>
                <div className="font-medium text-gray-800 dark:text-slate-200">
                  {format(parseISO(targetAssignment.date), 'EEE, MMM d', { locale })}
                </div>
                <div className="text-gray-600 dark:text-slate-400">
                  {state.shifts.find(s => s.id === targetAssignment.shiftId)?.name} · {state.positions.find(p => p.id === targetAssignment.positionId)?.name}
                </div>
              </>
            ) : (
              <div className="text-gray-600 dark:text-slate-400">{t('swapUnscheduled', lang)}</div>
            )}
            {hasWarning && (
              <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 text-xs mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{t('swapConstraintWarning', lang)}</span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="primary"
          disabled={!targetPersonId || loading}
          onClick={handleSubmit}
          className="w-full justify-center"
        >
          {loading ? '...' : t('swapSubmit', lang)}
        </Button>
      </div>
    </Modal>
  );
}
