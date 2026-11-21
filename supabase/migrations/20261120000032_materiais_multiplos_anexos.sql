-- ============================================================================
-- Migração: Suporte a Múltiplos Anexos (Documentos e Imagens) em Materiais Didáticos
-- Data: 2026-11-20
-- ============================================================================

-- Adiciona a coluna arquivos (JSONB) para suporte a múltiplos anexos com retrocompatibilidade
ALTER TABLE public.materiais 
ADD COLUMN IF NOT EXISTS arquivos JSONB DEFAULT '[]'::jsonb;

-- Preenche retroativamente a coluna arquivos a partir de arquivo_url existente onde arquivos estiver vazio
UPDATE public.materiais
SET arquivos = jsonb_build_array(
  jsonb_build_object(
    'url', arquivo_url,
    'nome', COALESCE(arquivo_nome, 'Arquivo anexo'),
    'tipo', tipo
  )
)
WHERE arquivo_url IS NOT NULL 
  AND (arquivos IS NULL OR arquivos = '[]'::jsonb);

-- Atualiza a constraint de tipos de materiais para aceitar também 'documento' e 'imagem'
ALTER TABLE public.materiais DROP CONSTRAINT IF EXISTS materiais_tipo_check;
ALTER TABLE public.materiais ADD CONSTRAINT materiais_tipo_check CHECK (tipo IN ('pdf', 'video', 'audio', 'link', 'texto', 'apresentacao', 'documento', 'imagem'));

-- Índice GIN para consultas eficientes caso seja necessário filtrar por anexos
CREATE INDEX IF NOT EXISTS idx_materiais_arquivos_gin ON public.materiais USING gin (arquivos);
