#!/usr/bin/env node
/**
 * 從 supabase-sync.config.json 產生前端用 src/lib/supabase-sync-config.ts
 * 僅使用 config 內專案自己的命名，無其他專案預設。含驗證與錯誤處理。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, 'supabase-sync.config.json');
const outPath = resolve(root, 'src/lib/supabase-sync-config.ts');

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    errors.push('config 必須為 JSON 物件');
    return errors;
  }
  const M = config.mainTable;
  const L = config.listTable;
  const E = config.env;
  if (!M || typeof M.name !== 'string') errors.push('mainTable.name 必填');
  if (!L || typeof L.name !== 'string') errors.push('listTable.name 必填');
  if (!E || typeof E.urlKey !== 'string') errors.push('env.urlKey 必填');
  if (!E || typeof E.anonKey !== 'string') errors.push('env.anonKey 必填');
  return errors;
}

function main() {
  try {
    if (!existsSync(configPath)) {
      console.error('[supabase:generate-config] 找不到 supabase-sync.config.json');
      console.error('請先執行：npm run supabase:detect');
      process.exit(1);
    }
    const raw = readFileSync(configPath, 'utf8');
    let config;
    try {
      config = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[supabase:generate-config] JSON 解析失敗:', parseErr.message);
      process.exit(1);
    }
    const prefix = config.projectPrefix || 'app';
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error('[supabase:generate-config] 設定不完整:', errors.join('; '));
      process.exit(1);
    }
    const M = config.mainTable;
    const L = config.listTable;
    const E = config.env;
    const ts = `/** 由 scripts/generate-supabase-sync-config.mjs 從 supabase-sync.config.json 產生，請勿手動編輯 */\n\nexport const SYNC_CONFIG = {\n  mainTable: {\n    name: ${JSON.stringify(M.name)},\n    deviceIdColumn: ${JSON.stringify(M.deviceIdColumn ?? 'device_id')},\n    payloadColumnGames: ${JSON.stringify(M.payloadColumnGames ?? 'data')},\n    payloadColumnCurrentId: ${JSON.stringify(M.payloadColumnCurrentId ?? 'current_id')},\n    updatedAtColumn: ${JSON.stringify(M.updatedAtColumn ?? 'updated_at')},\n  },\n  listTable: {\n    name: ${JSON.stringify(L.name)},\n    deviceIdColumn: ${JSON.stringify(L.deviceIdColumn ?? 'device_id')},\n    itemIdColumn: ${JSON.stringify(L.itemIdColumn ?? 'item_id')},\n    nameColumn: ${JSON.stringify(L.nameColumn ?? 'name')},\n    dataColumn: ${JSON.stringify(L.dataColumn ?? 'data')},\n    createdAtColumn: ${JSON.stringify(L.createdAtColumn ?? 'created_at')},\n  },\n  env: {\n    urlKey: ${JSON.stringify(E.urlKey)},\n    anonKey: ${JSON.stringify(E.anonKey)},\n  },\n} as const;\n`;
    writeFileSync(outPath, ts, 'utf8');
    console.log('已寫入 src/lib/supabase-sync-config.ts');
    return 0;
  } catch (err) {
    console.error('[supabase:generate-config] 錯誤:', err.message || err);
    process.exit(1);
  }
}

main();
