import { useRef, useState, useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useSchedule } from '../hooks/useSchedule';
import { useShifts } from '../hooks/useShifts';
import { usePositions } from '../hooks/usePositions';
import { usePeople } from '../hooks/usePeople';
import { useAssignments } from '../hooks/useAssignments';
import { useHomeGroups } from '../hooks/useHomeGroups';
import { useDateRange } from '../hooks/useDateRange';
import { useAuth } from '../hooks/useAuth';
import { useCloudSync } from '../hooks/useCloudSync';
import { usePresets } from '../hooks/usePresets';
import { langFromDir, t } from '../utils/i18n';
import { normalizeState } from '../utils/normalizeState';
import type { Shift, Position, AppState } from '../types';
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
import { AuthModal } from './auth/AuthModal';
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
    updateForceMinimum,
  } = usePeople(state, setState);
  const { assign, unassign, moveAssignment, swapAssignments, batchAssign, clearAndBatchAssign, assignments } = useAssignments(state, setState);
  const { addHomeGroup, updateHomeGroup, deleteHomeGroup, togglePersonHomeGroup, addHomeGroupPeriod, deleteHomeGroupPeriod } = useHomeGroups(state, setState);
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [exportError, setExportError] = useState('');

  // Auth + cloud sync
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const { loadBoard, saveBoard } = useCloudSync();
  const {
    shiftSets, positionSets,
    addShiftSet, deleteShiftSet,
    addPositionSet, deletePositionSet,
  } = usePresets(user?.id ?? null);

  function handleLoadShiftSet(shifts: Omit<Shift, 'id'>[]) {
    // Keep minBreakHours etc, just replace shifts entirely
    setState((prev: AppState) => ({
      ...prev,
      shifts: shifts.map(s => ({ ...s, id: crypto.randomUUID() })) as Shift[]
    }));
  }

  function handleLoadPositionSet(positions: Omit<Position, 'id'>[]) {
    setState((prev: AppState) => ({
      ...prev,
      positions: positions.map(p => ({ ...p, id: crypto.randomUUID() })) as Position[]
    }));
  }

  // Load board from Supabase when user logs in
  const loadedUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      loadedUserRef.current = null;
      return;
    }
    if (loadedUserRef.current === user.id) return;
    loadedUserRef.current = user.id;
    loadBoard(user.id).then(saved => {
      if (saved) setState(normalizeState(saved));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-save board to Supabase (debounced 1s) when logged in
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBoard(state, user.id);
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, user]);

  const homeGroupPeriods = activeSchedule?.homeGroupPeriods ?? [];
  const lang = langFromDir(state.dir);

  function handleExportExcel() {
    if (!activeSchedule) return;
    try {
      exportToExcel(state, activeSchedule, dates);
    } catch {
      setExportError(t('exportError', lang));
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

  // Show a minimal spinner while Supabase resolves the session
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      dir={state.dir}
      lang={state.dir === 'rtl' ? 'he' : 'en'}
      className="h-screen flex flex-col bg-gray-50"
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
        userEmail={user?.email}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={logout}
      />

      <DndProvider
        state={state}
        assignments={assignments}
        refDate={dates[0] ?? ''}
        onAssign={assign}
        onUnassign={unassign}
        onMove={moveAssignment}
        onSwap={swapAssignments}
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

          <main className="flex-1 overflow-hidden p-4 relative flex flex-col">
            {exportError && (
              <div className="mb-3 flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg shrink-0">
                <span>{exportError}</span>
                <button onClick={() => setExportError('')} className="text-red-400 hover:text-red-700 font-bold leading-none shrink-0">×</button>
              </div>
            )}
            {!activeSchedule ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center space-y-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600">{t('noSchedule', lang)}</p>
                  <p className="text-sm text-gray-400">{t('noScheduleHint', lang)}</p>
                  <button
                    onClick={() => setNewScheduleOpen(true)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
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
                  <p className="text-lg font-medium text-gray-600">{t('noPositions', lang)}</p>
                  <p className="text-sm text-gray-400">{t('noPositionsHint', lang)}</p>
                  <button
                    onClick={() => openSettings('Positions')}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
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
        onUpdateForceMinimum={updateForceMinimum}
        onAddHomeGroup={addHomeGroup}
        onUpdateHomeGroup={updateHomeGroup}
        onDeleteHomeGroup={deleteHomeGroup}
        onTogglePersonHomeGroup={togglePersonHomeGroup}
        shiftSets={shiftSets}
        positionSets={positionSets}
        onAddShiftSet={addShiftSet}
        onDeleteShiftSet={deleteShiftSet}
        onLoadShiftSet={handleLoadShiftSet}
        onAddPositionSet={addPositionSet}
        onDeletePositionSet={deletePositionSet}
        onLoadPositionSet={handleLoadPositionSet}
        isLoggedIn={!!user}
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
              onUpdateForceMinimum={updateForceMinimum}
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

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={login}
        onRegister={register}
        lang={lang}
      />
    </div>
  );
}
