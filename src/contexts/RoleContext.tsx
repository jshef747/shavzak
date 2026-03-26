import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { RoleContext as RoleContextType, BoardDescriptor, WorkspaceRole } from '../types';

interface RoleContextValue {
  /** The currently active workspace (null = user's own admin board, not yet loaded). */
  current: RoleContextType | null;
  /** All boards this user can access. */
  boards: BoardDescriptor[];
  /** Switch to a different workspace. */
  switchBoard: (boardId: string) => void;
  /** Set the full list of accessible boards (called after auth + cloud fetch). */
  setBoards: (boards: BoardDescriptor[]) => void;
  /** Shorthand: is the current workspace in admin role? */
  isAdmin: boolean;
  /** Shorthand: is the current workspace in worker role? */
  isWorker: boolean;
  /** The person_id for a worker in the current board (null for admins). */
  workerPersonId: string | null;
}

const Ctx = createContext<RoleContextValue | null>(null);

export function RoleContextProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<BoardDescriptor[]>([]);
  const [current, setCurrent] = useState<RoleContextType | null>(null);

  const switchBoard = useCallback((boardId: string) => {
    const descriptor = boards.find(b => b.boardId === boardId);
    if (!descriptor) return;
    setCurrent({
      boardId: descriptor.boardId,
      role: descriptor.role,
      personId: descriptor.personId,
    });
  }, [boards]);

  const handleSetBoards = useCallback((newBoards: BoardDescriptor[]) => {
    setBoards(newBoards);
    // If no current board is set yet, default to the first one (usually the user's own admin board)
    if (newBoards.length > 0) {
      setCurrent(prev => {
        if (prev) return prev;
        const first = newBoards[0];
        return { boardId: first.boardId, role: first.role, personId: first.personId };
      });
    }
  }, []);

  const role: WorkspaceRole = current?.role ?? 'admin';

  return (
    <Ctx.Provider value={{
      current,
      boards,
      switchBoard,
      setBoards: handleSetBoards,
      isAdmin: role === 'admin',
      isWorker: role === 'worker',
      workerPersonId: current?.personId ?? null,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRoleContext(): RoleContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRoleContext must be used inside RoleContextProvider');
  return ctx;
}
