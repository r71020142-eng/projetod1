-- ============================================================================
-- Rollback: Módulo de Exercícios Interativos
-- Uso: Executar somente caso haja necessidade de desfazer a migração 20261119000030
-- ============================================================================

DROP VIEW IF EXISTS public.vw_aluno_exercicios CASCADE;
DROP TABLE IF EXISTS public.tentativas_exercicios CASCADE;
DROP TABLE IF EXISTS public.exercicios_interativos CASCADE;
