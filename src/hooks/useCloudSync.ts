import { supabase } from '../lib/supabase';
import type { AppState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useCloudSync() {
  /** Load board state. Returns both the AppState and the board's UUID. */
  async function loadBoard(
    userId: string,
    isAdmin: boolean,
  ): Promise<{ state: AppState | null; boardId: string | null }> {
    if (isAdmin) {
      const { data, error } = await supabase
        .from('boards')
        .select('id, board_data')
        .eq('user_id', userId)
        .single();

      if (error || !data) return { state: null, boardId: null };
      return { state: data.board_data as AppState, boardId: data.id as string };
    }

    // Regular user: find their board via board_members
    const { data: membership } = await supabase
      .from('board_members')
      .select('board_id')
      .eq('user_id', userId)
      .single();

    if (!membership) return { state: null, boardId: null };

    const { data: boardRow } = await supabase
      .from('boards')
      .select('id, board_data')
      .eq('id', membership.board_id)
      .single();

    if (!boardRow) return { state: null, boardId: null };
    return { state: boardRow.board_data as AppState, boardId: boardRow.id as string };
  }

  /** Save the full board state. Only called when user isAdmin. */
  async function saveBoard(state: AppState, userId: string): Promise<void> {
    await supabase
      .from('boards')
      .upsert(
        { user_id: userId, board_data: state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
  }

  /**
   * Subscribe to live updates on a specific board.
   * Used by non-admin users to see the admin's changes in real time.
   */
  function subscribeToBoardChanges(
    boardId: string,
    onUpdate: (state: AppState) => void,
  ): RealtimeChannel {
    return supabase
      .channel(`board-changes-${boardId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
        (payload) => {
          const newData = (payload.new as { board_data: AppState }).board_data;
          if (newData) onUpdate(newData);
        },
      )
      .subscribe();
  }

  /**
   * Save only a person's constraints and unavailability (for non-admin users).
   * Calls the update_person_preferences RPC which enforces board_members auth.
   */
  async function savePersonPreferences(
    boardId: string,
    personId: string,
    constraints: AppState['people'][0]['constraints'],
    unavailability: AppState['people'][0]['unavailability'],
  ): Promise<void> {
    await supabase.rpc('update_person_preferences', {
      p_board_id: boardId,
      p_person_id: personId,
      p_constraints: constraints,
      p_unavailability: unavailability,
    });
  }

  return { loadBoard, saveBoard, subscribeToBoardChanges, savePersonPreferences };
}
