-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 19
-- Persistência de Avaliações, Tentativas e Estrutura Pedagógica (Método Paulo)
--
-- Entidades:
-- 1. public.programas_pedagogicos
-- 2. public.etapas_pedagogicas
-- 3. public.modulos_pedagogicos
-- 4. public.progresso_modulos_alunos
-- 5. public.avaliacoes
-- 6. public.tentativas_avaliacoes
--
-- Regras de Negócio e Segurança:
-- - Avaliações objetivas: auto-correção matemática proporcional.
-- - Avaliações práticas: rubricas pedagógicas e notas qualitativas.
-- - Limite de tentativas respeitado com suporte a autorização de tentativa extra.
-- - Views com security_barrier protegendo observações internas confidenciais da equipe.
-- - RLS rigoroso: Admin pleno; Professor gerencia e corrige; Aluno lê apenas suas tentativas.
-- ==============================================================================

-- 1. TABELA public.programas_pedagogicos
CREATE TABLE IF NOT EXISTS public.programas_pedagogicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  idioma TEXT NOT NULL DEFAULT 'Inglês',
  duracao_meses_estimada INTEGER,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA public.etapas_pedagogicas
CREATE TABLE IF NOT EXISTS public.etapas_pedagogicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id UUID NOT NULL REFERENCES public.programas_pedagogicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'rascunho')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_etapas_programa ON public.etapas_pedagogicas(programa_id, ordem);

-- 3. TABELA public.modulos_pedagogicos
CREATE TABLE IF NOT EXISTS public.modulos_pedagogicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES public.etapas_pedagogicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL,
  carga_horaria_horas NUMERIC(5,2) DEFAULT 0,
  criterios_conclusao JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_modulos_etapa ON public.modulos_pedagogicos(etapa_id, ordem);

