-- =====================================================
-- Migration: detecção de duplicatas via signature
-- Rode esse SQL no SQL Editor do Supabase.
-- =====================================================

alter table public.reports
  add column if not exists data_hora_relatorio text,
  add column if not exists signature text;

-- Unique constraint: mesmo user não pode salvar mesma signature 2x
create unique index if not exists reports_user_signature_unique
  on public.reports (user_id, signature)
  where signature is not null;
