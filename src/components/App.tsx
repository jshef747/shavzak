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
import { NewMobileScheduleView } from './schedule/NewMobileScheduleView';
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
import { WhatsNewModal } from './layout/WhatsNewModal';
import { SwapRequests } from './worker/SwapRequests';
import { exportToExcel } from '../utils/exportExcel';
import { autoAssign, type AutoAssignResult } from '../utils/autoAssign';
import { WHATS_NEW_VERSION } from '../constants';
import { RoleContextProvider, useRoleContext } from '../contexts/RoleContext';

// ─── Inner App (has access to RoleContext) ────────────────────────────────────

function AppInner() {
  const { state, setState } = useAppState();
  const { activeSchedule, createSchedule, deleteSchedule, setActiveSchedule, setOnCallDurationOverride } = useSchedule(state, setState);
  const { addShift, updateShift, deleteShift, reorderShifts } = useShifts(state, setState);
  const { addPosition, updatePosition, deletePosition, toggleOnCall, updateOnCallDuration, reorderPositions } = usePositions(state, setState);
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
  const [swapsOpen, setSwapsOpen] = useState(false);
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Auth + cloud sync
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const {
    loadBoard, loadBoardById, saveBoard,
    fetchUserBoards, updateWorkerConstraints,
    createInvite, acceptInvite,
  } = useCloudSync();
  const {
    shiftSets, positionSets,
    addShiftSet, deleteShiftSet,
    addPositionSet, deletePositionSet,
  } = usePresets(user?.id ?? null);

  // Role context
  const { isAdmin, isWorker, current: currentRole, boards, setBoards, switchBoard, workerPersonId } = useRoleContext();

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

  // Check URL for invite token on first load
  const inviteTokenFromUrl = new URLSearchParams(window.location.search).get('invite');

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

    fetchUserBoards(user.id).then(async (allBoards) => {
      setBoards(allBoards);

      // If the user arrived via an invite link and has no worker boards yet, accept it
      if (inviteTokenFromUrl && !allBoards.some(b => b.role === 'worker')) {
        try {
          const person = state.people.find(p => p.id) ?? null;
          const displayName = person?.name ?? user.email?.split('@')[0] ?? 'Worker';
          await acceptInvite(inviteTokenFromUrl, displayName);
          // Reload boards after accepting
          const refreshed = await fetchUserBoards(user.id);
          setBoards(refreshed);
          // Strip the token from the URL without a reload
          const url = new URL(window.location.href);
          url.searchParams.delete('invite');
          window.history.replaceState({}, '', url.toString());
        } catch {
          // Non-critical; user can always retry
        }
      }

      // Determine which board to load (prefer worker board if arrived via invite)
      const defaultBoard = allBoards[0];
      if (!defaultBoard) return;

      let saved: AppState | null;
      if (defaultBoard.role === 'admin') {
        saved = await loadBoard(user.id);
      } else {
        saved = await loadBoardById(defaultBoard.boardId);
      }

      if (saved) setState(normalizeState(saved));
    }).finally(() => {
      cloudLoadingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When user switches board, load the new board's data
  const prevBoardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentRole || !user) return;
    if (prevBoardIdRef.current === currentRole.boardId) return;
    prevBoardIdRef.current = currentRole.boardId;

    cloudLoadingRef.current = true;
    const load = currentRole.role === 'admin'
      ? loadBoard(user.id)
      : loadBoardById(currentRole.boardId);

    load.then(saved => {
      if (saved) setState(normalizeState(saved));
    }).finally(() => {
      cloudLoadingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole?.boardId]);

  // Auto-save board to Supabase (debounced 1s) when logged in as admin
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!user || !isAdmin) return;
    if (cloudLoadingRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBoard(state, user.id).then(err => setSyncError(err));
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, user, isAdmin]);

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

  function updateAvoidHalfShifts(value: boolean) {
    setState(prev => ({ ...prev, avoidHalfShifts: value }));
  }

  function openSettings(tab?: string) {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  }

  function handleOpenAutoAssign() {
    if (!activeSchedule) return;
    const result = autoAssign(activeSchedule, state.people, state.shifts, state.positions, state.minBreakHours, state.homeGroups, false, homeGroupPeriods, state.ignoreOnCallConstraints, state.avoidHalfShifts, activeSchedule.onCallDurationOverrides);
    setAutoAssignResult(result);
    setAutoAssignReassign(null);
    setAutoAssignOpen(true);
  }

  function handleConfirmReassign() {
    if (!activeSchedule) return;
    const result = autoAssign(activeSchedule, state.people, state.shifts, state.positions, state.minBreakHours, state.homeGroups, true, homeGroupPeriods, state.ignoreOnCallConstraints, state.avoidHalfShifts, activeSchedule.onCallDurationOverrides);
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

  // Worker: save own constraints via the atomic RPC (no full-board overwrite)
  async function handleWorkerSaveConstraints(personId: string) {
    if (!currentRole || !workerPersonId) return;
    const person = state.people.find(p => p.id === personId);
    if (!person) return;
    const err = await updateWorkerConstraints(
      currentRole.boardId,
      personId,
      person.constraints,
      person.unavailability,
    );
    if (err) toast.error(err);
  }
  void handleWorkerSaveConstraints; // suppress unused warning — called by PersonEditor in worker mode

  // Admin: generate / copy invite link
  async function handleOpenInviteLink() {
    if (!currentRole) return;
    setInviteLinkOpen(true);
    if (!inviteToken) {
      const token = await createInvite(currentRole.boardId);
      setInviteToken(token);
    }
  }

  const inviteUrl = inviteToken
    ? `${window.location.origin}${window.location.pathname}?invite=${inviteToken}`
    : null;

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  // Show a minimal spinner while Supabase resolves the session
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isHe = lang === 'he';

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
        // Role props
        isAdmin={isAdmin}
        isWorker={isWorker}
        boards={boards}
        currentBoardId={currentRole?.boardId ?? null}
        onSwitchBoard={switchBoard}
        onOpenInviteLink={isAdmin && user ? handleOpenInviteLink : undefined}
        onOpenSwaps={user ? () => setSwapsOpen(true) : undefined}
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
              onEditPerson={(id) => {
                // Workers can only open their own person editor
                if (isAdmin || id === workerPersonId) setSidebarEditPersonId(id);
              }}
              onDeletePerson={(id) => { if (isAdmin) deletePerson(id); }}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onCallDurationOverrides={activeSchedule?.onCallDurationOverrides}
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
                  {isAdmin && (
                    <Button
                      onClick={() => setNewScheduleOpen(true)}
                      variant="primary"
                      className="w-full sm:w-auto px-8 py-2.5 text-base shadow-md hover:shadow-lg transition-all"
                    >
                      {t('newScheduleBtn', lang)}
                    </Button>
                  )}
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
                  {isAdmin && (
                    <Button
                      onClick={() => openSettings('Positions')}
                      variant="primary"
                      className="w-full sm:w-auto px-8 py-2.5 text-base shadow-md hover:shadow-lg transition-all"
                    >
                      {t('openSettings', lang)}
                    </Button>
                  )}
                </div>
              </div>
            ) : isMobile ? (
              <NewMobileScheduleView
                state={state}
                dates={dates}
                assignments={assignments}
                homeGroupPeriods={homeGroupPeriods}
                onAssign={(cell, personId) => { if (isAdmin) assign(cell, personId); }}
                onUnassign={(cell) => { if (isAdmin) unassign(cell); }}
                onCallDurationOverrides={activeSchedule?.onCallDurationOverrides}
              />
            ) : (
              <ScheduleView
                ref={printRef}
                state={state}
                dates={dates}
                assignments={assignments}
                homeGroupPeriods={homeGroupPeriods}
                onCallDurationOverrides={activeSchedule?.onCallDurationOverrides}
                onSetOnCallDuration={(date, posId, hours) => { if (isAdmin) setOnCallDurationOverride(date, posId, hours); }}
              />
            )}
            <StatusLegend dir={state.dir} />
          </main>
        </div>
      </DndProvider>

      {/* Mobile floating bottom action bar */}
      {activeSchedule && isAdmin && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-end pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] px-3 pointer-events-none">
          <div className="w-full pointer-events-auto bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-gray-200/60 dark:border-slate-700/40 px-2 py-2 flex gap-1.5">
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
        </div>
      )}

      {/* Settings — admin only */}
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
          onUpdateIgnoreOnCallConstraints={updateIgnoreOnCallConstraints}
          onUpdateAvoidHalfShifts={updateAvoidHalfShifts}
          onAddPosition={addPosition}
          onUpdatePosition={updatePosition}
          onDeletePosition={deletePosition}
          onToggleOnCall={toggleOnCall}
          onUpdateOnCallDuration={updateOnCallDuration}
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
      )}

      {/* Worker can edit their own person's constraints from the sidebar */}
      {sidebarEditPersonId && (() => {
        const person = state.people.find(p => p.id === sidebarEditPersonId);
        // Workers can only edit their own person
        const canEdit = isAdmin || (isWorker && sidebarEditPersonId === workerPersonId);
        return person && canEdit ? (
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
              onToggleQualification={isAdmin ? toggleQualification : () => {}}
              onToggleUnavailability={toggleUnavailability}
              onToggleConstraintShift={isAdmin ? toggleConstraintShift : () => {}}
              onToggleConstraintBlockedShift={isAdmin ? toggleConstraintBlockedShift : () => {}}
              onToggleConstraintDay={isAdmin ? toggleConstraintDay : () => {}}
              onToggleConstraintBlockedDay={isAdmin ? toggleConstraintBlockedDay : () => {}}
              onUpdateConstraintMaxWeek={isAdmin ? updateConstraintMaxWeek : () => {}}
              onUpdateConstraintMaxTotal={isAdmin ? updateConstraintMaxTotal : () => {}}
              onUpdateConstraintMaxConsecutive={isAdmin ? updateConstraintMaxConsecutive : () => {}}
              onUpdateConstraintMinRest={isAdmin ? updateConstraintMinRest : () => {}}
              onUpdateForceMinimum={isAdmin ? updateForceMinimum : () => {}}
              onUpdateNeverAutoAssign={isAdmin ? updateNeverAutoAssign : () => {}}
              onDelete={isAdmin ? (id) => { deletePerson(id); setSidebarEditPersonId(null); } : () => {}}
              onClose={() => setSidebarEditPersonId(null)}
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
          homeGroupPeriods={homeGroupPeriods}
          onConfirmReassign={handleConfirmReassign}
          onRequestReassign={(mode) => { setAutoAssignReassign(mode); setAutoAssignResult(null); }}
          onApply={handleApplyAutoAssign}
          onCallDurationOverrides={activeSchedule?.onCallDurationOverrides}
        />
      )}

      {homePeriodsOpen && isAdmin && (
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
        inviteToken={inviteTokenFromUrl ?? undefined}
        onAcceptInvite={acceptInvite}
        onInviteAccepted={async () => {
          if (!user) return;
          const refreshed = await fetchUserBoards(user.id);
          setBoards(refreshed);
          const url = new URL(window.location.href);
          url.searchParams.delete('invite');
          window.history.replaceState({}, '', url.toString());
        }}
      />

      <WhatsNewModal
        open={state.seenWhatsNewVersion !== WHATS_NEW_VERSION}
        onClose={() => setState(prev => ({ ...prev, seenWhatsNewVersion: WHATS_NEW_VERSION }))}
        dir={state.dir}
      />

      {/* Shift swaps modal */}
      {user && currentRole && (
        <SwapRequests
          open={swapsOpen}
          onClose={() => setSwapsOpen(false)}
          boardId={currentRole.boardId}
          workerPersonId={workerPersonId}
          state={state}
          activeScheduleId={activeSchedule?.id ?? null}
          lang={lang}
        />
      )}

      {/* Invite link modal (admin only) */}
      {inviteLinkOpen && (
        <Modal
          open={inviteLinkOpen}
          onClose={() => { setInviteLinkOpen(false); setInviteCopied(false); }}
          title={isHe ? 'קישור הזמנה לעובדים' : 'Worker Invite Link'}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {isHe
                ? 'שתף קישור זה עם עובדים כדי שיוכלו להצטרף ללוח שלך. הם יוכלו לראות את הלוח ולהכניס אילוצים.'
                : 'Share this link with workers so they can join your board. They can view the schedule and enter their constraints.'}
            </p>
            {inviteUrl ? (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-gray-700 dark:text-slate-300 focus:outline-none"
                />
                <Button variant="primary" size="sm" onClick={handleCopyInvite}>
                  {inviteCopied ? (isHe ? 'הועתק!' : 'Copied!') : (isHe ? 'העתק' : 'Copy')}
                </Button>
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </Modal>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}

// ─── Root App: wraps with RoleContextProvider ─────────────────────────────────

export function App() {
  return (
    <RoleContextProvider>
      <AppInner />
    </RoleContextProvider>
  );
}
