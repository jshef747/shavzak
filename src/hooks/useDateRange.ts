import { useMemo } from 'react';
import { eachDayOfInterval, parseISO, format } from 'date-fns';

export function useDateRange(startDate: string | null, endDate: string | null): string[] {
  return useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (start > end) return [];
      return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    } catch {
      return [];
    }
  }, [startDate, endDate]);
}
