import { Modal } from './Modal';
import { Button } from './Button';
import { t, type Lang } from '../../utils/i18n';

interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: Lang;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({ open, message, onConfirm, onCancel, lang, variant = 'danger' }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={t('confirmTitle', lang)} size="sm">
      <p className="text-sm text-gray-700 dark:text-slate-300 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t('cancel', lang)}
        </Button>
        <Button variant={variant} size="sm" onClick={onConfirm}>
          {t('delete', lang)}
        </Button>
      </div>
    </Modal>
  );
}
