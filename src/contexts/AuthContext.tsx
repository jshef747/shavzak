import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { STORAGE_KEY } from '../constants';
import type { AppState } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredDir(): 'ltr' | 'rtl' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as Partial<AppState>).dir ?? 'rtl';
  } catch {}
  return 'rtl';
}

export { getStoredDir };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession) setAuthModalOpen(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<AuthError | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signUp(email: string, password: string): Promise<AuthError | null> {
    const { error } = await supabase.auth.signUp({ email, password });
    return error;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      authModalOpen,
      signIn,
      signUp,
      signOut,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
