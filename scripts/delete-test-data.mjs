#!/usr/bin/env node
/**
 * 刪除 pricing_sync 表中的測試資料（test-device-1, test-device-2, sync-demo）
 * 使用方式：node scripts/delete-test-data.mjs
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

const TEST_DEVICE_IDS = ['test-device-1', 'test-device-2', 'sync-demo'];

async function main() {
  console.log('正在刪除測試資料...');
  for (const deviceId of TEST_DEVICE_IDS) {
    const { error } = await supabase.from('pricing_sync').delete().eq('device_id', deviceId);
    if (error) {
      console.error('刪除失敗:', deviceId, error.message);
      process.exit(1);
    }
    console.log('  ✓ 已刪除', deviceId);
  }
  console.log('完成，共刪除', TEST_DEVICE_IDS.length, '筆。');
}

main();
