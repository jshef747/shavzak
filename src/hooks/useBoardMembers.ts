import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { BoardMember, UserRole } from '../types';

export interface BoardMemberWithEmail extends BoardMember {
  email?: string;
  personName?: string;
  role?: UserRole;
}

export function useBoardMembers(boardId: string | null, isAdmin: boolean) {
  const [members, setMembers] = useState<BoardMemberWithEmail[]>([]);

  useEffect(() => {
    if (!boardId || !isAdmin) return;

    supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .then(async ({ data }) => {
        if (!data) return;
        const memberRows = data as BoardMember[];

        // Fetch emails from profiles for each member
        const userIds = memberRows.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const emailMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; email: string }) => {
          emailMap[p.id] = p.email;
        });

        setMembers(memberRows.map(m => ({
          ...m,
          email: emailMap[m.user_id] ?? '',
        })));
      });
  }, [boardId, isAdmin]);

  async function unlinkMember(memberId: string): Promise<void> {
    await supabase.from('board_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  return { members, setMembers, unlinkMember };
}
