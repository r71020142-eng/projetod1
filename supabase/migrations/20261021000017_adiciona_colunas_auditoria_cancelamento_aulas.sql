-- MIGRAÇÃO: 20261021000017_adiciona_colunas_auditoria_cancelamento_aulas.sql
-- ETAPA: 10.3B2 — Integração do Frontend com Agenda, Aulas e Presenças
-- OBJETIVO: Adicionar colunas de auditoria de cancelamento em public.aulas
-- MOTIVAÇÃO TÉCNICA COMPROVADA:
-- A função public.cancelar_aula(UUID, TEXT) atualiza cancelada_em e cancelada_por
-- ao cancelar uma aula, mas essas colunas não foram criadas na tabela base public.aulas,
-- resultando em erro 42703 (column "cancelada_em" of relation "aulas" does not exist)
-- durante operações legítimas de cancelamento no frontend e na RPC.

ALTER TABLE public.aulas
  ADD COLUMN IF NOT EXISTS cancelada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelada_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.aulas.cancelada_em IS 'Data e hora UTC em que o cancelamento da aula foi efetivado.';
COMMENT ON COLUMN public.aulas.cancelada_por IS 'ID do usuário autenticado que realizou o cancelamento histórico da aula.';
