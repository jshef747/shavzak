import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { langFromDir, t } from '../../utils/i18n';
import { computeCellStatus } from '../../utils/validation';
import { Button } from '../ui/Button';
import type { AppState, Assignment, CellAddress } from '../../types';
import type { SwapRequest } from '../../types';

interface Props {
  state: AppState;
  assignments: Assignment[];
  myPersonId?: string;
  incomingRequests: SwapRequest[];
  outgoingRequests: SwapRequest[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

function hasConstraintWarning(
  req: SwapRequest,
  assignments: Assignment[],
  state: AppState,
): boolean {
  const requesterPerson = state.people.find(p => p.id === req.requester_person_id);
  const targetPerson = state.people.find(p => p.id === req.target_person_id);
  if (!requesterPerson || !targetPerson) return false;

  const requesterCell: CellAddress = {
    date: req.requester_date,
    shiftId: req.requester_shift_id,
    positionId: req.requester_position_id,
  };

  // Check if target can take requester's cell
  const simA = assignments.filter(a =>
    !(a.personId === req.requester_person_id && a.date === req.requester_date &&
      a.shiftId === req.requester_shift_id && a.positionId === req.requester_position_id)
  );
  const targetInRequesterCell = computeCellStatus(
    requesterCell, req.target_person_id, simA, targetPerson,
    state.shifts, req.requester_date, state.minBreakHours, state.homeGroups, [], state.positions
  );
  if (!['valid', 'empty', 'oncall-short-break'].includes(targetInRequesterCell)) return true;

  // If requester has a target cell, check if requester can take it
  if (req.target_date && req.target_shift_id && req.target_position_id) {
    const targetCell: CellAddress = {
      date: req.target_date,
      shiftId: req.target_shift_id,
      positionId: req.target_position_id,
    };
    const simB = assignments.filter(a =>
      !(a.personId === req.target_person_id && a.date === req.target_date &&
        a.shiftId === req.target_shift_id && a.positionId === req.target_position_id)
    );
    const requesterInTargetCell = computeCellStatus(
      targetCell, req.requester_person_id, simB, requesterPerson,
      state.shifts, req.requester_date, state.minBreakHours, state.homeGroups, [], state.positions
    );
    if (!['valid', 'empty', 'oncall-short-break'].includes(requesterInTargetCell)) return true;
  }

  return false;
}

interface SwapCardProps {
  req: SwapRequest;
  state: AppState;
  assignments: Assignment[];
  isIncoming: boolean;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
}

function SwapCard({ req, state, assignments, isIncoming, onApprove, onReject, onCancel }: SwapCardProps) {
  const lang = langFromDir(state.dir);
  const locale = state.dir === 'rtl' ? heLocale : undefined;
  const [loading, setLoading] = useState(false);

  const warning = hasConstraintWarning(req, assignments, state);
  const requesterPerson = state.people.find(p => p.id === req.requester_person_id);
  const targetPerson = state.people.find(p => p.id === req.target_person_id);

  const requesterShift = state.shifts.find(s => s.id === req.requester_shift_id);
  const requesterPos = state.positions.find(p => p.id === req.requester_position_id);
  const targetShift = req.target_shift_id ? state.shifts.find(s => s.id === req.target_shift_id) : null;
  const targetPos = req.target_position_id ? state.positions.find(p => p.id === req.target_position_id) : null;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
  };

  async function handle(action: (id: string) => Promise<void>) {
    setLoading(true);
    try { await action(req.id); } finally { setLoading(false); }
  }

  return (
    <div className={`p-3 rounded-lg border text-sm space-y-2 ${
      warning
        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
    }`}>
      {/* Header: who wants to swap with whom */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-gray-800 dark:text-slate-200">
          {isIncoming ? requesterPerson?.name : targetPerson?.name}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColors[req.status]}`}>
          {req.status}
        </span>
      </div>

      {/* Cell details */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-slate-400">
        <div>
          <div className="font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wide text-[10px] mb-0.5">
            {t('swapYourCell', lang)}
          </div>
          <div>{format(parseISO(req.requester_date), 'EEE, MMM d', { locale })}</div>
          <div>{requesterShift?.name} · {requesterPos?.name}</div>
        </div>
        <div>
          <div className="font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wide text-[10px] mb-0.5">
            {t('swapTargetCell', lang)}
          </div>
          {req.target_date ? (
            <>
              <div>{format(parseISO(req.target_date), 'EEE, MMM d', { locale })}</div>
              <div>{targetShift?.name} · {targetPos?.name}</div>
            </>
          ) : (
            <div>{t('swapUnscheduled', lang)}</div>
          )}
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{t('swapConstraintWarning', lang)}</span>
        </div>
      )}

      {/* Actions */}
      {req.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          {isIncoming && onApprove && onReject ? (
            <>
              <Button variant="primary" size="sm" onClick={() => handle(onApprove)} disabled={loading}>
                {t('approveSwap', lang)}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handle(onReject)} disabled={loading}>
                {t('rejectSwap', lang)}
              </Button>
            </>
          ) : !isIncoming && onCancel ? (
            <Button variant="secondary" size="sm" onClick={() => handle(onCancel)} disabled={loading}>
              {t('cancelSwap', lang)}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function SwapRequestPanel({
  state, assignments,
  incomingRequests, outgoingRequests,
  onApprove, onReject, onCancel,
}: Props) {
  const lang = langFromDir(state.dir);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  const pendingIncoming = incomingRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Panel header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-slate-700">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
          {t('swapRequests', lang)}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`relative text-xs px-3 py-1 rounded-full transition-colors duration-150 ${
              activeTab === 'incoming'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            {t('incomingSwaps', lang)}
            {pendingIncoming > 0 && (
              <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pendingIncoming}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`text-xs px-3 py-1 rounded-full transition-colors duration-150 ${
              activeTab === 'outgoing'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            {t('outgoingSwaps', lang)}
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className="p-4 max-h-60 overflow-y-auto space-y-2">
        {activeTab === 'incoming' ? (
          incomingRequests.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">
              {t('noIncomingSwaps', lang)}
            </p>
          ) : (
            incomingRequests.map(req => (
              <SwapCard
                key={req.id}
                req={req}
                state={state}
                assignments={assignments}
                isIncoming={true}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))
          )
        ) : (
          outgoingRequests.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">
              {t('noOutgoingSwaps', lang)}
            </p>
          ) : (
            outgoingRequests.map(req => (
              <SwapCard
                key={req.id}
                req={req}
                state={state}
                assignments={assignments}
                isIncoming={false}
                onCancel={onCancel}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}
