import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { AppState, Shift, UnavailabilityEntry, DayOfWeek, Position } from '../../types';
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
  onUpdateIgnoreOnCallConstraints: (value: boolean) => void;
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

const TABS = ['Shifts', 'Positions', 'People', 'Groups'];

export function MobileSettingsView({
  open, onClose, state, dates, initialTab,
  shiftSets, positionSets,
  onAddShiftSet, onDeleteShiftSet, onLoadShiftSet,
  onAddPositionSet, onDeletePositionSet, onLoadPositionSet,
  isLoggedIn,
  ...handlers
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Shifts');
  const lang = langFromDir(state.dir);
  const isRtl = state.dir === 'rtl';
  const isDark = state.theme === 'dark' || (state.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const surface = isDark ? '#0f172a' : '#f7f9fb';
  const surfaceCard = isDark ? '#1e293b' : '#ffffff';
  const onSurface = isDark ? '#f1f5f9' : '#2c3437';
  const onSurfaceVariant = isDark ? '#94a3b8' : '#596064';
  const tabBg = isDark ? 'rgba(30,41,59,0.9)' : 'rgba(247,249,251,0.95)';
  const outlineVariant = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(172,179,183,0.2)';
  const primaryColor = '#005bc4';

  const tabLabels = [
    t('tabShifts', lang),
    t('tabPositions', lang),
    t('tabPeople', lang),
    t('tabGroups', lang),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      dir={state.dir}
      style={{ backgroundColor: surface }}
    >
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3"
        style={{
          backgroundColor: surfaceCard,
          borderBottom: `1px solid ${outlineVariant}`,
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-70 transition-opacity shrink-0"
          style={{ backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : '#eaeff2' }}
        >
          {isRtl
            ? <ArrowRight className="w-5 h-5" style={{ color: onSurface }} strokeWidth={2} />
            : <ArrowLeft className="w-5 h-5" style={{ color: onSurface }} strokeWidth={2} />
          }
        </button>
        <h1 className="text-base font-bold font-heebo flex-1" style={{ color: onSurface }}>
          {t('settingsTitle', lang)}
        </h1>
      </div>

      {/* Pill tab strip */}
      <div
        className="shrink-0 px-4 py-2.5 overflow-x-auto"
        style={{
          backgroundColor: tabBg,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${outlineVariant}`,
          scrollbarWidth: 'none',
        }}
      >
        <div className="flex gap-2">
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="shrink-0 px-4 py-2 rounded-full text-sm font-bold font-heebo transition-colors duration-150 active:opacity-80"
                style={isActive
                  ? { backgroundColor: primaryColor, color: '#f9f8ff' }
                  : { backgroundColor: isDark ? 'rgba(148,163,184,0.1)' : '#eaeff2', color: onSurfaceVariant }
                }
              >
                {tabLabels[i]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: surface }}>
        <div className="p-4 space-y-4">
          {activeTab === 'Shifts' && (
            <ShiftsTab
              state={state}
              onAdd={handlers.onAddShift}
              onUpdate={handlers.onUpdateShift}
              onDelete={handlers.onDeleteShift}
              onReorder={handlers.onReorderShifts}
              onUpdateMinBreakHours={handlers.onUpdateMinBreakHours}
              onUpdateIgnoreOnCallConstraints={handlers.onUpdateIgnoreOnCallConstraints}
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
        </div>
      </div>
    </div>
  );
}
