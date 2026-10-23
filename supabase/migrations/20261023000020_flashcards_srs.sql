-- ==============================================================================
-- MIGRATION: 20261023000020_flashcards_srs.sql
-- DEMOSTRATIVO MTD - MÉTODO PAULO
--
-- Criação das estruturas de persistência para Flashcards e Repetição Espaçada (SRS):
-- 1. public.baralhos (metadados do baralho, regras de destino e limites diários)
-- 2. public.cartoes (cartões individuais com frente, verso, pronúncia, áudio opcional)
-- 3. public.progresso_cartoes_alunos (algoritmo SRS SM-2 determinístico por aluno)
-- 4. public.historico_revisoes_srs (log de auditoria imutável de cada revisão)
-- 5. public.sessoes_estudo_srs (consolidação de sessões de estudo diárias)
-- 6. função de validação de acesso public.aluno_has_access_to_baralho
-- 7. view public.vw_aluno_baralhos com security_barrier = true
-- 8. Políticas de Row Level Security (RLS) com isolamento rigoroso por discente
-- ==============================================================================

-- 1. TABELA DE BARALHOS
CREATE TABLE IF NOT EXISTS public.baralhos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'Geral',
  nivel_recomendado TEXT NOT NULL DEFAULT 'todos' CHECK (nivel_recomendado IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'todos')),
  idioma_origem TEXT NOT NULL DEFAULT 'Inglês',
  idioma_destino TEXT NOT NULL DEFAULT 'Português',
  professor_id TEXT NOT NULL,
  professor_nome TEXT NOT NULL DEFAULT 'Professor MTD',
  destino_tipo TEXT NOT NULL DEFAULT 'geral' CHECK (destino_tipo IN ('geral', 'turma', 'aluno')),
  destino_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  limite_diario_novos INTEGER NOT NULL DEFAULT 20 CHECK (limite_diario_novos >= 1 AND limite_diario_novos <= 100),
  tags TEXT[] NOT NULL DEFAULT '{}',
  material_id TEXT NULL,
  atividade_id TEXT NULL,
  aula_id TEXT NULL,
  modulo_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE CARTÕES
