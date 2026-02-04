#!/usr/bin/env node
/**
 * 在「方案紀錄」中正確寫入一筆資料（附加到 device_id = local-backup，若無則建立該列）
 * 使用方式：node scripts/add-one-profile.mjs
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

// 一筆符合 app 格式的方案紀錄（NamedPresetProfile）
const newProfile = {
  id: 'profile-' + Date.now(),
  name: 'CLI 寫入範例',
  rows: [
    { minutes: 60, people: 2, cost: 1700, fee: 200, profit: 1000 },
  ],
  createdAt: new Date().toISOString(),
};

const minimalGame = {
  id: 'game-' + Date.now(),
  name: '預設遊戲',
  presets: [],
  history: [],
};

async function main() {
  const { data: existing, error: fetchErr } = await supabase
    .from('pricing_sync')
    .select('games, current_game_id, named_profiles')
    .eq('device_id', DEVICE_ID)
    .maybeSingle();

  if (fetchErr) {
    console.error('讀取失敗:', fetchErr.message);
    process.exit(1);
  }

  const currentProfiles = existing?.named_profiles ?? [];
  if (!Array.isArray(currentProfiles)) {
    console.error('named_profiles 格式錯誤');
    process.exit(1);
  }
  const updatedProfiles = [newProfile, ...currentProfiles];

  const payload = existing
    ? {
        device_id: DEVICE_ID,
        games: existing.games ?? [minimalGame],
        current_game_id: existing.current_game_id ?? minimalGame.id,
        named_profiles: updatedProfiles,
        updated_at: new Date().toISOString(),
      }
    : {
        device_id: DEVICE_ID,
        games: [minimalGame],
        current_game_id: minimalGame.id,
        named_profiles: updatedProfiles,
        updated_at: new Date().toISOString(),
      };

  const { error: upsertErr } = await supabase
    .from('pricing_sync')
    .upsert(payload, { onConflict: 'device_id' });

  if (upsertErr) {
    console.error('寫入失敗:', upsertErr.message);
    process.exit(1);
  }

  console.log('已寫入一筆方案紀錄到 Supabase。');
  console.log('  方案名稱:', newProfile.name);
  console.log('  筆數:', newProfile.rows.length, '（60分/2人，成本1700+手續費200+利潤1000）');
  console.log('  同步碼:', DEVICE_ID, '→ 網頁輸入此同步碼按「載入」即可看到。');
}

main();
