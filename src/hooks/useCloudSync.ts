import { supabase } from '../lib/supabase';
import type { AppState, BoardDescriptor, ShiftSwap } from '../types';

export function useCloudSync() {
  /** Load the board owned by userId (admin's own board). */
  async function loadBoard(userId: string): Promise<AppState | null> {
    const { data, error } = await supabase
      .from('boards')
      .select('board_data')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.board_data as AppState;
  }

  /** Load any board by its id (used when a worker switches to an admin's board). */
  async function loadBoardById(boardId: string): Promise<AppState | null> {
    const { data, error } = await supabase
      .from('boards')
      .select('board_data')
      .eq('id', boardId)
      .single();

    if (error || !data) return null;
    return data.board_data as AppState;
  }

  /** Save the admin's own board. */
  async function saveBoard(state: AppState, userId: string): Promise<string | null> {
    const { error } = await supabase
      .from('boards')
      .upsert(
        { user_id: userId, board_data: state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    return error?.message ?? null;
  }

  /**
   * Fetch all boards accessible to the current user:
   *  - Their own admin board (if it exists)
   *  - Any boards they are a member of (worker boards)
   */
  async function fetchUserBoards(userId: string): Promise<BoardDescriptor[]> {
    const results: BoardDescriptor[] = [];

    // Admin board — the row in boards where user_id == userId
    const { data: ownBoard } = await supabase
      .from('boards')
      .select('id, board_data')
      .eq('user_id', userId)
      .maybeSingle();

    if (ownBoard) {
      const bd = ownBoard.board_data as AppState;
      const firstName = bd?.schedules?.[0]?.name ?? 'My Board';
      results.push({
        boardId: ownBoard.id as string,
        role: 'admin',
        label: firstName,
        personId: null,
      });
    }

    // Worker boards — board_members rows for this user
    const { data: memberRows } = await supabase
      .from('board_members')
      .select('board_id, person_id')
      .eq('user_id', userId);

    if (memberRows && memberRows.length > 0) {
      // Fetch the board_data for each worker board
      const boardIds = memberRows.map(r => r.board_id as string);
      const { data: workerBoards } = await supabase
        .from('boards')
        .select('id, board_data')
        .in('id', boardIds);

      for (const wb of workerBoards ?? []) {
        const member = memberRows.find(r => r.board_id === wb.id);
        const bd = wb.board_data as AppState;
        const firstName = bd?.schedules?.[0]?.name ?? 'Shared Board';
        results.push({
          boardId: wb.id as string,
          role: 'worker',
          label: firstName,
          personId: member?.person_id ?? null,
        });
      }
    }

    return results;
  }

  /**
   * Worker-safe constraint update: calls the `update_worker_constraints` RPC
   * instead of overwriting the whole board blob.
   */
  async function updateWorkerConstraints(
    boardId: string,
    personId: string,
    constraints: AppState['people'][number]['constraints'],
    unavailability: AppState['people'][number]['unavailability'],
  ): Promise<string | null> {
    const { error } = await supabase.rpc('update_worker_constraints', {
      p_board_id:       boardId,
      p_person_id:      personId,
      p_constraints:    constraints,
      p_unavailability: unavailability,
    });
    return error?.message ?? null;
  }

  /** Generate (or retrieve existing) an invite link token for the admin's board. */
  async function createInvite(boardId: string): Promise<string | null> {
    // Check if one already exists for this board
    const { data: existing } = await supabase
      .from('invites')
      .select('token')
      .eq('board_id', boardId)
      .maybeSingle();

    if (existing?.token) return existing.token as string;

    const { data, error } = await supabase
      .from('invites')
      .insert({ board_id: boardId })
      .select('token')
      .single();

    if (error || !data) return null;
    return data.token as string;
  }

  /** Accept an invite by token. Returns { board_id, person_id } or throws. */
  async function acceptInvite(
    token: string,
    name: string,
    colorHex?: string,
  ): Promise<{ boardId: string; personId: string }> {
    const { data, error } = await supabase.rpc('accept_invite', {
      p_token:     token,
      p_name:      name,
      p_color_hex: colorHex ?? '#94a3b8',
    });
    if (error) throw new Error(error.message);
    return { boardId: data.board_id, personId: data.person_id };
  }

  // ─── Shift swap helpers ────────────────────────────────────────────────────

  async function fetchSwaps(boardId: string): Promise<ShiftSwap[]> {
    const { data, error } = await supabase
      .from('shift_swaps')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(row => ({
      id:                 row.id as string,
      boardId:            row.board_id as string,
      scheduleId:         row.schedule_id as string,
      shiftId:            row.shift_id as string,
      date:               row.date as string,
      positionId:         row.position_id as string,
      requesterPersonId:  row.requester_person_id as string,
      targetPersonId:     row.target_person_id as string,
      status:             row.status as ShiftSwap['status'],
      createdAt:          row.created_at as string,
      updatedAt:          row.updated_at as string,
    }));
  }

  async function requestSwap(swap: Omit<ShiftSwap, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    const { error } = await supabase.from('shift_swaps').insert({
      board_id:            swap.boardId,
      schedule_id:         swap.scheduleId,
      shift_id:            swap.shiftId,
      date:                swap.date,
      position_id:         swap.positionId,
      requester_person_id: swap.requesterPersonId,
      target_person_id:    swap.targetPersonId,
    });
    return error?.message ?? null;
  }

  async function respondToSwap(swapId: string, status: 'accepted' | 'rejected'): Promise<string | null> {
    const { error } = await supabase
      .from('shift_swaps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', swapId);
    return error?.message ?? null;
  }

  return {
    loadBoard,
    loadBoardById,
    saveBoard,
    fetchUserBoards,
    updateWorkerConstraints,
    createInvite,
    acceptInvite,
    fetchSwaps,
    requestSwap,
    respondToSwap,
  };
}
