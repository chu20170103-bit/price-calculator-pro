import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types/pricing';
import type { NamedPresetProfile } from './useNamedPresets';

const DEVICE_ID_KEY = 'pricing-device-id';
const SAVE_DEBOUNCE_MS = 2000;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 14);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export interface UseSupabaseSyncOptions {
  games: Game[];
  currentGameId: string;
  namedProfiles: NamedPresetProfile[];
  loadGames: (games: Game[], currentGameId: string) => void;
  loadProfiles: (profiles: NamedPresetProfile[]) => void;
}

export function useSupabaseSync({
  games,
  currentGameId,
  namedProfiles,
  loadGames,
  loadProfiles,
}: UseSupabaseSyncOptions) {
  const hasFetched = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }
    const deviceId = getDeviceId();
    const payload = {
      device_id: deviceId,
      games,
      current_game_id: currentGameId || null,
      named_profiles: namedProfiles,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('pricing_sync')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from('pricing_sync').update(payload).eq('device_id', deviceId)
      : await supabase.from('pricing_sync').insert(payload);

    if (error) {
      console.warn('[Supabase] save failed:', error);
      toast.error(`雲端同步失敗：${error.message}`);
    }
  }, [games, currentGameId, namedProfiles]);

  useEffect(() => {
    if (!isSupabaseConfigured() || hasFetched.current) return;
    hasFetched.current = true;
    const deviceId = getDeviceId();
    supabase
      .from('pricing_sync')
      .select('games, current_game_id, named_profiles')
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        const gamesFromCloud = data.games as Game[] | null;
        const profilesFromCloud = data.named_profiles as NamedPresetProfile[] | null;
        const cid = (data.current_game_id as string) || '';
        if (Array.isArray(gamesFromCloud) && gamesFromCloud.length > 0) {
          loadGames(gamesFromCloud, cid || gamesFromCloud[0]?.id || '');
        }
        if (Array.isArray(profilesFromCloud)) {
          loadProfiles(profilesFromCloud);
        }
      });
  }, [loadGames, loadProfiles]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
      saveToSupabase();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [games, currentGameId, namedProfiles, saveToSupabase]);
}
