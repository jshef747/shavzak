import { useState, useEffect } from 'react';
import type { AppState, Shift, UnavailabilityEntry, DayOfWeek, Position } from '../../types';
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
  onUpdateForceMinimum: (personId: string, value: boolean) => void;
  onUpdateNeverAutoAssign: (personId: string, value: boolean) => void;
  onAddHomeGroup: (name: string) => void;
  onUpdateHomeGroup: (id: string, name: string) => void;
  onDeleteHomeGroup: (id: string) => void;
  onTogglePersonHomeGroup: (personId: string, groupId: string) => void;
  shiftSets: import('../../hooks/usePresets').ShiftSetPreset[];
  positionSets: import('../../hooks/usePresets').PositionSetPreset[];
  onAddShiftSet: (name: string, shifts: Shift[]) => Promise<void>;
  onDeleteShiftSet: (id: string) => Promise<void>;
  onLoadShiftSet: (shifts: Omit<Shift, 'id'>[]) => void;
  onAddPositionSet: (name: string, positions: Position[]) => Promise<void>;
  onDeletePositionSet: (id: string) => Promise<void>;
  onLoadPositionSet: (positions: Omit<Position, 'id'>[]) => void;
  isLoggedIn: boolean;
}

// Internal tab keys stay in English for logic comparisons
const TABS = ['Shifts', 'Positions', 'People', 'Groups'];

export function SettingsModal({
  open, onClose, state, dates, initialTab,
  shiftSets, positionSets,
  onAddShiftSet, onDeleteShiftSet, onLoadShiftSet,
  onAddPositionSet, onDeletePositionSet, onLoadPositionSet,
  isLoggedIn,
  ...handlers
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Shifts');
  const lang = langFromDir(state.dir);

  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);

  const tabLabels = [t('tabShifts', lang), t('tabPositions', lang), t('tabPeople', lang), t('tabGroups', lang)];

  return (
    <Modal open={open} onClose={onClose} title={t('settingsTitle', lang)} size="xl" dir={state.dir}>
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} labels={tabLabels} />
      {activeTab === 'Shifts' && (
        <ShiftsTab
          state={state}
          onAdd={handlers.onAddShift}
          onUpdate={handlers.onUpdateShift}
          onDelete={handlers.onDeleteShift}
          onReorder={handlers.onReorderShifts}
          onUpdateMinBreakHours={handlers.onUpdateMinBreakHours}
          shiftSets={shiftSets}
          onAddShiftSet={onAddShiftSet}
          onDeleteShiftSet={onDeleteShiftSet}
          onLoadShiftSet={onLoadShiftSet}
          isLoggedIn={isLoggedIn}
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
          positionSets={positionSets}
          onAddPositionSet={onAddPositionSet}
          onDeletePositionSet={onDeletePositionSet}
          onLoadPositionSet={onLoadPositionSet}
          isLoggedIn={isLoggedIn}
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
          onUpdateForceMinimum={handlers.onUpdateForceMinimum}
          onUpdateNeverAutoAssign={handlers.onUpdateNeverAutoAssign}
          onTogglePersonHomeGroup={handlers.onTogglePersonHomeGroup}
        />
      )}
      {activeTab === 'Groups' && (
        <HomeGroupsTab
          state={state}
          onAddGroup={handlers.onAddHomeGroup}
          onUpdateGroup={handlers.onUpdateHomeGroup}
          onDeleteGroup={handlers.onDeleteHomeGroup}
          onTogglePersonGroup={handlers.onTogglePersonHomeGroup}
        />
      )}
    </Modal>
  );
}
