import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Shift, Position } from '../types';

export interface ShiftSetPreset {
  id: string;
  name: string;
  shifts: Omit<Shift, 'id'>[]; 
}

export interface PositionSetPreset {
  id: string;
  name: string;
  positions: Omit<Position, 'id'>[]; 
}

export function usePresets(userId: string | null) {
  const [shiftSets, setShiftSets] = useState<ShiftSetPreset[]>([]);
  const [positionSets, setPositionSets] = useState<PositionSetPreset[]>([]);

  useEffect(() => {
    if (!userId) {
      setShiftSets([]);
      setPositionSets([]);
      return;
    }

    supabase
      .from('shift_set_presets')
      .select('id, name, shifts')
      .eq('user_id', userId)
      .order('created_at')
      .then(({ data }) => { if (data) setShiftSets(data); });

    supabase
      .from('position_set_presets')
      .select('id, name, positions')
      .eq('user_id', userId)
      .order('created_at')
      .then(({ data }) => { if (data) setPositionSets(data); });
  }, [userId]);

  async function addShiftSet(name: string, shifts: Shift[]): Promise<void> {
    const shiftsWithoutIds = shifts.map(({ id, ...rest }) => rest);
    const { data } = await supabase
      .from('shift_set_presets')
      .insert({ name, shifts: shiftsWithoutIds, user_id: userId })
      .select('id, name, shifts')
      .single();
    if (data) setShiftSets(prev => [...prev, data]);
  }

  async function deleteShiftSet(id: string): Promise<void> {
    await supabase.from('shift_set_presets').delete().eq('id', id);
    setShiftSets(prev => prev.filter(p => p.id !== id));
  }

  async function addPositionSet(name: string, positions: Position[]): Promise<void> {
    const posWithoutIds = positions.map(({ id, ...rest }) => rest);
    const { data } = await supabase
      .from('position_set_presets')
      .insert({ name, positions: posWithoutIds, user_id: userId })
      .select('id, name, positions')
      .single();
    if (data) setPositionSets(prev => [...prev, data]);
  }

  async function deletePositionSet(id: string): Promise<void> {
    await supabase.from('position_set_presets').delete().eq('id', id);
    setPositionSets(prev => prev.filter(p => p.id !== id));
  }

  return {
    shiftSets,
    positionSets,
    addShiftSet,
    deleteShiftSet,
    addPositionSet,
    deletePositionSet,
  };
}
