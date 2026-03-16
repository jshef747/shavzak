import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { AppState, Person, UnavailabilityEntry, DayOfWeek } from '../../types';
import { langFromDir, t, DAY_LABELS_HE } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const DAY_LABELS_EN: { day: DayOfWeek; label: string }[] = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

interface Props {
  person: Person;
  state: AppState;
  dates: string[];
  onToggleQualification: (personId: string, positionId: string) => void;
  onToggleUnavailability: (personId: string, entry: UnavailabilityEntry) => void;
  onToggleConstraintShift: (personId: string, shiftId: string) => void;
  onToggleConstraintBlockedShift: (personId: string, shiftId: string) => void;
  onToggleConstraintDay: (personId: string, day: DayOfWeek) => void;
  onToggleConstraintBlockedDay: (personId: string, day: DayOfWeek) => void;
  onUpdateConstraintMaxWeek: (personId: string, max: number | null) => void;
  onUpdateConstraintMaxTotal: (personId: string, max: number | null) => void;
  onUpdateConstraintMaxConsecutive: (personId: string, max: number | null) => void;
  onUpdateConstraintMinRest: (personId: string, min: number | null) => void;
  onUpdateForceMinimum: (personId: string, value: boolean) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function PersonEditor({
  person,
  state,
  dates,
  onToggleQualification,
  onToggleUnavailability,
  onToggleConstraintShift,
  onToggleConstraintBlockedShift,
  onToggleConstraintDay,
  onToggleConstraintBlockedDay,
  onUpdateConstraintMaxWeek,
  onUpdateConstraintMaxTotal,
  onUpdateConstraintMaxConsecutive,
  onUpdateConstraintMinRest,
  onUpdateForceMinimum,
  onDelete,
  onClose,
}: Props) {
  const c = person.constraints;
  const lang = langFromDir(state.dir);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const dayLabels: { day: DayOfWeek; label: string }[] = lang === 'he'
    ? DAY_LABELS_HE.map((label, i) => ({ day: i as DayOfWeek, label }))
    : DAY_LABELS_EN;

  function parseMax(val: string): number | null {
    const n = parseInt(val, 10);
    return isNaN(n) || n <= 0 ? null : n;
  }

  return (
    <div className="space-y-5">
      {/* Qualified Positions */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('qualifiedPositions', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('qualifiedDesc', lang)}</p>
          </div>
        </div>
        {state.positions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('noPositionsDefined', lang)}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.positions.map(pos => {
              const qualified = person.qualifiedPositions.includes(pos.id);
              return (
                <button
                  key={pos.id}
                  onClick={() => onToggleQualification(person.id, pos.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    qualified
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {qualified && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {pos.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* One-Time Constraints */}
      {dates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{t('oneTimeConstraints', lang)}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('oneTimeDesc', lang)}</p>
            </div>
          </div>
          <div className="overflow-auto max-h-64 rounded-lg border border-gray-200">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('dateCol', lang)}</th>
                  {state.shifts.map(s => (
                    <th key={s.id} className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dates.map((date, i) => (
                  <tr key={date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div dir="ltr" className="flex flex-col items-start leading-tight">
                        <span className="text-xs font-semibold text-gray-700">{format(parseISO(date), 'EEE')}</span>
                        <span className="text-[10px] text-gray-400">{format(parseISO(date), 'dd/MM')}</span>
                      </div>
                    </td>
                    {state.shifts.map(shift => {
                      const unavail = person.unavailability.some(u => u.date === date && u.shiftId === shift.id);
                      return (
                        <td
                          key={shift.id}
                          className={`px-3 py-2 text-center transition-colors ${unavail ? 'bg-red-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={unavail}
                            onChange={() => onToggleUnavailability(person.id, { date, shiftId: shift.id })}
                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repeating Constraints */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('repeatingConstraints', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('repeatingDesc', lang)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Allowed Shifts */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">{t('allowedShifts', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {state.shifts.map(shift => {
                const active = c?.allowedShiftIds?.includes(shift.id) ?? false;
                return (
                  <button
                    key={shift.id}
                    onClick={() => onToggleConstraintShift(person.id, shift.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    {shift.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocked Shifts */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">{t('blockedShifts', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {state.shifts.map(shift => {
                const active = c?.blockedShiftIds?.includes(shift.id) ?? false;
                return (
                  <button
                    key={shift.id}
                    onClick={() => onToggleConstraintBlockedShift(person.id, shift.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    {shift.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allowed Days */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">{t('allowedDays', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {dayLabels.map(({ day, label }) => {
                const active = c?.allowedDaysOfWeek?.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    onClick={() => onToggleConstraintDay(person.id, day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocked Days */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">{t('blockedDays', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {dayLabels.map(({ day, label }) => {
                const active = c?.blockedDaysOfWeek?.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    onClick={() => onToggleConstraintBlockedDay(person.id, day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Limits */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-3">{t('limitsLabel', lang)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { label: t('maxPerWeek', lang), value: c?.maxShiftsPerWeek ?? '', onChange: (v: string) => onUpdateConstraintMaxWeek(person.id, parseMax(v)) },
                { label: t('maxTotal', lang), value: c?.maxShiftsTotal ?? '', onChange: (v: string) => onUpdateConstraintMaxTotal(person.id, parseMax(v)) },
                { label: t('maxConsecutive', lang), value: c?.maxConsecutiveDays ?? '', onChange: (v: string) => onUpdateConstraintMaxConsecutive(person.id, parseMax(v)) },
                { label: t('minRest', lang), value: c?.minRestDays ?? '', onChange: (v: string) => onUpdateConstraintMinRest(person.id, parseMax(v)) },
              ] as const).map(({ label, value, onChange }) => (
                <div key={label} className="flex flex-col gap-1 items-center text-center justify-between">
                  <label className="text-[11px] font-medium text-gray-500 leading-tight">{label}</label>
                  <input
                    type="number"
                    min={1}
                    placeholder={t('noLimit', lang)}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-shadow"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Force Minimum Duty */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{t('forceMinimumLabel', lang)}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('forceMinimumDesc', lang)}</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={!!person.forceMinimum}
            onClick={() => onUpdateForceMinimum(person.id, !person.forceMinimum)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
              person.forceMinimum ? 'bg-amber-400' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              person.forceMinimum ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-900">{t('dangerZone', lang)}</h3>
            <p className="text-xs text-red-600/70 mt-0.5">{t('dangerZoneDesc', lang)}</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t('deletePerson', lang)}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('close', lang)}</Button>
        </div>
      </div>
      <ConfirmDialog
        open={deleteDialogOpen}
        message={t('deletePersonConfirm', lang)}
        onConfirm={() => { onDelete(person.id); setDeleteDialogOpen(false); onClose(); }}
        onCancel={() => setDeleteDialogOpen(false)}
        lang={lang}
      />
    </div>
  );
}
