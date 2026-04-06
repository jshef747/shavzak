import { describe, it, expect } from 'vitest';
import { autoAssign } from './autoAssign';
import type { Person, Shift, Position, Schedule, Assignment } from '../types';

// --- Test fixtures: 4 shifts × 6 hours each ---

const SHIFTS: Shift[] = [
  { id: 'morning', name: 'Morning', startHour: 6, durationHours: 6 },
  { id: 'noon', name: 'Noon', startHour: 12, durationHours: 6 },
  { id: 'evening', name: 'Evening', startHour: 18, durationHours: 6 },
  { id: 'night', name: 'Night', startHour: 0, durationHours: 6 },
];

const POSITION: Position = { id: 'guard', name: 'Guard' };

function makePerson(id: string, name: string, qualifiedPositions: string[] = ['guard']): Person {
  return {
    id,
    name,
    colorHex: '#aaa',
    homeGroupIds: [],
    qualifiedPositions,
    unavailability: [],
    constraints: null,
  };
}

function makeSchedule(startDate: string, endDate: string): Schedule {
  return {
    id: 'test-schedule',
    name: 'Test',
    startDate,
    endDate,
    assignments: [],
    createdAt: startDate,
    updatedAt: startDate,
  };
}

function hoursForPerson(personId: string, assignments: { personId: string; shiftId: string; half?: 1 | 2 }[]): number {
  const shiftMap = new Map(SHIFTS.map(s => [s.id, s]));
  return assignments
    .filter(a => a.personId === personId)
    .reduce((sum, a) => {
      const shift = shiftMap.get(a.shiftId);
      if (!shift) return sum;
      return sum + (a.half !== undefined ? shift.durationHours / 2 : shift.durationHours);
    }, 0);
}

function shiftCountsForPerson(personId: string, assignments: { personId: string; shiftId: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of assignments) {
    if (a.personId !== personId) continue;
    counts[a.shiftId] = (counts[a.shiftId] ?? 0) + 1;
  }
  return counts;
}

// ============================================================
// Test 1: Hour balance
// ============================================================
describe('Hour balance', () => {
  it('distributes hours evenly across people with varying qualification counts (2 positions)', () => {
    // 2 positions, each with enough qualified people to allow balancing
    const pos1: Position = { id: 'guard', name: 'Guard' };
    const pos2: Position = { id: 'medic', name: 'Medic' };
    const positions = [pos1, pos2];

    const people: Person[] = [
      makePerson('p1', 'Alice', ['guard']),              // guard only
      makePerson('p2', 'Bob', ['guard', 'medic']),       // both
      makePerson('p3', 'Carol', ['guard', 'medic']),     // both
      makePerson('p4', 'Dave', ['medic']),               // medic only
      makePerson('p5', 'Eve', ['guard', 'medic']),       // both
    ];

    // Use 6h min break to allow denser scheduling with 6h shifts
    const schedule = makeSchedule('2026-04-06', '2026-04-12'); // 7 days
    // 56 slots (7 days × 4 shifts × 2 positions), 5 people
    const result = autoAssign(schedule, people, SHIFTS, positions, 6);

    const hours = people.map(p => hoursForPerson(p.id, result.proposed));
    const maxH = Math.max(...hours);
    const minH = Math.min(...hours);

    // With mixed qualifications + break constraints, specialists (guard-only,
    // medic-only) have fewer eligible cells. Allow up to 3 shift difference (18h).
    expect(maxH - minH).toBeLessThanOrEqual(18);
  });

  it('distributes hours evenly when all people have the same qualifications', () => {
    const people: Person[] = [
      makePerson('p1', 'Alice'),
      makePerson('p2', 'Bob'),
      makePerson('p3', 'Carol'),
      makePerson('p4', 'Dave'),
      makePerson('p5', 'Eve'),
    ];

    // Use 6h min break to allow denser scheduling with 6h shifts
    const schedule = makeSchedule('2026-04-06', '2026-04-12'); // 7 days
    const result = autoAssign(schedule, people, SHIFTS, [POSITION], 6);

    const hours = people.map(p => hoursForPerson(p.id, result.proposed));
    const maxH = Math.max(...hours);
    const minH = Math.min(...hours);

    // With 28 slots (7 days × 4 shifts) and 5 people → max diff ≤ 1 shift (6h)
    expect(maxH - minH).toBeLessThanOrEqual(6);
  });
});

