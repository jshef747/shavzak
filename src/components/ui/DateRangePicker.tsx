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

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);

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
      onStartChange(iso);
      onEndChange('');
    } else {
      if (isBefore(day, start)) {
        onStartChange(iso);
        onEndChange('');
      } else if (isSameDay(day, start)) {
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
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150"
          aria-label={t('prevMonth', lang)}
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {format(viewMonth, 'MMMM yyyy', { locale })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150"
          aria-label={t('nextMonth', lang)}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map(h => (
          <div key={h} className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1 uppercase tracking-wide">{h}</div>
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
          const hasEnd = !!end || (!!start && !!hoverDate && !isSameDay(hoverDate, start));

          // Range background: full-width strip with caps on start/end
          const showRangeBg = inRange || isSelected;
          const capStart = dayIsStart && hasEnd;
          const capEnd = dayIsEnd;

          return (
            <div
              key={day.toISOString()}
              className={`relative flex items-center justify-center h-9 cursor-pointer
                ${outOfRange ? 'opacity-25 cursor-not-allowed' : ''}
              `}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => !outOfRange && setHoverDate(day)}
              onMouseLeave={() => setHoverDate(null)}
            >
              {/* Continuous range strip */}
              {showRangeBg && (
                <div className={`absolute inset-y-1 inset-x-0 bg-indigo-500/20 dark:bg-indigo-500/25
                  ${capStart ? 'rounded-s-full' : ''}
                  ${capEnd ? 'rounded-e-full' : ''}
                `} />
              )}
              {/* Day circle */}
              <span
                className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-colors duration-100
                  ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : ''}
                  ${!isSelected && inRange ? 'text-indigo-300 dark:text-indigo-200' : ''}
                  ${!isSelected && !inRange && !outOfRange ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
                  ${!isSelected && outOfRange ? 'text-slate-400 dark:text-slate-600' : ''}
                  ${dayIsToday && !isSelected ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-800' : ''}
                `}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected range summary */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">{t('dateStart', lang)}</span>{' '}
          {startDate ? format(parseISO(startDate), 'MMM d, yyyy', { locale }) : <span className="text-slate-300 dark:text-slate-600">—</span>}
        </div>
        <div className="flex-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">{t('dateEnd', lang)}</span>{' '}
          {endDate ? format(parseISO(endDate), 'MMM d, yyyy', { locale }) : <span className="text-slate-300 dark:text-slate-600">—</span>}
        </div>
      </div>
    </div>
  );
}
