import type { AppState, Assignment } from '../../types';
import { PeoplePool } from '../roster/PeoplePool';
import { HoursTracker } from '../tracker/HoursTracker';
import { useIsMobile } from '../../hooks/useIsMobile';

interface Props {
  state: AppState;
  assignments: Assignment[];
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ state, assignments, onEditPerson, onDeletePerson }: Omit<Props, 'open' | 'onClose'>) {
  const assignedPersonIds = new Set(assignments.map(a => a.personId));
  return (
    <>
      <div className="flex-1">
        <PeoplePool state={state} assignedPersonIds={assignedPersonIds} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} />
      </div>
      <div className="border-t border-gray-200 dark:border-slate-700">
        <HoursTracker state={state} assignments={assignments} />
      </div>
    </>
  );
}

export function Sidebar({ state, assignments, onEditPerson, onDeletePerson, open, onClose }: Props) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <aside className="no-print flex flex-col w-56 overflow-y-auto bg-white dark:bg-slate-800 border-r rtl:border-r-0 rtl:border-l border-gray-200 dark:border-slate-700">
        <SidebarContent state={state} assignments={assignments} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} />
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
        className={`no-print fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 z-30 w-64 flex flex-col overflow-y-auto bg-white dark:bg-slate-800 border-r rtl:border-r-0 rtl:border-l border-gray-200 dark:border-slate-700 transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Roster</span>
          <button
            onClick={onClose}
            aria-label="Close roster"
            className="p-1 rounded text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent state={state} assignments={assignments} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} />
      </aside>
    </>
  );
}
