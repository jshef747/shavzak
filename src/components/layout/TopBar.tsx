import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import type { AppState, Schedule } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { NewScheduleModal } from './NewScheduleModal';
import { QuickStartModal } from './QuickStartModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  state: AppState;
  activeSchedule: Schedule | null;
  printRef?: RefObject<HTMLDivElement | null>;
  onCreateSchedule: (name: string, start: string, end: string) => void;
  onDeleteSchedule: (id: string) => void;
  onSetActiveSchedule: (id: string | null) => void;
  onExportExcel: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onAutoAssign: () => void;
  onOpenHomePeriods: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  userEmail?: string;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  hideSidebar?: boolean;
  isAdmin?: boolean;
  onOpenMyProfile?: () => void;
  swapBadgeCount?: number;
  onOpenSwapPanel?: () => void;
}

export function TopBar({
  state,
  activeSchedule,
  onCreateSchedule,
  onDeleteSchedule,
  onSetActiveSchedule,
  onExportExcel,
  onOpenSettings,
  onToggleSidebar,
  onAutoAssign,
  onOpenHomePeriods,
  onToggleTheme,
  isDark,
  userEmail,
  onOpenAuthModal,
  onLogout,
  hideSidebar = false,
  isAdmin = true,
  onOpenMyProfile,
  swapBadgeCount = 0,
  onOpenSwapPanel,
}: Props) {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const lang = langFromDir(state.dir);

  // Auto-show Quick Start on first ever visit (no schedules yet)
  useEffect(() => {
    if (state.schedules.length === 0 && !localStorage.getItem('shavzak-guided')) {
      setGuideOpen(true);
      localStorage.setItem('shavzak-guided', '1');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: "?" opens the guide (when not in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') setGuideOpen(true);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <div className="no-print h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 flex items-center gap-4 shrink-0">
        {/* Hamburger — mobile LTR only (appears on left) */}
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle roster"
          className={`md:hidden rtl:hidden p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150 shrink-0 ${hideSidebar ? 'hidden' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Zone 1: Wordmark */}
        <span className="hidden md:block text-base font-semibold text-gray-900 dark:text-slate-100 shrink-0">שבצק</span>
        <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-slate-600 shrink-0" />

        {/* Zone 2: Schedule selector (admin only) */}
        {isAdmin ? (
          <div className="flex gap-2 items-center">
            <select
              aria-label={t('selectSchedule', lang)}
              className="text-sm rounded px-2 py-1 text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={state.activeScheduleId ?? ''}
              onChange={e => onSetActiveSchedule(e.target.value || null)}
            >
              <option value="">{t('selectSchedule', lang)}</option>
              {state.schedules.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              {t('newBtn', lang)}
            </Button>
            {activeSchedule && (
              <Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                {t('delete', lang)}
              </Button>
            )}
          </div>
        ) : (
          /* User view: show active schedule name read-only */
          activeSchedule && (
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate max-w-[160px]">
              {activeSchedule.name}
            </span>
          )
        )}

        {/* Zone 3: Right actions */}
        <div className="ml-auto rtl:ml-0 rtl:mr-auto flex items-center gap-2 shrink-0">
          {/* Admin-only action buttons */}
          {isAdmin && activeSchedule && (
            <>
              <Button variant="primary" size="sm" onClick={onAutoAssign} className="hidden md:inline-flex">
                {t('autoAssign', lang)}
              </Button>
              <Button variant="secondary" size="sm" onClick={onOpenHomePeriods}
                className="hidden md:inline-flex !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white">
                {t('homePeriods', lang)}
              </Button>
              <Button variant="secondary" size="sm" onClick={onExportExcel}
                className="hidden md:inline-flex">
                {t('excel', lang)}
              </Button>
            </>
          )}
          {/* User-role: My Profile + Swap Requests badge */}
          {!isAdmin && userEmail && (
            <>
              {onOpenMyProfile && (
                <Button variant="secondary" size="sm" onClick={onOpenMyProfile} className="hidden md:inline-flex">
                  {t('myProfile', lang)}
                </Button>
              )}
              {onOpenSwapPanel && (
                <button
                  onClick={onOpenSwapPanel}
                  className="relative p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150"
                  title={t('swapRequests', lang)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {swapBadgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {swapBadgeCount}
                    </span>
                  )}
                </button>
              )}
            </>
          )}
          {/* Auth: login / user+logout */}
          {userEmail ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden md:block text-xs text-gray-500 dark:text-slate-400 truncate max-w-[140px]">{userEmail}</span>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150 text-xs px-2"
              >
                {t('logout', lang)}
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150 text-xs px-2"
            >
              {t('login', lang)}
            </button>
          )}
          {/* Theme toggle: cycles system → light → dark → system */}
          <button
            onClick={onToggleTheme}
            title={state.theme === 'system' ? 'Auto (system)' : state.theme === 'light' ? 'Light mode' : 'Dark mode'}
            className="p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150"
          >
            {state.theme === 'dark' ? (
              /* Moon */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : state.theme === 'light' ? (
              /* Sun */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            ) : isDark ? (
              /* System + currently dark: moon with dot */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            ) : (
              /* System + currently light: monitor */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setGuideOpen(true)}
            title={t('quickStartTitle', lang)}
            className="p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150 text-sm font-bold leading-none"
          >
            ?
          </button>
          <button
            onClick={onOpenSettings}
            title={t('settingsTitle', lang)}
            className="p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {/* Hamburger — mobile RTL only (appears on right inside Zone 3) */}
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle roster"
            className={`ltr:hidden md:hidden rtl:ml-auto p-1.5 rounded-md border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-150 shrink-0 ${hideSidebar ? 'hidden' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        message={t('deleteScheduleConfirm', lang)}
        onConfirm={() => { if (activeSchedule) onDeleteSchedule(activeSchedule.id); setDeleteConfirmOpen(false); }}
        onCancel={() => setDeleteConfirmOpen(false)}
        lang={lang}
      />
      <NewScheduleModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreateSchedule={onCreateSchedule}
        dir={state.dir}
      />
      <QuickStartModal open={guideOpen} onClose={() => setGuideOpen(false)} dir={state.dir} />
    </>
  );
}
