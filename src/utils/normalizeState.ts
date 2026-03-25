import type { AppState } from '../types';
import { INITIAL_STATE } from '../constants';
import { PALETTE_150 } from './personColor';

export function normalizeState(raw: unknown): AppState {
  const parsed = raw as Partial<AppState>;
  const merged: AppState = { ...INITIAL_STATE, ...parsed };

  merged.people = (merged.people ?? []).map((p, idx) => {
    const colorHex = (p.colorHex && typeof p.colorHex === 'string')
      ? p.colorHex
      : PALETTE_150[idx % PALETTE_150.length];
    return {
      ...p,
      colorHex,
      constraints: p.constraints ?? null,
      // Migrate legacy single homeGroupId to homeGroupIds array
      homeGroupIds: p.homeGroupIds ?? ((p as unknown as { homeGroupId?: string | null }).homeGroupId ? [(p as unknown as { homeGroupId: string }).homeGroupId] : []),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Migrate per-schedule homeGroupPeriods up to global AppState level
  const migratedPeriods = (merged.schedules ?? []).flatMap(
    (s) => ((s as unknown as { homeGroupPeriods?: import('../types').HomeGroupPeriod[] }).homeGroupPeriods ?? [])
  );
  merged.homeGroupPeriods = [
    ...(merged.homeGroupPeriods ?? []),
    // Merge any legacy per-schedule periods not already present
    ...migratedPeriods.filter(mp => !(merged.homeGroupPeriods ?? []).some(p => p.id === mp.id)),
  ];

  merged.schedules = (merged.schedules ?? []).map(s => {
    const { homeGroupPeriods: _dropped, ...rest } = s as typeof s & { homeGroupPeriods?: unknown };
    void _dropped;
    return rest;
  });

  merged.homeGroups = merged.homeGroups ?? [];
  merged.dir = 'rtl';
  merged.theme = (['light', 'dark', 'system'] as const).includes(merged.theme as 'light' | 'dark' | 'system') ? merged.theme : 'system';
  merged.minBreakHours = merged.minBreakHours ?? 12;
  merged.ignoreOnCallConstraints = merged.ignoreOnCallConstraints ?? false;
  merged.avoidHalfShifts = merged.avoidHalfShifts ?? false;
  return merged;
}
