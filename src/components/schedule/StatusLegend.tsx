import { memo, useState } from 'react';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  dir: 'ltr' | 'rtl';
}

export const StatusLegend = memo(function StatusLegend({ dir }: Props) {
  const lang = langFromDir(dir);
  const [open, setOpen] = useState(false);

  const legendItems = [
    { labelKey: 'statusValid',             color: 'bg-emerald-100 border-emerald-400' },
    { labelKey: 'statusUnavailable',       color: 'bg-red-100 border-red-500' },
    { labelKey: 'statusHomeGroup',         color: 'bg-blue-100 border-blue-400' },
    { labelKey: 'statusDoubleBooked',      color: 'bg-orange-100 border-orange-500' },
    { labelKey: 'statusUnqualified',       color: 'bg-yellow-100 border-yellow-500' },
    { labelKey: 'statusInsufficientBreak', color: 'bg-sky-100 border-sky-500' },
    { labelKey: 'statusConstraint',        color: 'bg-purple-100 border-purple-500' },
    { labelKey: 'statusOncallShortBreak',  color: 'bg-orange-50 border-orange-400' },
  ];

  return (
    <div className="no-print fixed bottom-20 md:bottom-4 end-4   z-40">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="bg-gray-900/90 backdrop-blur-md dark:bg-white/90 text-white dark:text-gray-900 font-medium text-xs px-3 py-2 rounded-full shadow-md hover:bg-gray-800 dark:hover:bg-white transition-colors duration-150"
      >
        {open ? t('hideLegend', lang) : t('legend', lang)}
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 end-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-gray-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl ring-1 ring-black/[0.02] p-4 space-y-2 min-w-[200px]">
          {legendItems.map(item => (
            <div key={item.labelKey} className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
              <span className={`w-4 h-4 rounded border-2 shrink-0 ${item.color}`} />
              {t(item.labelKey, lang)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
