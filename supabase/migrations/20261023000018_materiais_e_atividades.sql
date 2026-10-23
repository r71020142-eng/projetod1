-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 18
-- Persistência de Materiais Didáticos, Atividades, Entregas e Conteúdos Diários
--
-- Entidades:
-- 1. public.materiais
-- 2. public.atividades
-- 3. public.entregas_atividades
-- 4. public.conteudos_diarios
--
-- Regras de Negócio e Segurança:
-- - Destino: 'geral' (todos os alunos), 'turma' (turma específica) ou 'aluno' (individual).
-- - RLS Estrito:
--   - Admin: leitura e gravação irrestritas.
--   - Professor: leitura e publicação para turmas que leciona ou materiais gerais; correção de entregas.
--   - Aluno: leitura apenas de materiais/atividades gerais, da sua turma ou direcionados a ele;
--     leitura e envio apenas de suas próprias entregas (sem acesso a entregas de terceiros).
--   - Observações internas da equipe pedagógica NUNCA são expostas aos alunos.
-- ==============================================================================

-- 1. TABELA public.materiais
CREATE TABLE IF NOT EXISTS public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pdf', 'video', 'audio', 'link', 'texto', 'apresentacao')),
  categoria TEXT NOT NULL,
  nivel_recomendado TEXT NOT NULL DEFAULT 'todos' CHECK (nivel_recomendado IN ('todos', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  autor_id UUID NOT NULL, -- references professores(id) ou perfis(id)
  autor_nome TEXT,
  data_publicacao DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendado', 'publicado', 'arquivado')),
  destino_tipo TEXT NOT NULL DEFAULT 'geral' CHECK (destino_tipo IN ('geral', 'turma', 'aluno')),
  destino_id UUID, -- references turmas(id) ou alunos(id)
  link_externo TEXT,
  conteudo_texto TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  observacoes_internas TEXT,
  modulo_id UUID,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_materiais_status ON public.materiais(status);
CREATE INDEX IF NOT EXISTS idx_materiais_destino ON public.materiais(destino_tipo, destino_id);
CREATE INDEX IF NOT EXISTS idx_materiais_autor ON public.materiais(autor_id);
CREATE INDEX IF NOT EXISTS idx_materiais_data_publicacao ON public.materiais(data_publicacao DESC);

-- Trigger de updated_at para materiais
CREATE OR REPLACE FUNCTION public.set_materiais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_materiais_updated_at ON public.materiais;
CREATE TRIGGER trg_materiais_updated_at
BEFORE UPDATE ON public.materiais
FOR EACH ROW EXECUTE FUNCTION public.set_materiais_updated_at();

-- 2. TABELA public.atividades
CREATE TABLE IF NOT EXISTS public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  instrucoes TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'link', 'multipla_escolha', 'audio', 'video', 'arquivo')),
  nivel_recomendado TEXT CHECK (nivel_recomendado IN ('todos', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  material_relacionado_id UUID REFERENCES public.materiais(id) ON DELETE SET NULL,
  destino_tipo TEXT NOT NULL DEFAULT 'geral' CHECK (destino_tipo IN ('geral', 'turma', 'aluno')),
  destino_id UUID, -- references turmas(id) ou alunos(id)
  data_publicacao DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo_entrega TIMESTAMPTZ,
  pontuacao_maxima NUMERIC(5,2) DEFAULT 100.00,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'publicada', 'encerrada', 'arquivada')),
  professor_id UUID NOT NULL, -- references professores(id)
  permitir_atraso BOOLEAN NOT NULL DEFAULT true,
  observacoes_internas TEXT,
  modulo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_atividades_status ON public.atividades(status);
CREATE INDEX IF NOT EXISTS idx_atividades_destino ON public.atividades(destino_tipo, destino_id);
CREATE INDEX IF NOT EXISTS idx_atividades_professor ON public.atividades(professor_id);
CREATE INDEX IF NOT EXISTS idx_atividades_material ON public.atividades(material_relacionado_id);

DROP TRIGGER IF EXISTS trg_atividades_updated_at ON public.atividades;
CREATE TRIGGER trg_atividades_updated_at
BEFORE UPDATE ON public.atividades
FOR EACH ROW EXECUTE FUNCTION public.set_materiais_updated_at();

