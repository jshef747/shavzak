export interface Shift {
  id: string;
  name: string;
  startHour: number;
  durationHours: number;
}

export interface Position { id: string; name: string; isOnCall?: boolean; }

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

export interface HomeGroup {
  id: string;
  name: string;
}

export interface HomeGroupPeriod {
  id: string;
  groupId: string;
  startDate: string; // departure day (ISO) — shifts with startHour >= 12 are blocked
  endDate: string;   // return day (ISO)    — shifts with startHour < 12 are blocked
}

export interface Person {
  id: string;
  name: string;
  colorHex: string;             // unique pastel hex color assigned at creation
  homeGroupIds: string[];
  qualifiedPositions: string[];
  unavailability: UnavailabilityEntry[];
  constraints: ShiftConstraint | null;
  forceMinimum?: boolean;       // if true, prioritize this person for max assignments
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
  homeGroupPeriods: HomeGroupPeriod[];
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
  | 'empty' | 'valid' | 'unavailable' | 'home-group'
  | 'double-booked' | 'unqualified' | 'insufficient-break'
  | 'constraint-violation' | 'oncall-short-break';

export interface AppState {
  shifts: Shift[];
  positions: Position[];
  people: Person[];
  homeGroups: HomeGroup[];
  schedules: Schedule[];
  activeScheduleId: string | null;
  dir: 'ltr' | 'rtl';
  theme: 'light' | 'dark' | 'system';
  minBreakHours: number;
}

// --- Role / team system ---

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  person_id: string;
  created_at: string;
}

export interface Invite {
  id: string;        // UUID — also the token in the invite URL
  board_id: string;
  revoked_at: string | null;
  created_at: string;
}

export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SwapRequest {
  id: string;
  board_id: string;
  requester_person_id: string;
  requester_date: string;
  requester_shift_id: string;
  requester_position_id: string;
  target_person_id: string;
  target_date: string | null;
  target_shift_id: string | null;
  target_position_id: string | null;
  status: SwapStatus;
  created_at: string;
}
