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
    title: '1. Create a Schedule',
    description: 'Click "+ New Schedule" in the top bar to create a new board. Give it a name and pick your date range.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: '2. Setup Defaults',
    description: 'Open Settings (⚙) to define Shifts (e.g. Morning, Night) and Positions (roles). Mark a position as On-Call if it should be treated as a standby role — this affects how auto-assign fills last-resort slots. Use Presets to save common shift/position sets for quick reuse.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: '3. Manage Your Team',
    description: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>Under Settings → People, add team members. Click Edit on any person to configure:</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Qualified Positions</span> — which roles they can fill</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Limits</span> — Max/Week, Max Total, Min Rest between shifts</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Unavailability</span> — block specific dates or recurring days/shifts</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Home Groups</span> — assign to one or more groups for leave tracking</span></li>
        </ul>
        <p className="text-gray-400 text-xs">Use multi-select in the People list to bulk-assign roles or groups to many people at once.</p>
      </div>
    ),
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '4. Smart Scheduling',
    description: 'Use the "Auto Assign" button (✨) to instantly fill the schedule based on everyone\'s qualifications and constraints. You can also manually Drag & Drop people from the sidebar into any cell.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '5. Force Minimum & On-Call',
    description: (
      <div className="space-y-3 text-sm text-gray-600">
        <div>
          <p className="font-semibold text-gray-800 mb-1">⚡ Force Minimum Duty</p>
          <p>Mark a person with Force Minimum (in their Edit panel, or bulk-select in the People list) and auto-assign will prioritize them for every available slot — as long as their minimum rest time has passed. Good for people who need to accumulate maximum hours. The ⚡ bolt appears next to their name in the sidebar so you always know who's flagged.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">On-Call fallback</p>
          <p>If every qualified person for an on-call position is blocked by a constraint, auto-assign will assign the least-constrained one anyway and mark the cell purple. This prevents on-call slots from being left empty when there's no clean option.</p>
        </div>
      </div>
    ),
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    title: '6. Home Groups',
    description: 'In Settings → Groups, organise people into "Home Groups". Then, click "Periods" in the top bar to mark dates when entire groups go home.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '7. Cell Colors & Validation',
    description: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" /> Valid assignment</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 shrink-0" /> Unavailable / Blocked day</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" /> Not qualified for position</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" /> Double-booked same shift</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" /> Insufficient break (under 12h)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" /> Constraint violation (hover for details)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" /> On home leave (Home Group)</div>
      </div>
    ),
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: '8. Export',
    description: 'Use the top bar buttons to export the schedule to Excel (includes a Constraints sheet) or print to PDF.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: '8. Sign In — It\'s Worth It',
    description: (
      <div className="space-y-3 text-gray-600 leading-relaxed">
        <p className="text-sm">Right now your data lives only in this browser — clear it and it's gone. Signing in takes 10 seconds and gives you:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Cloud backup</span> — schedules saved automatically, never lost</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Access anywhere</span> — phone, tablet, any computer</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">Synced presets</span> — your saved shifts &amp; positions follow your account</span></li>
        </ul>
        <p className="text-xs text-gray-400">Free. No credit card.</p>
      </div>
    ),
  },
];

