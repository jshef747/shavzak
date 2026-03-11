import { useState } from 'react';
import type { AppState } from '../../types';
import { langFromDir, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  state: AppState;
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function PositionsTab({ state, onAdd, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('');
  const lang = langFromDir(state.dir);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('currentPositions', lang)}</h3>
        {state.positions.length === 0 && <p className="text-sm text-gray-400">{t('noPositionsYet', lang)}</p>}
        <div className="space-y-2">
          {state.positions.map(pos => (
            <div key={pos.id} className="flex gap-2 items-center">
              <input
                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                value={pos.name}
                onChange={e => onUpdate(pos.id, e.target.value)}
              />
              <Button variant="danger" size="sm" onClick={() => onDelete(pos.id)}>{t('delete', lang)}</Button>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('addPosition', lang)}</h3>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('positionNamePlaceholder', lang)}
            className="flex-1"
          />
          <Button onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }}>
            {t('add', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
