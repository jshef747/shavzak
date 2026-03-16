import { useState, useEffect } from 'react';
import type { AppState } from '../types';
import { STORAGE_KEY, INITIAL_STATE } from '../constants';
import { normalizeState } from '../utils/normalizeState';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeState(JSON.parse(raw));
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