-- 3. TABELA public.entregas_atividades
CREATE TABLE IF NOT EXISTS public.entregas_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  resposta_texto TEXT,
  resposta_link TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('nao_iniciada', 'em_andamento', 'entregue', 'atrasada', 'corrigida', 'reenviar')),
  entregue_em TIMESTAMPTZ,
  feedback TEXT,
  pontuacao NUMERIC(5,2),
  corrigido_em TIMESTAMPTZ,
  professor_corretor_id UUID REFERENCES public.professores(id),
  motivo_reenvio TEXT,
  historico_envios JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT unq_entrega_atividade_aluno UNIQUE (atividade_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_entregas_aluno ON public.entregas_atividades(aluno_id);
CREATE INDEX IF NOT EXISTS idx_entregas_atividade ON public.entregas_atividades(atividade_id);
CREATE INDEX IF NOT EXISTS idx_entregas_status ON public.entregas_atividades(status);

DROP TRIGGER IF EXISTS trg_entregas_updated_at ON public.entregas_atividades;
CREATE TRIGGER trg_entregas_updated_at
BEFORE UPDATE ON public.entregas_atividades
FOR EACH ROW EXECUTE FUNCTION public.set_materiais_updated_at();

-- 4. TABELA public.conteudos_diarios
CREATE TABLE IF NOT EXISTS public.conteudos_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  data_programada DATE NOT NULL DEFAULT CURRENT_DATE,
  nivel_recomendado TEXT NOT NULL DEFAULT 'todos' CHECK (nivel_recomendado IN ('todos', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  destino_tipo TEXT NOT NULL DEFAULT 'geral' CHECK (destino_tipo IN ('geral', 'turma', 'aluno')),
  destino_id UUID,
  material_id UUID REFERENCES public.materiais(id) ON DELETE SET NULL,
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendado', 'publicado', 'arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_conteudos_diarios_data ON public.conteudos_diarios(data_programada);
CREATE INDEX IF NOT EXISTS idx_conteudos_diarios_destino ON public.conteudos_diarios(destino_tipo, destino_id);

-- 5. FUNÇÕES AUXILIARES DE ACESSO PARA ALUNO
CREATE OR REPLACE FUNCTION public.aluno_has_access_to_material(
  p_destino_tipo TEXT,
  p_destino_id UUID
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

  -- 1. Destino geral: todos os alunos têm acesso
  IF p_destino_tipo = 'geral' OR p_destino_id IS NULL THEN
    RETURN true;
  END IF;

  -- 2. Destino aluno específico
  IF p_destino_tipo = 'aluno' AND p_destino_id = v_aluno_id THEN
    RETURN true;
  END IF;

  -- 3. Destino turma: verifica matrícula ativa
  IF p_destino_tipo = 'turma' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.matriculas_turmas mt
      WHERE mt.turma_id = p_destino_id
        AND mt.aluno_id = v_aluno_id
        AND mt.status = 'ativa'
    );
  END IF;

  RETURN false;
END;
$$;

-- 6. VIEWS DE LEITURA COM SECURITY BARRIER E HIGIENIZAÇÃO DE PRIVACIDADE
DROP VIEW IF EXISTS public.vw_aluno_materiais;
CREATE VIEW public.vw_aluno_materiais
WITH (security_barrier = true)
AS
SELECT
  m.id,
  m.titulo,
  m.descricao,
  m.tipo,
  m.categoria,
  m.nivel_recomendado,
  m.autor_id,
  m.autor_nome,
  m.data_publicacao,
  m.status,
  m.destino_tipo,
  m.destino_id,
  m.link_externo,
  m.conteudo_texto,
  m.tags,
  m.modulo_id,
  m.arquivo_url,
  m.arquivo_nome,
  m.created_at,
  m.updated_at
FROM public.materiais m
WHERE m.status = 'publicado'
  AND (m.data_publicacao <= CURRENT_DATE)
  AND public.aluno_has_access_to_material(m.destino_tipo, m.destino_id);

GRANT SELECT ON public.vw_aluno_materiais TO authenticated;

DROP VIEW IF EXISTS public.vw_aluno_atividades;
CREATE VIEW public.vw_aluno_atividades
WITH (security_barrier = true)
AS
SELECT
  a.id,
  a.titulo,
  a.instrucoes,
  a.tipo,
  a.nivel_recomendado,
  a.material_relacionado_id,
  a.destino_tipo,
  a.destino_id,
  a.data_publicacao,
  a.prazo_entrega,
  a.pontuacao_maxima,
  a.status,
  a.professor_id,
  a.permitir_atraso,
  a.modulo_id,
  a.created_at,
  a.updated_at
FROM public.atividades a
WHERE a.status IN ('publicada', 'encerrada')
  AND (a.data_publicacao <= CURRENT_DATE)
  AND public.aluno_has_access_to_material(a.destino_tipo, a.destino_id);

GRANT SELECT ON public.vw_aluno_atividades TO authenticated;

-- 7. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteudos_diarios ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas existentes
DROP POLICY IF EXISTS admin_all_materiais ON public.materiais;
DROP POLICY IF EXISTS professor_select_materiais ON public.materiais;
DROP POLICY IF EXISTS professor_write_materiais ON public.materiais;
DROP POLICY IF EXISTS aluno_select_materiais ON public.materiais;

DROP POLICY IF EXISTS admin_all_atividades ON public.atividades;
DROP POLICY IF EXISTS professor_select_atividades ON public.atividades;
DROP POLICY IF EXISTS professor_write_atividades ON public.atividades;
DROP POLICY IF EXISTS aluno_select_atividades ON public.atividades;

DROP POLICY IF EXISTS admin_all_entregas ON public.entregas_atividades;
DROP POLICY IF EXISTS professor_select_entregas ON public.entregas_atividades;
DROP POLICY IF EXISTS professor_update_entregas ON public.entregas_atividades;
DROP POLICY IF EXISTS aluno_select_entregas ON public.entregas_atividades;
DROP POLICY IF EXISTS aluno_insert_entregas ON public.entregas_atividades;
DROP POLICY IF EXISTS aluno_update_entregas ON public.entregas_atividades;

DROP POLICY IF EXISTS admin_all_conteudos_diarios ON public.conteudos_diarios;
DROP POLICY IF EXISTS aluno_select_conteudos_diarios ON public.conteudos_diarios;

-- 7.1. Políticas de Materiais
CREATE POLICY admin_all_materiais
ON public.materiais
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY professor_select_materiais
ON public.materiais
FOR SELECT
TO authenticated
USING (public.get_current_professor_id() IS NOT NULL);

CREATE POLICY professor_write_materiais
ON public.materiais
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_professor_id() IS NOT NULL);

CREATE POLICY aluno_select_materiais
ON public.materiais
FOR SELECT
TO authenticated
USING (
  status = 'publicado'
  AND data_publicacao <= CURRENT_DATE
  AND public.aluno_has_access_to_material(destino_tipo, destino_id)
);

-- 7.2. Políticas de Atividades
CREATE POLICY admin_all_atividades
ON public.atividades
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY professor_select_atividades
ON public.atividades
FOR SELECT
TO authenticated
USING (public.get_current_professor_id() IS NOT NULL);

CREATE POLICY professor_write_atividades
ON public.atividades
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_professor_id() IS NOT NULL);

CREATE POLICY aluno_select_atividades
ON public.atividades
FOR SELECT
TO authenticated
USING (
  status IN ('publicada', 'encerrada')
  AND data_publicacao <= CURRENT_DATE
  AND public.aluno_has_access_to_material(destino_tipo, destino_id)
);

-- 7.3. Políticas de Entregas
CREATE POLICY admin_all_entregas
ON public.entregas_atividades
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY professor_select_entregas
ON public.entregas_atividades
FOR SELECT
TO authenticated
USING (public.get_current_professor_id() IS NOT NULL);

CREATE POLICY professor_update_entregas
ON public.entregas_atividades
FOR UPDATE
TO authenticated
USING (public.get_current_professor_id() IS NOT NULL)
WITH CHECK (public.get_current_professor_id() IS NOT NULL);

-- Aluno enxerga APENAS a sua própria entrega
CREATE POLICY aluno_select_entregas
ON public.entregas_atividades
FOR SELECT
TO authenticated
USING (aluno_id = public.get_current_aluno_id());

-- Aluno insere APENAS a sua própria entrega
CREATE POLICY aluno_insert_entregas
ON public.entregas_atividades
FOR INSERT
TO authenticated
WITH CHECK (aluno_id = public.get_current_aluno_id());

-- Aluno atualiza APENAS a sua própria entrega
CREATE POLICY aluno_update_entregas
ON public.entregas_atividades
FOR UPDATE
TO authenticated
USING (aluno_id = public.get_current_aluno_id())
WITH CHECK (aluno_id = public.get_current_aluno_id());

-- 7.4. Políticas de Conteúdos Diários
CREATE POLICY admin_all_conteudos_diarios
ON public.conteudos_diarios
FOR ALL
TO authenticated
USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL)
WITH CHECK (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

CREATE POLICY aluno_select_conteudos_diarios
ON public.conteudos_diarios
FOR SELECT
TO authenticated
USING (
  status = 'publicado'
  AND data_programada <= CURRENT_DATE
  AND public.aluno_has_access_to_material(destino_tipo, destino_id)
);

-- Permissões gerais
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_atividades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudos_diarios TO authenticated;
