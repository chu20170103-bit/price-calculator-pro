#!/usr/bin/env node
/**
 * 從 supabase-sync.config.json 產生 migrations（表名與欄位名皆依該專案 config）。
 * 含驗證與錯誤處理。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, 'supabase-sync.config.json');
const migrationsDir = resolve(root, 'supabase/migrations');

function validateConfig(config) {
  const errors = [];
  if (!config?.mainTable?.name) errors.push('mainTable.name 必填');
  if (!config?.listTable?.name) errors.push('listTable.name 必填');
  return errors;
}

function main() {
  try {
    if (!existsSync(configPath)) {
      console.error('[supabase:generate-migrations] 找不到 supabase-sync.config.json');
      console.error('請先執行：npm run supabase:detect');
      process.exit(1);
    }
    let config;
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (parseErr) {
      console.error('[supabase:generate-migrations] JSON 解析失敗:', parseErr.message);
      process.exit(1);
    }
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error('[supabase:generate-migrations] 設定不完整:', errors.join('; '));
      process.exit(1);
    }
    const M = config.mainTable;
    const L = config.listTable;
    const mainName = M.name;
    const listName = L.name;
    const deviceId = M.deviceIdColumn ?? 'device_id';
    const gamesCol = M.payloadColumnGames ?? 'data';
    const currentIdCol = M.payloadColumnCurrentId ?? 'current_id';
    const updatedAtCol = M.updatedAtColumn ?? 'updated_at';
    const itemIdCol = L.itemIdColumn ?? 'item_id';
    const nameCol = L.nameColumn ?? 'name';
    const dataCol = L.dataColumn ?? 'data';
    const createdAtCol = L.createdAtColumn ?? 'created_at';

    const sql1 = `-- 主表：依本專案 supabase-sync.config.json 產生，一裝置一筆
create table if not exists public.${mainName} (
  id uuid primary key default gen_random_uuid(),
  ${deviceId} text unique not null,
  ${gamesCol} jsonb not null default '[]',
  ${currentIdCol} text,
  ${updatedAtCol} timestamptz default now()
);

grant select, insert, update, delete on public.${mainName} to anon;
alter table public.${mainName} enable row level security;
drop policy if exists "Allow anon read and write" on public.${mainName};
create policy "Allow anon read and write"
  on public.${mainName} for all to anon using (true) with check (true);
create index if not exists idx_${mainName.replace(/-/g, '_')}_updated on public.${mainName} (${updatedAtCol} desc);
`;

    const sql2 = `-- 清單表：依本專案 config 產生，單筆存刪
create table if not exists public.${listName} (
  id uuid primary key default gen_random_uuid(),
  ${deviceId} text not null,
  ${itemIdCol} text not null,
  ${nameCol} text not null,
  ${dataCol} jsonb not null default '[]',
  ${createdAtCol} timestamptz default now(),
  unique (${deviceId}, ${itemIdCol})
);

create index if not exists idx_${listName.replace(/-/g, '_')}_device on public.${listName} (${deviceId});
grant select, insert, update, delete on public.${listName} to anon;
alter table public.${listName} enable row level security;
drop policy if exists "Allow anon read and write list" on public.${listName};
create policy "Allow anon read and write list"
  on public.${listName} for all to anon using (true) with check (true);
`;

    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }
    const ts = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const prefix = ts();
    const f1 = resolve(migrationsDir, `${prefix}01_create_main_sync.sql`);
    const f2 = resolve(migrationsDir, `${prefix}02_create_list_sync.sql`);
    writeFileSync(f1, sql1, 'utf8');
    writeFileSync(f2, sql2, 'utf8');
    console.log('已寫入 migrations:');
    console.log('  ', f1);
    console.log('  ', f2);
    console.log('請執行 npm run db:push 套用（或於 Supabase Dashboard SQL Editor 手動執行）。');
    return 0;
  } catch (err) {
    console.error('[supabase:generate-migrations] 錯誤:', err.message || err);
    process.exit(1);
  }
}

main();
