-- =====================================================
-- TOCS - Schema Supabase
-- Rode esse SQL no SQL Editor do seu projeto Supabase.
-- =====================================================

-- 1. Tabela de relatórios
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credito numeric(12, 2) not null default 0,
  debito  numeric(12, 2) not null default 0,
  pix     numeric(12, 2) not null default 0,
  total   numeric(12, 2) not null default 0,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists reports_user_created_idx
  on public.reports (user_id, created_at desc);

-- 2. Row Level Security
alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
  on public.reports for delete
  using (auth.uid() = user_id);

-- 3. Storage bucket pras fotos dos relatórios
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- 4. Policies do storage (cada user só vê/sobe as próprias fotos)
drop policy if exists "reports_storage_select_own" on storage.objects;
create policy "reports_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "reports_storage_insert_own" on storage.objects;
create policy "reports_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "reports_storage_delete_own" on storage.objects;
create policy "reports_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
