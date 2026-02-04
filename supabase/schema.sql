-- 在 Supabase Dashboard → SQL Editor 執行此腳本
-- https://supabase.com/dashboard/project/wlcknwjkixxphamklvog/sql

-- 儲存整份報價資料（games + 方案紀錄），以 device_id 區分不同裝置
create table if not exists public.pricing_sync (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  games jsonb not null default '[]',
  current_game_id text,
  named_profiles jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- 授予 anon 角色對該表的權限（RLS 通過後才能讀寫）
grant select, insert, update, delete on public.pricing_sync to anon;

-- 允許匿名讀寫（不需登入即可存檔；之後可改為 RLS + 登入）
alter table public.pricing_sync enable row level security;

drop policy if exists "Allow anon read and write" on public.pricing_sync;
create policy "Allow anon read and write"
  on public.pricing_sync
  for all
  to anon
  using (true)
  with check (true);

-- 方便查詢最後更新時間
create index if not exists idx_pricing_sync_updated_at
  on public.pricing_sync (updated_at desc);
