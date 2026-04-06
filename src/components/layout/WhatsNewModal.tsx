import { Scale, PhoneCall, Calendar, Ghost } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  dir?: 'ltr' | 'rtl';
}

const FEATURES_EN = [
  {
    icon: <Scale className="w-5 h-5" />,
    title: 'Fairer shifts, finally',
    desc: "Auto-assign now looks at actual hours worked — not some normalised estimate — and makes sure each person gets a healthy mix of morning, noon, evening, and night shifts instead of the same one on repeat.",
  },
  {
    icon: <PhoneCall className="w-5 h-5" />,
    title: 'On-call counts as a third of a real shift',
    desc: "Being on-call is not the same as actually working. So now 24h on-call only counts as ~8h toward the balance. People who pull on-call duty will automatically get more regular shifts to make up the difference.",
  },
  {
    icon: <Ghost className="w-5 h-5" />,
    title: 'Ghost mode — skip someone in auto-assign',
    desc: "Toggle \"Never Auto-Assign\" on any person in Settings → People and auto-assign will completely ignore them. Great for commanders, trainees, or anyone who handles their own scheduling.",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: 'Cleaner home groups table',
    desc: "The home groups table now only shows dates that are actually in your current schedule — no more columns stretching into the past or future. And once a home period's return date passes, it disappears automatically.",
  },
];

const FEATURES_HE = [
  {
    icon: FEATURES_EN[0].icon,
    title: 'חלוקת משמרות הוגנת, סוף סוף',
    desc: 'השיבוץ האוטומטי עכשיו מסתכל על שעות אמיתיות שנעשו — לא על הערכה ממוצעת — ודואג שכל אחד יקבל תמהיל של בוקר, צהריים, ערב ולילה, במקום אותה משמרת שוב ושוב.',
  },
  {
    icon: FEATURES_EN[1].icon,
    title: 'כוננות שווה שליש ממשמרת רגילה',
    desc: 'כוננות זה לא אותו דבר כמו לעבוד. אז עכשיו 24 שעות כוננות נחשבות רק כ-8 שעות באיזון. מי שנמצא בכוננות יקבל יותר משמרות רגילות כפיצוי.',
  },
  {
    icon: FEATURES_EN[2].icon,
    title: 'מצב רוח — לדלג על מישהו בשיבוץ',
    desc: 'הפעל "לא לשבץ אוטומטית" על כל אדם בהגדרות ← אנשים והשיבוץ האוטומטי יתעלם ממנו לחלוטין. מעולה למפקדים, מתגייסים, או כל מי שמנהל את הלוח שלו בעצמו.',
  },
  {
    icon: FEATURES_EN[3].icon,
    title: 'טבלת קבוצות בית מסודרת יותר',
    desc: 'טבלת קבוצות הבית מציגה עכשיו רק תאריכים שנמצאים בלוח הנוכחי — לא עמודות שמתפרסות לעבר או לעתיד. ותקופות שפגה תוקפן נעלמות לבד.',
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
