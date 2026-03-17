import { t } from '../../utils/i18n';
import type { Lang } from '../../utils/i18n';
import { Button } from '../ui/Button';

interface Props {
  lang: Lang;
  userEmail?: string;
  onLogout: () => void;
}

export function WaitingScreen({ lang, userEmail, onLogout }: Props) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="max-w-sm w-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-8 text-center space-y-4">
        <div className="flex justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {t('waitingForAdmin', lang)}
        </h2>
        {userEmail && (
          <p className="text-xs text-gray-500 dark:text-slate-400">{userEmail}</p>
        )}
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('waitingForAdminDesc', lang)}
        </p>
        <Button variant="secondary" size="sm" onClick={onLogout}>
          {t('logout', lang)}
        </Button>
      </div>
    </div>
  );
}
