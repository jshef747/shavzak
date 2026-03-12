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
    <div className="space-y-5">
      {/* Current Positions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('currentPositions', lang)}
              {state.positions.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{state.positions.length}</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('positionsDesc', lang)}</p>
          </div>
        </div>

        {state.positions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">{t('noPositionsEmpty', lang)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.positions.map(pos => (
              <div key={pos.id} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-600">{pos.name.charAt(0).toUpperCase()}</span>
                </div>
                <input
                  className="flex-1 bg-transparent border-0 px-0 py-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 min-w-0"
                  value={pos.name}
                  onChange={e => onUpdate(pos.id, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(pos.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Position */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('addPosition', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('addPositionDesc', lang)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('positionNamePlaceholder', lang)}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); setName(''); } }}
          />
          <Button onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }} className="self-end">
            {t('add', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
