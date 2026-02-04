#!/usr/bin/env node
/**
 * 自動化流程：依當前專案判斷 → 建立 config → 產生前端 config（→ 可選 migrations → 可選 db push）
 * 涵蓋：1) 自動判斷要擷取的資料庫內容  2) 自動建立、串聯與執行  3) 錯誤處理
 * 使用：npm run supabase:auto-setup  或  node scripts/supabase-auto-setup.mjs
 * 選項：SKIP_MIGRATIONS=1 不產生 migrations；SKIP_DB_PUSH=1 不執行 db push
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(scriptName, args = [], opts = {}) {
  const result = spawnSync('node', [resolve(__dirname, scriptName), ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...opts,
  });
  return result.status;
}

function main() {
  const skipMigrations = process.env.SKIP_MIGRATIONS === '1' || process.env.SKIP_MIGRATIONS === 'true';
  const skipDbPush = process.env.SKIP_DB_PUSH === '1' || process.env.SKIP_DB_PUSH === 'true';

  console.log('=== Supabase 自動化設定（依當前專案判斷）===\n');

  // Step 1: 自動判斷專案命名與資料庫內容，寫入 config
  console.log('1. 自動判斷要擷取的資料庫內容（表名、欄位、env）...');
  let code = run('detect-supabase-naming.mjs');
  if (code !== 0) {
    console.error('\n[錯誤] 偵測失敗，請檢查專案是否有 supabase/migrations 或 src 內 Supabase 使用，或手動建立 supabase-sync.config.json');
    process.exit(1);
  }
  console.log('  ✓ 偵測完成，supabase-sync.config.json 已寫入\n');

  // Step 2: 產生前端 config，串聯前端
  console.log('2. 建立並串聯前端 config（src/lib/supabase-sync-config.ts）...');
  code = run('generate-supabase-sync-config.mjs');
  if (code !== 0) {
    console.error('\n[錯誤] 產生前端 config 失敗');
    process.exit(1);
  }
  console.log('  ✓ 前端 config 已產生\n');

  // Step 3（可選）: 產生 migrations
  if (!skipMigrations) {
    console.log('3. 產生 migrations（依 config 表名與欄位）...');
    code = run('generate-migrations-from-config.mjs');
    if (code !== 0) {
      console.error('\n[錯誤] 產生 migrations 失敗');
      process.exit(1);
    }
    console.log('  ✓ migrations 已寫入 supabase/migrations/\n');
  } else {
    console.log('3. 略過產生 migrations（SKIP_MIGRATIONS=1）\n');
  }

  // Step 4（可選）: 執行 db push
  if (!skipDbPush) {
    console.log('4. 執行 db push（套用 migrations 至 Supabase）...');
    const pushResult = spawnSync('npm', ['run', 'db:push'], { cwd: root, stdio: 'inherit' });
    if (pushResult.status !== 0) {
      console.warn('\n[警告] db push 失敗或已略過（若尚未 npx supabase link，請先連結專案）');
      console.warn('可手動執行：npx supabase link --project-ref <REF> 後再 npm run db:push');
    } else {
      console.log('  ✓ db push 完成\n');
    }
  } else {
    console.log('4. 略過 db push（SKIP_DB_PUSH=1）\n');
  }

  console.log('=== 自動化流程結束 ===');
  console.log('建議：執行 npm run supabase:check 確認連線與讀寫，再 npm run deploy 部署。');
}

try {
  main();
} catch (err) {
  console.error('[supabase:auto-setup] 未預期錯誤:', err.message || err);
  process.exit(1);
}
