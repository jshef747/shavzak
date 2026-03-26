import type { AppState, Assignment } from '../../types';
import { X } from 'lucide-react';
import { PeoplePool } from '../roster/PeoplePool';
import { HoursTracker } from '../tracker/HoursTracker';
import { useIsMobile } from '../../hooks/useIsMobile';
import { IconButton } from '../ui/IconButton';

interface Props {
  state: AppState;
  assignments: Assignment[];
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
  open: boolean;
  onClose: () => void;
  onCallDurationOverrides?: Record<string, Record<string, number>>;
}

function SidebarContent({ state, assignments, onEditPerson, onDeletePerson, onCallDurationOverrides }: Omit<Props, 'open' | 'onClose'>) {
  const assignedPersonIds = new Set(assignments.map(a => a.personId));
  return (
    <>
      <div className="flex-1">
        <PeoplePool state={state} assignedPersonIds={assignedPersonIds} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} />
      </div>
      <div className="border-t border-gray-200 dark:border-slate-700">
        <HoursTracker state={state} assignments={assignments} onCallDurationOverrides={onCallDurationOverrides} />
      </div>
    </>
  );
}

export function Sidebar({ state, assignments, onEditPerson, onDeletePerson, open, onClose, onCallDurationOverrides }: Props) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <aside className="no-print flex flex-col w-[260px] overflow-y-auto bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-e border-gray-200/60 dark:border-slate-800 relative z-10 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex-1 pt-2">
          <SidebarContent state={state} assignments={assignments} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} onCallDurationOverrides={onCallDurationOverrides} />
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`no-print fixed inset-0 z-20 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={`no-print fixed inset-y-0 start-0  z-30 w-64 flex flex-col overflow-y-auto bg-white dark:bg-slate-800 border-e  border-gray-200 dark:border-slate-700 transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full '
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Roster</span>
          <IconButton
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
            aria-label="Close roster"
            size="sm"
          />
        </div>
        <SidebarContent state={state} assignments={assignments} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} onCallDurationOverrides={onCallDurationOverrides} />
      </aside>
    </>
  );
}