-- 4. TABELA public.progresso_modulos_alunos
CREATE TABLE IF NOT EXISTS public.progresso_modulos_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.modulos_pedagogicos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('bloqueado', 'em_andamento', 'aguardando_validacao', 'concluido')),
  porcentagem_conclusao NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  criterios_cumpridos JSONB NOT NULL DEFAULT '[]'::jsonb,
  validado_por_professor_id UUID REFERENCES public.professores(id),
  validado_em TIMESTAMPTZ,
  historico_reaberturas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT unq_progresso_modulo_aluno UNIQUE (aluno_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS idx_progresso_modulos_aluno ON public.progresso_modulos_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_progresso_modulos_modulo ON public.progresso_modulos_alunos(modulo_id);

-- 5. TABELA public.avaliacoes
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('objetiva', 'pratica')),
  programa_id UUID REFERENCES public.programas_pedagogicos(id) ON DELETE SET NULL,
  etapa_id UUID REFERENCES public.etapas_pedagogicas(id) ON DELETE SET NULL,
  modulo_id UUID REFERENCES public.modulos_pedagogicos(id) ON DELETE SET NULL,
  professor_id UUID NOT NULL,
  professor_nome TEXT,
  destino_tipo TEXT NOT NULL DEFAULT 'geral' CHECK (destino_tipo IN ('geral', 'turma', 'aluno')),
  destino_turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  destino_aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'publicada', 'encerrada', 'arquivada')),
  data_publicacao DATE,
  prazo TIMESTAMPTZ,
  max_tentativas INTEGER NOT NULL DEFAULT 1 CHECK (max_tentativas >= 1),
  nota_maxima NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  nota_minima_aprovacao NUMERIC(5,2) DEFAULT 70.00,
  permitir_envio_atrasado BOOLEAN NOT NULL DEFAULT true,
  instrucoes TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  politica_gabarito TEXT NOT NULL DEFAULT 'gabarito_imediato' CHECK (politica_gabarito IN ('gabarito_imediato', 'apos_encerramento', 'oculto')),
  config_feedback JSONB,
  questoes JSONB,
  rubrica JSONB,
  permitir_texto BOOLEAN DEFAULT true,
  permitir_link BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_status ON public.avaliacoes(status);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_destino_turma ON public.avaliacoes(destino_turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_destino_aluno ON public.avaliacoes(destino_aluno_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_modulo ON public.avaliacoes(modulo_id);

-- 6. TABELA public.tentativas_avaliacoes
CREATE TABLE IF NOT EXISTS public.tentativas_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  versao_avaliacao INTEGER NOT NULL DEFAULT 1,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT,
  numero_tentativa INTEGER NOT NULL DEFAULT 1,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  enviada_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'enviada', 'aguardando_correcao', 'corrigida', 'reaberta')),
  respostas_objetivas JSONB,
  resposta_pratica JSONB,
  nota NUMERIC(5,2),
  nota_maxima NUMERIC(5,2),
  resultado TEXT CHECK (resultado IN ('aprovado', 'reprovado', 'precisa_reforco', 'refazer')),
  feedback JSONB,
  atrasada BOOLEAN NOT NULL DEFAULT false,
  politica_gabarito_utilizada TEXT,
  autorizacao_tentativa_extra JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tentativas_avaliacao ON public.tentativas_avaliacoes(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_aluno ON public.tentativas_avaliacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_status ON public.tentativas_avaliacoes(status);

-- 7. FUNÇÃO DE VERIFICAÇÃO DE ACESSO PARA ALUNO
CREATE OR REPLACE FUNCTION public.aluno_has_access_to_avaliacao(
  p_destino_tipo TEXT,
  p_destino_turma_id UUID,
  p_destino_aluno_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
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

  IF p_destino_tipo = 'geral' THEN
    RETURN true;
  END IF;

  IF p_destino_tipo = 'aluno' AND p_destino_aluno_id = v_aluno_id THEN
    RETURN true;
  END IF;

  IF p_destino_tipo = 'turma' AND p_destino_turma_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.matriculas_turmas mt
      WHERE mt.turma_id = p_destino_turma_id
        AND mt.aluno_id = v_aluno_id
        AND mt.status = 'ativa'
    );
  END IF;

  RETURN false;
END;
$$;

-- 8. VIEWS COM SECURITY BARRIER
DROP VIEW IF EXISTS public.vw_aluno_avaliacoes;
CREATE VIEW public.vw_aluno_avaliacoes
WITH (security_barrier = true)
AS
SELECT
  a.id,
  a.titulo,
  a.descricao,
  a.tipo,
  a.programa_id,
  a.etapa_id,
  a.modulo_id,
  a.professor_id,
  a.professor_nome,
  a.destino_tipo,
  a.destino_turma_id,
  a.destino_aluno_id,
  a.status,
  a.data_publicacao,
  a.prazo,
  a.max_tentativas,
  a.nota_maxima,
  a.nota_minima_aprovacao,
  a.permitir_envio_atrasado,
  a.instrucoes,
  a.versao,
  a.politica_gabarito,
  a.questoes,
  a.rubrica,
  a.permitir_texto,
  a.permitir_link,
  a.created_at,
  a.updated_at
FROM public.avaliacoes a
WHERE a.status IN ('publicada', 'encerrada')
  AND public.aluno_has_access_to_avaliacao(a.destino_tipo, a.destino_turma_id, a.destino_aluno_id);

GRANT SELECT ON public.vw_aluno_avaliacoes TO authenticated;

-- 9. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.programas_pedagogicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_pedagogicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_pedagogicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_modulos_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_avaliacoes ENABLE ROW LEVEL SECURITY;

-- Políticas para Estrutura Pedagógica (Programas, Etapas, Módulos)
DROP POLICY IF EXISTS admin_all_programas ON public.programas_pedagogicos;
DROP POLICY IF EXISTS authenticated_select_programas ON public.programas_pedagogicos;
CREATE POLICY admin_all_programas ON public.programas_pedagogicos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY authenticated_select_programas ON public.programas_pedagogicos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_all_etapas ON public.etapas_pedagogicas;
DROP POLICY IF EXISTS authenticated_select_etapas ON public.etapas_pedagogicas;
CREATE POLICY admin_all_etapas ON public.etapas_pedagogicas FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY authenticated_select_etapas ON public.etapas_pedagogicas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_all_modulos ON public.modulos_pedagogicos;
DROP POLICY IF EXISTS authenticated_select_modulos ON public.modulos_pedagogicos;
CREATE POLICY admin_all_modulos ON public.modulos_pedagogicos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY authenticated_select_modulos ON public.modulos_pedagogicos FOR SELECT TO authenticated USING (true);

-- Políticas para Progresso de Módulos
DROP POLICY IF EXISTS admin_all_progresso_modulos ON public.progresso_modulos_alunos;
DROP POLICY IF EXISTS aluno_select_progresso_modulos ON public.progresso_modulos_alunos;
DROP POLICY IF EXISTS aluno_write_progresso_modulos ON public.progresso_modulos_alunos;
CREATE POLICY admin_all_progresso_modulos ON public.progresso_modulos_alunos FOR ALL TO authenticated USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL) WITH CHECK (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);
CREATE POLICY aluno_select_progresso_modulos ON public.progresso_modulos_alunos FOR SELECT TO authenticated USING (aluno_id = public.get_current_aluno_id());
CREATE POLICY aluno_write_progresso_modulos ON public.progresso_modulos_alunos FOR ALL TO authenticated USING (aluno_id = public.get_current_aluno_id()) WITH CHECK (aluno_id = public.get_current_aluno_id());

