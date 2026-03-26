import { useState } from 'react';
import { Calendar, Settings, Users, Wand2, Zap, Home, Palette, Download, Cloud } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  dir?: 'ltr' | 'rtl';
}

const STEPS_EN = [
  {
    icon: <Calendar className="w-8 h-8" strokeWidth={1.5} />,
    title: '1. Create a Schedule',
    description: 'Click "+ New Schedule" in the top bar to create a new board. Give it a name and pick your date range.',
  },
  {
    icon: <Settings className="w-8 h-8" strokeWidth={1.5} />,
    title: '2. Setup Defaults',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>Open Settings (⚙) to define <span className="font-semibold text-gray-800 dark:text-slate-100">Shifts</span> and <span className="font-semibold text-gray-800 dark:text-slate-100">Positions</span> (roles).</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">On-Call positions</span> — mark a position as On-Call to treat it as a standby role. Set a custom hour count (e.g. 24h) so it's tracked separately from regular shift hours. On-call cells span the full day as one merged cell.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Avoid Half-Shifts</span> — toggle in Shifts settings to make auto-assign skip half-shift slots entirely (or use them only as last resort).</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Presets</span> — save common shift/position sets for quick reuse across schedules.</span></li>
        </ul>
      </div>
    ),
  },
  {
    icon: <Users className="w-8 h-8" strokeWidth={1.5} />,
    title: '3. Manage Your Team',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>Under Settings → People, add team members. Click Edit on any person to configure:</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Qualified Positions</span> — which roles they can fill</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Limits</span> — Max/Week, Max Total, Min Rest between shifts</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Unavailability</span> — block specific dates or recurring days/shifts</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Home Groups</span> — assign to one or more groups for leave tracking</span></li>
        </ul>
        <p className="text-gray-400 dark:text-slate-400 text-xs mt-2">Use multi-select in the People list to bulk-assign roles or groups to many people at once.</p>
      </div>
    ),
  },
  {
    icon: <Wand2 className="w-8 h-8" strokeWidth={1.5} />,
    title: '4. Smart Scheduling',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>Use the <span className="font-semibold text-gray-800 dark:text-slate-100">Auto Assign</span> button (✨) to instantly fill the schedule based on everyone's qualifications and constraints. You can also manually <span className="font-semibold text-gray-800 dark:text-slate-100">Drag &amp; Drop</span> people from the sidebar into any cell.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Shift variety</span> — auto-assign avoids giving someone the same shift on consecutive days (soft penalty).</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Half-shifts</span> — controlled by the Avoid Half-Shifts toggle in Settings → Shifts.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">On mobile</span> — tap any position row to assign. Swipe through dates using the carousel at the top, and tap a shift card to expand its positions.</span></li>
        </ul>
      </div>
    ),
  },
  {
    icon: <Zap className="w-8 h-8" strokeWidth={1.5} />,
    title: '5. Force Minimum & On-Call',
    description: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">⚡ Force Minimum Duty</p>
          <p>Mark a person with Force Minimum (in their Edit panel, or bulk-select in the People list) and auto-assign will prioritize them for every available slot — as long as their minimum rest time has passed. Good for people who need to accumulate maximum hours. The ⚡ bolt appears next to their name in the sidebar so you always know who's flagged.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">On-Call positions</p>
          <p>Set a custom duration (e.g. 24h) per on-call position in Settings → Positions. The cell spans the whole day as a single merged cell, and hours tracking uses that duration. If every qualified person is blocked by a constraint, auto-assign assigns the least-constrained one anyway and marks the cell purple — so on-call slots are never left empty.</p>
        </div>
      </div>
    ),
  },
  {
    icon: <Home className="w-8 h-8" strokeWidth={1.5} />,
    title: '6. Home Groups',
    description: 'In Settings → Groups, organise people into "Home Groups". Then, click "Periods" in the top bar to mark dates when entire groups go home.',
  },
  {
    icon: <Palette className="w-8 h-8" strokeWidth={1.5} />,
    title: '7. Cell Colors & Validation',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" /> Valid assignment</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" /> Unavailable / Blocked day</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-yellow-400 dark:bg-yellow-500 shrink-0" /> Not qualified for position</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-orange-400 dark:bg-orange-500 shrink-0" /> Double-booked same shift</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-sky-400 dark:bg-sky-500 shrink-0" /> Insufficient break (under 12h)</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0" /> Constraint violation (hover for details)</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" /> On home leave (Home Group)</div>
      </div>
    ),
  },
  {
    icon: <Download className="w-8 h-8" strokeWidth={1.5} />,
    title: '8. Export',
    description: 'Use the top bar buttons to export the schedule to Excel (includes a Constraints sheet) or print to PDF.',
  },
  {
    icon: <Cloud className="w-8 h-8" strokeWidth={1.5} />,
    title: '9. Sign In — It\'s Worth It',
    description: (
      <div className="space-y-3 text-gray-600 dark:text-slate-300 leading-relaxed">
        <p className="text-sm">Right now your data lives only in this browser — clear it and it's gone. Signing in takes 10 seconds and gives you:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Cloud backup</span> — schedules saved automatically, never lost</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Access anywhere</span> — phone, tablet, any computer</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Synced presets</span> — your saved shifts &amp; positions follow your account</span></li>
        </ul>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Free. No credit card.</p>
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
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>פתח הגדרות (⚙) כדי להגדיר <span className="font-semibold text-gray-800 dark:text-slate-100">משמרות</span> ו<span className="font-semibold text-gray-800 dark:text-slate-100">תפקידים</span>.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תפקידי כוננות</span> — סמן תפקיד כ"כוננות" לטיפול כתפקיד המתנה. הגדר מספר שעות מותאם (למשל 24ש) למעקב שעות נפרד משאר המשמרות. תאי כוננות ממוזגים לתא יחיד המכסה את כל היום.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">הימנע ממשמרות חצי</span> — מתג בהגדרות משמרות לשליטה האם השיבוץ האוטומטי משתמש במשמרות חצי.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תבניות</span> — שמור קבוצות משמרות ותפקידים לשימוש חוזר.</span></li>
        </ul>
      </div>
    ),
  },
  {
    icon: STEPS_EN[2].icon,
    title: '3. ניהול סגל',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>תחת הגדרות ← אנשים, הוסף חברי צוות. לחץ "ערוך" לכל אדם להגדרת:</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תפקידים מותרים</span> — אילו תפקידים הוא יכול למלא</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">מגבלות</span> — מקס' בשבוע, מקס' סה"כ, מינימום מנוחה בין משמרות</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">חוסר זמינות</span> — חסימת תאריכים ספציפיים או ימים/משמרות חוזרים</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">קבוצות יציאה</span> — שיוך לקבוצה אחת או יותר</span></li>
        </ul>
        <p className="text-gray-400 dark:text-slate-500 text-xs mt-2">השתמש בבחירה מרובה ברשימת האנשים לשיבוץ תפקידים או קבוצות לכמה אנשים בבת אחת.</p>
      </div>
    ),
  },
  {
    icon: STEPS_EN[3].icon,
    title: '4. שיבוץ חכם',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>לחץ על <span className="font-semibold text-gray-800 dark:text-slate-100">שיבוץ אוטומטי</span> (✨) למילוי מהיר בהתחשב באילוצים. ניתן גם לגרור ולשחרר (Drag &amp; Drop) אנשים ידנית.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">מגוון משמרות</span> — השיבוץ האוטומטי מרתיע רצפים של אותה משמרת בימים עוקבים.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">משמרות חצי</span> — נשלט על ידי מתג "הימנע ממשמרות חצי" בהגדרות ← משמרות.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">במובייל</span> — הקש על שורת תפקיד לשיבוץ. גלול בין תאריכים בקרוסלה בראש המסך, והקש על כרטיס משמרת להרחבתו.</span></li>
        </ul>
      </div>
    ),
  },
  {
    icon: STEPS_EN[4].icon,
    title: '5. מינימום מאולץ וכוננות',
    description: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">⚡ מינימום מאולץ</p>
          <p>סמן אדם כ"מינימום מאולץ" (בפאנל העריכה שלו, או בבחירה מרובה ברשימת האנשים) — השיבוץ האוטומטי יתעדף אותו לכל משבצת פנויה כל עוד עבר זמן המנוחה המינימלי. מתאים לאנשים שצריכים לצבור מקסימום שעות. סמל ⚡ יופיע ליד שמם בסרגל הצד.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">תפקידי כוננות</p>
          <p>הגדר משך מותאם (למשל 24ש) לכל תפקיד כוננות בהגדרות ← תפקידים. התא ממוזג לתא יחיד לכל היום ומעקב השעות משתמש במשך זה. אם כל המועמדים המוסמכים חסומים, השיבוץ ישבץ את הפחות מוגבל וסמן בסגול — כך לא יישארו משבצות ריקות.</p>
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
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" /> שיבוץ תקין</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" /> חוסר זמינות / יום חסום</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-yellow-400 dark:bg-yellow-500 shrink-0" /> לא מוסמך לתפקיד זה</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-orange-400 dark:bg-orange-500 shrink-0" /> כפול באותה משמרת</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-sky-400 dark:bg-sky-500 shrink-0" /> הפסקה קצרה מדי (פחות מ-12ש)</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0" /> הפרת אילוץ (העבר עכבר לפרטים)</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" /> ביציאה הביתה (קבוצת יציאה)</div>
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
      <div className="space-y-3 text-gray-600 dark:text-slate-300 leading-relaxed">
        <p className="text-sm">כרגע המידע שלך נשמר רק בדפדפן הזה — ניקוי הדפדפן ימחק הכל. התחברות לוקחת 10 שניות ונותנת לך:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">גיבוי לענן</span> — הלוחות נשמרים אוטומטית, ללא אובדן נתונים</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">גישה מכל מקום</span> — טלפון, טאבלט, כל מחשב</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תבניות מסונכרנות</span> — משמרות ותפקידים שמורים קשורים לחשבון שלך</span></li>
        </ul>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">חינם. ללא כרטיס אשראי.</p>
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
      <div className="flex flex-col min-h-[360px]">
        {/* Step indicator */}
        <div className="flex justify-center gap-2.5 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === step ? 'bg-blue-600 dark:bg-blue-500 scale-125' : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col items-center px-2 sm:px-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 shrink-0 shadow-sm rotate-3 hover:rotate-0 transition-transform">
            {current.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 text-center tracking-tight">
            {current.title}
          </h3>
          <div className="text-sm md:text-base text-gray-600 dark:text-slate-300 leading-relaxed text-start  w-full">
            {typeof current.description === 'string' ? (
              <p>{current.description}</p>
            ) : (
              current.description
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {t('back', lang)}
          </button>

          <span className="text-xs font-medium text-gray-400 dark:text-slate-500 tracking-wider" dir="ltr">
            {step + 1} / {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150"
            >
              {t('next', lang)}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors duration-150 active:scale-95"
            >
              {t('done', lang)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
