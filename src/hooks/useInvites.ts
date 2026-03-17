import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Invite } from '../types';

export function useInvites(boardId: string | null, isAdmin: boolean) {
  const [activeInvite, setActiveInvite] = useState<Invite | null>(null);

  useEffect(() => {
    if (!boardId || !isAdmin) return;

    supabase
      .from('invites')
      .select('*')
      .eq('board_id', boardId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setActiveInvite(data as Invite | null);
      });
  }, [boardId, isAdmin]);

  const inviteUrl = activeInvite
    ? `${window.location.origin}/?invite=${activeInvite.id}`
    : null;

  async function generateInvite(): Promise<void> {
    if (!boardId) return;
    const { data } = await supabase
      .from('invites')
      .insert({ board_id: boardId })
      .select('*')
      .single();
    if (data) setActiveInvite(data as Invite);
  }

  async function revokeInvite(): Promise<void> {
    if (!activeInvite) return;
    await supabase
      .from('invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', activeInvite.id);
    setActiveInvite(null);
  }

  return { activeInvite, inviteUrl, generateInvite, revokeInvite };
}