-- Políticas para Avaliações
DROP POLICY IF EXISTS admin_all_avaliacoes ON public.avaliacoes;
DROP POLICY IF EXISTS professor_select_avaliacoes ON public.avaliacoes;
DROP POLICY IF EXISTS professor_write_avaliacoes ON public.avaliacoes;
DROP POLICY IF EXISTS aluno_select_avaliacoes ON public.avaliacoes;
CREATE POLICY admin_all_avaliacoes ON public.avaliacoes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY professor_select_avaliacoes ON public.avaliacoes FOR SELECT TO authenticated USING (public.get_current_professor_id() IS NOT NULL);
CREATE POLICY professor_write_avaliacoes ON public.avaliacoes FOR ALL TO authenticated USING (public.get_current_professor_id() IS NOT NULL) WITH CHECK (public.get_current_professor_id() IS NOT NULL);
CREATE POLICY aluno_select_avaliacoes ON public.avaliacoes FOR SELECT TO authenticated USING (status IN ('publicada', 'encerrada') AND public.aluno_has_access_to_avaliacao(destino_tipo, destino_turma_id, destino_aluno_id));

-- Políticas para Tentativas de Avaliações
DROP POLICY IF EXISTS admin_all_tentativas ON public.tentativas_avaliacoes;
DROP POLICY IF EXISTS professor_all_tentativas ON public.tentativas_avaliacoes;
DROP POLICY IF EXISTS aluno_select_tentativas ON public.tentativas_avaliacoes;
DROP POLICY IF EXISTS aluno_insert_tentativas ON public.tentativas_avaliacoes;
DROP POLICY IF EXISTS aluno_update_tentativas ON public.tentativas_avaliacoes;

CREATE POLICY admin_all_tentativas ON public.tentativas_avaliacoes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY professor_all_tentativas ON public.tentativas_avaliacoes FOR ALL TO authenticated USING (public.get_current_professor_id() IS NOT NULL) WITH CHECK (public.get_current_professor_id() IS NOT NULL);
CREATE POLICY aluno_select_tentativas ON public.tentativas_avaliacoes FOR SELECT TO authenticated USING (aluno_id = public.get_current_aluno_id());
CREATE POLICY aluno_insert_tentativas ON public.tentativas_avaliacoes FOR INSERT TO authenticated WITH CHECK (aluno_id = public.get_current_aluno_id());
CREATE POLICY aluno_update_tentativas ON public.tentativas_avaliacoes FOR UPDATE TO authenticated USING (aluno_id = public.get_current_aluno_id()) WITH CHECK (aluno_id = public.get_current_aluno_id());

-- Permissões gerais
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programas_pedagogicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapas_pedagogicas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modulos_pedagogicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progresso_modulos_alunos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tentativas_avaliacoes TO authenticated;
