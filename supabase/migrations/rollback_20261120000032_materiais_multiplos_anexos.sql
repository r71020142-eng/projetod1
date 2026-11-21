-- ============================================================================
-- Rollback: Suporte a Múltiplos Anexos (Documentos e Imagens) em Materiais Didáticos
-- ============================================================================

DROP INDEX IF EXISTS public.idx_materiais_arquivos_gin;
ALTER TABLE public.materiais DROP COLUMN IF EXISTS arquivos;
