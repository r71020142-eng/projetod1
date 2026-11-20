-- ============================================================================
-- Migração: IA Generativa de Conteúdo Pedagógico e Síntese de Voz (TTS)
-- Data: 2026-11-20
-- Módulo: Exercícios Interativos (Juno Academy - Método Paulo)
-- ============================================================================

-- 1. ADICIONAR COLUNAS DE CONTROLE DE IA E FIDELIDADE TEXTO-ÁUDIO
ALTER TABLE public.exercicios_interativos
  ADD COLUMN IF NOT EXISTS audio_texto_hash TEXT,
  ADD COLUMN IF NOT EXISTS audio_status TEXT DEFAULT 'pendente' CHECK (audio_status IN ('sincronizado', 'desatualizado', 'pendente', 'manual')),
  ADD COLUMN IF NOT EXISTS audio_provedor TEXT,
  ADD COLUMN IF NOT EXISTS audio_voz_id TEXT,
  ADD COLUMN IF NOT EXISTS audio_voz_nome TEXT,
  ADD COLUMN IF NOT EXISTS audio_velocidade NUMERIC(3,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS audio_gerado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audio_is_ia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conteudo_gerado_por_ia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ia_prompt_meta JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_audio_status ON public.exercicios_interativos(audio_status);
CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_audio_is_ia ON public.exercicios_interativos(audio_is_ia);

-- 2. RECRIAR SECURITY BARRIER VIEW PARA O ALUNO
DROP VIEW IF EXISTS public.vw_aluno_exercicios;

CREATE VIEW public.vw_aluno_exercicios WITH (security_barrier = true) AS
SELECT
  e.id,
  e.titulo,
  e.descricao,
  e.instrucoes,
  e.tipo,
  e.nivel,
  e.categoria,
  e.texto_conteudo,
  e.audio_url,
  e.audio_nome,
  e.audio_duracao_segundos,
  e.audio_status,
  e.audio_is_ia,
  e.audio_texto_hash,
  e.audio_provedor,
  e.audio_voz_nome,
  e.questoes,
  e.baralho_vocabulario_id,
  e.destino_tipo,
  e.destino_turma_id,
  e.destino_aluno_id,
  e.professor_nome,
  e.nota_maxima,
  e.nota_minima_aprovacao,
  e.politica_gabarito,
  e.tempo_estimado_minutos,
  e.versao,
  e.created_at
FROM public.exercicios_interativos e
WHERE e.status = 'publicado';

GRANT SELECT ON public.vw_aluno_exercicios TO authenticated;

-- 3. RESOLUÇÃO DO ÁUDIO INCOMPATÍVEL NO EXERCÍCIO DE DEMONSTRAÇÃO
-- Desvincula o áudio de fundo (coffee_shop.ogg) e sinaliza status pendente para narração autêntica por voz
UPDATE public.exercicios_interativos
SET
  audio_url = NULL,
  audio_nome = 'Narração pendente (áudio anterior ambiente desvinculado)',
  audio_status = 'pendente',
  audio_is_ia = false,
  audio_texto_hash = NULL,
  updated_at = timezone('utc'::text, now())
WHERE titulo ILIKE '%Sunday in London%'
  AND audio_url LIKE '%coffee_shop.ogg%';
