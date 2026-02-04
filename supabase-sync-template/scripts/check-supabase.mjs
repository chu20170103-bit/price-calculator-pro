#!/usr/bin/env node
/**
 * 自動檢查 Supabase 是否開好：環境變數、連線、表存在、anon 讀寫權限。
 * 使用方式：node scripts/check-supabase.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function loadSyncConfig() {
  const configPath = resolve(root, 'supabase-sync.config.json');
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

const env = { ...process.env, ...loadEnv() };
const syncConfig = loadSyncConfig();
const urlKey = syncConfig?.env?.urlKey || 'VITE_SUPABASE_URL';
const anonKey = syncConfig?.env?.anonKey || 'VITE_SUPABASE_ANON_KEY';
const url = env[urlKey]?.trim();
const key = env[anonKey]?.trim();
const mainTableName = syncConfig?.mainTable?.name || 'pricing_sync';
const deviceIdCol = syncConfig?.mainTable?.deviceIdColumn || 'device_id';
const gamesCol = syncConfig?.mainTable?.payloadColumnGames || 'games';
const currentIdCol = syncConfig?.mainTable?.payloadColumnCurrentId || 'current_game_id';

const checks = { ok: [], fail: [] };

function pass(msg) {
  checks.ok.push(msg);
  console.log('  ✓', msg);
}
function fail(msg) {
  checks.fail.push(msg);
  console.log('  ✗', msg);
}

async function main() {
  console.log('=== Supabase 自動檢查 ===\n');

  // 1. 環境變數（本機 .env 或 CI 的 secrets，變數名依 supabase-sync.config.json）
  console.log('1. 環境變數');
  if (url && key) {
    pass(`${urlKey} 已設定`);
    pass(`${anonKey} 已設定`);
  } else {
    if (!url) fail(`${urlKey} 未設定（本機請設 .env）`);
    if (!key) fail(`${anonKey} 未設定`);
  }
  console.log('');

  if (!url || !key) {
    console.log('請先設定環境變數後再執行此腳本。');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // 2. 連線與表存在
  console.log('2. 連線與表', mainTableName);
  const { error: selectError } = await supabase
    .from(mainTableName)
    .select(deviceIdCol)
    .limit(1);
  if (selectError) {
    if (selectError.code === '42P01') {
      fail(`表 ${mainTableName} 不存在，請執行 npm run db:push 或於 Dashboard 執行 migration`);
    } else {
      fail('讀取失敗: ' + selectError.message);
    }
  } else {
    pass('連線成功，表 ' + mainTableName + ' 存在');
  }
  console.log('');

  // 3. anon 寫入權限（insert + delete 測試列）
  console.log('3. anon 讀寫權限');
  const testId = 'check-supabase-' + Date.now();
  const payload = {
    [deviceIdCol]: testId,
    [gamesCol]: [],
    [currentIdCol]: null,
  };
  const { error: insertErr } = await supabase.from(mainTableName).insert(payload);
  if (insertErr) {
    fail('寫入測試失敗: ' + insertErr.message);
  } else {
    pass('寫入（insert）成功');
    const { error: deleteErr } = await supabase.from(mainTableName).delete().eq(deviceIdCol, testId);
    if (deleteErr) {
      fail('刪除測試失敗: ' + deleteErr.message);
    } else {
      pass('刪除（delete）成功');
    }
  }
  console.log('');

  // 總結
  console.log('=== 結果 ===');
  if (checks.fail.length === 0) {
    console.log('全部通過，Supabase 已開好，可正常讀寫。');
    process.exit(0);
  } else {
    console.log('失敗項:', checks.fail.length);
    checks.fail.forEach(m => console.log('  -', m));
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
