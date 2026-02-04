import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface NamedPresetRow {
  minutes: number;
  people: number;
  cost: number;
  fee: number;
  profit: number;
}

export interface NamedPresetProfile {
  id: string;
  name: string;
  rows: NamedPresetRow[];
  createdAt: string;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const STORAGE_KEY = 'named-preset-profiles';

export function useNamedPresets() {
  const [profiles, setProfiles] = useLocalStorage<NamedPresetProfile[]>(STORAGE_KEY, []);

  const addProfile = useCallback((name: string, rows: NamedPresetRow[]) => {
    const trimmed = name.trim();
    if (!trimmed || rows.length === 0) return null;
    const newProfile: NamedPresetProfile = {
      id: generateId(),
      name: trimmed,
      rows: rows.map(({ minutes, people, cost, fee, profit }) => ({
        minutes,
        people,
        cost,
        fee,
        profit,
      })),
      createdAt: new Date().toISOString(),
    };
    setProfiles(prev => [newProfile, ...prev]);
    return newProfile;
  }, [setProfiles]);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
  }, [setProfiles]);

  return { profiles, addProfile, deleteProfile };
}
