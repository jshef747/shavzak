import type { AppState } from '../types';

export const STORAGE_KEY = 'shift-manager-v1';
export const MIN_BREAK_HOURS = 12;

export const DEFAULT_SHIFTS = [
  { id: 'morning', name: 'Morning', startHour: 8, durationHours: 8 },
  { id: 'evening', name: 'Evening', startHour: 16, durationHours: 8 },
  { id: 'night', name: 'Night', startHour: 0, durationHours: 8 },
];

export const INITIAL_STATE: AppState = {
  shifts: DEFAULT_SHIFTS,
  positions: [],
  people: [],
  homeGroups: [],
  schedules: [],
  activeScheduleId: null,
  dir: 'rtl',
  theme: 'system',
  minBreakHours: 12,
};
