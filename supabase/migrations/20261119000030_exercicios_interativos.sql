-- ============================================================================
-- Migração: Módulo de Exercícios Interativos (Múltipla Escolha e Leitura com Áudio)
-- Data: 2026-11-19
-- Inspiração Funcional: Experiência Lingua.com adaptada ao Método Paulo
-- ============================================================================

-- 1. TABELA DE EXERCÍCIOS INTERATIVOS
CREATE TABLE IF NOT EXISTS public.exercicios_interativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  instrucoes TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('multipla_escolha', 'leitura_audio')),
  nivel TEXT NOT NULL CHECK (nivel IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  categoria TEXT DEFAULT 'Geral',
  texto_conteudo TEXT,
  audio_url TEXT,
  audio_nome TEXT,
  audio_duracao_segundos INT,
  questoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  baralho_vocabulario_id TEXT,
  destino_tipo TEXT NOT NULL DEFAULT 'geral' CHECK (destino_tipo IN ('geral', 'turma', 'aluno')),
  destino_turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  destino_aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
  professor_id TEXT NOT NULL,
  professor_nome TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  nota_maxima NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  nota_minima_aprovacao NUMERIC(5,2) DEFAULT 7.00,
  politica_gabarito TEXT NOT NULL DEFAULT 'apos_tentativa' CHECK (politica_gabarito IN ('imediato', 'apos_tentativa')),
  tempo_estimado_minutos INT,
  versao INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_tipo ON public.exercicios_interativos(tipo);
CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_nivel ON public.exercicios_interativos(nivel);
CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_status ON public.exercicios_interativos(status);
CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_professor ON public.exercicios_interativos(professor_id);
CREATE INDEX IF NOT EXISTS idx_exercicios_interativos_destino_turma ON public.exercicios_interativos(destino_turma_id);

-- 2. TABELA DE TENTATIVAS DE EXERCÍCIOS
CREATE TABLE IF NOT EXISTS public.tentativas_exercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercicio_id UUID NOT NULL REFERENCES public.exercicios_interativos(id) ON DELETE CASCADE,
  exercicio_titulo TEXT NOT NULL,
  exercicio_tipo TEXT NOT NULL,
  exercicio_nivel TEXT NOT NULL,
  versao_exercicio INT NOT NULL DEFAULT 1,
  aluno_id TEXT NOT NULL,
  aluno_nome TEXT,
  numero_tentativa INT NOT NULL DEFAULT 1,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  concluida_em TIMESTAMPTZ,
  tempo_gasto_segundos INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida')),
  respostas JSONB NOT NULL DEFAULT '[]'::jsonb,
  questoes_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_questoes INT DEFAULT 0,
  total_acertos INT DEFAULT 0,
  total_erros INT DEFAULT 0,
  pontos_obtidos NUMERIC(5,2) DEFAULT 0.00,
  pontos_totais NUMERIC(5,2) DEFAULT 10.00,
  nota_final NUMERIC(5,2) DEFAULT 0.00,
  percentual_aproveitamento INT DEFAULT 0,
  aprovado BOOLEAN DEFAULT false,
  politica_gabarito TEXT DEFAULT 'apos_tentativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tentativas_exercicios_exercicio ON public.tentativas_exercicios(exercicio_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_exercicios_aluno ON public.tentativas_exercicios(aluno_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_exercicios_status ON public.tentativas_exercicios(status);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.exercicios_interativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_exercicios ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.exercicios_interativos TO authenticated, service_role;
GRANT ALL ON TABLE public.tentativas_exercicios TO authenticated, service_role;

-- Políticas de Exercícios Interativos
DROP POLICY IF EXISTS admin_all_exercicios ON public.exercicios_interativos;
CREATE POLICY admin_all_exercicios ON public.exercicios_interativos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS professor_manage_exercicios ON public.exercicios_interativos;
CREATE POLICY professor_manage_exercicios ON public.exercicios_interativos
  FOR ALL TO authenticated
  USING (public.get_current_professor_id() IS NOT NULL OR public.get_auth_role() = 'professor')
  WITH CHECK (public.get_current_professor_id() IS NOT NULL OR public.get_auth_role() = 'professor');

DROP POLICY IF EXISTS aluno_select_published_exercicios ON public.exercicios_interativos;
CREATE POLICY aluno_select_published_exercicios ON public.exercicios_interativos
  FOR SELECT TO authenticated
  USING (status = 'publicado');

-- Políticas de Tentativas de Exercícios
DROP POLICY IF EXISTS admin_all_tentativas_exercicios ON public.tentativas_exercicios;
CREATE POLICY admin_all_tentativas_exercicios ON public.tentativas_exercicios
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS professor_select_tentativas_exercicios ON public.tentativas_exercicios;
CREATE POLICY professor_select_tentativas_exercicios ON public.tentativas_exercicios
  FOR SELECT TO authenticated
  USING (public.get_current_professor_id() IS NOT NULL OR public.get_auth_role() = 'professor');

DROP POLICY IF EXISTS aluno_manage_own_tentativas_exercicios ON public.tentativas_exercicios;
CREATE POLICY aluno_manage_own_tentativas_exercicios ON public.tentativas_exercicios
  FOR ALL TO authenticated
  USING (
    aluno_id = (SELECT aluno_id FROM public.perfis WHERE id = auth.uid())
    OR aluno_id = (SELECT id::text FROM public.alunos WHERE id::text = aluno_id)
    OR public.is_admin()
  )
  WITH CHECK (
    aluno_id = (SELECT aluno_id FROM public.perfis WHERE id = auth.uid())
    OR public.is_admin()
  );

-- 4. SECURITY BARRIER VIEW PARA ACESSO DISCENTE SEGURO
CREATE OR REPLACE VIEW public.vw_aluno_exercicios WITH (security_barrier = true) AS
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
