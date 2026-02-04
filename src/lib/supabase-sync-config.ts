/** 由 scripts/generate-supabase-sync-config.mjs 從 supabase-sync.config.json 產生，請勿手動編輯 */

export const SYNC_CONFIG = {
  mainTable: {
    name: "pricing_sync",
    deviceIdColumn: "device_id",
    payloadColumnGames: "games",
    payloadColumnCurrentId: "current_game_id",
    updatedAtColumn: "updated_at",
  },
  listTable: {
    name: "pricing_profiles",
    deviceIdColumn: "device_id",
    itemIdColumn: "profile_id",
    nameColumn: "name",
    dataColumn: "rows",
    createdAtColumn: "created_at",
  },
  env: {
    urlKey: "VITE_SUPABASE_URL",
    anonKey: "VITE_SUPABASE_ANON_KEY",
  },
} as const;
