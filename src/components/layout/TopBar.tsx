import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { Menu, Settings, Moon, Sun, Monitor, HelpCircle, Trash2, LogIn, LogOut, Eraser, CloudOff } from 'lucide-react';
import type { AppState, Schedule } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { IconButton } from '../ui/IconButton';
import { NewScheduleModal } from './NewScheduleModal';
import { QuickStartModal } from './QuickStartModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

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
  onClearAssignments: () => void;
  onOpenHomePeriods: () => void;
  onToggleTheme: () => void;
  userEmail?: string;
  syncError?: string | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  hideSidebar?: boolean;
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
  onClearAssignments,
  onOpenHomePeriods,
  onToggleTheme,
  userEmail,
  syncError,
  onOpenAuthModal,
  onLogout,
  hideSidebar = false,
}: Props) {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
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
      <div className="no-print h-[60px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800/80 px-4 flex items-center gap-4 shrink-0 shadow-sm relative z-40">
        {/* Hamburger — mobile LTR only (appears on left) */}
        <IconButton
          icon={<Menu className="w-5 h-5" strokeWidth={2} />}
          onClick={onToggleSidebar}
          aria-label="Toggle roster"
          className={`md:hidden rtl:hidden shrink-0 ${hideSidebar ? 'hidden' : ''}`}
        />

        {/* Zone 1: Wordmark */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
            <span className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'system-ui' }}>ש</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-slate-100 tracking-tight">שבצק</span>
        </div>
        <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-slate-700 shrink-0 mx-2" />

        {/* Zone 2: Schedule selector */}
        <div className="flex gap-2.5 items-center flex-1 md:flex-none">
          <Select
            aria-label={t('selectSchedule', lang)}
            value={state.activeScheduleId ?? ''}
            onChange={e => onSetActiveSchedule(e.target.value || null)}
            className="!py-1.5 !px-3 !bg-gray-50 dark:!bg-slate-800/50 !border-gray-200 dark:!border-slate-700 hover:!border-gray-300 dark:hover:!border-slate-600 transition-colors shadow-none font-medium min-w-[160px]"
          >
            <option value="">{t('selectSchedule', lang)}</option>
            {state.schedules.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="hidden sm:inline-flex text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            {t('newBtn', lang)}
          </Button>
          {activeSchedule && (
            <IconButton
              icon={<Trash2 className="w-4 h-4" strokeWidth={2} />}
              onClick={() => setDeleteConfirmOpen(true)}
              title={t('deleteSchedule', lang)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
            />
          )}
        </div>

        {/* Zone 3: Right actions */}
        <div className="ms-auto flex items-center gap-2 shrink-0">
          {activeSchedule && (
            <div className="hidden lg:flex items-center gap-2 me-4 p-1 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700/50">
              <Button variant="ghost" size="sm" onClick={onAutoAssign} className="text-gray-600 hover:text-gray-900">
                {t('autoAssign', lang)}
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenHomePeriods} className="text-gray-600 hover:text-gray-900">
                {t('homePeriods', lang)}
              </Button>
              <Button variant="ghost" size="sm" onClick={onExportExcel} className="text-gray-600 hover:text-gray-900">
                {t('excel', lang)}
              </Button>
            </div>
          )}

          {/* User Section */}
          <div className="flex items-center gap-2 border-s border-gray-200 dark:border-slate-700 ps-4">
            {userEmail ? (
              <>
                {syncError && (
                  <div
                    title={syncError}
                    className="no-print flex items-center gap-1.5 text-red-500 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full px-2 py-1"
                  >
                    <CloudOff className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="hidden sm:inline">{t('syncError', lang)}</span>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-full pe-2 ps-3 py-1 border border-gray-100 dark:border-slate-700/50">
                  <span className="text-xs font-medium text-gray-600 dark:text-slate-300 truncate max-w-[140px]">{userEmail}</span>
                  <button
                    onClick={onLogout}
                    className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {t('logout', lang)}
                  </button>
                </div>
                <IconButton
                  icon={<LogOut className="w-4 h-4" strokeWidth={2} />}
                  onClick={onLogout}
                  title={t('logout', lang)}
                  className="sm:hidden text-gray-500 hover:text-gray-700"
                />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenAuthModal}
                  className="hidden sm:inline-flex font-semibold text-blue-600"
                >
                  {t('login', lang)}
                </Button>
                <IconButton
                  icon={<LogIn className="w-4 h-4" strokeWidth={2} />}
                  onClick={onOpenAuthModal}
                  title={t('login', lang)}
                  className="sm:hidden text-blue-600"
                />
              </>
            )}

            {/* Global Actions */}
            <div className="flex items-center gap-1">
              <IconButton
                icon={
                  state.theme === 'dark' ? <Moon className="w-4 h-4" strokeWidth={2} /> :
                  state.theme === 'light' ? <Sun className="w-4 h-4" strokeWidth={2} /> :
                  <Monitor className="w-4 h-4" strokeWidth={2} />
                }
                onClick={onToggleTheme}
                title={state.theme === 'system' ? 'Auto (system)' : state.theme === 'light' ? 'Light mode' : 'Dark mode'}
              />
              <IconButton
                icon={<HelpCircle className="w-4 h-4" strokeWidth={2} />}
                onClick={() => setGuideOpen(true)}
                title={t('quickStartTitle', lang)}
              />
              <IconButton
                icon={<Settings className="w-4 h-4" strokeWidth={2} />}
                onClick={onOpenSettings}
                title={t('settingsTitle', lang)}
              />
            </div>
          </div>

          {/* Hamburger — mobile RTL only */}
          <IconButton
            icon={<Menu className="w-5 h-5" strokeWidth={2} />}
            onClick={onToggleSidebar}
            aria-label="Toggle roster"
            className={`ltr:hidden md:hidden shrink-0 ${hideSidebar ? 'hidden' : ''}`}
          />
        </div>
      </div>

      {/* Schedule actions dialog — delete or clear assignments */}
      {deleteConfirmOpen && (
        <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title={lang === 'he' ? 'פעולות לוח' : 'Schedule actions'} size="sm">
          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={() => { setClearConfirmOpen(true); setDeleteConfirmOpen(false); }}
              className="flex items-start gap-3 w-full text-start p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Eraser className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{lang === 'he' ? 'נקה שיבוצים' : 'Clear assignments'}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{lang === 'he' ? 'מחק את כל השיבוצים, שמור את הלוח' : 'Remove all assignments, keep the schedule'}</p>
              </div>
            </button>
            <button
              onClick={() => { if (activeSchedule) { onDeleteSchedule(activeSchedule.id); } setDeleteConfirmOpen(false); }}
              className="flex items-start gap-3 w-full text-start p-3 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('deleteSchedule', lang)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{lang === 'he' ? 'מחק את הלוח לצמיתות' : 'Permanently delete this schedule'}</p>
              </div>
            </button>
            <div className="flex justify-end pt-1 border-t border-gray-100 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmOpen(false)}>{t('cancel', lang)}</Button>
            </div>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={clearConfirmOpen}
        message={lang === 'he' ? 'למחוק את כל השיבוצים בלוח זה?' : 'Clear all assignments in this schedule?'}
        onConfirm={() => { onClearAssignments(); setClearConfirmOpen(false); }}
        onCancel={() => setClearConfirmOpen(false)}
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
