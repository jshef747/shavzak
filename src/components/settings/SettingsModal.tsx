import { useState, useEffect } from 'react';
import type { AppState, Shift, UnavailabilityEntry, DayOfWeek } from '../../types';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { langFromDir, t } from '../../utils/i18n';
import { ShiftsTab } from './ShiftsTab';
import { PositionsTab } from './PositionsTab';
import { PeopleTab } from './PeopleTab';
import { HomeGroupsTab } from './HomeGroupsTab';

interface Props {
  open: boolean;
  onClose: () => void;
  state: AppState;
  dates: string[];
  initialTab?: string;
  onAddShift: (name: string, startHour: number, durationHours: number) => void;
  onUpdateShift: (id: string, updates: Partial<Omit<Shift, 'id'>>) => void;
  onDeleteShift: (id: string) => void;
  onReorderShifts: (orderedIds: string[]) => void;
  onUpdateMinBreakHours: (hours: number) => void;
  onAddPosition: (name: string) => void;
  onUpdatePosition: (id: string, name: string) => void;
  onDeletePosition: (id: string) => void;
  onToggleOnCall: (id: string) => void;
  onReorderPositions: (orderedIds: string[]) => void;
  onAddPerson: (name: string) => void;
  onDeletePerson: (id: string) => void;
  onUpdatePersonName: (id: string, name: string) => void;
  onToggleQualification: (personId: string, positionId: string) => void;
  onToggleUnavailability: (personId: string, entry: UnavailabilityEntry) => void;
  onToggleConstraintShift: (personId: string, shiftId: string) => void;
  onToggleConstraintBlockedShift: (personId: string, shiftId: string) => void;
  onToggleConstraintDay: (personId: string, day: DayOfWeek) => void;
  onToggleConstraintBlockedDay: (personId: string, day: DayOfWeek) => void;
  onUpdateConstraintMaxWeek: (personId: string, max: number | null) => void;
  onUpdateConstraintMaxTotal: (personId: string, max: number | null) => void;
  onUpdateConstraintMaxConsecutive: (personId: string, max: number | null) => void;
  onUpdateConstraintMinRest: (personId: string, min: number | null) => void;
  onAddHomeGroup: (name: string) => void;
  onUpdateHomeGroup: (id: string, name: string) => void;
  onDeleteHomeGroup: (id: string) => void;
  onSetPersonHomeGroup: (personId: string, groupId: string | null) => void;
}

// Internal tab keys stay in English for logic comparisons
const TABS = ['Shifts', 'Positions', 'People', 'Groups'];

export function SettingsModal({ open, onClose, state, dates, initialTab, ...handlers }: Props) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Shifts');
  const lang = langFromDir(state.dir);

  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);

  const tabLabels = [t('tabShifts', lang), t('tabPositions', lang), t('tabPeople', lang), t('tabGroups', lang)];

  return (
    <Modal open={open} onClose={onClose} title={t('settingsTitle', lang)} size="xl">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} labels={tabLabels} />
      {activeTab === 'Shifts' && (
        <ShiftsTab
          state={state}
          onAdd={handlers.onAddShift}
          onUpdate={handlers.onUpdateShift}
          onDelete={handlers.onDeleteShift}
          onReorder={handlers.onReorderShifts}
          onUpdateMinBreakHours={handlers.onUpdateMinBreakHours}
        />
      )}
      {activeTab === 'Positions' && (
        <PositionsTab
          state={state}
          onAdd={handlers.onAddPosition}
          onUpdate={handlers.onUpdatePosition}
          onDelete={handlers.onDeletePosition}
          onToggleOnCall={handlers.onToggleOnCall}
          onReorder={handlers.onReorderPositions}
          onToggleQualification={handlers.onToggleQualification}
        />
      )}
      {activeTab === 'People' && (
        <PeopleTab
          state={state}
          dates={dates}
          onAdd={handlers.onAddPerson}
          onDelete={handlers.onDeletePerson}
          onUpdateName={handlers.onUpdatePersonName}
          onToggleQualification={handlers.onToggleQualification}
          onToggleUnavailability={handlers.onToggleUnavailability}
          onToggleConstraintShift={handlers.onToggleConstraintShift}
          onToggleConstraintBlockedShift={handlers.onToggleConstraintBlockedShift}
          onToggleConstraintDay={handlers.onToggleConstraintDay}
          onToggleConstraintBlockedDay={handlers.onToggleConstraintBlockedDay}
          onUpdateConstraintMaxWeek={handlers.onUpdateConstraintMaxWeek}
          onUpdateConstraintMaxTotal={handlers.onUpdateConstraintMaxTotal}
          onUpdateConstraintMaxConsecutive={handlers.onUpdateConstraintMaxConsecutive}
          onUpdateConstraintMinRest={handlers.onUpdateConstraintMinRest}
          onSetPersonHomeGroup={handlers.onSetPersonHomeGroup}
        />
      )}
      {activeTab === 'Groups' && (
        <HomeGroupsTab
          state={state}
          onAddGroup={handlers.onAddHomeGroup}
          onUpdateGroup={handlers.onUpdateHomeGroup}
          onDeleteGroup={handlers.onDeleteHomeGroup}
          onSetPersonGroup={handlers.onSetPersonHomeGroup}
        />
      )}
    </Modal>
  );
}
