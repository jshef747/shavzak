import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole } from '../types';

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setAllProfiles([]);
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      setLoadingProfile(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (cancelled) return;

      if (data) {
        setProfile(data as UserProfile);

        // If admin, also fetch all profiles for UsersTab
        if ((data as UserProfile).role === 'admin') {
          const { data: all } = await supabase.from('profiles').select('*');
          if (!cancelled) setAllProfiles((all ?? []) as UserProfile[]);
        }
      } else {
        // Profile row may not exist yet (trigger timing); treat as admin
        setProfile({ id: userId!, email: '', role: 'admin', created_at: '' });
      }

      setLoadingProfile(false);
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [userId]);

  const isAdmin = profile?.role === 'admin' || profile === null;

  async function updateRole(targetUserId: string, role: UserRole): Promise<void> {
    await supabase.from('profiles').update({ role }).eq('id', targetUserId);
    setAllProfiles(prev =>
      prev.map(p => p.id === targetUserId ? { ...p, role } : p)
    );
  }

  return { profile, isAdmin, loadingProfile, allProfiles, updateRole };
}
