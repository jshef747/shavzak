import { useState } from 'react';
import type { PositionPreset, HourPreset } from '../../hooks/usePresets';
import { type Lang, t } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  lang: Lang;
  positionPresets: PositionPreset[];
  hourPresets: HourPreset[];
  onAddPositionPreset: (name: string) => Promise<void>;
  onDeletePositionPreset: (id: string) => Promise<void>;
  onAddHourPreset: (name: string, start_time: string, end_time: string) => Promise<void>;
  onDeleteHourPreset: (id: string) => Promise<void>;
  isLoggedIn: boolean;
}

export function PresetsTab({
  lang,
  positionPresets,
  hourPresets,
  onAddPositionPreset,
  onDeletePositionPreset,
  onAddHourPreset,
  onDeleteHourPreset,
  isLoggedIn,
}: Props) {
  const [newPosName, setNewPosName] = useState('');
  const [newHourName, setNewHourName] = useState('');
  const [newHourStart, setNewHourStart] = useState('07:00');
  const [newHourEnd, setNewHourEnd] = useState('15:00');

  async function handleAddPositionPreset() {
    if (!newPosName.trim()) return;
    await onAddPositionPreset(newPosName.trim());
    setNewPosName('');
  }

  async function handleAddHourPreset() {
    if (!newHourName.trim()) return;
    await onAddHourPreset(newHourName.trim(), newHourStart, newHourEnd);
    setNewHourName('');
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm font-medium text-slate-600">Login to use presets</p>
        <p className="text-xs text-slate-400">Presets are synced to your account across devices</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Position Presets */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('positionPresets', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('positionPresetsDesc', lang)}</p>
          </div>
        </div>

        {positionPresets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg mb-4">
            {t('noPresets', lang)}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {positionPresets.map(p => (
              <div key={p.id} className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full px-3 py-1">
                <span className="text-sm">{p.name}</span>
                <button
                  onClick={() => onDeletePositionPreset(p.id)}
                  className="ml-1 text-indigo-400 hover:text-red-500 transition-colors leading-none"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newPosName}
            onChange={e => setNewPosName(e.target.value)}
            placeholder={t('presetNamePlaceholder', lang)}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleAddPositionPreset(); }}
          />
          <Button onClick={handleAddPositionPreset} variant="primary" size="sm">
            {t('add', lang)}
          </Button>
        </div>
      </div>

      {/* Hour Presets */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('hourPresets', lang)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('hourPresetsDesc', lang)}</p>
          </div>
        </div>

        {hourPresets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg mb-4">
            {t('noPresets', lang)}
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {hourPresets.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-800">{p.name}</span>
                  <span dir="ltr" className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {p.start_time} – {p.end_time}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteHourPreset(p.id)}
                  className="text-emerald-400 hover:text-red-500 transition-colors text-lg leading-none"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-end">
          <Input
            label="Name"
            value={newHourName}
            onChange={e => setNewHourName(e.target.value)}
            placeholder={t('presetNamePlaceholder', lang)}
            className="w-36"
            onKeyDown={e => { if (e.key === 'Enter') handleAddHourPreset(); }}
          />
          <Input
            label="Start"
            type="time"
            dir="ltr"
            value={newHourStart}
            onChange={e => setNewHourStart(e.target.value)}
            className="w-28"
          />
          <Input
            label="End"
            type="time"
            dir="ltr"
            value={newHourEnd}
            onChange={e => setNewHourEnd(e.target.value)}
            className="w-28"
          />
          <Button onClick={handleAddHourPreset} variant="primary" size="sm" className="self-end">
            {t('add', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
