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
    description: 'Hit "+ New Schedule" in the top bar, give it a name, and pick your dates. That\'s it — your board is ready.',
  },
  {
    icon: <Settings className="w-8 h-8" strokeWidth={1.5} />,
    title: '2. Set Up Shifts & Positions',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>Open Settings (⚙) to define your <span className="font-semibold text-gray-800 dark:text-slate-100">Shifts</span> (when) and <span className="font-semibold text-gray-800 dark:text-slate-100">Positions</span> (who does what).</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">On-Call positions</span> — mark a position as On-Call and give it a duration (e.g. 24h). It shows as one big merged cell per day, and hours are tracked separately from regular shifts.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Avoid Half-Shifts</span> — a toggle in Shifts settings if you don't want auto-assign touching half-shift slots.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Presets</span> — save your shift/position combos so you can load them instantly next time.</span></li>
        </ul>
      </div>
    ),
  },
  {
    icon: <Users className="w-8 h-8" strokeWidth={1.5} />,
    title: '3. Add Your Team',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>Go to Settings → People and add everyone. Click Edit on any person to fine-tune:</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Qualified Positions</span> — which roles they can actually fill</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Limits</span> — max shifts per week, max total, minimum rest between shifts</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Unavailability</span> — block specific dates, days of the week, or shifts</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Ghost mode</span> — toggle "Never Auto-Assign" to make auto-assign completely skip this person. Handy for commanders or anyone managing their own schedule.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Home Groups</span> — assign to a group so their leave periods are tracked automatically</span></li>
        </ul>
        <p className="text-gray-400 dark:text-slate-500 text-xs mt-2">Tip: multi-select people in the list to bulk-assign roles or groups in one shot.</p>
      </div>
    ),
  },
  {
    icon: <Wand2 className="w-8 h-8" strokeWidth={1.5} />,
    title: '4. Fill the Schedule',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>Hit <span className="font-semibold text-gray-800 dark:text-slate-100">Auto Assign</span> (✨) and watch it fill the board — respecting qualifications, rest times, and constraints. Or just <span className="font-semibold text-gray-800 dark:text-slate-100">drag people</span> from the sidebar into any cell manually.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Balanced by default</span> — hours are spread evenly, and no one gets the same shift type over and over.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">On-call is fair too</span> — 24h on-call counts as ~8h active, so on-call people still get regular shifts to keep things balanced.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">On mobile</span> — tap a position row to assign, swipe the date carousel at the top, tap a shift card to expand it.</span></li>
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
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">⚡ Force Minimum</p>
          <p>Mark someone with Force Minimum (in their Edit panel or via bulk-select) and auto-assign will prioritise them for every available slot — as long as their rest time has passed. The ⚡ icon appears next to their name in the sidebar so you always know who's flagged.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">On-Call positions</p>
          <p>Set a duration per on-call position (e.g. 24h) in Settings → Positions. The cell spans the whole day and hours are tracked using that duration. If everyone qualified is blocked, auto-assign picks the least-constrained person and marks the cell purple — so slots are never left empty.</p>
        </div>
      </div>
    ),
  },
  {
    icon: <Home className="w-8 h-8" strokeWidth={1.5} />,
    title: '6. Home Groups & Leave',
    description: 'In Settings → Groups, organise your team into home groups. Then use "Periods" in the top bar to mark when each group goes home. The schedule will automatically block those dates for that group — and expired periods clean themselves up.',
  },
  {
    icon: <Palette className="w-8 h-8" strokeWidth={1.5} />,
    title: '7. What the Colors Mean',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" /> All good — valid assignment</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" /> Person is unavailable or blocked</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-yellow-400 dark:bg-yellow-500 shrink-0" /> Not qualified for this position</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-orange-400 dark:bg-orange-500 shrink-0" /> Double-booked on the same shift</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-sky-400 dark:bg-sky-500 shrink-0" /> Break too short (under 12h)</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0" /> Constraint violation — hover for details</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" /> On home leave</div>
      </div>
    ),
  },
  {
    icon: <Download className="w-8 h-8" strokeWidth={1.5} />,
    title: '8. Export',
    description: 'Export to Excel (includes a full Constraints sheet) or print to PDF straight from the top bar.',
  },
  {
    icon: <Cloud className="w-8 h-8" strokeWidth={1.5} />,
    title: '9. Sign In — Seriously Worth It',
    description: (
      <div className="space-y-3 text-gray-600 dark:text-slate-300 leading-relaxed">
        <p className="text-sm">Right now your data only lives in this browser — clear it and it's gone forever. Signing in takes about 10 seconds and gives you:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Cloud backup</span> — schedules save automatically, nothing gets lost</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Access anywhere</span> — phone, tablet, any computer</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">Synced presets</span> — your saved shifts &amp; positions follow your account everywhere</span></li>
        </ul>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Free. No credit card. No catch.</p>
      </div>
    ),
  },
];

