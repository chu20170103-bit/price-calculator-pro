-- 方案紀錄：一筆一筆存，單筆新增 / 單筆刪除
create table if not exists public.pricing_profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  profile_id text not null,
  name text not null,
  rows jsonb not null default '[]',
  created_at timestamptz default now(),
  unique (device_id, profile_id)
);

create index if not exists idx_pricing_profiles_device_id
  on public.pricing_profiles (device_id);

grant select, insert, update, delete on public.pricing_profiles to anon;
alter table public.pricing_profiles enable row level security;
drop policy if exists "Allow anon read and write profiles" on public.pricing_profiles;
create policy "Allow anon read and write profiles"
  on public.pricing_profiles for all to anon using (true) with check (true);
