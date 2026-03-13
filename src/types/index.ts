export interface Shift {
  id: string;
  name: string;
  startHour: number;
  durationHours: number;
  isHalfShift?: boolean;  // two people share the shift, each working half the duration (manual only)
  oncallSlots?: number;   // number of on-call (תקן קפיצה) slots per shift per day (0 = none)
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
  halfSlot?: 1 | 2;   // which half of a half-shift (1=first half, 2=second half); undefined = full shift
  isOncall?: boolean; // true = on-call (תקן קפיצה) assignment; positionId will be ONCALL_POSITION_ID
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

export interface CellAddress {
  date: string;
  shiftId: string;
  positionId: string;
  halfSlot?: 1 | 2;   // which half-slot (mirrors Assignment.halfSlot)
  isOncall?: boolean; // true = on-call cell (mirrors Assignment.isOncall)
}

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
  oncallWeight: number; // fraction of hours counted for on-call assignments in fairness balance (default 0.5)
}
