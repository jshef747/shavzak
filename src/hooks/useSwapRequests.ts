import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SwapRequest } from '../types';

export interface NewSwapRequest {
  board_id: string;
  requester_person_id: string;
  requester_date: string;
  requester_shift_id: string;
  requester_position_id: string;
  target_person_id: string;
  target_date: string | null;
  target_shift_id: string | null;
  target_position_id: string | null;
}

export function useSwapRequests(boardId: string | null, myPersonId: string | null) {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);

  useEffect(() => {
    if (!boardId) {
      setSwapRequests([]);
      return;
    }

    // Initial fetch: all non-cancelled requests for this board
    supabase
      .from('swap_requests')
      .select('*')
      .eq('board_id', boardId)
      .neq('status', 'cancelled')
      .then(({ data }) => setSwapRequests((data ?? []) as SwapRequest[]));

    // Real-time subscription
    const channel = supabase
      .channel(`swap-requests-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSwapRequests(prev => [...prev, payload.new as SwapRequest]);
          } else if (payload.eventType === 'UPDATE') {
            setSwapRequests(prev =>
              prev.map(r => r.id === (payload.new as SwapRequest).id ? payload.new as SwapRequest : r)
            );
          } else if (payload.eventType === 'DELETE') {
            setSwapRequests(prev => prev.filter(r => r.id !== (payload.old as SwapRequest).id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [boardId]);

  const incomingRequests = swapRequests.filter(
    r => r.target_person_id === myPersonId && r.status === 'pending',
  );
  const outgoingRequests = swapRequests.filter(
    r => r.requester_person_id === myPersonId,
  );

  async function requestSwap(req: NewSwapRequest): Promise<void> {
    await supabase.from('swap_requests').insert({ ...req, status: 'pending' });
  }

  async function approveSwap(swapId: string): Promise<void> {
    await supabase.rpc('apply_swap', { swap_request_id: swapId });
  }

  async function rejectSwap(swapId: string): Promise<void> {
    await supabase.from('swap_requests').update({ status: 'rejected' }).eq('id', swapId);
  }

  async function cancelSwap(swapId: string): Promise<void> {
    await supabase.from('swap_requests').update({ status: 'cancelled' }).eq('id', swapId);
  }

  return {
    swapRequests,
    incomingRequests,
    outgoingRequests,
    requestSwap,
    approveSwap,
    rejectSwap,
    cancelSwap,
  };
}
