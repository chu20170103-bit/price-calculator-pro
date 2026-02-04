#!/usr/bin/env node
/**
 * 將「目前本機紀錄」寫入 Supabase（依你畫面上的 207妹妹 5 筆）
 * 寫入後在網頁「跨裝置同步」輸入同步碼 local-backup 按「載入」即可看到。
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

const DEVICE_ID = 'local-backup';

// 依你畫面上的表格：207妹妹 5 筆（分 次 成本 手續費 利潤 售價）
const profile207 = {
  id: 'local-207-' + Date.now(),
  name: '207妹妹',
  rows: [
    { minutes: 30, people: 1, cost: 800, fee: 100, profit: 700 },
    { minutes: 40, people: 1, cost: 1000, fee: 200, profit: 700 },
    { minutes: 60, people: 1, cost: 1300, fee: 200, profit: 900 },
    { minutes: 60, people: 2, cost: 1700, fee: 200, profit: 1000 },
    { minutes: 90, people: 2, cost: 2200, fee: 300, profit: 1400 },
  ],
  createdAt: new Date().toISOString(),
};

const minimalGame = {
  id: 'local-game-1',
  name: '預設遊戲',
  presets: [],
  history: [],
};

async function main() {
  const row = {
    device_id: DEVICE_ID,
    games: [minimalGame],
    current_game_id: minimalGame.id,
    named_profiles: [profile207],
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('pricing_sync').upsert(row, { onConflict: 'device_id' });
  if (error) {
    console.error('寫入失敗:', error.message);
    process.exit(1);
  }
  console.log('已將本機紀錄寫入 Supabase。');
  console.log('方案紀錄：207妹妹，5 筆。');
  console.log('在網頁「跨裝置同步」輸入同步碼 local-backup 按「載入」即可看到。');
}

main();
