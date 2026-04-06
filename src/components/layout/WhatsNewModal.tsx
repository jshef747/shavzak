import { Scale, PhoneCall, Calendar } from 'lucide-react';
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
    title: 'Smarter Workload Balancing',
    desc: 'Auto-assign now uses raw total hours (not a normalized estimate) as the primary fairness metric, and tracks shift-type distribution so each person gets a balanced mix of morning, noon, evening, and night shifts.',
  },
  {
    icon: <PhoneCall className="w-5 h-5" />,
    title: 'On-Call Weighted as 1/3 Active Duty',
    desc: 'On-call hours now count as 1/3 toward the balancing calculation (24h on-call ≈ 8h active). People who do on-call will receive more regular shifts to compensate, keeping total workload fair.',
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: 'Home Groups Table & Period Cleanup',
    desc: 'The home groups table now shows only dates within the current schedule range. Expired home-group periods (past their return date) are automatically removed on app load.',
  },
];

const FEATURES_HE = [
  {
    icon: FEATURES_EN[0].icon,
    title: 'איזון עומסים חכם יותר',
    desc: 'השיבוץ האוטומטי משתמש עכשיו בסך שעות גולמי (ולא הערכה מנורמלת) כמדד הוגנות ראשי, ועוקב אחרי פיזור סוגי משמרות כך שכל אדם מקבל תמהיל מאוזן של בוקר, צהריים, ערב ולילה.',
  },
  {
    icon: FEATURES_EN[1].icon,
    title: 'כוננות שקולה כ-⅓ משמרת פעילה',
    desc: 'שעות כוננות נחשבות עכשיו כ-⅓ בלבד לצורך חישוב האיזון (24 שעות כוננות ≈ 8 שעות פעילות). מי שמבצע כוננות יקבל יותר משמרות רגילות בתמורה, כדי לשמור על עומס כולל הוגן.',
  },
  {
    icon: FEATURES_EN[2].icon,
    title: 'טבלת קבוצות בית וניקוי תקופות',
    desc: 'טבלת קבוצות הבית מציגה עכשיו רק תאריכים בטווח הלוח הנוכחי. תקופות בית שפג תוקפן (עברו את תאריך החזרה) מוסרות אוטומטית בטעינת האפליקציה.',
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
