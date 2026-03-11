import { format, parseISO } from 'date-fns';
import type { AppState, Person, UnavailabilityEntry, DayOfWeek } from '../../types';
import { langFromDir, t, DAY_LABELS_HE } from '../../utils/i18n';
import { Button } from '../ui/Button';

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
  onDelete,
  onClose,
}: Props) {
  const c = person.constraints;
  const lang = langFromDir(state.dir);

  // Build day labels array: same index = same day of week
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
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('qualifiedPositions', lang)}</h4>
        {state.positions.length === 0 && <p className="text-sm text-gray-400">{t('noPositionsDefined', lang)}</p>}
        <div className="flex flex-wrap gap-2">
          {state.positions.map(pos => {
            const qualified = person.qualifiedPositions.includes(pos.id);
            return (
              <button
                key={pos.id}
                onClick={() => onToggleQualification(person.id, pos.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  qualified
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              >
                {pos.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* One-Time Constraints */}
      {dates.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-0.5">{t('oneTimeConstraints', lang)}</h4>
          <p className="text-xs text-gray-400 mb-2">{t('oneTimeConstraintsHint', lang)}</p>
          <div className="overflow-auto max-h-64 border rounded">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">{t('dateCol', lang)}</th>
                  {state.shifts.map(s => (
                    <th key={s.id} className="px-3 py-2 text-center">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map(date => (
                  <tr key={date} className="border-t">
                    <td className="px-3 py-1 whitespace-nowrap">
                      <span className="font-medium">{format(parseISO(date), 'EEE')}</span>
                      <span dir="ltr" className="text-gray-400 ml-1">{date}</span>
                    </td>
                    {state.shifts.map(shift => {
                      const unavail = person.unavailability.some(u => u.date === date && u.shiftId === shift.id);
                      return (
                        <td
                          key={shift.id}
                          className={`px-3 py-1 text-center transition-colors ${unavail ? 'bg-red-100' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={unavail}
                            onChange={() => onToggleUnavailability(person.id, { date, shiftId: shift.id })}
                            className="accent-red-500"
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
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('repeatingConstraints', lang)}</h4>
        <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
          {/* Allowed Shifts (whitelist) */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">{t('allowedShifts', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {state.shifts.map(shift => {
                const active = c?.allowedShiftIds?.includes(shift.id) ?? false;
                return (
                  <button
                    key={shift.id}
                    onClick={() => onToggleConstraintShift(person.id, shift.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-700 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {shift.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocked Shifts (blacklist) */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">{t('blockedShifts', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {state.shifts.map(shift => {
                const active = c?.blockedShiftIds?.includes(shift.id) ?? false;
                return (
                  <button
                    key={shift.id}
                    onClick={() => onToggleConstraintBlockedShift(person.id, shift.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-red-600 border-red-700 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-red-400'
                    }`}
                  >
                    {shift.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allowed Days (whitelist) */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">{t('allowedDays', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {dayLabels.map(({ day, label }) => {
                const active = c?.allowedDaysOfWeek?.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    onClick={() => onToggleConstraintDay(person.id, day)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-700 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blocked Days (blacklist) */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">{t('blockedDays', lang)}</p>
            <div className="flex flex-wrap gap-1.5">
              {dayLabels.map(({ day, label }) => {
                const active = c?.blockedDaysOfWeek?.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    onClick={() => onToggleConstraintBlockedDay(person.id, day)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-red-600 border-red-700 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-red-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max per week */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-44 shrink-0">{t('maxPerWeek', lang)}</label>
            <input
              type="number"
              min={1}
              placeholder={t('noLimit', lang)}
              value={c?.maxShiftsPerWeek ?? ''}
              onChange={e => onUpdateConstraintMaxWeek(person.id, parseMax(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Max total */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-44 shrink-0">{t('maxTotal', lang)}</label>
            <input
              type="number"
              min={1}
              placeholder={t('noLimit', lang)}
              value={c?.maxShiftsTotal ?? ''}
              onChange={e => onUpdateConstraintMaxTotal(person.id, parseMax(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Max consecutive days */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-44 shrink-0">{t('maxConsecutive', lang)}</label>
            <input
              type="number"
              min={1}
              placeholder={t('noLimit', lang)}
              value={c?.maxConsecutiveDays ?? ''}
              onChange={e => onUpdateConstraintMaxConsecutive(person.id, parseMax(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Min rest days */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 w-44 shrink-0">{t('minRest', lang)}</label>
            <input
              type="number"
              min={1}
              placeholder={t('noLimit', lang)}
              value={c?.minRestDays ?? ''}
              onChange={e => onUpdateConstraintMinRest(person.id, parseMax(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between border-t pt-4">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm(t('deletePersonConfirm', lang))) {
              onDelete(person.id);
              onClose();
            }
          }}
        >
          {t('deletePerson', lang)}
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>{t('close', lang)}</Button>
      </div>
    </div>
  );
}
