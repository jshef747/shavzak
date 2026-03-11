export interface Shift {
  id: string;
  name: string;
  startHour: number;
  durationHours: number;
}

export interface Position { id: string; name: string; }

export interface UnavailabilityEntry { shiftId: string; date: string; }

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, matches date-fns getDay()

export interface ShiftConstraint {
  allowedShiftIds: string[] | null;        // whitelist — null = no restriction
  blockedShiftIds: string[] | null;        // blacklist — never allowed on these shifts
  allowedDaysOfWeek: DayOfWeek[] | null;   // whitelist — null = no restriction
  blockedDaysOfWeek: DayOfWeek[] | null;   // blacklist — never allowed on these days
  maxShiftsPerWeek: number | null;         // rolling 7-day window; null = no limit
  maxShiftsTotal: number | null;           // across whole schedule; null = no limit
  maxConsecutiveDays: number | null;       // max working days in a row; null = no limit
  minRestDays: number | null;              // min calendar days off between any two assignments
}

export interface Person {
  id: string;
  name: string;
  qualifiedPositions: string[];
  unavailability: UnavailabilityEntry[];
  constraints: ShiftConstraint | null;
}

export interface Assignment {
  personId: string;
  date: string;
  shiftId: string;
  positionId: string;
}

export interface Schedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  assignments: Assignment[];
  createdAt: string;
  updatedAt: string;
}

export interface CellAddress { date: string; shiftId: string; positionId: string; }

export interface DragData {
  type: 'from-pool' | 'from-cell';
  personId: string;
  sourceCell?: CellAddress;
}

export type CellStatus =
  | 'empty' | 'valid' | 'unavailable'
  | 'double-booked' | 'unqualified' | 'insufficient-break'
  | 'constraint-violation';

export interface AppState {
  shifts: Shift[];
  positions: Position[];
  people: Person[];
  schedules: Schedule[];
  activeScheduleId: string | null;
  dir: 'ltr' | 'rtl';
  minBreakHours: number;
}
