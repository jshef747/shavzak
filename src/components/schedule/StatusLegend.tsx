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
    <div className="no-print fixed bottom-4 right-4 rtl:right-auto rtl:left-4 z-40">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg hover:bg-slate-700 transition-colors"
      >
        {open ? t('hideLegend', lang) : t('legend', lang)}
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 right-0 rtl:right-auto rtl:left-0 bg-white border border-slate-200 rounded-lg shadow-xl p-3 space-y-1.5 min-w-[190px]">
          {legendItems.map(item => (
            <div key={item.labelKey} className="flex items-center gap-2 text-xs text-slate-700">
              <span className={`w-4 h-4 rounded border-2 shrink-0 ${item.color}`} />
              {t(item.labelKey, lang)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
