import type { AppState, Assignment } from '../../types';
import { PeoplePool } from '../roster/PeoplePool';
import { HoursTracker } from '../tracker/HoursTracker';

interface Props {
  state: AppState;
  assignments: Assignment[];
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
}

export function Sidebar({ state, assignments, onEditPerson, onDeletePerson }: Props) {
  const assignedPersonIds = new Set(assignments.map(a => a.personId));

  return (
    <div className="no-print w-56 border-r rtl:border-r-0 rtl:border-l flex flex-col overflow-y-auto bg-white">
      <div className="flex-1">
        <PeoplePool state={state} assignedPersonIds={assignedPersonIds} onEditPerson={onEditPerson} onDeletePerson={onDeletePerson} />
      </div>
      <div className="border-t">
        <HoursTracker state={state} assignments={assignments} />
      </div>
    </div>
  );
}