const STEPS_HE = [
  {
    icon: STEPS_EN[0].icon,
    title: '1. צור לוח זמנים',
    description: "לחץ על '+ לוח חדש' בסרגל העליון כדי ליצור לוח. הענק לו שם ובחר טווח תאריכים.",
  },
  {
    icon: STEPS_EN[1].icon,
    title: '2. הגדרות בסיס',
    description: 'פתח הגדרות (⚙) כדי להגדיר משמרות ותפקידים. סמן תפקיד כ"כוננות" (On-Call) אם הוא תפקיד המתנה — זה משפיע על אופן מילוי התאים האחרונים בשיבוץ אוטומטי. השתמש ב"תבניות" לשמירת קבוצות משמרות ותפקידים לשימוש חוזר.',
  },
  {
    icon: STEPS_EN[2].icon,
    title: '3. ניהול סגל',
    description: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>תחת הגדרות ← אנשים, הוסף חברי צוות. לחץ "ערוך" לכל אדם להגדרת:</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">תפקידים מותרים</span> — אילו תפקידים הוא יכול למלא</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">מגבלות</span> — מקס' בשבוע, מקס' סה"כ, מינימום מנוחה בין משמרות</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">חוסר זמינות</span> — חסימת תאריכים ספציפיים או ימים/משמרות חוזרים</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">קבוצות יציאה</span> — שיוך לקבוצה אחת או יותר</span></li>
        </ul>
        <p className="text-gray-400 text-xs">השתמש בבחירה מרובה ברשימת האנשים לשיבוץ תפקידים או קבוצות לכמה אנשים בבת אחת.</p>
      </div>
    ),
  },
  {
    icon: STEPS_EN[3].icon,
    title: '4. שיבוץ חכם',
    description: 'לחץ על "שיבוץ אוטומטי" (✨) למילוי מהיר של הלוח בהתחשב באילוצים של כולם. ניתן גם לגרור ולשחרר (Drag & Drop) אנשים ידנית לתוך התאים.',
  },
  {
    icon: STEPS_EN[4].icon,
    title: '5. מינימום מאולץ וכוננות',
    description: (
      <div className="space-y-3 text-sm text-gray-600">
        <div>
          <p className="font-semibold text-gray-800 mb-1">⚡ מינימום מאולץ</p>
          <p>סמן אדם כ"מינימום מאולץ" (בפאנל העריכה שלו, או בבחירה מרובה ברשימת האנשים) — השיבוץ האוטומטי יתעדף אותו לכל משבצת פנויה כל עוד עבר זמן המנוחה המינימלי. מתאים לאנשים שצריכים לצבור מקסימום שעות. סמל ⚡ יופיע ליד שמם בסרגל הצד.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">גיבוי כוננות</p>
          <p>אם כל המועמדים המוסמכים לתפקיד כוננות חסומים על ידי אילוץ, השיבוץ האוטומטי ישבץ את הפחות מוגבל מביניהם בכל זאת וסמן את התא בסגול. כך לא יישארו משבצות כוננות ריקות.</p>
        </div>
      </div>
    ),
  },
  {
    icon: STEPS_EN[5].icon,
    title: '6. קבוצות יציאה',
    description: 'בהגדרות ← קבוצות, סדר את הסגל ב"קבוצות יציאה הביתה". לאחר מכן, לחץ על "יציאות" בסרגל העליון כדי לסמן תאריכים בהם קבוצות שלמות נמצאות בבית.',
  },
  {
    icon: STEPS_EN[6].icon,
    title: '7. צבעי תאים וולידציה',
    description: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" /> שיבוץ תקין</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 shrink-0" /> חוסר זמינות / יום חסום</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" /> לא מוסמך לתפקיד זה</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" /> כפול באותה משמרת</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" /> הפסקה קצרה מדי (פחות מ-12ש)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" /> הפרת אילוץ (העבר עכבר לפרטים)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" /> ביציאה הביתה (קבוצת יציאה)</div>
      </div>
    ),
  },
  {
    icon: STEPS_EN[7].icon,
    title: '8. ייצוא',
    description: 'השתמש בכפתורי הסרגל העליון כדי לייצא את הלוח לאקסל (כולל גיליון אילוצים).',
  },
  {
    icon: STEPS_EN[8].icon,
    title: '9. התחברות — שווה את זה',
    description: (
      <div className="space-y-3 text-gray-600 leading-relaxed">
        <p className="text-sm">כרגע המידע שלך נשמר רק בדפדפן הזה — ניקוי הדפדפן ימחק הכל. התחברות לוקחת 10 שניות ונותנת לך:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">גיבוי לענן</span> — הלוחות נשמרים אוטומטית, ללא אובדן נתונים</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">גישה מכל מקום</span> — טלפון, טאבלט, כל מחשב</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800">תבניות מסונכרנות</span> — משמרות ותפקידים שמורים קשורים לחשבון שלך</span></li>
        </ul>
        <p className="text-xs text-gray-400">חינם. ללא כרטיס אשראי.</p>
      </div>
    ),
  },
];

export function QuickStartModal({ open, onClose, dir = 'ltr' }: Props) {
  const [step, setStep] = useState(0);
  const lang = langFromDir(dir);
  const STEPS = lang === 'he' ? STEPS_HE : STEPS_EN;
  const current = STEPS[step];

  return (
    <Modal open={open} onClose={onClose} title={t('quickStartTitle', lang)} size="md">
      <div className="flex flex-col">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === step ? 'bg-blue-600 scale-110' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col items-center px-4 sm:px-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-6 shrink-0 shadow-sm rotate-3 hover:rotate-0 transition-transform">
            {current.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 text-center tracking-tight">
            {current.title}
          </h3>
          <div className="text-sm md:text-base text-gray-600 leading-relaxed text-left rtl:text-right w-full">
            {typeof current.description === 'string' ? (
              <p>{current.description}</p>
            ) : (
              current.description
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {t('back', lang)}
          </button>

          <span className="text-xs font-medium text-gray-400 tracking-wider" dir="ltr">
            {step + 1} / {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-150"
            >
              {t('next', lang)}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
            >
              {t('done', lang)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