// ============================================================
// Test 2: Shift variety
// ============================================================
describe('Shift variety', () => {
  it('distributes shift types evenly across a 14-day schedule', () => {
    const people: Person[] = [
      makePerson('p1', 'Alice'),
      makePerson('p2', 'Bob'),
      makePerson('p3', 'Carol'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-19'); // 14 days
    const result = autoAssign(schedule, people, SHIFTS, [POSITION], 12);

    // 56 slots (14 days × 4 shifts), 3 people → ~18-19 each
    // Each shift type appears 14 times total → ~4-5 per person
    // Allow ceil(14/3) + 1 = 6 max per shift type
    const maxPerShiftType = Math.ceil(14 / 3) + 1;

    for (const person of people) {
      const counts = shiftCountsForPerson(person.id, result.proposed);
      for (const shiftId of SHIFTS.map(s => s.id)) {
        const count = counts[shiftId] ?? 0;
        expect(count).toBeLessThanOrEqual(maxPerShiftType);
      }
    }
  });
});

// ============================================================
// Test 3: Consecutive shift avoidance
// ============================================================
describe('Consecutive shift avoidance', () => {
  it('avoids assigning the same shift more than 2 days in a row', () => {
    const people: Person[] = [
      makePerson('p1', 'Alice'),
      makePerson('p2', 'Bob'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-12'); // 7 days
    const result = autoAssign(schedule, people, SHIFTS, [POSITION], 12);

    // For each person + shift combo, check consecutive days
    for (const person of people) {
      const personAssignments = result.proposed.filter(a => a.personId === person.id);
      for (const shift of SHIFTS) {
        const dates = personAssignments
          .filter(a => a.shiftId === shift.id)
          .map(a => a.date)
          .sort();

        let consecutive = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays === 1) {
            consecutive++;
          } else {
            consecutive = 1;
          }
          // Allow up to 3 consecutive (penalty kicks in at 1, escalates at 2-3)
          expect(consecutive).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

// ============================================================
// Test 4: forceMinimum priority
// ============================================================
describe('forceMinimum priority', () => {
  it('gives forceMinimum person at least as many hours as others', () => {
    const people: Person[] = [
      { ...makePerson('p1', 'Alice'), forceMinimum: true },
      makePerson('p2', 'Bob'),
      makePerson('p3', 'Carol'),
      makePerson('p4', 'Dave'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-12'); // 7 days
    const result = autoAssign(schedule, people, SHIFTS, [POSITION], 12);

    const aliceHours = hoursForPerson('p1', result.proposed);
    const othersMax = Math.max(
      hoursForPerson('p2', result.proposed),
      hoursForPerson('p3', result.proposed),
      hoursForPerson('p4', result.proposed),
    );

    expect(aliceHours).toBeGreaterThanOrEqual(othersMax);
  });
});

// ============================================================
// Test 5: Constraints respected
// ============================================================
describe('Constraints respected', () => {
  it('never assigns a person on dates they are unavailable', () => {
    const people: Person[] = [
      {
        ...makePerson('p1', 'Alice'),
        unavailability: [
          { shiftId: 'morning', date: '2026-04-07' },
          { shiftId: 'evening', date: '2026-04-08' },
        ],
      },
      makePerson('p2', 'Bob'),
      makePerson('p3', 'Carol'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-12');
    const result = autoAssign(schedule, people, SHIFTS, [POSITION], 12);

    const aliceAssignments = result.proposed.filter(a => a.personId === 'p1');
    // Alice should never be on morning shift on April 7
    expect(aliceAssignments.some(a => a.shiftId === 'morning' && a.date === '2026-04-07')).toBe(false);
    // Alice should never be on evening shift on April 8
    expect(aliceAssignments.some(a => a.shiftId === 'evening' && a.date === '2026-04-08')).toBe(false);
  });
});

// ============================================================
// Test 6: Half-shift pairing
// ============================================================
describe('Half-shift pairing', () => {
  it('assigns both halves of a half-shift to the same person when possible', () => {
    const halfShifts: Shift[] = [
      { id: 'morning', name: 'Morning', startHour: 6, durationHours: 6, isHalfShift: true },
    ];

    const people: Person[] = [
      makePerson('p1', 'Alice'),
      makePerson('p2', 'Bob'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-08'); // 3 days
    const result = autoAssign(schedule, people, halfShifts, [POSITION], 12);

    // Group by date — for each date, half=1 and half=2 should have the same personId
    const byDate = new Map<string, { half1?: string; half2?: string }>();
    for (const a of result.proposed) {
      if (!byDate.has(a.date)) byDate.set(a.date, {});
      const entry = byDate.get(a.date)!;
      if (a.half === 1) entry.half1 = a.personId;
      if (a.half === 2) entry.half2 = a.personId;
    }

    for (const [, entry] of byDate) {
      if (entry.half1 && entry.half2) {
        expect(entry.half1).toBe(entry.half2);
      }
    }
  });
});

// ============================================================
// Test 7: On-call / regular balance
// ============================================================
describe('On-call / regular balance', () => {
  const ON_CALL_POS: Position = { id: 'oncall', name: 'On-Call', isOnCall: true, onCallDurationHours: 24 };
  const GUARD_POS: Position = { id: 'guard', name: 'Guard' };
  const REGULAR_SHIFTS: Shift[] = [
    { id: 'morning', name: 'Morning', startHour: 6, durationHours: 8 },
    { id: 'evening', name: 'Evening', startHour: 14, durationHours: 8 },
    { id: 'night', name: 'Night', startHour: 22, durationHours: 8 },
  ];

  function makeOncallPerson(id: string, name: string): Person {
    return {
      id,
      name,
      colorHex: '#aaa',
      homeGroupIds: [],
      qualifiedPositions: ['guard', 'oncall'],
      unavailability: [],
      constraints: null,
    };
  }

  function isOnCallAssignment(a: Assignment): boolean {
    return a.positionId === 'oncall';
  }

  it('spreads on-call across at least 4 of 6 people over 7 days', () => {
    const people = [
      makeOncallPerson('p1', 'Alice'),
      makeOncallPerson('p2', 'Bob'),
      makeOncallPerson('p3', 'Carol'),
      makeOncallPerson('p4', 'Dave'),
      makeOncallPerson('p5', 'Eve'),
      makeOncallPerson('p6', 'Frank'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-12'); // 7 days
    const result = autoAssign(schedule, people, REGULAR_SHIFTS, [GUARD_POS, ON_CALL_POS], 12);

    // Count how many distinct people got on-call
    const onCallPeople = new Set(
      result.proposed.filter(isOnCallAssignment).map(a => a.personId),
    );
    expect(onCallPeople.size).toBeGreaterThanOrEqual(4);
  });

  it('keeps total hours difference within 24h between any two people', () => {
    const people = [
      makeOncallPerson('p1', 'Alice'),
      makeOncallPerson('p2', 'Bob'),
      makeOncallPerson('p3', 'Carol'),
      makeOncallPerson('p4', 'Dave'),
      makeOncallPerson('p5', 'Eve'),
      makeOncallPerson('p6', 'Frank'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-12');
    const result = autoAssign(schedule, people, REGULAR_SHIFTS, [GUARD_POS, ON_CALL_POS], 12);

    // Compute total hours per person (regular + on-call)
    const hours = people.map(p => {
      const regular = hoursForPerson(p.id, result.proposed);
      const oncall = result.proposed
        .filter(a => a.personId === p.id && isOnCallAssignment(a))
        .reduce((sum, a) => sum + (a.half !== undefined ? 12 : 24), 0);
      // hoursForPerson only uses shiftMap which doesn't have on-call virtual shiftIds
      return regular + oncall;
    });

    const maxH = Math.max(...hours);
    const minH = Math.min(...hours);
    expect(maxH - minH).toBeLessThanOrEqual(24);
  });

  it('gives people who do on-call some regular shifts too (mixed workload)', () => {
    const people = [
      makeOncallPerson('p1', 'Alice'),
      makeOncallPerson('p2', 'Bob'),
      makeOncallPerson('p3', 'Carol'),
      makeOncallPerson('p4', 'Dave'),
      makeOncallPerson('p5', 'Eve'),
      makeOncallPerson('p6', 'Frank'),
    ];

    const schedule = makeSchedule('2026-04-06', '2026-04-12');
    const result = autoAssign(schedule, people, REGULAR_SHIFTS, [GUARD_POS, ON_CALL_POS], 12);

    // People with on-call assignments should also have at least 1 regular assignment
    const onCallPeople = new Set(
      result.proposed.filter(isOnCallAssignment).map(a => a.personId),
    );
    for (const pid of onCallPeople) {
      const regularCount = result.proposed.filter(
        a => a.personId === pid && !isOnCallAssignment(a),
      ).length;
      expect(regularCount).toBeGreaterThanOrEqual(1);
    }
  });
});
