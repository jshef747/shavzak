import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DateRangePicker } from '../ui/DateRangePicker';
import { langFromDir, t } from '../../utils/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateSchedule: (name: string, start: string, end: string) => void;
  dir?: 'ltr' | 'rtl';
}

export function NewScheduleModal({ open, onClose, onCreateSchedule, dir = 'ltr' }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const lang = langFromDir(dir);

  function handleCreate() {
    if (!name.trim() || !startDate || !endDate) return;
    onCreateSchedule(name.trim(), startDate, endDate);
    setName(''); setStartDate(''); setEndDate('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t('newScheduleModalTitle', lang)} size="sm">
      <div className="space-y-4">
        <Input
          label={t('name', lang)}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('weekOnePlaceholder', lang)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          autoFocus
        />
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          dir={dir}
        />
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>{t('cancel', lang)}</Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!name.trim() || !startDate || !endDate}
          >
            {t('create', lang)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
