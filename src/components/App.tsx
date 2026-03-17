import { useRef, useState, useEffect, useCallback } from 'react';
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
import { useProfile } from '../hooks/useProfile';
import { useBoardMembers } from '../hooks/useBoardMembers';
import { useInvites } from '../hooks/useInvites';
import { useSwapRequests } from '../hooks/useSwapRequests';
import { langFromDir, t } from '../utils/i18n';
import { normalizeState } from '../utils/normalizeState';
import type { Shift, Position, AppState, CellAddress } from '../types';
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
import { WaitingScreen } from './layout/WaitingScreen';
import { SwapRequestModal } from './swap/SwapRequestModal';
import { SwapRequestPanel } from './swap/SwapRequestPanel';
import { exportToExcel } from '../utils/exportExcel';
import { autoAssign, type AutoAssignResult } from '../utils/autoAssign';
import { supabase } from '../lib/supabase';

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

  // Board ID for non-admin users
  const [boardId, setBoardId] = useState<string | null>(null);

  // Swap request modal/panel state
  const [swapRequestCell, setSwapRequestCell] = useState<CellAddress | null>(null);
  const [swapPanelOpen, setSwapPanelOpen] = useState(false);

  // Invite token from URL (e.g. ?invite=<uuid>)
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
  });

  // Auth + cloud sync
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const { loadBoard, saveBoard, subscribeToBoardChanges, savePersonPreferences } = useCloudSync();
  const { isAdmin, loadingProfile, allProfiles, updateRole } = useProfile(user?.id ?? null);
  const { members, unlinkMember } = useBoardMembers(boardId, isAdmin);
  const { inviteUrl, generateInvite, revokeInvite } = useInvites(boardId, isAdmin);
  const {
    shiftSets, positionSets,
    addShiftSet, deleteShiftSet,
    addPositionSet, deletePositionSet,
  } = usePresets(user?.id ?? null);

  // Derive myPersonId for non-admin users
  const myPersonId = members.find(m => m.user_id === user?.id)?.person_id ?? null;

  // Swap requests
  const {
    incomingRequests,
    outgoingRequests,
    requestSwap,
    approveSwap,
    rejectSwap,
    cancelSwap,
  } = useSwapRequests(boardId, myPersonId);

  const pendingSwapCount = incomingRequests.filter(r => r.status === 'pending').length;

  function handleLoadShiftSet(shifts: Omit<Shift, 'id'>[]) {
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

  // Load board from Supabase when user logs in (wait for profile to resolve first)
  const loadedUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || loadingProfile) {
      if (!user) loadedUserRef.current = null;
      return;
    }
    if (loadedUserRef.current === user.id) return;
    loadedUserRef.current = user.id;

    loadBoard(user.id, isAdmin).then(({ state: saved, boardId: bId }) => {
      if (saved) setState(normalizeState(saved));
      setBoardId(bId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingProfile, isAdmin]);

  // Auto-save board to Supabase (debounced 1s) — admin only
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!user || !isAdmin) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBoard(state, user.id);
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, user, isAdmin]);

  // Non-admin users subscribe to live board changes
  useEffect(() => {
    if (!boardId || isAdmin) return;
    const channel = subscribeToBoardChanges(boardId, (newState) => {
      setState(normalizeState(newState));
    });
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, isAdmin]);

  // Open auth modal automatically if invite token is present and user is not logged in
  useEffect(() => {
    if (inviteToken && !user && !authLoading) {
      setAuthModalOpen(true);
    }
  }, [inviteToken, user, authLoading]);

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

  // Keep <html> in sync so dark: variants work in portals / fixed elements
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setState(prev => {
      const next = prev.theme === 'system' ? 'light' : prev.theme === 'light' ? 'dark' : 'system';
      return { ...prev, theme: next };
    });
  }, [setState]);

  const homeGroupPeriods = activeSchedule?.homeGroupPeriods ?? [];
  const lang = langFromDir(state.dir);
  const isMobile = useIsMobile();

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

  async function handleJoinBoard(personName: string, positionId: string) {
    if (!inviteToken) return;
    await supabase.rpc('join_board', {
      invite_token: inviteToken,
      person_name: personName,
      position_id: positionId,
    });
    // Clear invite token from URL and state
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
    setInviteToken(null);
    // Reload board membership (profile will now be 'user')
    loadedUserRef.current = null;
  }

  // Save person preferences (non-admin users updating their own constraints)
  async function handleSavePersonPreferences(
    constraints: AppState['people'][0]['constraints'],
    unavailability: AppState['people'][0]['unavailability'],
  ) {
    if (!boardId || !myPersonId) return;
    await savePersonPreferences(boardId, myPersonId, constraints, unavailability);
  }

  // Show a minimal spinner while Supabase resolves the session
  if (authLoading || (user && loadingProfile)) {
    return (
      <div className={`h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950${isDark ? ' dark' : ''}`}>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Non-admin user with no board membership yet (edge case: joined but board_members missing)
  if (user && !isAdmin && !myPersonId && !loadingProfile && boardId === null && loadedUserRef.current === user.id) {
    return (
      <WaitingScreen
        lang={lang}
        userEmail={user.email}
        onLogout={logout}
      />
    );
  }

  return (
    <div
      dir={state.dir}
      lang={state.dir === 'rtl' ? 'he' : 'en'}
      className={`h-screen flex flex-col bg-gray-50 dark:bg-slate-950${isDark ? ' dark' : ''}`}
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
        onOpenHomePeriods={() => setHomePeriodsOpen(true)}
        onToggleTheme={toggleTheme}
        isDark={isDark}
        userEmail={user?.email}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={logout}
        isAdmin={isAdmin}
        onOpenMyProfile={!isAdmin && myPersonId ? () => setSidebarEditPersonId(myPersonId) : undefined}
        swapBadgeCount={pendingSwapCount}
        onOpenSwapPanel={!isAdmin ? () => setSwapPanelOpen(v => !v) : undefined}
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
        isAdmin={isAdmin}
      >
        <div className="flex flex-1 overflow-hidden">
          {!isMobile && isAdmin && (
            <Sidebar
              state={state}
              assignments={assignments}
              onEditPerson={(id) => setSidebarEditPersonId(id)}
              onDeletePerson={(id) => deletePerson(id)}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              isAdmin={isAdmin}
            />
          )}

          <main className="flex-1 overflow-hidden md:p-4 relative flex flex-col bg-gray-50 dark:bg-slate-950">
            {exportError && (
              <div className="mb-3 flex items-center justify-between gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg shrink-0">
                <span>{exportError}</span>
                <button onClick={() => setExportError('')} className="text-red-400 hover:text-red-700 font-bold leading-none shrink-0">×</button>
              </div>
            )}
            {!activeSchedule ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center space-y-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600 dark:text-slate-400">{t('noSchedule', lang)}</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500">{t('noScheduleHint', lang)}</p>
                  {isAdmin && (
                    <button
                      onClick={() => setNewScheduleOpen(true)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
                    >
                      {t('newScheduleBtn', lang)}
                    </button>
                  )}
                </div>
              </div>
            ) : state.positions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center space-y-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-600 dark:text-slate-400">{t('noPositions', lang)}</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500">{t('noPositionsHint', lang)}</p>
                  {isAdmin && (
                    <button
                      onClick={() => openSettings('Positions')}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
                    >
                      {t('openSettings', lang)}
                    </button>
                  )}
                </div>
              </div>
            ) : isMobile ? (
              <MobileScheduleView
                state={state}
                dates={dates}
                assignments={assignments}
                homeGroupPeriods={homeGroupPeriods}
                onAssign={isAdmin ? (cell, personId) => assign(cell, personId) : undefined}
                onUnassign={isAdmin ? (cell) => unassign(cell) : undefined}
                isAdmin={isAdmin}
                myPersonId={myPersonId}
                onRequestSwap={!isAdmin ? (cell: CellAddress) => setSwapRequestCell(cell) : undefined}
              />
            ) : (
              <ScheduleView
                ref={printRef}
                state={state}
                dates={dates}
                assignments={assignments}
                homeGroupPeriods={homeGroupPeriods}
                isAdmin={isAdmin}
                myPersonId={myPersonId}
                onRequestSwap={!isAdmin ? (cell) => setSwapRequestCell(cell) : undefined}
              />
            )}
            <StatusLegend dir={state.dir} />
          </main>
        </div>

        {/* Swap request panel for non-admin users */}
        {!isAdmin && swapPanelOpen && (
          <SwapRequestPanel
            state={state}
            assignments={assignments}
            myPersonId={myPersonId ?? ''}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onApprove={approveSwap}
            onReject={rejectSwap}
            onCancel={cancelSwap}
          />
        )}
      </DndProvider>

      {/* Mobile bottom action bar */}
      {activeSchedule && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex gap-1.5 z-30">
          {isAdmin && (
            <>
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
            </>
          )}
          {!isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => setSwapPanelOpen(v => !v)}
            >
              {t('swapRequests', lang)}
              {pendingSwapCount > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {pendingSwapCount}
                </span>
              )}
            </Button>
          )}
        </div>
      )}

      {isAdmin && (
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
          isAdmin={isAdmin}
          boardId={boardId}
          members={members}
          allProfiles={allProfiles}
          inviteUrl={inviteUrl}
          onGenerateInvite={generateInvite}
          onRevokeInvite={revokeInvite}
          onUnlinkMember={unlinkMember}
          onUpdateRole={updateRole}
        />
      )}

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
              onToggleQualification={isAdmin ? toggleQualification : undefined}
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
              onDelete={isAdmin ? (id) => { deletePerson(id); setSidebarEditPersonId(null); } : undefined}
              onClose={() => {
                setSidebarEditPersonId(null);
                // For non-admin users, save preferences when closing their editor
                if (!isAdmin && myPersonId === sidebarEditPersonId) {
                  const updatedPerson = state.people.find(p => p.id === sidebarEditPersonId);
                  if (updatedPerson) {
                    handleSavePersonPreferences(updatedPerson.constraints, updatedPerson.unavailability);
                  }
                }
              }}
            />
          </Modal>
        ) : null;
      })()}

      {isAdmin && (
        <NewScheduleModal
          open={newScheduleOpen}
          onClose={() => setNewScheduleOpen(false)}
          onCreateSchedule={createSchedule}
          dir={state.dir}
        />
      )}

      {isAdmin && (
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
      )}

      {isAdmin && activeSchedule && (
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
        onClose={() => { setAuthModalOpen(false); }}
        onLogin={login}
        onRegister={register}
        lang={lang}
        inviteToken={inviteToken ?? undefined}
        invitePositions={inviteToken ? state.positions : undefined}
        onJoinBoard={inviteToken ? handleJoinBoard : undefined}
      />

      {/* Swap request modal (non-admin users) */}
      {!isAdmin && myPersonId && swapRequestCell && (
        <SwapRequestModal
          open
          onClose={() => setSwapRequestCell(null)}
          state={state}
          assignments={assignments}
          myPersonId={myPersonId}
          myCell={swapRequestCell}
          boardId={boardId ?? ''}
          onSubmit={requestSwap}
        />
      )}
    </div>
  );
}
