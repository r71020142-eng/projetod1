-- ==============================================================================
-- MIGRATION: 20261023000021_self_presentation.sql
-- DEMOSTRATIVO MTD - MÉTODO PAULO
--
-- Criação das estruturas de persistência para Self Presentation (Fluência Oral):
-- 1. public.self_presentations (gravações de nivelamento inicial e reavaliações periódicas)
-- 2. view public.vw_aluno_self_presentations com security_barrier = true
--    (Higienização estrita de observacoesInternas e mascaramento de avaliações não publicadas)
-- 3. Índices e gatilhos de integridade
-- 4. Políticas de Row Level Security (RLS)
-- ==============================================================================

-- 1. TABELA DE SELF PRESENTATIONS
CREATE TABLE IF NOT EXISTS public.self_presentations (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'nivelamento_inicial' CHECK (tipo IN ('nivelamento_inicial', 'reavaliacao')),
  titulo TEXT NOT NULL,
  idioma_avaliado TEXT NOT NULL DEFAULT 'Inglês',
  link_video TEXT NOT NULL,
  data_gravacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'em_avaliacao', 'avaliada', 'reenvio_solicitado', 'arquivada')),
  versao INTEGER NOT NULL DEFAULT 1,
  consentimento_aceito BOOLEAN NOT NULL DEFAULT FALSE,
  consentimento_data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consentimento_versao_texto TEXT NOT NULL DEFAULT 'v1.0',
  consentimento_ip_dispositivo TEXT NULL,
  observacao_aluno TEXT NULL,
  professor_avaliador_id TEXT NULL,
  professor_avaliador_nome TEXT NULL,
  avaliacao JSONB NULL,
  solicitacao_reenvio JSONB NULL,
  historico_versoes JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES DE PERFORMANCE E INTEGRIDADE
CREATE INDEX IF NOT EXISTS idx_sp_aluno_status ON public.self_presentations(aluno_id, status);
CREATE INDEX IF NOT EXISTS idx_sp_status_tipo ON public.self_presentations(status, tipo);
CREATE INDEX IF NOT EXISTS idx_sp_professor ON public.self_presentations(professor_avaliador_id);
CREATE INDEX IF NOT EXISTS idx_sp_data_gravacao ON public.self_presentations(data_gravacao DESC);

-- TRIGGER PARA UPDATED_AT
CREATE OR REPLACE TRIGGER trg_self_presentations_updated_at
  BEFORE UPDATE ON public.self_presentations
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_updated_at();

-- 2. VIEW SEGURA PARA O ALUNO COM SANITIZAÇÃO RIGOROSA DE PRIVACIDADE
CREATE OR REPLACE VIEW public.vw_aluno_self_presentations
WITH (security_barrier = true) AS
SELECT
  sp.id,
  sp.aluno_id,
  sp.aluno_nome,
  sp.tipo,
  sp.titulo,
  sp.idioma_avaliado,
  sp.link_video,
  sp.data_gravacao,
  sp.status,
  sp.versao,
  jsonb_build_object(
    'aceito', sp.consentimento_aceito,
    'dataHora', sp.consentimento_data_hora,
    'versaoTexto', sp.consentimento_versao_texto,
    'ipDispositivo', sp.consentimento_ip_dispositivo
  ) AS consentimento,
  sp.observacao_aluno,
  sp.professor_avaliador_id,
  sp.professor_avaliador_nome,
  CASE
    WHEN sp.avaliacao IS NULL THEN NULL
    -- Se a avaliação não foi formalmente publicada pelo professor, oculta do aluno
    WHEN (sp.avaliacao->>'publicada')::BOOLEAN IS NOT TRUE THEN NULL
    -- Sanitização ativa: remove estritamente observacoesInternas confidenciais
    ELSE (sp.avaliacao - 'observacoesInternas')
  END AS avaliacao,
  sp.solicitacao_reenvio,
  sp.historico_versoes,
  sp.created_at,
  sp.updated_at
FROM public.self_presentations sp
WHERE (
  -- Aluno consulta apenas seus próprios registros através do vínculo perfil -> aluno_id
  EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.aluno_id = sp.aluno_id
      AND p.id = auth.uid()
  )
  OR public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor')
);

-- HABILITAR RLS
ALTER TABLE public.self_presentations ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: SELF PRESENTATIONS
DROP POLICY IF EXISTS "sp_equipe_manage" ON public.self_presentations;
CREATE POLICY "sp_equipe_manage" ON public.self_presentations
  FOR ALL
  TO authenticated
  USING (public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor'))
  WITH CHECK (public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor'));

DROP POLICY IF EXISTS "sp_aluno_select_own" ON public.self_presentations;
CREATE POLICY "sp_aluno_select_own" ON public.self_presentations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.aluno_id = self_presentations.aluno_id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sp_aluno_insert_own" ON public.self_presentations;
CREATE POLICY "sp_aluno_insert_own" ON public.self_presentations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.aluno_id = self_presentations.aluno_id
        AND p.id = auth.uid()
    )
    AND (
      -- Apenas rascunho ou submissão inicial permitida diretamente pelo aluno
      status IN ('rascunho', 'enviada')
    )
  );

DROP POLICY IF EXISTS "sp_aluno_update_own" ON public.self_presentations;
CREATE POLICY "sp_aluno_update_own" ON public.self_presentations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.aluno_id = self_presentations.aluno_id
        AND p.id = auth.uid()
    )
    AND status IN ('rascunho', 'reenvio_solicitado')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.aluno_id = self_presentations.aluno_id
        AND p.id = auth.uid()
    )
    AND status IN ('rascunho', 'enviada')
  );
