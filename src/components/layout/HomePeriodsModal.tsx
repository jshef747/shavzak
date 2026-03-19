import { useState } from 'react';
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
  onDeletePeriod: (periodId: string) => void;
}

export function HomePeriodsModal({ open, onClose, state, onAddPeriod, onDeletePeriod }: Props) {
  const lang = langFromDir(state.dir);
  const locale = state.dir === 'rtl' ? heLocale : undefined;

  const [newGroupId, setNewGroupId] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string | null>(null);

  const periods = state.homeGroupPeriods ?? [];

  function formatDate(iso: string) {
    try { return format(parseISO(iso), 'dd/MM/yyyy', { locale }); } catch { return iso; }
  }

  function groupName(groupId: string) {
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

  const canAdd = !!newGroupId && !!newStart && !!newEnd && newEnd >= newStart;

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
                  <th className="px-3 py-2 text-start  font-semibold">{t('groupLabel', lang)}</th>
                  <th className="px-3 py-2 text-start  font-semibold">{t('departure', lang)}</th>
                  <th className="px-3 py-2 text-start  font-semibold">{t('returnDate', lang)}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {[...periods]
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                  .map((period: HomeGroupPeriod) => (
                    <tr key={period.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{groupName(period.groupId)}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(period.startDate)}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(period.endDate)}</td>
                      <td className="px-3 py-2 text-end ">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setPendingDeletePeriodId(period.id)}
                        >
                          {t('delete', lang)}
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add period form */}
        {state.homeGroups.length > 0 ? (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('addPeriod', lang)}</p>
            {/* Group selector */}
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
            {/* Date range picker — no min/max restriction, periods are global */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <DateRangePicker
                startDate={newStart}
                endDate={newEnd}
                onStartChange={setNewStart}
                onEndChange={setNewEnd}
                dir={state.dir}
              />
            </div>
            <div className="flex justify-end ">
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
