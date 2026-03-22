import { supabase } from '../lib/supabase';
import type { AppState } from '../types';

export function useCloudSync() {
  async function loadBoard(userId: string): Promise<AppState | null> {
    const { data, error } = await supabase
      .from('boards')
      .select('board_data')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.board_data as AppState;
  }

  async function saveBoard(state: AppState, userId: string): Promise<string | null> {
    const { error } = await supabase
      .from('boards')
      .upsert(
        { user_id: userId, board_data: state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    return error?.message ?? null;
  }

  return { loadBoard, saveBoard };
}
