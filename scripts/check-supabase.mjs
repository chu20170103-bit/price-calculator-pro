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

const env = { ...process.env, ...loadEnv() };
const url = env.VITE_SUPABASE_URL?.trim();
const key = env.VITE_SUPABASE_ANON_KEY?.trim();

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

  // 1. 環境變數（本機 .env 或 CI 的 secrets）
  console.log('1. 環境變數');
  if (url && key) {
    pass('VITE_SUPABASE_URL 已設定');
    pass('VITE_SUPABASE_ANON_KEY 已設定');
  } else {
    if (!url) fail('VITE_SUPABASE_URL 未設定（本機請設 .env，GitHub Pages 請在 Repo Settings → Secrets 新增）');
    if (!key) fail('VITE_SUPABASE_ANON_KEY 未設定');
  }
  console.log('');

  if (!url || !key) {
    console.log('請先設定環境變數後再執行此腳本。');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // 2. 連線與表存在
  console.log('2. 連線與表 pricing_sync');
  const { data: rows, error: selectError } = await supabase
    .from('pricing_sync')
    .select('device_id')
    .limit(1);
  if (selectError) {
    if (selectError.code === '42P01') {
      fail('表 pricing_sync 不存在，請執行 npx supabase db push 或於 Dashboard 執行 schema.sql');
    } else {
      fail('讀取失敗: ' + selectError.message);
    }
  } else {
    pass('連線成功，表 pricing_sync 存在');
  }
  console.log('');

  // 3. anon 寫入權限（insert + delete 測試列）
  console.log('3. anon 讀寫權限');
  const testId = 'check-supabase-' + Date.now();
  const { error: insertErr } = await supabase.from('pricing_sync').insert({
    device_id: testId,
    games: [],
    current_game_id: null,
    named_profiles: [],
  });
  if (insertErr) {
    fail('寫入測試失敗: ' + insertErr.message);
  } else {
    pass('寫入（insert）成功');
    const { error: deleteErr } = await supabase.from('pricing_sync').delete().eq('device_id', testId);
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
