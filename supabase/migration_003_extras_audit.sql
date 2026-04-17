-- =====================================================
-- TOCS — Migration 003: Extras audit + remove PIX
-- - Auditoria em extras_people (created_by / updated_by)
-- - Remove a chave PIX (não pagamos em PIX; caixa cobre)
-- Idempotente.
-- =====================================================

alter table public.extras_people
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id);

-- trigger: marca updated_by e updated_at em qualquer UPDATE
create or replace function public.extras_people_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists extras_people_touch_trg on public.extras_people;
create trigger extras_people_touch_trg
  before update on public.extras_people
  for each row execute function public.extras_people_touch();

-- Remove a coluna PIX (não pagamos em PIX no cadastro — só com justificativa no momento do pagamento)
alter table public.extras_people drop column if exists pix_key;
