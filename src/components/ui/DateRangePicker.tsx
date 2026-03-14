import { useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, format, isSameDay, isWithinInterval,
  parseISO, isAfter, isBefore, startOfToday,
} from 'date-fns';
import { he as heLocale } from 'date-fns/locale';
import { langFromDir, t, DAY_HEADERS_HE } from '../../utils/i18n';

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
  dir?: 'ltr' | 'rtl';
  minDate?: string;
  maxDate?: string;
}

const DAY_HEADERS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, dir = 'ltr', minDate, maxDate }: Props) {
  const lang = langFromDir(dir);
  const locale = dir === 'rtl' ? heLocale : undefined;
  const dayHeaders = dir === 'rtl' ? DAY_HEADERS_HE : DAY_HEADERS_EN;

  const today = startOfToday();
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (startDate) return startOfMonth(parseISO(startDate));
    return startOfMonth(today);
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  // Build calendar grid: all days in viewMonth + leading/trailing blanks
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart); // 0=Sun

  function isDayOutOfRange(day: Date): boolean {
    const iso = format(day, 'yyyy-MM-dd');
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  }

  function handleDayClick(day: Date) {
    if (isDayOutOfRange(day)) return;
    const iso = format(day, 'yyyy-MM-dd');
    if (!start || (start && end)) {
      // Start fresh: set start only, clear end
      onStartChange(iso);
      onEndChange('');
    } else {
      // start is set, end is not yet
      if (isBefore(day, start)) {
        // Clicked before start → reset to new start
        onStartChange(iso);
        onEndChange('');
      } else if (isSameDay(day, start)) {
        // Clicked same day → clear
        onStartChange('');
        onEndChange('');
      } else {
        onEndChange(iso);
      }
    }
  }

  function isInRange(day: Date): boolean {
    const rangeEnd = end ?? (start && !end ? hoverDate : null);
    if (!start || !rangeEnd) return false;
    const [lo, hi] = isAfter(rangeEnd, start) ? [start, rangeEnd] : [rangeEnd, start];
    return isWithinInterval(day, { start: lo, end: hi });
  }

  function isStart(day: Date) { return !!start && isSameDay(day, start); }
  function isEnd(day: Date) { return !!end && isSameDay(day, end); }
  function isToday(day: Date) { return isSameDay(day, today); }

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label={t('prevMonth', lang)}
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {format(viewMonth, 'MMMM yyyy', { locale })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label={t('nextMonth', lang)}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map(h => (
          <div key={h} className="text-center text-xs font-medium text-gray-400 py-1">{h}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map(day => {
          const outOfRange = isDayOutOfRange(day);
          const inRange = !outOfRange && isInRange(day);
          const dayIsStart = isStart(day);
          const dayIsEnd = isEnd(day);
          const dayIsToday = isToday(day);
          const isSelected = dayIsStart || dayIsEnd;

          return (
            <div
              key={day.toISOString()}
              className={`relative flex items-center justify-center h-8 transition-colors
                ${outOfRange ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                ${inRange && !isSelected ? 'bg-indigo-50' : ''}
                ${dayIsStart ? 'rounded-l-full' : ''}
                ${dayIsEnd ? 'rounded-r-full' : ''}
              `}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => !outOfRange && setHoverDate(day)}
              onMouseLeave={() => setHoverDate(null)}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors
                  ${isSelected ? 'bg-indigo-600 text-white' : ''}
                  ${!isSelected && inRange ? 'text-indigo-700' : ''}
                  ${!isSelected && !inRange && !outOfRange ? 'text-gray-700 hover:bg-gray-100' : ''}
                  ${!isSelected && outOfRange ? 'text-gray-400' : ''}
                  ${dayIsToday && !isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                `}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected range summary */}
      <div className="mt-3 pt-3 border-t flex gap-2 text-xs text-gray-500">
        <div className="flex-1">
          <span className="font-medium text-gray-600">{t('dateStart', lang)}</span>{' '}
          {startDate ? format(parseISO(startDate), 'MMM d, yyyy', { locale }) : <span className="text-gray-300">—</span>}
        </div>
        <div className="flex-1">
          <span className="font-medium text-gray-600">{t('dateEnd', lang)}</span>{' '}
          {endDate ? format(parseISO(endDate), 'MMM d, yyyy', { locale }) : <span className="text-gray-300">—</span>}
        </div>
      </div>
    </div>
  );
}
