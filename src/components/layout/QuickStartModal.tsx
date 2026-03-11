import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  dir?: 'ltr' | 'rtl';
}

const STEPS_EN = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Create a Schedule',
    description: 'Click "+ New" in the top bar to create a new schedule. Give it a name and pick your date range using the calendar.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Add Shifts & Positions',
    description: 'Open Settings (⚙) → Shifts to define your shift types (e.g. Morning, Evening, Night). Then go to Positions to define roles (e.g. Guard, Driver).',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Add People',
    description: 'Settings → People → Add each person, then click Edit to assign their qualified positions and set any scheduling constraints.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    title: 'Drag & Drop to Assign',
    description: 'Drag people from the sidebar on the left into any schedule cell. Drop them back to the sidebar (or outside a cell) to unassign. Dragging to an invalid slot is blocked automatically.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Understand Cell Colors',
    description: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" /> Valid assignment</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 shrink-0" /> One-time unavailability</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" /> Not qualified for this position</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" /> Double-booked same shift</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" /> Less than 12h break</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" /> Repeating constraint violated — hover for details</div>
      </div>
    ),
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: 'Export Your Schedule',
    description: 'Use the Excel button to download the schedule as a spreadsheet (includes a Constraints sheet when constraints exist). Use PDF to print.',
  },
];

const STEPS_HE = [
  {
    icon: STEPS_EN[0].icon,
    title: 'צור לוח זמנים',
    description: "לחץ על '+ חדש' בסרגל העליון. תן שם ללוח ובחר טווח תאריכים בלוח השנה.",
  },
  {
    icon: STEPS_EN[1].icon,
    title: 'הוסף משמרות ותפקידים',
    description: 'פתח הגדרות (⚙) ← משמרות כדי להגדיר סוגי משמרות (בוקר, ערב, לילה). עבור לתפקידים להגדרת תפקידי הסגל.',
  },
  {
    icon: STEPS_EN[2].icon,
    title: 'הוסף אנשים',
    description: 'הגדרות ← אנשים ← הוסף אדם, לחץ ערוך כדי לקבוע תפקידים ואילוצים.',
  },
  {
    icon: STEPS_EN[3].icon,
    title: 'גרור ושחרר לשיבוץ',
    description: 'גרור אנשים מהסגל לתאי הלוח. שחרר מחוץ לתא כדי לבטל שיבוץ. שיבוץ לתא לא חוקי חסום אוטומטית.',
  },
  {
    icon: STEPS_EN[4].icon,
    title: 'צבעי תאים',
    description: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" /> שיבוץ תקין</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 shrink-0" /> חוסר זמינות חד-פעמי</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" /> לא מוסמך לתפקיד זה</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" /> כפול באותה משמרת</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" /> פחות מ-12 שעות הפסקה</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" /> הפרת אילוץ חוזר — העבר עכבר לפרטים</div>
      </div>
    ),
  },
  {
    icon: STEPS_EN[5].icon,
    title: 'ייצוא הלוח',
    description: 'לחץ Excel להורדת קובץ גיליון. לחץ PDF להדפסה.',
  },
];

export function QuickStartModal({ open, onClose, dir = 'ltr' }: Props) {
  const [step, setStep] = useState(0);
  const lang = langFromDir(dir);
  const STEPS = lang === 'he' ? STEPS_HE : STEPS_EN;
  const current = STEPS[step];

  return (
    <Modal open={open} onClose={onClose} title={t('quickStartTitle', lang)} size="md">
      <div className="flex flex-col" style={{ minHeight: 320 }}>
        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col items-center text-center px-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
            {current.icon}
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">
            {step + 1} / {STEPS.length}: {current.title}
          </h3>
          <div className="text-sm text-gray-500 leading-relaxed text-left w-full">
            {typeof current.description === 'string' ? (
              <p>{current.description}</p>
            ) : (
              current.description
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('back', lang)}
          </button>
          <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {t('next', lang)}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t('done', lang)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
