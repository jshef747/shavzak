import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppState } from '../types';
import { STORAGE_KEY, INITIAL_STATE } from '../constants';
import { supabase } from '../lib/supabase';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: AppState = { ...INITIAL_STATE, ...parsed };
      // Normalize people to ensure constraints field exists (backwards compat)
      merged.people = (merged.people ?? []).map(p => ({
        ...p,
        constraints: p.constraints ?? null,
      }));
      merged.dir = 'rtl';
      merged.minBreakHours = merged.minBreakHours ?? 12;
      return merged;
    }
  } catch {}
  return INITIAL_STATE;
}

async function loadFromSupabase(userId: string): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('shifts, positions, people, schedules, active_schedule_id, min_break_hours')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  const state: AppState = {
    ...INITIAL_STATE,
    shifts: data.shifts ?? [],
    positions: data.positions ?? [],
    people: (data.people ?? []).map((p: AppState['people'][number]) => ({
      ...p,
      constraints: p.constraints ?? null,
    })),
    schedules: data.schedules ?? [],
    activeScheduleId: data.active_schedule_id ?? null,
    minBreakHours: data.min_break_hours ?? 12,
    dir: 'rtl',
  };
  return state;
}

async function saveToSupabase(userId: string, state: AppState): Promise<void> {
  const { error } = await supabase.from('user_data').upsert({
    id: userId,
    shifts: state.shifts,
    positions: state.positions,
    people: state.people,
    schedules: state.schedules,
    active_schedule_id: state.activeScheduleId,
    min_break_hours: state.minBreakHours,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) console.error('Supabase sync error:', error);
}

export function useAppState(session: Session | null) {
  const [state, setState] = useState<AppState>(loadState);
  const [syncing, setSyncing] = useState(false);

  // Effect 1: Load remote state when user logs in
  useEffect(() => {
    if (!session) return;
    loadFromSupabase(session.user.id).then(remote => {
      if (remote) {
        setState(remote);
      } else {
        // First login ever: upload current local data to Supabase
        saveToSupabase(session.user.id, state);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // Effect 2: Always mirror to localStorage (unchanged behaviour)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Effect 3: Debounced sync to Supabase when logged in
  useEffect(() => {
    if (!session) return;
    setSyncing(true);
    const timer = setTimeout(() => {
      saveToSupabase(session.user.id, state).finally(() => setSyncing(false));
    }, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, session?.user.id]);

  return { state, setState, syncing };
}
