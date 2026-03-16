import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PositionPreset {
  id: string;
  name: string;
}

export interface HourPreset {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export function usePresets(userId: string | null) {
  const [positionPresets, setPositionPresets] = useState<PositionPreset[]>([]);
  const [hourPresets, setHourPresets] = useState<HourPreset[]>([]);

  useEffect(() => {
    if (!userId) {
      setPositionPresets([]);
      setHourPresets([]);
      return;
    }

    supabase
      .from('position_presets')
      .select('id, name')
      .order('created_at')
      .then(({ data }) => { if (data) setPositionPresets(data); });

    supabase
      .from('hour_presets')
      .select('id, name, start_time, end_time')
      .order('created_at')
      .then(({ data }) => { if (data) setHourPresets(data); });
  }, [userId]);

  async function addPositionPreset(name: string): Promise<void> {
    const { data } = await supabase
      .from('position_presets')
      .insert({ name, user_id: userId })
      .select('id, name')
      .single();
    if (data) setPositionPresets(prev => [...prev, data]);
  }

  async function deletePositionPreset(id: string): Promise<void> {
    await supabase.from('position_presets').delete().eq('id', id);
    setPositionPresets(prev => prev.filter(p => p.id !== id));
  }

  async function addHourPreset(name: string, start_time: string, end_time: string): Promise<void> {
    const { data } = await supabase
      .from('hour_presets')
      .insert({ name, start_time, end_time, user_id: userId })
      .select('id, name, start_time, end_time')
      .single();
    if (data) setHourPresets(prev => [...prev, data]);
  }

  async function deleteHourPreset(id: string): Promise<void> {
    await supabase.from('hour_presets').delete().eq('id', id);
    setHourPresets(prev => prev.filter(p => p.id !== id));
  }

  return {
    positionPresets,
    hourPresets,
    addPositionPreset,
    deletePositionPreset,
    addHourPreset,
    deleteHourPreset,
  };
}
