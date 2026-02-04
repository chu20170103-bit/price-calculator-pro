#!/usr/bin/env node
/**
 * 實測：寫入一筆方案紀錄「207」到 Supabase，再刪除，確認資料庫可正常寫入與刪除。
 * 使用方式：node scripts/test-db-write-delete.mjs
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

const env = { ...process.env, ...loadEnv() };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('請在 .env 設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const TEST_DEVICE_ID = 'test-207-run';

const profile207 = {
  id: 'test-profile-207',
  name: '207',
  rows: [
    { minutes: 30, people: 1, cost: 800, fee: 100, profit: 700 },
  ],
  createdAt: new Date().toISOString(),
};

const minimalGame = {
  id: 'test-game-1',
  name: '測試用',
  presets: [],
  history: [],
};

async function main() {
  console.log('=== 1. 寫入：新增方案紀錄「207」 ===');
  const rowWith207 = {
    device_id: TEST_DEVICE_ID,
    games: [minimalGame],
    current_game_id: minimalGame.id,
    named_profiles: [profile207],
    updated_at: new Date().toISOString(),
  };
  const { error: err1 } = await supabase.from('pricing_sync').upsert(rowWith207, { onConflict: 'device_id' });
  if (err1) {
    console.error('寫入失敗:', err1.message);
    process.exit(1);
  }
  console.log('  ✓ 已寫入 device_id:', TEST_DEVICE_ID, '，方案紀錄含一筆「207」');

  console.log('\n=== 2. 查詢確認 ===');
  const { data: readBack, error: err2 } = await supabase
    .from('pricing_sync')
    .select('device_id, named_profiles')
    .eq('device_id', TEST_DEVICE_ID)
    .single();
  if (err2 || !readBack) {
    console.error('查詢失敗:', err2?.message || '無資料');
    process.exit(1);
  }
  const profiles = readBack.named_profiles || [];
  const found = profiles.find(p => p.name === '207');
  if (!found) {
    console.error('查詢結果中沒有「207」');
    process.exit(1);
  }
  console.log('  ✓ 確認 named_profiles 內有一筆 name="207"');

  console.log('\n=== 3. 刪除：移除方案紀錄「207」 ===');
  const rowWithout207 = {
    device_id: TEST_DEVICE_ID,
    games: [minimalGame],
    current_game_id: minimalGame.id,
    named_profiles: [],
    updated_at: new Date().toISOString(),
  };
  const { error: err3 } = await supabase.from('pricing_sync').upsert(rowWithout207, { onConflict: 'device_id' });
  if (err3) {
    console.error('更新（刪除方案）失敗:', err3.message);
    process.exit(1);
  }
  console.log('  ✓ 已將 named_profiles 清空，等同刪除「207」');

  console.log('\n=== 4. 再次查詢確認已刪除 ===');
  const { data: afterDelete, error: err4 } = await supabase
    .from('pricing_sync')
    .select('named_profiles')
    .eq('device_id', TEST_DEVICE_ID)
    .single();
  if (err4 || !afterDelete) {
    console.error('查詢失敗:', err4?.message);
    process.exit(1);
  }
  if ((afterDelete.named_profiles || []).length !== 0) {
    console.error('刪除後 named_profiles 應為空，實際:', afterDelete.named_profiles);
    process.exit(1);
  }
  console.log('  ✓ named_profiles 已為空');

  console.log('\n=== 5. 清理測試列（可選）===');
  const { error: err5 } = await supabase.from('pricing_sync').delete().eq('device_id', TEST_DEVICE_ID);
  if (err5) {
    console.warn('  （清理失敗不影響測試）', err5.message);
  } else {
    console.log('  ✓ 已刪除測試用列', TEST_DEVICE_ID);
  }

  console.log('\n✅ 資料庫寫入與刪除測試通過。');
}

main();
