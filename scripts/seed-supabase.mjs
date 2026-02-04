#!/usr/bin/env node
/**
 * 寫入幾筆測試資料到 Supabase pricing_sync 表
 * 使用方式：在專案根目錄執行 node scripts/seed-supabase.mjs
 * 需先在 .env 設定 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY
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

const testRows = [
  {
    device_id: 'test-device-1',
    games: [
      {
        id: 'game1',
        name: '測試遊戲 A',
        presets: [
          { id: 'p1', label: '30分/2人', minutes: 30, people: 2, cost: 800, fee: 200, price: 1200, isSystem: false },
        ],
        history: [],
      },
    ],
    current_game_id: 'game1',
    named_profiles: [
      { id: 'np1', name: '方案一', rows: [{ minutes: 60, people: 4, cost: 1500, fee: 300, profit: 600 }], createdAt: new Date().toISOString() },
    ],
  },
  {
    device_id: 'test-device-2',
    games: [
      {
        id: 'game2',
        name: '測試遊戲 B',
        presets: [
          { id: 'p2', label: '60分/4人', minutes: 60, people: 4, cost: 1500, fee: 300, price: 2400, isSystem: false },
        ],
        history: [],
      },
    ],
    current_game_id: 'game2',
    named_profiles: [],
  },
  {
    device_id: 'sync-demo',
    games: [
      {
        id: 'gd1',
        name: '同步碼示範',
        presets: [
          { id: 'pd1', label: '90分/6人', minutes: 90, people: 6, cost: 2000, fee: 500, price: 3500, isSystem: false },
        ],
        history: [],
      },
    ],
    current_game_id: 'gd1',
    named_profiles: [
      { id: 'npd1', name: '示範方案', rows: [{ minutes: 90, people: 6, cost: 2000, fee: 500, profit: 1000 }], createdAt: new Date().toISOString() },
    ],
  },
];

async function main() {
  console.log('正在寫入 Supabase pricing_sync...');
  for (const row of testRows) {
    const { error } = await supabase.from('pricing_sync').upsert(row, { onConflict: 'device_id' });
    if (error) {
      console.error('寫入失敗:', row.device_id, error.message);
      process.exit(1);
    }
    console.log('  ✓', row.device_id);
  }
  console.log('完成，共寫入', testRows.length, '筆。');
}

main();
