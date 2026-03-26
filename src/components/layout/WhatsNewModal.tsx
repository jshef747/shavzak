import { Clock, Shuffle, Ban, PhoneCall, Smartphone, CalendarClock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  dir?: 'ltr' | 'rtl';
}

const FEATURES_EN = [
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: 'Premium Mobile UI',
    desc: 'Completely redesigned mobile experience: scrollable date carousel, glassmorphic shift cards with smooth accordion animations, richer assignment rows with status badges, and a floating bottom action bar.',
  },
  {
    icon: <PhoneCall className="w-5 h-5" />,
    title: 'On-Call Duration per Position',
    desc: 'Set a custom hour count for each on-call position (e.g. 24h). The cell spans all shift rows for that day, and hours tracking uses the on-call duration instead of the shift duration.',
  },
  {
    icon: <Shuffle className="w-5 h-5" />,
    title: 'Shift Variety in Auto-Assign',
    desc: 'Auto-assign now avoids giving someone the same shift on consecutive days. A soft penalty discourages streaks (e.g. three mornings in a row) while still filling all slots.',
  },
  {
    icon: <Ban className="w-5 h-5" />,
    title: 'Avoid Half-Shifts Toggle',
    desc: 'A new toggle in Settings → Shifts lets you tell auto-assign to skip half-shift slots entirely, or use them only as a last resort.',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Merged On-Call Cells',
    desc: 'On-call positions now display as a single merged cell spanning all shift rows for each day — cleaner and easier to assign.',
  },
  {
    icon: <CalendarClock className="w-5 h-5" />,
    title: 'Per-Day On-Call Duration',
    desc: 'Click the clock icon next to any date header to override the on-call slot duration for that day only (e.g. 12h on Monday, 6h on Tuesday, 24h on Wednesday). Auto-assign, Excel export, and hours tracking all respect the per-day setting.',
  },
];

const FEATURES_HE = [
  {
    icon: FEATURES_EN[0].icon,
    title: 'ממשק מובייל חדש',
    desc: 'עיצוב מחדש מלא של חוויית המובייל: קרוסלה תאריכים גלילה, כרטיסי משמרת שקופים עם אנימציות חלקות, שורות שיבוץ עשירות עם תגי סטטוס, וסרגל פעולות צף בתחתית המסך.',
  },
  {
    icon: FEATURES_EN[1].icon,
    title: 'משך כוננות לפי תפקיד',
    desc: 'ניתן לקבוע מספר שעות מותאם לכל תפקיד כוננות (למשל 24 שעות). התא ממוזג על פני כל שורות המשמרת לאותו יום, ומעקב השעות משתמש במשך הכוננות.',
  },
  {
    icon: FEATURES_EN[2].icon,
    title: 'מגוון משמרות בשיבוץ אוטומטי',
    desc: 'השיבוץ האוטומטי מנסה עכשיו למנוע רצף של אותה משמרת לאותו אדם בימים עוקבים. עונש רך מרתיע רצפים (כגון שלושה בקרים ברצף) תוך מילוי כל המשבצות.',
  },
  {
    icon: FEATURES_EN[3].icon,
    title: 'מתג "הימנע ממשמרות חצי"',
    desc: 'מתג חדש בהגדרות ← משמרות מאפשר לשיבוץ האוטומטי לדלג לגמרי על משמרות חצי, או להשתמש בהן רק כמוצא אחרון.',
  },
  {
    icon: FEATURES_EN[4].icon,
    title: 'תאי כוננות ממוזגים',
    desc: 'תפקידי כוננות מוצגים עכשיו כתא אחד ממוזג על פני כל שורות המשמרת לכל יום — נקי יותר וקל יותר לשיבוץ.',
  },
  {
    icon: FEATURES_EN[5].icon,
    title: 'משך כוננות לפי יום',
    desc: 'לחץ על סמל השעון ליד כותרת כל יום כדי לקבוע משך כוננות שונה לאותו יום בלבד (למשל 12 שעות ביום ראשון, 6 שעות ביום שני, 24 שעות ביום שלישי). שיבוץ אוטומטי, ייצוא אקסל ומעקב שעות מתחשבים בהגדרה לפי יום.',
  },
];

export function WhatsNewModal({ open, onClose, dir = 'rtl' }: Props) {
  const lang = langFromDir(dir);
  const features = lang === 'he' ? FEATURES_HE : FEATURES_EN;

  return (
    <Modal open={open} onClose={onClose} title={t('whatsNewTitle', lang)} size="md" dir={dir}>
      <div className="flex flex-col gap-4">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700">
            <span className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              {f.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-0.5">{f.title}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 active:scale-95"
          >
            {lang === 'he' ? 'הבנתי' : 'Got it'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
