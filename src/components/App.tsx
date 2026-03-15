import { useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useShifts } from '../hooks/useShifts';
import { usePositions } from '../hooks/usePositions';
import { usePeople } from '../hooks/usePeople';
import { useAssignments } from '../hooks/useAssignments';
import { useHomeGroups } from '../hooks/useHomeGroups';
import { useDateRange } from '../hooks/useDateRange';
import { langFromDir, t } from '../utils/i18n';
import { TopBar } from './layout/TopBar';
import { Sidebar } from './layout/Sidebar';
import { ScheduleView } from './schedule/ScheduleView';
import { StatusLegend } from './schedule/StatusLegend';
import { DndProvider } from './dnd/DndProvider';
import { SettingsModal } from './settings/SettingsModal';
import { PersonEditor } from './settings/PersonEditor';
import { Modal } from './ui/Modal';
import { NewScheduleModal } from './layout/NewScheduleModal';
import { AutoAssignModal } from './layout/AutoAssignModal';
import { HomePeriodsModal } from './layout/HomePeriodsModal';
import { exportToExcel } from '../utils/exportExcel';
import { autoAssign, type AutoAssignResult } from '../utils/autoAssign';

export function App() {
  const { state, setState } = useAppState();
  const { activeSchedule, createSchedule, deleteSchedule, setActiveSchedule } = useSchedule(state, setState);
  const { addShift, updateShift, deleteShift, reorderShifts } = useShifts(state, setState);
  const { addPosition, updatePosition, deletePosition, toggleOnCall, reorderPositions } = usePositions(state, setState);
  const {
    addPerson, deletePerson, updatePersonName,
    toggleQualification, toggleUnavailability,
    toggleConstraintShift, toggleConstraintBlockedShift,
    toggleConstraintDay, toggleConstraintBlockedDay,
    updateConstraintMaxWeek, updateConstraintMaxTotal,
    updateConstraintMaxConsecutive, updateConstraintMinRest,
  } = usePeople(state, setState);
  const { assign, unassign, moveAssignment, batchAssign, clearAndBatchAssign, assignments } = useAssignments(state, setState);
  const { addHomeGroup, updateHomeGroup, deleteHomeGroup, setPersonHomeGroup, addHomeGroupPeriod, deleteHomeGroupPeriod } = useHomeGroups(state, setState);
  const dates = useDateRange(activeSchedule?.startDate ?? null, activeSchedule?.endDate ?? null);
  const printRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [sidebarEditPersonId, setSidebarEditPersonId] = useState<string | null>(null);
  const [newScheduleOpen, setNewScheduleOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<AutoAssignResult | null>(null);
  const [autoAssignReassign, setAutoAssignReassign] = useState<'partial' | 'full' | null>(null);
  const [homePeriodsOpen, setHomePeriodsOpen] = useState(false);

  const homeGroupPeriods = activeSchedule?.homeGroupPeriods ?? [];

  const lang = langFromDir(state.dir);

  function handleExportExcel() {
    if (!activeSchedule) return;
    try {
      exportToExcel(state, activeSchedule, dates);
    } catch {
      window.alert(t('exportError', lang));
    }
  }

  function updateMinBreakHours(hours: number) {
    setState(prev => ({ ...prev, minBreakHours: hours }));
  }

  function openSettings(tab?: string) {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  }

  function handleOpenAutoAssign() {
    if (!activeSchedule) return;
    if (activeSchedule.assignments.length > 0) {
      // Some or all cells are filled — show confirmation before reassigning
      const totalCells = dates.length * state.shifts.length * state.positions.length;
      const mode = activeSchedule.assignments.length >= totalCells ? 'full' : 'partial';
      setAutoAssignResult(null);
      setAutoAssignReassign(mode);
      setAutoAssignOpen(true);
    } else {
      const result = autoAssign(activeSchedule, state.people, state.shifts, state.positions, state.minBreakHours, state.homeGroups);
      setAutoAssignResult(result);
      setAutoAssignReassign(null);
      setAutoAssignOpen(true);
    }
  }

  function handleConfirmReassign() {
    if (!activeSchedule) return;
    const result = autoAssign(activeSchedule, state.people, state.shifts, state.positions, state.minBreakHours, state.homeGroups, true);
    setAutoAssignResult(result);
  }

  function handleApplyAutoAssign() {
    if (autoAssignResult) {
      if (autoAssignReassign) {
        clearAndBatchAssign(autoAssignResult.proposed);
      } else {
        batchAssign(autoAssignResult.proposed);
      }

    }
    setAutoAssignOpen(false);
    setAutoAssignResult(null);
    setAutoAssignReassign(null);
  }

  return (
    <div
      dir={state.dir}
      lang={state.dir === 'rtl' ? 'he' : 'en'}
      className="h-screen flex flex-col bg-gray-100"
    >
      <TopBar
        state={state}
        activeSchedule={activeSchedule}
        printRef={printRef}
        onCreateSchedule={createSchedule}
        onDeleteSchedule={deleteSchedule}
        onSetActiveSchedule={setActiveSchedule}
        onExportExcel={handleExportExcel}
        onOpenSettings={() => openSettings()}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onAutoAssign={handleOpenAutoAssign}
        onOpenHomePeriods={() => setHomePeriodsOpen(true)}
      />

      <DndProvider
        state={state}
        assignments={assignments}
        refDate={dates[0] ?? ''}
        onAssign={assign}
        onUnassign={unassign}
        onMove={moveAssignment}
        onDragStart={() => setSidebarOpen(false)}
      >
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            state={state}
            assignments={assignments}
            onEditPerson={(id) => setSidebarEditPersonId(id)}
            onDeletePerson={(id) => deletePerson(id)}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="flex-1 overflow-hidden p-4 relative">
            {!activeSchedule ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center space-y-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-600">{t('noSchedule', lang)}</p>
                  <p className="text-sm text-slate-400">{t('noScheduleHint', lang)}</p>
                  <button
                    onClick={() => setNewScheduleOpen(true)}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    {t('newScheduleBtn', lang)}
                  </button>
                </div>
              </div>
            ) : state.positions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center space-y-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-lg font-medium text-slate-600">{t('noPositions', lang)}</p>
                  <p className="text-sm text-slate-400">{t('noPositionsHint', lang)}</p>
                  <button
                    onClick={() => openSettings('Positions')}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    {t('openSettings', lang)}
                  </button>
                </div>
              </div>
            ) : (
              <ScheduleView
                ref={printRef}
                state={state}
                dates={dates}
                assignments={assignments}
                homeGroupPeriods={homeGroupPeriods}
              />
            )}
            <StatusLegend dir={state.dir} />
          </main>
        </div>
      </DndProvider>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        dates={dates}
        initialTab={settingsInitialTab}
        onAddShift={addShift}
        onUpdateShift={updateShift}
        onDeleteShift={deleteShift}
        onReorderShifts={reorderShifts}
        onUpdateMinBreakHours={updateMinBreakHours}
        onAddPosition={addPosition}
        onUpdatePosition={updatePosition}
        onDeletePosition={deletePosition}
        onToggleOnCall={toggleOnCall}
        onReorderPositions={reorderPositions}
        onAddPerson={addPerson}
        onDeletePerson={deletePerson}
        onUpdatePersonName={updatePersonName}
        onToggleQualification={toggleQualification}
        onToggleUnavailability={toggleUnavailability}
        onToggleConstraintShift={toggleConstraintShift}
        onToggleConstraintBlockedShift={toggleConstraintBlockedShift}
        onToggleConstraintDay={toggleConstraintDay}
        onToggleConstraintBlockedDay={toggleConstraintBlockedDay}
        onUpdateConstraintMaxWeek={updateConstraintMaxWeek}
        onUpdateConstraintMaxTotal={updateConstraintMaxTotal}
        onUpdateConstraintMaxConsecutive={updateConstraintMaxConsecutive}
        onUpdateConstraintMinRest={updateConstraintMinRest}
        onAddHomeGroup={addHomeGroup}
        onUpdateHomeGroup={updateHomeGroup}
        onDeleteHomeGroup={deleteHomeGroup}
        onSetPersonHomeGroup={setPersonHomeGroup}
      />

      {sidebarEditPersonId && (() => {
        const person = state.people.find(p => p.id === sidebarEditPersonId);
        return person ? (
          <Modal
            open
            onClose={() => setSidebarEditPersonId(null)}
            title={`${t('edit', lang)}: ${person.name}`}
            size="lg"
          >
            <PersonEditor
              person={person}
              state={state}
              dates={dates}
              onToggleQualification={toggleQualification}
              onToggleUnavailability={toggleUnavailability}
              onToggleConstraintShift={toggleConstraintShift}
              onToggleConstraintBlockedShift={toggleConstraintBlockedShift}
              onToggleConstraintDay={toggleConstraintDay}
              onToggleConstraintBlockedDay={toggleConstraintBlockedDay}
              onUpdateConstraintMaxWeek={updateConstraintMaxWeek}
              onUpdateConstraintMaxTotal={updateConstraintMaxTotal}
              onUpdateConstraintMaxConsecutive={updateConstraintMaxConsecutive}
              onUpdateConstraintMinRest={updateConstraintMinRest}
              onDelete={(id) => { deletePerson(id); setSidebarEditPersonId(null); }}
              onClose={() => setSidebarEditPersonId(null)}
            />
          </Modal>
        ) : null;
      })()}

      <NewScheduleModal
        open={newScheduleOpen}
        onClose={() => setNewScheduleOpen(false)}
        onCreateSchedule={createSchedule}
        dir={state.dir}
      />

      <AutoAssignModal
        open={autoAssignOpen}
        onClose={() => { setAutoAssignOpen(false); setAutoAssignResult(null); setAutoAssignReassign(null); }}
        result={autoAssignResult}
        reassign={autoAssignReassign}
        state={state}
        dates={dates}
        baseAssignments={activeSchedule?.assignments ?? []}
        homeGroupPeriods={activeSchedule?.homeGroupPeriods ?? []}
        onConfirmReassign={handleConfirmReassign}
        onApply={handleApplyAutoAssign}
      />

      {activeSchedule && (
        <HomePeriodsModal
          open={homePeriodsOpen}
          onClose={() => setHomePeriodsOpen(false)}
          state={state}
          activeSchedule={activeSchedule}
          onAddPeriod={addHomeGroupPeriod}
          onDeletePeriod={deleteHomeGroupPeriod}
        />
      )}
    </div>
  );
}