CREATE TABLE IF NOT EXISTS public.cartoes (
  id TEXT PRIMARY KEY,
  baralho_id TEXT NOT NULL REFERENCES public.baralhos(id) ON DELETE CASCADE,
  frente TEXT NOT NULL,
  verso TEXT NOT NULL,
  exemplo TEXT NULL,
  traducao TEXT NULL,
  dica TEXT NULL,
  pronuncia TEXT NULL,
  link_audio TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE PROGRESSO INDIVIDUAL DE CARTÕES (SRS SM-2)
CREATE TABLE IF NOT EXISTS public.progresso_cartoes_alunos (
  id TEXT PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  cartao_id TEXT NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  baralho_id TEXT NOT NULL REFERENCES public.baralhos(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'novo' CHECK (estado IN ('novo', 'aprendendo', 'revisao', 'suspenso')),
  total_revisoes INTEGER NOT NULL DEFAULT 0,
  total_lapsos INTEGER NOT NULL DEFAULT 0,
  fator_facilidade NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (fator_facilidade >= 1.30),
  intervalo_dias INTEGER NOT NULL DEFAULT 0,
  intervalo_minutos INTEGER NULL,
  proxima_revisao TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ultima_revisao TIMESTAMPTZ NULL,
  ultima_resposta TEXT NULL CHECK (ultima_resposta IS NULL OR ultima_resposta IN ('errei', 'dificil', 'bom', 'facil')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_progresso_cartao_aluno UNIQUE (aluno_id, cartao_id)
);

-- 4. TABELA DE HISTÓRICO DE REVISÕES (AUDITORIA IMUTÁVEL SRS)
CREATE TABLE IF NOT EXISTS public.historico_revisoes_srs (
  id TEXT PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  cartao_id TEXT NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  baralho_id TEXT NOT NULL REFERENCES public.baralhos(id) ON DELETE CASCADE,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resposta TEXT NOT NULL CHECK (resposta IN ('errei', 'dificil', 'bom', 'facil')),
  estado_anterior TEXT NOT NULL CHECK (estado_anterior IN ('novo', 'aprendendo', 'revisao', 'suspenso')),
  intervalo_anterior INTEGER NOT NULL DEFAULT 0,
  novo_estado TEXT NOT NULL CHECK (novo_estado IN ('novo', 'aprendendo', 'revisao', 'suspenso')),
  novo_intervalo INTEGER NOT NULL DEFAULT 0,
  tempo_resposta_ms INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE SESSÕES DE ESTUDO
CREATE TABLE IF NOT EXISTS public.sessoes_estudo_srs (
  id TEXT PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  baralho_id TEXT NOT NULL REFERENCES public.baralhos(id) ON DELETE CASCADE,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  concluida_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  total_estudado INTEGER NOT NULL DEFAULT 0,
  erros INTEGER NOT NULL DEFAULT 0,
  dificeis INTEGER NOT NULL DEFAULT 0,
  bons INTEGER NOT NULL DEFAULT 0,
  faceis INTEGER NOT NULL DEFAULT 0,
  tempo_segundos INTEGER NOT NULL DEFAULT 0,
  revisoes_reagendadas INTEGER NOT NULL DEFAULT 0,
  proxima_revisao_prevista TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ÍNDICES DE PERFORMANCE E INTEGRIDADE
CREATE INDEX IF NOT EXISTS idx_baralhos_status_destino ON public.baralhos(status, destino_tipo, destino_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_baralho_status ON public.cartoes(baralho_id, status);
CREATE INDEX IF NOT EXISTS idx_progresso_aluno_revisao ON public.progresso_cartoes_alunos(aluno_id, proxima_revisao);
CREATE INDEX IF NOT EXISTS idx_progresso_baralho_aluno ON public.progresso_cartoes_alunos(baralho_id, aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_aluno_data ON public.historico_revisoes_srs(aluno_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_aluno_baralho ON public.sessoes_estudo_srs(aluno_id, baralho_id);

-- TRIGGERS DE UPDATED_AT (utilizando a função canônica do projeto: set_current_timestamp_updated_at)
DROP TRIGGER IF EXISTS trg_baralhos_updated_at ON public.baralhos;
CREATE TRIGGER trg_baralhos_updated_at
  BEFORE UPDATE ON public.baralhos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_cartoes_updated_at ON public.cartoes;
CREATE TRIGGER trg_cartoes_updated_at
  BEFORE UPDATE ON public.cartoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_progresso_cartoes_updated_at ON public.progresso_cartoes_alunos;
CREATE TRIGGER trg_progresso_cartoes_updated_at
  BEFORE UPDATE ON public.progresso_cartoes_alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. FUNÇÃO DE CONTROLE DE ACESSO A BARALHOS
CREATE OR REPLACE FUNCTION public.aluno_has_access_to_baralho(p_destino_tipo text, p_destino_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aluno_id UUID;
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  v_aluno_id := public.get_current_aluno_id();
  IF v_aluno_id IS NULL THEN
    RETURN false;
  END IF;

  -- Geral: acesso para todos os discentes
  IF p_destino_tipo = 'geral' OR p_destino_tipo IS NULL THEN
    RETURN true;
  END IF;

  IF p_destino_id IS NULL THEN
    RETURN false;
  END IF;

  -- Aluno individual
  IF p_destino_tipo = 'aluno' AND p_destino_id = v_aluno_id::text THEN
    RETURN true;
  END IF;

  -- Turma: verifica matrícula ativa na turma especificada
  IF p_destino_tipo = 'turma' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.matriculas_turmas mt
      WHERE mt.turma_id::text = p_destino_id
        AND mt.aluno_id = v_aluno_id
        AND mt.status = 'ativa'
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.aluno_has_access_to_baralho(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_has_access_to_baralho(text, text) TO authenticated, service_role;

-- 7. VIEW ISOLADA PARA O DISCENTE COM SECURITY BARRIER
CREATE OR REPLACE VIEW public.vw_aluno_baralhos
WITH (security_barrier = true) AS
SELECT
  b.id,
  b.nome,
  b.descricao,
  b.categoria,
  b.nivel_recomendado,
  b.idioma_origem,
  b.idioma_destino,
  b.professor_id,
  b.professor_nome,
  b.destino_tipo,
  b.destino_id,
  b.status,
  b.limite_diario_novos,
  b.tags,
  b.material_id,
  b.atividade_id,
  b.aula_id,
  b.modulo_id,
  (SELECT COUNT(*)::INT FROM public.cartoes c WHERE c.baralho_id = b.id AND c.status = 'ativo') AS total_cartoes,
  b.created_at,
  b.updated_at
FROM public.baralhos b
WHERE b.status = 'publicado'
  AND (
    public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR public.aluno_has_access_to_baralho(b.destino_tipo, b.destino_id)
  );

-- HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.baralhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_cartoes_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_revisoes_srs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_estudo_srs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: BARALHOS
DROP POLICY IF EXISTS "baralhos_equipe_manage" ON public.baralhos;
CREATE POLICY "baralhos_equipe_manage" ON public.baralhos
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "baralhos_aluno_select" ON public.baralhos;
CREATE POLICY "baralhos_aluno_select" ON public.baralhos
  FOR SELECT
  TO authenticated
  USING (
    status = 'publicado'
    AND public.aluno_has_access_to_baralho(destino_tipo, destino_id)
  );

-- POLÍTICAS RLS: CARTÕES
DROP POLICY IF EXISTS "cartoes_equipe_manage" ON public.cartoes;
CREATE POLICY "cartoes_equipe_manage" ON public.cartoes
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "cartoes_aluno_select" ON public.cartoes;
CREATE POLICY "cartoes_aluno_select" ON public.cartoes
  FOR SELECT
  TO authenticated
  USING (
    status = 'ativo'
    AND EXISTS (
      SELECT 1 FROM public.baralhos b
      WHERE b.id = cartoes.baralho_id
        AND b.status = 'publicado'
        AND public.aluno_has_access_to_baralho(b.destino_tipo, b.destino_id)
    )
  );

-- POLÍTICAS RLS: PROGRESSO DE CARTÕES
DROP POLICY IF EXISTS "progresso_equipe_select" ON public.progresso_cartoes_alunos;
CREATE POLICY "progresso_equipe_select" ON public.progresso_cartoes_alunos
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "progresso_aluno_manage_own" ON public.progresso_cartoes_alunos;
CREATE POLICY "progresso_aluno_manage_own" ON public.progresso_cartoes_alunos
  FOR ALL
  TO authenticated
  USING (aluno_id = public.get_current_aluno_id())
  WITH CHECK (aluno_id = public.get_current_aluno_id());

-- POLÍTICAS RLS: HISTÓRICO DE REVISÕES
DROP POLICY IF EXISTS "historico_srs_equipe_select" ON public.historico_revisoes_srs;
CREATE POLICY "historico_srs_equipe_select" ON public.historico_revisoes_srs
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "historico_srs_aluno_manage" ON public.historico_revisoes_srs;
CREATE POLICY "historico_srs_aluno_manage" ON public.historico_revisoes_srs
  FOR ALL
  TO authenticated
  USING (aluno_id = public.get_current_aluno_id())
  WITH CHECK (aluno_id = public.get_current_aluno_id());

-- POLÍTICAS RLS: SESSÕES DE ESTUDO
DROP POLICY IF EXISTS "sessoes_srs_equipe_select" ON public.sessoes_estudo_srs;
CREATE POLICY "sessoes_srs_equipe_select" ON public.sessoes_estudo_srs
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "sessoes_srs_aluno_manage" ON public.sessoes_estudo_srs;
CREATE POLICY "sessoes_srs_aluno_manage" ON public.sessoes_estudo_srs
  FOR ALL
  TO authenticated
  USING (aluno_id = public.get_current_aluno_id())
  WITH CHECK (aluno_id = public.get_current_aluno_id());

-- PERMISSÕES GERAIS PARA TABELAS E VIEW
GRANT SELECT ON public.vw_aluno_baralhos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.baralhos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progresso_cartoes_alunos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_revisoes_srs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes_estudo_srs TO authenticated, service_role;
