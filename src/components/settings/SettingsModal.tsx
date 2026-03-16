import { useState, useEffect } from 'react';
import type { AppState, Shift, UnavailabilityEntry, DayOfWeek } from '../../types';
import type { PositionPreset, HourPreset } from '../../hooks/usePresets';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { langFromDir, t } from '../../utils/i18n';
import { ShiftsTab } from './ShiftsTab';
import { PositionsTab } from './PositionsTab';
import { PeopleTab } from './PeopleTab';
import { HomeGroupsTab } from './HomeGroupsTab';
import { PresetsTab } from './PresetsTab';

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
  positionPresets: PositionPreset[];
  hourPresets: HourPreset[];
  onAddPositionPreset: (name: string) => Promise<void>;
  onDeletePositionPreset: (id: string) => Promise<void>;
  onAddHourPreset: (name: string, start_time: string, end_time: string) => Promise<void>;
  onDeleteHourPreset: (id: string) => Promise<void>;
  isLoggedIn: boolean;
}

// Internal tab keys stay in English for logic comparisons
const TABS = ['Shifts', 'Positions', 'People', 'Groups', 'Presets'];

export function SettingsModal({
  open, onClose, state, dates, initialTab,
  positionPresets, hourPresets,
  onAddPositionPreset, onDeletePositionPreset,
  onAddHourPreset, onDeleteHourPreset,
  isLoggedIn,
  ...handlers
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Shifts');
  const lang = langFromDir(state.dir);

  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);

  const tabLabels = [t('tabShifts', lang), t('tabPositions', lang), t('tabPeople', lang), t('tabGroups', lang), t('tabPresets', lang)];

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
          hourPresets={hourPresets}
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
          positionPresets={positionPresets}
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
      {activeTab === 'Presets' && (
        <PresetsTab
          lang={lang}
          positionPresets={positionPresets}
          hourPresets={hourPresets}
          onAddPositionPreset={onAddPositionPreset}
          onDeletePositionPreset={onDeletePositionPreset}
          onAddHourPreset={onAddHourPreset}
          onDeleteHourPreset={onDeleteHourPreset}
          isLoggedIn={isLoggedIn}
        />
      )}
    </Modal>
  );
}
