import { useState } from 'react';
import type { AppState, HomeGroupPeriod, Schedule } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { langFromDir, t } from '../../utils/i18n';
import { format, parseISO } from 'date-fns';
import { he as heLocale } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  state: AppState;
  activeSchedule: Schedule;
  onAddPeriod: (scheduleId: string, groupId: string, startDate: string, endDate: string) => void;
  onDeletePeriod: (scheduleId: string, periodId: string) => void;
}

export function HomePeriodsModal({ open, onClose, state, activeSchedule, onAddPeriod, onDeletePeriod }: Props) {
  const lang = langFromDir(state.dir);
  const locale = state.dir === 'rtl' ? heLocale : undefined;

  const [newGroupId, setNewGroupId] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const periods = activeSchedule.homeGroupPeriods ?? [];

  function formatDate(iso: string) {
    try { return format(parseISO(iso), 'dd/MM/yyyy', { locale }); } catch { return iso; }
  }

  function groupName(groupId: string) {
    return state.homeGroups.find(g => g.id === groupId)?.name ?? groupId;
  }

  function handleAdd() {
    if (!newGroupId || !newStart || !newEnd) return;
    if (newEnd < newStart) return;
    onAddPeriod(activeSchedule.id, newGroupId, newStart, newEnd);
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
                <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 text-start rtl:text-end font-semibold">{t('groupLabel', lang)}</th>
                  <th className="px-3 py-2 text-start rtl:text-end font-semibold">{t('departure', lang)}</th>
                  <th className="px-3 py-2 text-start rtl:text-end font-semibold">{t('returnDate', lang)}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...periods]
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                  .map((period: HomeGroupPeriod) => (
                    <tr key={period.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{groupName(period.groupId)}</td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(period.startDate)}</td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(period.endDate)}</td>
                      <td className="px-3 py-2 text-end rtl:text-start">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (window.confirm(t('deletePeriodConfirm', lang))) {
                              onDeletePeriod(activeSchedule.id, period.id);
                            }
                          }}
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
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('addPeriod', lang)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Group selector */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('groupLabel', lang)}</label>
                <select
                  value={newGroupId}
                  onChange={e => setNewGroupId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">— {t('groupLabel', lang)} —</option>
                  {state.homeGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Departure date */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('departure', lang)}</label>
                <input
                  type="date"
                  value={newStart}
                  min={activeSchedule.startDate}
                  max={activeSchedule.endDate}
                  onChange={e => {
                    setNewStart(e.target.value);
                    if (newEnd && e.target.value > newEnd) setNewEnd(e.target.value);
                  }}
                  className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>

              {/* Return date */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('returnDate', lang)}</label>
                <input
                  type="date"
                  value={newEnd}
                  min={newStart || activeSchedule.startDate}
                  max={activeSchedule.endDate}
                  onChange={e => setNewEnd(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end rtl:justify-start">
              <Button variant="primary" onClick={handleAdd} disabled={!canAdd}>
                {t('addPeriod', lang)}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {lang === 'he'
              ? 'צור קבוצות תחילה בהגדרות → קבוצות'
              : 'Create groups first in Settings → Groups'}
          </p>
        )}
      </div>
    </Modal>
  );
}