const STEPS_HE = [
  {
    icon: STEPS_EN[0].icon,
    title: '1. צור לוח',
    description: "לחץ על '+ לוח חדש' בסרגל העליון, תן לו שם ובחר תאריכים. זהו — הלוח מוכן.",
  },
  {
    icon: STEPS_EN[1].icon,
    title: '2. הגדר משמרות ותפקידים',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>פתח הגדרות (⚙) כדי להגדיר <span className="font-semibold text-gray-800 dark:text-slate-100">משמרות</span> (מתי) ו<span className="font-semibold text-gray-800 dark:text-slate-100">תפקידים</span> (מי עושה מה).</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תפקידי כוננות</span> — סמן תפקיד ככוננות והגדר לו משך (למשל 24ש). הוא מוצג כתא ממוזג לאורך כל היום, והשעות נעקבות בנפרד.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">הימנע ממשמרות חצי</span> — מתג בהגדרות משמרות אם אתה לא רוצה שהשיבוץ יגע במשמרות חצי.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תבניות</span> — שמור קומבינציות משמרות ותפקידים לטעינה מהירה בפעם הבאה.</span></li>
        </ul>
      </div>
    ),
  },
  {
    icon: STEPS_EN[2].icon,
    title: '3. הוסף את הצוות',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>עבור להגדרות ← אנשים והוסף את כולם. לחץ "ערוך" על כל אדם לכוונון:</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תפקידים מותרים</span> — אילו תפקידים הוא יכול למלא</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">מגבלות</span> — מקס' בשבוע, מקס' סה"כ, מינימום מנוחה בין משמרות</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">חוסר זמינות</span> — חסימת תאריכים, ימים בשבוע, או משמרות</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">מצב רוח</span> — הפעל "לא לשבץ אוטומטית" כדי שהשיבוץ יתעלם מהאדם לחלוטין. מעולה למפקדים או מי שמנהל את הלוח שלו בעצמו.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">קבוצות יציאה</span> — שיוך לקבוצה כדי שתקופות הבית שלו יעקבו אוטומטית</span></li>
        </ul>
        <p className="text-gray-400 dark:text-slate-500 text-xs mt-2">טיפ: בחר כמה אנשים ביחד כדי לשבץ תפקידים וקבוצות לכולם בבת אחת.</p>
      </div>
    ),
  },
  {
    icon: STEPS_EN[3].icon,
    title: '4. מלא את הלוח',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>לחץ <span className="font-semibold text-gray-800 dark:text-slate-100">שיבוץ אוטומטי</span> (✨) ותראה את הלוח מתמלא — תוך כיבוד כשירויות, מנוחה ואילוצים. או פשוט <span className="font-semibold text-gray-800 dark:text-slate-100">גרור אנשים</span> מהסרגל הצדדי לכל משבצת.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">מאוזן כברירת מחדל</span> — השעות מחולקות בצורה הוגנת, ואיש לא מקבל את אותו סוג משמרת שוב ושוב.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">כוננות גם הוגנת</span> — 24ש כוננות נחשבות כ-8ש פעילות, אז מי שבכוננות עדיין מקבל משמרות רגילות לאיזון.</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">במובייל</span> — הקש על שורת תפקיד לשיבוץ, גלול בקרוסלה התאריכים, הקש על כרטיס משמרת להרחבתו.</span></li>
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
          <p>סמן אדם כ"מינימום מאולץ" (בפאנל העריכה שלו או בבחירה מרובה) והשיבוץ יתעדף אותו לכל משבצת פנויה — כל עוד עבר זמן המנוחה. סמל ⚡ מופיע ליד שמו בסרגל הצד.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-slate-100 mb-1">תפקידי כוננות</p>
          <p>הגדר משך לכל תפקיד כוננות בהגדרות ← תפקידים. התא ממוזג לכל היום והשעות נעקבות לפי המשך. אם כל המוסמכים חסומים, השיבוץ יבחר את הפחות מוגבל ויסמן בסגול — אף משבצת לא נשארת ריקה.</p>
        </div>
      </div>
    ),
  },
  {
    icon: STEPS_EN[5].icon,
    title: '6. קבוצות יציאה',
    description: 'בהגדרות ← קבוצות, ארגן את הצוות לקבוצות יציאה. אחר כך לחץ "יציאות" בסרגל העליון לסמן מתי כל קבוצה בבית. הלוח יחסום את הימים האלה אוטומטית — ותקופות שפגה תוקפן נמחקות לבד.',
  },
  {
    icon: STEPS_EN[6].icon,
    title: '7. מה הצבעים אומרים',
    description: (
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-emerald-400 dark:bg-emerald-500 shrink-0" /> הכל תקין — שיבוץ תקין</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" /> האדם לא זמין או חסום</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-yellow-400 dark:bg-yellow-500 shrink-0" /> לא מוסמך לתפקיד זה</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-orange-400 dark:bg-orange-500 shrink-0" /> כפול באותה משמרת</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-sky-400 dark:bg-sky-500 shrink-0" /> הפסקה קצרה מדי (פחות מ-12ש)</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0" /> הפרת אילוץ — העבר עכבר לפרטים</div>
        <div className="flex items-center gap-3"><span className="w-3.5 h-3.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" /> ביציאה הביתה</div>
      </div>
    ),
  },
  {
    icon: STEPS_EN[7].icon,
    title: '8. ייצוא',
    description: 'ייצא לאקסל (כולל גיליון אילוצים מלא) או הדפס ל-PDF ישירות מסרגל העליון.',
  },
  {
    icon: STEPS_EN[8].icon,
    title: '9. התחברות — שווה את זה באמת',
    description: (
      <div className="space-y-3 text-gray-600 dark:text-slate-300 leading-relaxed">
        <p className="text-sm">כרגע המידע שלך נשמר רק בדפדפן — ניקוי הדפדפן ומחק הכל. התחברות לוקחת 10 שניות ונותנת לך:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">גיבוי לענן</span> — הלוחות נשמרים אוטומטית, שום דבר לא אובד</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">גישה מכל מקום</span> — טלפון, טאבלט, כל מחשב</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">·</span><span><span className="font-semibold text-gray-800 dark:text-slate-100">תבניות מסונכרנות</span> — המשמרות והתפקידים השמורים עוקבים אחרי החשבון שלך לכל מקום</span></li>
        </ul>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">חינם. ללא כרטיס אשראי. ללא תעלומות.</p>
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
          <div className="text-sm md:text-base text-gray-600 dark:text-slate-300 leading-relaxed text-start w-full">
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
