import { useRef, useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { CalendarX2, UsersRound } from 'lucide-react';
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
import { MobileScheduleView } from './schedule/MobileScheduleView';
import { StatusLegend } from './schedule/StatusLegend';
import { DndProvider } from './dnd/DndProvider';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button } from './ui/Button';
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
    updateNeverAutoAssign,
  } = usePeople(state, setState);
  const { assign, unassign, moveAssignment, swapAssignments, batchAssign, clearAndBatchAssign, assignments } = useAssignments(state, setState);
  const { addHomeGroup, updateHomeGroup, deleteHomeGroup, togglePersonHomeGroup, addHomeGroupPeriod, updateHomeGroupPeriod, deleteHomeGroupPeriod, reorderHomeGroupPeriods } = useHomeGroups(state, setState);
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
  const [syncError, setSyncError] = useState<string | null>(null);

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
  const cloudLoadingRef = useRef(false);
  useEffect(() => {
    if (!user) {
      loadedUserRef.current = null;
      return;
    }
    if (loadedUserRef.current === user.id) return;
    loadedUserRef.current = user.id;
    cloudLoadingRef.current = true;
    loadBoard(user.id).then(saved => {
      if (saved) setState(normalizeState(saved));
    }).finally(() => {
      cloudLoadingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-save board to Supabase (debounced 1s) when logged in
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    if (cloudLoadingRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBoard(state, user.id).then(err => setSyncError(err));
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, user]);

  // Dark mode: track system preference
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const isDark = state.theme === 'dark' || (state.theme === 'system' && systemDark);

  // Keep <html> in sync synchronously (not via useEffect) so CSS variables
  // like --person-cell-alpha on .dark are always correct before paint.
  document.documentElement.classList.toggle('dark', isDark);

  const toggleTheme = useCallback(() => {
    setState(prev => {
      const next = prev.theme === 'system' ? 'light' : prev.theme === 'light' ? 'dark' : 'system';
      return { ...prev, theme: next };
    });
  }, [setState]);

  const homeGroupPeriods = state.homeGroupPeriods ?? [];
  const lang = langFromDir(state.dir);
  const isMobile = useIsMobile();

  function handleExportExcel() {
    if (!activeSchedule) return;
    try {
      exportToExcel(state, activeSchedule, dates);
    } catch {
      toast.error(t('exportError', lang));
    }
  }

  function updateMinBreakHours(hours: number) {
    setState(prev => ({ ...prev, minBreakHours: hours }));
  }

  function updateIgnoreOnCallConstraints(value: boolean) {
    setState(prev => ({ ...prev, ignoreOnCallConstraints: value }));
  }

  function openSettings(tab?: string) {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  }

  function handleOpenAutoAssign() {
    if (!activeSchedule) return;
    // Always run with reassign=false — existing assignments are skipped automatically.
    // The reassign dialog (clear & redo) is only triggered from the preview modal itself.
    const result = autoAssign(activeSchedule, state.people, state.shifts, state.positions, state.minBreakHours, state.homeGroups, false, homeGroupPeriods, state.ignoreOnCallConstraints);
    setAutoAssignResult(result);
    setAutoAssignReassign(null);
    setAutoAssignOpen(true);
  }

  function handleConfirmReassign() {
    if (!activeSchedule) return;
    const result = autoAssign(activeSchedule, state.people, state.shifts, state.positions, state.minBreakHours, state.homeGroups, true, homeGroupPeriods, state.ignoreOnCallConstraints);
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
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      dir={state.dir}
      lang={state.dir === 'rtl' ? 'he' : 'en'}
      className="h-screen flex flex-col bg-gray-50 dark:bg-slate-950"
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
        hideSidebar={isMobile}
        onAutoAssign={handleOpenAutoAssign}
        onClearAssignments={() => clearAndBatchAssign([])}
        onOpenHomePeriods={() => setHomePeriodsOpen(true)}
        onToggleTheme={toggleTheme}
        userEmail={user?.email}
        syncError={syncError}
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
          {!isMobile && (
            <Sidebar
              state={state}
              assignments={assignments}
              onEditPerson={(id) => setSidebarEditPersonId(id)}
              onDeletePerson={(id) => deletePerson(id)}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          )}

          <main className="flex-1 overflow-hidden md:p-6 relative flex flex-col bg-gray-50 dark:bg-slate-950/50">
            {!activeSchedule ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center max-w-md w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-10 shadow-sm">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CalendarX2 className="w-10 h-10 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">{t('noSchedule', lang)}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">{t('noScheduleHint', lang)}</p>
                  <Button
                    onClick={() => setNewScheduleOpen(true)}
                    variant="primary"
                    className="w-full sm:w-auto px-8 py-2.5 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {t('newScheduleBtn', lang)}
                  </Button>
                </div>
              </div>
            ) : state.positions.length === 0 ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center max-w-md w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-10 shadow-sm">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UsersRound className="w-10 h-10 text-indigo-500 dark:text-indigo-400" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">{t('noPositions', lang)}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">{t('noPositionsHint', lang)}</p>
                  <Button
                    onClick={() => openSettings('Positions')}
                    variant="primary"
                    className="w-full sm:w-auto px-8 py-2.5 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {t('openSettings', lang)}
                  </Button>
                </div>
              </div>
            ) : isMobile ? (
              <MobileScheduleView
                state={state}
                dates={dates}
                assignments={assignments}
                homeGroupPeriods={homeGroupPeriods}
                onAssign={(cell, personId) => assign(cell, personId)}
                onUnassign={(cell) => unassign(cell)}
              />
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

      {/* Mobile bottom action bar */}
      {activeSchedule && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex gap-1.5 z-30">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 justify-center"
            onClick={handleOpenAutoAssign}
          >
            {t('autoAssign', lang)}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-center !bg-emerald-600 !border-emerald-600 !text-white"
            onClick={() => setHomePeriodsOpen(true)}
          >
            {t('homePeriods', lang)}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-center"
            onClick={handleExportExcel}
          >
            {t('excel', lang)}
          </Button>
        </div>
      )}

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
        onUpdateIgnoreOnCallConstraints={updateIgnoreOnCallConstraints}
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
        onUpdateNeverAutoAssign={updateNeverAutoAssign}
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
              onUpdateNeverAutoAssign={updateNeverAutoAssign}
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
        homeGroupPeriods={homeGroupPeriods}
        onConfirmReassign={handleConfirmReassign}
        onRequestReassign={(mode) => { setAutoAssignReassign(mode); setAutoAssignResult(null); }}
        onApply={handleApplyAutoAssign}
      />

      {homePeriodsOpen && (
        <HomePeriodsModal
          open={homePeriodsOpen}
          onClose={() => setHomePeriodsOpen(false)}
          state={state}
          onAddPeriod={addHomeGroupPeriod}
          onUpdatePeriod={updateHomeGroupPeriod}
          onDeletePeriod={deleteHomeGroupPeriod}
          onReorderPeriods={reorderHomeGroupPeriods}
        />
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={login}
        onRegister={register}
        lang={lang}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}
