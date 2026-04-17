-- =====================================================
-- TOCS — Migration 002: Controle Total
-- Fases 0 (multi-tenant + roles), 2 (caixa) e 3 (extras)
-- Rode esse SQL INTEIRO no SQL Editor do Supabase.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- =====================================================

-- ------- FASE 0: Fundação ----------

-- Unidades (2 fixas: delivery + atendimento)
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.units (slug, name) values
  ('delivery', 'TOCS Delivery'),
  ('atendimento', 'TOCS Atendimento')
on conflict (slug) do nothing;

-- Profiles (1 linha por auth.user) com role
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'funcionario' check (role in ('admin', 'funcionario')),
  default_unit_id uuid references public.units(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

-- Auto-criar profile quando um novo user for criado no auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'funcionario'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: é admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Units: todos autenticados leem; só admin altera (criação já foi no seed)
alter table public.units enable row level security;

drop policy if exists "units_select_all" on public.units;
create policy "units_select_all"
  on public.units for select
  to authenticated
  using (true);

drop policy if exists "units_admin_write" on public.units;
create policy "units_admin_write"
  on public.units for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Adicionar unit_id na tabela reports (Safrapay) — nullable pra compatibilidade
alter table public.reports
  add column if not exists unit_id uuid references public.units(id);

create index if not exists reports_unit_created_idx
  on public.reports (unit_id, created_at desc);


-- ------- FASE 2: Caixa ----------

-- Sessão de caixa: 1 sessão por (unit, dia_operacional) com abertura + fechamento
create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  operation_date date not null,
  opened_at timestamptz not null default now(),
  opened_by uuid not null references auth.users(id),
  opening_total numeric(12,2) not null,
  opening_denominations jsonb not null default '{}'::jsonb,
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  closing_total numeric(12,2),
  closing_denominations jsonb,
  cash_sales numeric(12,2),                 -- vendas em dinheiro do Saipos
  cash_sales_source text check (cash_sales_source in ('saipos_foto', 'manual')),
  cash_sales_image_path text,
  expected_total numeric(12,2),             -- calculado no fechamento
  divergence numeric(12,2),                 -- closing - expected
  divergence_justification text,
  divergence_acknowledged_by_admin boolean not null default false,
  status text not null default 'aberta' check (status in ('aberta', 'fechada')),
  notes text,
  created_at timestamptz not null default now(),
  unique (unit_id, operation_date)
);

create index if not exists cash_sessions_unit_date_idx
  on public.cash_sessions (unit_id, operation_date desc);

create index if not exists cash_sessions_divergencias_idx
  on public.cash_sessions (divergence_acknowledged_by_admin, closed_at desc)
  where divergence is not null and divergence <> 0;

-- Movimentações durante a sessão (reforço, retirada, transferência)
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  unit_id uuid not null references public.units(id),
  type text not null check (type in (
    'reforco',              -- dinheiro entrou (do cofre/dono/etc)
    'retirada',             -- dinheiro saiu (depósito, fornecedor)
    'transferencia_saida',  -- saiu pra outra unidade
    'transferencia_entrada' -- entrou da outra unidade
  )),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  related_unit_id uuid references public.units(id),  -- pra transferências
  related_movement_id uuid references public.cash_movements(id),  -- par da transferência
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cash_movements_session_idx
  on public.cash_movements (session_id, created_at);

-- RLS caixa: todos autenticados leem; só admin/quem abriu deleta
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "cash_sessions_select_all" on public.cash_sessions;
create policy "cash_sessions_select_all"
  on public.cash_sessions for select
  to authenticated using (true);

drop policy if exists "cash_sessions_insert_auth" on public.cash_sessions;
create policy "cash_sessions_insert_auth"
  on public.cash_sessions for insert
  to authenticated with check (auth.uid() = opened_by);

drop policy if exists "cash_sessions_update_auth" on public.cash_sessions;
create policy "cash_sessions_update_auth"
  on public.cash_sessions for update
  to authenticated using (true) with check (true);

drop policy if exists "cash_sessions_delete_admin" on public.cash_sessions;
create policy "cash_sessions_delete_admin"
  on public.cash_sessions for delete
  to authenticated using (public.is_admin());

drop policy if exists "cash_movements_select_all" on public.cash_movements;
create policy "cash_movements_select_all"
  on public.cash_movements for select
  to authenticated using (true);

drop policy if exists "cash_movements_insert_auth" on public.cash_movements;
create policy "cash_movements_insert_auth"
  on public.cash_movements for insert
  to authenticated with check (auth.uid() = created_by);

drop policy if exists "cash_movements_delete_admin" on public.cash_movements;
create policy "cash_movements_delete_admin"
  on public.cash_movements for delete
  to authenticated using (public.is_admin());

-- Storage bucket pras fotos do Saipos (cash_sales_image_path)
insert into storage.buckets (id, name, public)
values ('saipos', 'saipos', false)
on conflict (id) do nothing;

drop policy if exists "saipos_select_auth" on storage.objects;
create policy "saipos_select_auth"
  on storage.objects for select
  to authenticated using (bucket_id = 'saipos');

drop policy if exists "saipos_insert_auth" on storage.objects;
create policy "saipos_insert_auth"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'saipos');

drop policy if exists "saipos_delete_admin" on storage.objects;
create policy "saipos_delete_admin"
  on storage.objects for delete
  to authenticated using (bucket_id = 'saipos' and public.is_admin());


