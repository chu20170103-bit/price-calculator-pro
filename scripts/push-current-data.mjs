#!/usr/bin/env node
/**
 * 將「目前方案紀錄」寫入 Supabase
 * 方式一：在網頁按「匯出歷史紀錄＋方案紀錄」複製 JSON，貼到 scripts/current-sync-data.json，然後執行：
 *   node scripts/push-current-data.mjs [device_id]
 * 方式二：不帶參數且無檔案時，會提示先匯出並建立 JSON 檔。
 * 預設 device_id 為 my-data，可傳入第一個參數覆蓋（例如你的同步碼）。
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

const dataPath = resolve(__dirname, 'current-sync-data.json');
const deviceId = process.argv[2] || 'my-data';

function buildRow(payload) {
  if (payload.device_id != null && payload.games != null) {
    return payload;
  }
  const history = payload.history || [];
  const namedProfiles = payload.namedProfiles || [];
  const gameId = 'exported-' + Date.now();
  return {
    device_id: deviceId,
    games: [
      {
        id: gameId,
        name: '當前',
        presets: [],
        history,
      },
    ],
    current_game_id: gameId,
    named_profiles: namedProfiles,
  };
}

async function main() {
  if (!existsSync(dataPath)) {
    console.error('找不到', dataPath);
    console.error('請在網頁按「匯出歷史紀錄」取得 JSON，另存為 scripts/current-sync-data.json 後再執行此腳本。');
    process.exit(1);
  }
  const raw = readFileSync(dataPath, 'utf8');
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error('JSON 解析失敗:', e.message);
    process.exit(1);
  }
  const row = buildRow(payload);
  row.updated_at = new Date().toISOString();
  if (!row.device_id) row.device_id = deviceId;

  console.log('正在寫入 Supabase，device_id:', row.device_id);
  const { error } = await supabase.from('pricing_sync').upsert(row, { onConflict: 'device_id' });
  if (error) {
    console.error('寫入失敗:', error.message);
    process.exit(1);
  }
  console.log('完成。方案紀錄筆數:', (row.named_profiles || []).length);
}

main();
