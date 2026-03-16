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
  });

  merged.schedules = (merged.schedules ?? []).map(s => ({
    ...s,
    homeGroupPeriods: s.homeGroupPeriods ?? [],
  }));

  merged.homeGroups = merged.homeGroups ?? [];
  merged.dir = 'rtl';
  merged.minBreakHours = merged.minBreakHours ?? 12;
  return merged;
}
