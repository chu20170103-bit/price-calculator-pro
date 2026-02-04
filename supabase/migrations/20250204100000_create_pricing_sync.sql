-- 儲存整份報價資料（games + 方案紀錄），以 device_id 區分不同裝置／同步碼
create table if not exists public.pricing_sync (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  games jsonb not null default '[]',
  current_game_id text,
  named_profiles jsonb not null default '[]',
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.pricing_sync to anon;

alter table public.pricing_sync enable row level security;

drop policy if exists "Allow anon read and write" on public.pricing_sync;
create policy "Allow anon read and write"
  on public.pricing_sync
  for all
  to anon
  using (true)
  with check (true);

create index if not exists idx_pricing_sync_updated_at
  on public.pricing_sync (updated_at desc);
