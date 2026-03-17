import { Modal } from './Modal';
import { Button } from './Button';
import { t, type Lang } from '../../utils/i18n';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: Lang;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({ open, message, onConfirm, onCancel, lang, variant = 'danger' }: Props) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onCancel} title={t('confirmTitle', lang)} size="sm">
      <div className="flex flex-col gap-6 pt-1">
        <div className="flex gap-4 items-start">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed pt-1">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {t('cancel', lang)}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm}>
            {t('delete', lang)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
