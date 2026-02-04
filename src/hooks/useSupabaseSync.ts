import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { SYNC_CONFIG } from '@/lib/supabase-sync-config';
import type { Game } from '@/types/pricing';
import type { NamedPresetProfile } from './useNamedPresets';

const SYNC_CODE_KEY = 'pricing-sync-code';
/** 未設定同步碼時使用的預設 key，讓開頁就讀／寫雲端同一筆資料 */
const DEFAULT_SYNC_KEY = 'main';
/** 立即寫入：縮短 debounce，變更後很快就推上雲端 */
const SAVE_DEBOUNCE_MS = 300;

const MT = SYNC_CONFIG.mainTable;
const LT = SYNC_CONFIG.listTable;
const ENV = SYNC_CONFIG.env;

/** 同步用的 key：有設定同步碼則用同步碼，否則用預設 main（預設即讀寫雲端） */
function getSyncKey(): string {
  const code = localStorage.getItem(SYNC_CODE_KEY);
  return (code && code.trim()) ? code.trim() : DEFAULT_SYNC_KEY;
}

/** 從 list 表多筆 row 轉成 NamedPresetProfile[]（欄位名依 SYNC_CONFIG） */
function rowsToProfiles(rows: Record<string, unknown>[]): NamedPresetProfile[] {
  return rows.map((r) => ({
    id: String(r[LT.itemIdColumn] ?? ''),
    name: String(r[LT.nameColumn] ?? ''),
    rows: Array.isArray(r[LT.dataColumn])
      ? (r[LT.dataColumn] as Record<string, unknown>[]).map((row) => ({
          minutes: Number(row.minutes) || 0,
          people: Number(row.people) || 0,
          cost: Number(row.cost) || 0,
          fee: Number(row.fee) || 0,
          profit: Number(row.profit) || 0,
        }))
      : [],
    createdAt: String(r[LT.createdAtColumn] ?? new Date().toISOString()),
  })).filter((p) => p.name || p.rows.length > 0);
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env[ENV.urlKey];
  const key = import.meta.env[ENV.anonKey];
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
  /** 剛寫入後短時間內不要 refetch，避免把剛刪除的資料又從舊快取讀回來 */
  const lastSavedAtRef = useRef(0);
  const [syncCode, setSyncCodeState] = useState<string>(() => localStorage.getItem(SYNC_CODE_KEY) || '');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /** 初次雲端讀取完成後才允許自動儲存，避免用空的本機資料覆蓋雲端 */
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  /** 只同步主資料到 main 表（方案紀錄改為單筆存刪） */
  const saveToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.warn('[Supabase] 未設定，跳過寫入');
      return;
    }
    console.log('[Supabase] 操作紀錄：寫入主資料至雲端');
    setIsSaving(true);
    const key = getSyncKey();
    const payload: Record<string, unknown> = {
      [MT.deviceIdColumn]: key,
      [MT.payloadColumnGames]: games,
      [MT.payloadColumnCurrentId]: currentGameId || null,
      [MT.updatedAtColumn]: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from(MT.name)
      .select('id')
      .eq(MT.deviceIdColumn, key)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from(MT.name).update(payload).eq(MT.deviceIdColumn, key)
      : await supabase.from(MT.name).insert(payload);

    if (error) {
      console.error('[Supabase] 寫入失敗:', error.message, error);
      toast.error(`雲端同步失敗：${error.message}`);
      setIsSaving(false);
      return;
    }
    setLastSyncedAt(new Date());
    lastSavedAtRef.current = Date.now();
    setIsSaving(false);
    console.log('[Supabase] 操作紀錄：已寫入雲端');
  }, [games, currentGameId]);

  /** 單筆新增方案紀錄到雲端 */
  const addProfileToCloud = useCallback(
    async (profile: NamedPresetProfile) => {
      if (!isSupabaseConfigured()) return;
      const key = getSyncKey();
      const { error } = await supabase.from(LT.name).insert({
        [LT.deviceIdColumn]: key,
        [LT.itemIdColumn]: profile.id,
        [LT.nameColumn]: profile.name,
        [LT.dataColumn]: profile.rows,
        [LT.createdAtColumn]: profile.createdAt,
      });
      if (error) {
        console.error('[Supabase] 新增方案失敗:', error.message);
        toast.error('雲端同步失敗：' + error.message);
        return;
      }
      lastSavedAtRef.current = Date.now();
      console.log('[Supabase] 操作紀錄：已新增單筆方案至雲端');
    },
    []
  );

  /** 單筆刪除方案紀錄（只刪雲端那一筆） */
  const deleteProfileFromCloud = useCallback(async (profileId: string) => {
    if (!isSupabaseConfigured()) return;
    const key = getSyncKey();
    const { error } = await supabase
      .from(LT.name)
      .delete()
      .eq(LT.deviceIdColumn, key)
      .eq(LT.itemIdColumn, profileId);
    if (error) {
      console.error('[Supabase] 刪除方案失敗:', error.message);
      toast.error('雲端刪除失敗：' + error.message);
      return;
    }
    lastSavedAtRef.current = Date.now();
    console.log('[Supabase] 操作紀錄：已從雲端刪除單筆方案');
  }, []);

  /** 從雲端讀取並套用（主表 + 清單表，欄位依 SYNC_CONFIG） */
  const refetchFromCloud = useCallback(() => {
    if (!isSupabaseConfigured()) return;
    console.log('[Supabase] 操作紀錄：從雲端讀取');
    const key = getSyncKey();
    const mainSelect = [MT.payloadColumnGames, MT.payloadColumnCurrentId].join(', ');
    const listSelect = [LT.itemIdColumn, LT.nameColumn, LT.dataColumn, LT.createdAtColumn].join(', ');
    Promise.all([
      supabase.from(MT.name).select(mainSelect).eq(MT.deviceIdColumn, key).maybeSingle(),
      supabase.from(LT.name).select(listSelect).eq(LT.deviceIdColumn, key).order(LT.createdAtColumn, { ascending: false }),
    ])
      .then(([syncRes, profilesRes]) => {
        if (syncRes.error) {
          console.error('[Supabase] 讀取主表失敗:', syncRes.error.message);
          return;
        }
        const data = syncRes.data as Record<string, unknown> | null;
        const gamesFromCloud = data?.[MT.payloadColumnGames] as Game[] | null;
        const cid = (data?.[MT.payloadColumnCurrentId] as string) || '';
        if (Array.isArray(gamesFromCloud) && gamesFromCloud.length > 0) {
          loadGames(gamesFromCloud, cid || gamesFromCloud[0]?.id || '');
        }
        if (profilesRes.error) {
          console.error('[Supabase] 讀取清單表失敗:', profilesRes.error.message);
        } else {
          const list = (profilesRes.data || []) as Record<string, unknown>[];
          loadProfiles(rowsToProfiles(list));
        }
        console.log('[Supabase] 操作紀錄：讀取完成並已套用');
      })
      .catch((err) => console.error('[Supabase] 讀取例外:', err));
  }, [loadGames, loadProfiles]);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    console.log('[Supabase] 初次載入檢查:', configured ? '已設定，準備讀取' : `未設定（請設 ${ENV.urlKey}、${ENV.anonKey}）`);
    if (!configured) {
      if (typeof window !== 'undefined') {
        console.warn(`[Supabase] 未設定：請在 .env 設定 ${ENV.urlKey}、${ENV.anonKey}`);
      }
      setInitialLoadDone(true);
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;
    const key = getSyncKey();
    console.log('[Supabase] 讀取中 key=', key);
    const mainSelect = [MT.payloadColumnGames, MT.payloadColumnCurrentId].join(', ');
    const listSelect = [LT.itemIdColumn, LT.nameColumn, LT.dataColumn, LT.createdAtColumn].join(', ');
    Promise.all([
      supabase.from(MT.name).select(mainSelect).eq(MT.deviceIdColumn, key).maybeSingle(),
      supabase.from(LT.name).select(listSelect).eq(LT.deviceIdColumn, key).order(LT.createdAtColumn, { ascending: false }),
    ])
      .then(([syncRes, profilesRes]) => {
        if (syncRes.error) {
          console.error('[Supabase] 讀取失敗:', syncRes.error.message, syncRes.error);
          toast.error('雲端讀取失敗：' + syncRes.error.message);
          setInitialLoadDone(true);
          return;
        }
        const data = syncRes.data as Record<string, unknown> | null;
        const gamesFromCloud = data?.[MT.payloadColumnGames] as Game[] | null;
        const cid = (data?.[MT.payloadColumnCurrentId] as string) || '';
        const gamesCount = Array.isArray(gamesFromCloud) ? gamesFromCloud.length : 0;
        let profiles: NamedPresetProfile[] = [];
        if (!profilesRes.error) {
          const list = (profilesRes.data || []) as Record<string, unknown>[];
          profiles = rowsToProfiles(list);
        } else {
          console.warn('[Supabase] 讀取清單表失敗:', profilesRes.error.message);
        }
        console.log('[Supabase] 讀取完成：方案紀錄', profiles.length, '筆，games', gamesCount, '筆');
        if (Array.isArray(gamesFromCloud) && gamesFromCloud.length > 0) {
          loadGames(gamesFromCloud, cid || gamesFromCloud[0]?.id || '');
        }
        loadProfiles(profiles);
        const total = profiles.length + gamesCount;
        if (total > 0) toast.success('已從雲端載入');
        setInitialLoadDone(true);
      })
      .catch((err) => {
        console.error('[Supabase] 讀取例外:', err);
        toast.error('雲端讀取失敗');
        setInitialLoadDone(true);
      });
  }, [loadGames, loadProfiles]);

  /** 切回分頁時從雲端讀取；若剛寫入完 3 秒內則略過，避免刪除後被舊資料蓋回 */
  const REFETCH_COOLDOWN_MS = 3000;
  useEffect(() => {
    if (!isSupabaseConfigured() || !initialLoadDone) return;
    let t: ReturnType<typeof setTimeout>;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSavedAtRef.current < REFETCH_COOLDOWN_MS) {
        console.log('[操作紀錄] 剛寫入不久，略過本次從雲端讀取');
        return;
      }
      console.log('[操作紀錄] 切回分頁，即將從雲端讀取');
      t = setTimeout(() => refetchFromCloud(), 400);
    };
    window.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('visibilitychange', onVisible);
      clearTimeout(t!);
    };
  }, [refetchFromCloud, initialLoadDone]);

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
      const mainSelect = [MT.payloadColumnGames, MT.payloadColumnCurrentId].join(', ');
      const listSelect = [LT.itemIdColumn, LT.nameColumn, LT.dataColumn, LT.createdAtColumn].join(', ');
      const [syncRes, profilesRes] = await Promise.all([
        supabase.from(MT.name).select(mainSelect).eq(MT.deviceIdColumn, trimmed).maybeSingle(),
        supabase.from(LT.name).select(listSelect).eq(LT.deviceIdColumn, trimmed).order(LT.createdAtColumn, { ascending: false }),
      ]);
      if (syncRes.error) {
        toast.error(`載入失敗：${syncRes.error.message}`);
        return;
      }
      const data = syncRes.data as Record<string, unknown> | null;
      if (!data && (!profilesRes.data || profilesRes.data.length === 0)) {
        toast.info('此同步碼尚無資料，之後在此裝置的儲存會寫入此同步碼');
      } else {
        const gamesFromCloud = data?.[MT.payloadColumnGames] as Game[] | null;
        const cid = (data?.[MT.payloadColumnCurrentId] as string) || '';
        if (Array.isArray(gamesFromCloud) && gamesFromCloud.length > 0) {
          loadGames(gamesFromCloud, cid || gamesFromCloud[0]?.id || '');
        }
        const list = (profilesRes.data || []) as Record<string, unknown>[];
        const loadedProfiles = rowsToProfiles(list);
        loadProfiles(loadedProfiles);
        toast.success(
          loadedProfiles.length > 0
            ? `已載入此同步碼的資料（${loadedProfiles.length} 筆方案）`
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

  /** 刪除雲端儲存：此裝置的主表一筆 + 清單表全部刪除（僅在用戶主動按「清空雲端」時使用） */
  const deleteCloudStorage = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      toast.error('未設定 Supabase');
      return;
    }
    const key = getSyncKey();
    const [syncErr, profilesErr] = await Promise.all([
      supabase.from(MT.name).delete().eq(MT.deviceIdColumn, key).then((r) => r.error),
      supabase.from(LT.name).delete().eq(LT.deviceIdColumn, key).then((r) => r.error),
    ]);
    if (syncErr || profilesErr) {
      const msg = syncErr?.message || profilesErr?.message || '未知錯誤';
      console.error('[Supabase] 刪除雲端儲存失敗:', msg);
      toast.error('刪除雲端儲存失敗：' + msg);
      return;
    }
    console.log('[Supabase] 操作紀錄：已刪除雲端儲存（主表 + 清單表）');
    toast.success('已刪除雲端儲存，本機資料不受影響');
  }, []);

  const syncKeyForDisplay = getSyncKey();
  const isUsingSyncCode = Boolean(syncCode);

  return {
    syncCode,
    setSyncCode,
    clearSyncCode,
    loadBySyncCode,
    saveNow,
    refetchFromCloud,
    deleteCloudStorage,
    /** 單筆新增／刪除方案到雲端（每一筆各自儲存與刪除） */
    addProfileToCloud,
    deleteProfileFromCloud,
    lastSyncedAt,
    isSaving,
    /** 目前用來讀取／寫入雲端的 key（同步碼或預設 main） */
    syncKeyForDisplay: isUsingSyncCode ? syncCode : `${DEFAULT_SYNC_KEY}（預設）`,
    isUsingSyncCode,
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!initialLoadDone) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
      saveToSupabase();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [games, currentGameId, saveToSupabase, initialLoadDone]);

  // 離開分頁／關閉前盡量寫入一次（僅在初次載入完成後，避免覆蓋雲端）
  useEffect(() => {
    if (!isSupabaseConfigured() || !initialLoadDone) return;
    const flush = () => saveToSupabase();
    const onHide = () => flush();
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [saveToSupabase, initialLoadDone]);
}
