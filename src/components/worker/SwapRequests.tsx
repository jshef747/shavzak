import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Check, X, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useCloudSync } from '../../hooks/useCloudSync';
import type { AppState, ShiftSwap } from '../../types';
import type { Lang } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  boardId: string;
  /** The person_id of the current worker (null if admin viewing). */
  workerPersonId: string | null;
  state: AppState;
  /** Active schedule id to pre-fill when requesting a swap. */
  activeScheduleId: string | null;
  lang: Lang;
}

const STATUS_LABEL: Record<ShiftSwap['status'], { en: string; he: string; color: string }> = {
  pending:  { en: 'Pending',  he: 'ממתין',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  accepted: { en: 'Accepted', he: 'אושר',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  rejected: { en: 'Rejected', he: 'נדחה',   color: 'text-red-600 bg-red-50 border-red-200' },
};

export function SwapRequests({ open, onClose, boardId, workerPersonId, state, activeScheduleId, lang }: Props) {
  const { fetchSwaps, requestSwap, respondToSwap } = useCloudSync();
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request form state
  const [reqDate, setReqDate]       = useState('');
  const [reqShiftId, setReqShiftId] = useState('');
  const [reqPosId, setReqPosId]     = useState('');
  const [reqTarget, setReqTarget]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await fetchSwaps(boardId);
    setSwaps(rows);
    setLoading(false);
  }, [boardId, fetchSwaps]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleRequest() {
    if (!workerPersonId || !activeScheduleId) return;
    setError(null);
    const err = await requestSwap({
      boardId,
      scheduleId:         activeScheduleId,
      shiftId:            reqShiftId,
      date:               reqDate,
      positionId:         reqPosId,
      requesterPersonId:  workerPersonId,
      targetPersonId:     reqTarget,
    });
    if (err) { setError(err); return; }
    setRequestOpen(false);
    setReqDate(''); setReqShiftId(''); setReqPosId(''); setReqTarget('');
    load();
  }

  async function handleRespond(id: string, status: 'accepted' | 'rejected') {
    setError(null);
    const err = await respondToSwap(id, status);
    if (err) { setError(err); return; }
    load();
  }

  function personName(personId: string) {
    return state.people.find(p => p.id === personId)?.name ?? personId;
  }

  function shiftName(shiftId: string) {
    return state.shifts.find(s => s.id === shiftId)?.name ?? shiftId;
  }

  function posName(posId: string) {
    return state.positions.find(p => p.id === posId)?.name ?? posId;
  }

  const isHe = lang === 'he';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isHe ? 'החלפות משמרת' : 'Shift Swaps'}
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Request new swap button (workers only) */}
        {workerPersonId && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setRequestOpen(true)}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isHe ? 'בקש החלפה' : 'Request Swap'}
            </Button>
          </div>
        )}

        {/* Swap list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : swaps.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {isHe ? 'אין בקשות החלפה.' : 'No swap requests yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {swaps.map(swap => {
              const statusInfo = STATUS_LABEL[swap.status];
              const isTarget = swap.targetPersonId === workerPersonId;
              return (
                <li
                  key={swap.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {personName(swap.requesterPersonId)}
                      <span className="mx-1.5 text-gray-400">→</span>
                      {personName(swap.targetPersonId)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {swap.date} · {shiftName(swap.shiftId)} · {posName(swap.positionId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                      {isHe ? statusInfo.he : statusInfo.en}
                    </span>
                    {/* Target worker can respond to pending swaps */}
                    {isTarget && swap.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleRespond(swap.id, 'accepted')}
                          className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                          title={isHe ? 'אשר' : 'Accept'}
                        >
                          <Check className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => handleRespond(swap.id, 'rejected')}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title={isHe ? 'דחה' : 'Reject'}
                        >
                          <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </>
                    )}
                    {swap.status === 'pending' && !isTarget && (
                      <Clock className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Request swap sub-modal */}
      {requestOpen && (
        <Modal
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          title={isHe ? 'בקשת החלפה חדשה' : 'New Swap Request'}
          size="sm"
        >
          <div className="space-y-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'תאריך' : 'Date'}
              </label>
              <input
                type="date"
                value={reqDate}
                onChange={e => setReqDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'משמרת' : 'Shift'}
              </label>
              <select
                value={reqShiftId}
                onChange={e => setReqShiftId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isHe ? 'בחר משמרת' : 'Select shift'}</option>
                {state.shifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'תפקיד' : 'Position'}
              </label>
              <select
                value={reqPosId}
                onChange={e => setReqPosId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isHe ? 'בחר תפקיד' : 'Select position'}</option>
                {state.positions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Target person */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {isHe ? 'החלף עם' : 'Swap with'}
              </label>
              <select
                value={reqTarget}
                onChange={e => setReqTarget(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isHe ? 'בחר חבר צוות' : 'Select team member'}</option>
                {state.people
                  .filter(p => p.id !== workerPersonId)
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setRequestOpen(false)}>
                {isHe ? 'ביטול' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!reqDate || !reqShiftId || !reqPosId || !reqTarget}
                onClick={handleRequest}
              >
                {isHe ? 'שלח בקשה' : 'Send Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
