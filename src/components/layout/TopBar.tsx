import { useState, type RefObject } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { AppState, Schedule } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { NewScheduleModal } from './NewScheduleModal';
import { QuickStartModal } from './QuickStartModal';

interface Props {
  state: AppState;
  activeSchedule: Schedule | null;
  printRef: RefObject<HTMLDivElement | null>;
  onCreateSchedule: (name: string, start: string, end: string) => void;
  onDeleteSchedule: (id: string) => void;
  onSetActiveSchedule: (id: string | null) => void;
  onExportExcel: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  state,
  activeSchedule,
  printRef,
  onCreateSchedule,
  onDeleteSchedule,
  onSetActiveSchedule,
  onExportExcel,
  onOpenSettings,
  onToggleSidebar,
}: Props) {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const lang = langFromDir(state.dir);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: activeSchedule?.name ?? 'Schedule',
  });

  return (
    <>
      <div className="no-print bg-slate-900 text-white px-4 py-2.5 flex items-center gap-4 shadow rtl:flex-row-reverse">
        {/* Hamburger — mobile LTR only (appears on left) */}
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle roster"
          className="md:hidden rtl:hidden p-1.5 rounded-md border border-slate-600 text-slate-100 hover:bg-slate-700 transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Zone 1: Wordmark */}
        <span className="font-bold text-lg text-white shrink-0">שבצק</span>
        <div className="w-px h-5 bg-slate-600 shrink-0" />

        {/* Zone 2: Schedule selector */}
        <div className="flex gap-2 items-center rtl:flex-row-reverse">
          <select
            className="text-sm rounded px-2 py-1 text-gray-800 bg-white border-0 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={state.activeScheduleId ?? ''}
            onChange={e => onSetActiveSchedule(e.target.value || null)}
          >
            <option value="">{t('selectSchedule', lang)}</option>
            {state.schedules.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
          >
            {t('newBtn', lang)}
          </Button>
          {activeSchedule && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { if (window.confirm(t('deleteScheduleConfirm', lang))) onDeleteSchedule(activeSchedule.id); }}
              className="hidden md:inline-flex"
            >
              {t('delete', lang)}
            </Button>
          )}
        </div>

        {/* Zone 3: Right actions */}
        <div className="ml-auto rtl:ml-0 rtl:mr-auto flex items-center gap-2 shrink-0 rtl:flex-row-reverse">
          {activeSchedule && (
            <>
              <Button variant="secondary" size="sm" onClick={onExportExcel}
                className="hidden md:inline-flex bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600">
                {t('excel', lang)}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handlePrint()}
                className="hidden md:inline-flex bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600">
                {t('pdf', lang)}
              </Button>
            </>
          )}
          <button
            onClick={() => setGuideOpen(true)}
            title={t('quickStartTitle', lang)}
            className="hidden md:block p-1.5 rounded-md border border-slate-600 text-slate-100 hover:bg-slate-700 transition-colors text-sm font-bold leading-none"
          >
            ?
          </button>
          <button
            onClick={onOpenSettings}
            title={t('settingsTitle', lang)}
            className="p-1.5 rounded-md border border-slate-600 text-slate-100 hover:bg-slate-700 transition-colors"
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
            className="ltr:hidden md:hidden rtl:ml-auto p-1.5 rounded-md border border-slate-600 text-slate-100 hover:bg-slate-700 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

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