-- ------- FASE 3: Extras ----------

create table if not exists public.extras_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  pix_key text,
  default_category text check (default_category in ('cozinha', 'atendimento')),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists extras_people_active_name_idx
  on public.extras_people (active, name);

-- Default de valor por dia da semana (ter/qua/qui = 70, sex/sáb/dom = 100)
-- Guardamos numa tabelinha pra admin conseguir mudar sem mexer em código
create table if not exists public.extras_default_values (
  day_of_week int primary key check (day_of_week between 0 and 6),  -- 0=dom, 6=sáb
  default_value numeric(10,2) not null
);

insert into public.extras_default_values (day_of_week, default_value) values
  (0, 100.00),  -- domingo
  (1, 0.00),    -- segunda (folga)
  (2, 70.00),   -- terça
  (3, 70.00),   -- quarta
  (4, 70.00),   -- quinta
  (5, 100.00),  -- sexta
  (6, 100.00)   -- sábado
on conflict (day_of_week) do nothing;

create table if not exists public.extras_shifts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.extras_people(id) on delete restrict,
  work_date date not null,
  category text not null check (category in ('cozinha', 'atendimento')),
  value numeric(10,2) not null check (value >= 0),
  value_was_overridden boolean not null default false,
  value_override_reason text,
  paid boolean not null default false,
  paid_at timestamptz,
  paid_amount numeric(10,2),
  payment_method text check (payment_method in ('dinheiro', 'pix')),
  payment_pix_reason text,  -- obrigatório se payment_method='pix'
  paid_by_unit_id uuid references public.units(id),
  paid_by_user uuid references auth.users(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint pix_requires_reason
    check (payment_method <> 'pix' or (payment_pix_reason is not null and length(trim(payment_pix_reason)) > 0)),
  constraint override_requires_reason
    check (value_was_overridden = false or (value_override_reason is not null and length(trim(value_override_reason)) > 0))
);

create index if not exists extras_shifts_date_idx
  on public.extras_shifts (work_date desc);
create index if not exists extras_shifts_person_idx
  on public.extras_shifts (person_id, work_date desc);
create index if not exists extras_shifts_unpaid_idx
  on public.extras_shifts (paid, work_date)
  where paid = false;

alter table public.extras_people enable row level security;
alter table public.extras_default_values enable row level security;
alter table public.extras_shifts enable row level security;

drop policy if exists "extras_people_select_all" on public.extras_people;
create policy "extras_people_select_all"
  on public.extras_people for select
  to authenticated using (true);

drop policy if exists "extras_people_write_auth" on public.extras_people;
create policy "extras_people_write_auth"
  on public.extras_people for all
  to authenticated using (true) with check (true);

drop policy if exists "extras_defaults_select_all" on public.extras_default_values;
create policy "extras_defaults_select_all"
  on public.extras_default_values for select
  to authenticated using (true);

drop policy if exists "extras_defaults_admin_write" on public.extras_default_values;
create policy "extras_defaults_admin_write"
  on public.extras_default_values for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "extras_shifts_select_all" on public.extras_shifts;
create policy "extras_shifts_select_all"
  on public.extras_shifts for select
  to authenticated using (true);

drop policy if exists "extras_shifts_insert_auth" on public.extras_shifts;
create policy "extras_shifts_insert_auth"
  on public.extras_shifts for insert
  to authenticated with check (true);

drop policy if exists "extras_shifts_update_auth" on public.extras_shifts;
create policy "extras_shifts_update_auth"
  on public.extras_shifts for update
  to authenticated using (true) with check (true);

drop policy if exists "extras_shifts_delete_admin" on public.extras_shifts;
create policy "extras_shifts_delete_admin"
  on public.extras_shifts for delete
  to authenticated using (public.is_admin());


-- ------- Função RPC: criar transferência entre unidades atomicamente ----------
create or replace function public.transfer_between_units(
  p_from_session uuid,
  p_to_session uuid,
  p_amount numeric,
  p_description text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_unit uuid;
  v_to_unit uuid;
  v_from_mov uuid;
  v_to_mov uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if p_amount <= 0 then raise exception 'valor deve ser positivo'; end if;

  select unit_id into v_from_unit from cash_sessions where id = p_from_session and status = 'aberta';
  select unit_id into v_to_unit   from cash_sessions where id = p_to_session   and status = 'aberta';

  if v_from_unit is null then raise exception 'sessão de origem não encontrada ou fechada'; end if;
  if v_to_unit is null   then raise exception 'sessão de destino não encontrada ou fechada'; end if;
  if v_from_unit = v_to_unit then raise exception 'unidades de origem e destino iguais'; end if;

  insert into cash_movements (session_id, unit_id, type, amount, description, related_unit_id, created_by)
    values (p_from_session, v_from_unit, 'transferencia_saida', p_amount, p_description, v_to_unit, v_uid)
    returning id into v_from_mov;

  insert into cash_movements (session_id, unit_id, type, amount, description, related_unit_id, related_movement_id, created_by)
    values (p_to_session, v_to_unit, 'transferencia_entrada', p_amount, p_description, v_from_unit, v_from_mov, v_uid)
    returning id into v_to_mov;

  update cash_movements set related_movement_id = v_to_mov where id = v_from_mov;

  return json_build_object('from_movement', v_from_mov, 'to_movement', v_to_mov);
end;
$$;

grant execute on function public.transfer_between_units(uuid, uuid, numeric, text) to authenticated;
