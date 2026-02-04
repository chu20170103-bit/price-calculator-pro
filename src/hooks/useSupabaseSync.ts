import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Game } from '@/types/pricing';
import type { NamedPresetProfile } from './useNamedPresets';

const SYNC_CODE_KEY = 'pricing-sync-code';
/** 未設定同步碼時使用的預設 key，讓開頁就讀／寫雲端同一筆資料 */
const DEFAULT_SYNC_KEY = 'main';
const SAVE_DEBOUNCE_MS = 800;

/** 同步用的 key：有設定同步碼則用同步碼，否則用預設 main（預設即讀寫雲端） */
function getSyncKey(): string {
  const code = localStorage.getItem(SYNC_CODE_KEY);
  return (code && code.trim()) ? code.trim() : DEFAULT_SYNC_KEY;
}

/** 正規化從 Supabase 讀出的 named_profiles，確保為陣列且每筆含 id, name, rows, createdAt */
function normalizeProfiles(raw: unknown): NamedPresetProfile[] {
  if (Array.isArray(raw)) {
    return raw.map((p: Record<string, unknown>) => ({
      id: typeof p.id === 'string' ? p.id : 'p_' + Math.random().toString(36).slice(2, 11),
      name: typeof p.name === 'string' ? p.name : '',
      rows: Array.isArray(p.rows)
        ? p.rows.map((r: Record<string, unknown>) => ({
            minutes: Number(r.minutes) || 0,
            people: Number(r.people) || 0,
            cost: Number(r.cost) || 0,
            fee: Number(r.fee) || 0,
            profit: Number(r.profit) || 0,
          }))
        : [],
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    })).filter(p => p.name || p.rows.length > 0);
  }
  return [];
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
  const [syncCode, setSyncCodeState] = useState<string>(() => localStorage.getItem(SYNC_CODE_KEY) || '');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      if (import.meta.env.DEV) {
        console.info('[Supabase] 未設定：請在 .env 設定 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY');
      }
      return;
    }
    setIsSaving(true);
    const key = getSyncKey();
    const payload = {
      device_id: key,
      games,
      current_game_id: currentGameId || null,
      named_profiles: namedProfiles,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('pricing_sync')
      .select('id')
      .eq('device_id', key)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from('pricing_sync').update(payload).eq('device_id', key)
      : await supabase.from('pricing_sync').insert(payload);

    if (error) {
      console.error('[Supabase] 寫入失敗:', error.message, error);
      toast.error(`雲端同步失敗：${error.message}`);
      setIsSaving(false);
      return;
    }
    setLastSyncedAt(new Date());
    setIsSaving(false);
    if (import.meta.env.DEV) {
      console.info('[Supabase] 已寫入');
    }
  }, [games, currentGameId, namedProfiles]);

  useEffect(() => {
    if (!isSupabaseConfigured() || hasFetched.current) return;
    hasFetched.current = true;
    const key = getSyncKey();
    supabase
      .from('pricing_sync')
      .select('games, current_game_id, named_profiles')
      .eq('device_id', key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        const gamesFromCloud = data.games as Game[] | null;
        let profilesFromCloud = data.named_profiles;
        if (typeof profilesFromCloud === 'string') {
          try {
            profilesFromCloud = JSON.parse(profilesFromCloud);
          } catch {
            profilesFromCloud = null;
          }
        }
        const normalizedProfiles = normalizeProfiles(profilesFromCloud);
        const cid = (data.current_game_id as string) || '';
        if (Array.isArray(gamesFromCloud) && gamesFromCloud.length > 0) {
          loadGames(gamesFromCloud, cid || gamesFromCloud[0]?.id || '');
        }
        loadProfiles(normalizedProfiles);
      });
  }, [loadGames, loadProfiles]);

  const setSyncCode = useCallback((code: string) => {
    const trimmed = code.trim();
    if (trimmed) {
      localStorage.setItem(SYNC_CODE_KEY, trimmed);
      setSyncCodeState(trimmed);
      toast.success('已設定同步碼，此裝置的資料會與其他輸入相同同步碼的裝置共用');
    }
  }, []);

  const clearSyncCode = useCallback(() => {
    localStorage.removeItem(SYNC_CODE_KEY);
    setSyncCodeState('');
    toast.success('已清除同步碼，此裝置改回使用本機識別');
  }, []);

  const loadBySyncCode = useCallback(
    async (code: string) => {
      if (!isSupabaseConfigured()) {
        toast.error('尚未設定 Supabase，無法載入');
        return;
      }
      const trimmed = code.trim();
      if (!trimmed) {
        toast.error('請輸入同步碼');
        return;
      }
      const { data, error } = await supabase
        .from('pricing_sync')
        .select('games, current_game_id, named_profiles')
        .eq('device_id', trimmed)
        .maybeSingle();
      if (error) {
        toast.error(`載入失敗：${error.message}`);
        return;
      }
      if (!data) {
        toast.info('此同步碼尚無資料，之後在此裝置的儲存會寫入此同步碼');
      } else {
        const gamesFromCloud = data.games as Game[] | null;
        let profilesFromCloud = data.named_profiles;
        if (typeof profilesFromCloud === 'string') {
          try {
            profilesFromCloud = JSON.parse(profilesFromCloud);
          } catch {
            profilesFromCloud = null;
          }
        }
        const normalizedProfiles = normalizeProfiles(profilesFromCloud);
        const cid = (data.current_game_id as string) || '';
        if (Array.isArray(gamesFromCloud) && gamesFromCloud.length > 0) {
          loadGames(gamesFromCloud, cid || gamesFromCloud[0]?.id || '');
        }
        loadProfiles(normalizedProfiles);
        toast.success(
          normalizedProfiles.length > 0
            ? `已載入此同步碼的資料（${normalizedProfiles.length} 筆方案）`
            : '已載入此同步碼的資料'
        );
      }
      localStorage.setItem(SYNC_CODE_KEY, trimmed);
      setSyncCodeState(trimmed);
    },
    [loadGames, loadProfiles]
  );

  const saveNow = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    saveToSupabase();
  }, [saveToSupabase]);

  const syncKeyForDisplay = getSyncKey();
  const isUsingSyncCode = Boolean(syncCode);

  return {
    syncCode,
    setSyncCode,
    clearSyncCode,
    loadBySyncCode,
    saveNow,
    lastSyncedAt,
    isSaving,
    /** 目前用來讀取／寫入雲端的 key（同步碼或預設 main） */
    syncKeyForDisplay: isUsingSyncCode ? syncCode : `${DEFAULT_SYNC_KEY}（預設）`,
    isUsingSyncCode,
  };

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

  // 離開分頁／關閉前盡量寫入一次（避免只依賴 debounce）
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const flush = () => saveToSupabase();
    const onHide = () => flush();
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [saveToSupabase]);
}
