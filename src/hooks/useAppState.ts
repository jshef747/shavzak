import { useState, useEffect } from 'react';
import type { AppState } from '../types';
import { STORAGE_KEY, INITIAL_STATE } from '../constants';

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

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return { state, setState };
}
