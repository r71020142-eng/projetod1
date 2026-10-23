-- ==============================================================================
-- MIGRATION: 20261023000022_comunidade_e_conquistas.sql
-- DEMOSTRATIVO MTD - MÉTODO PAULO
--
-- Criação das estruturas de persistência para Comunidade e Conquistas/Gamificação:
-- 1. public.espacos_comunidade
-- 2. public.publicacoes_comunidade
-- 3. public.comentarios_comunidade
-- 4. public.modelos_conquistas
-- 5. public.conquistas_concedidas
-- 6. public.solicitacoes_placas
-- 7. Políticas de Row Level Security (RLS)
-- ==============================================================================

-- 1. ESPAÇOS DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.espacos_comunidade (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'MessageCircle',
  cor_tema TEXT NOT NULL DEFAULT 'indigo',
  visibilidade TEXT NOT NULL DEFAULT 'geral' CHECK (visibilidade IN ('geral', 'turma', 'nivel')),
  turma_id TEXT NULL,
  nivel_minimo TEXT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  apenas_leitura_alunos BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PUBLICAÇÕES DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.publicacoes_comunidade (
  id TEXT PRIMARY KEY,
  espaco_id TEXT NOT NULL REFERENCES public.espacos_comunidade(id) ON DELETE CASCADE,
  autor_id TEXT NOT NULL,
  autor_nome TEXT NOT NULL,
  autor_papel TEXT NOT NULL CHECK (autor_papel IN ('admin', 'professor', 'aluno')),
  autor_avatar TEXT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fixada BOOLEAN NOT NULL DEFAULT FALSE,
  fechada_para_respostas BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto_moderacao', 'removido')),
  total_curtidas INTEGER NOT NULL DEFAULT 0,
  total_comentarios INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. COMENTÁRIOS DE PUBLICAÇÕES
CREATE TABLE IF NOT EXISTS public.comentarios_comunidade (
  id TEXT PRIMARY KEY,
  publicacao_id TEXT NOT NULL REFERENCES public.publicacoes_comunidade(id) ON DELETE CASCADE,
  autor_id TEXT NOT NULL,
  autor_nome TEXT NOT NULL,
  autor_papel TEXT NOT NULL CHECK (autor_papel IN ('admin', 'professor', 'aluno')),
  autor_avatar TEXT NULL,
  conteudo TEXT NOT NULL,
  resposta_a_comentario_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto_moderacao', 'removido')),
  total_curtidas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MODELOS DE CONQUISTAS (GAMIFICAÇÃO)
CREATE TABLE IF NOT EXISTS public.modelos_conquistas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'Award',
  categoria TEXT NOT NULL CHECK (categoria IN ('progresso', 'engajamento', 'fluencia', 'social', 'especial')),
  tipo_marco TEXT NOT NULL,
  regra_criterio JSONB NOT NULL DEFAULT '{}'::JSONB,
  pontos_recompensa INTEGER NOT NULL DEFAULT 100,
  habilitar_placa_fisica BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CONQUISTAS CONCEDIDAS AOS ALUNOS
CREATE TABLE IF NOT EXISTS public.conquistas_concedidas (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  modelo_id TEXT NOT NULL REFERENCES public.modelos_conquistas(id) ON DELETE CASCADE,
  concedida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notificada BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_aluno_conquista UNIQUE (aluno_id, modelo_id)
);

-- 6. SOLICITAÇÕES DE PLACAS FÍSICAS
CREATE TABLE IF NOT EXISTS public.solicitacoes_placas (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  conquista_id TEXT NOT NULL REFERENCES public.modelos_conquistas(id) ON DELETE RESTRICT,
  nome_gravacao TEXT NOT NULL,
  endereco_entrega JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'solicitada' CHECK (status IN ('solicitada', 'em_analise', 'aprovada', 'em_producao', 'enviada', 'entregue', 'rejeitada')),
  codigo_rastreio TEXT NULL,
  motivo_rejeicao TEXT NULL,
  solicitada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_pub_espaco_status ON public.publicacoes_comunidade(espaco_id, status);
CREATE INDEX IF NOT EXISTS idx_comentarios_pub ON public.comentarios_comunidade(publicacao_id, status);
CREATE INDEX IF NOT EXISTS idx_conquistas_aluno ON public.conquistas_concedidas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_placas_aluno ON public.solicitacoes_placas(aluno_id, status);

-- HABILITAR RLS
ALTER TABLE public.espacos_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas_concedidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_placas ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: LEITURA GERAL PARA AUTENTICADOS
DROP POLICY IF EXISTS "espacos_select_all" ON public.espacos_comunidade;
CREATE POLICY "espacos_select_all" ON public.espacos_comunidade FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pub_select_publicadas" ON public.publicacoes_comunidade;
CREATE POLICY "pub_select_publicadas" ON public.publicacoes_comunidade FOR SELECT TO authenticated USING (status = 'publicado' OR public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor'));

DROP POLICY IF EXISTS "comentarios_select_publicados" ON public.comentarios_comunidade;
CREATE POLICY "comentarios_select_publicados" ON public.comentarios_comunidade FOR SELECT TO authenticated USING (status = 'publicado' OR public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor'));

DROP POLICY IF EXISTS "modelos_conquistas_select_all" ON public.modelos_conquistas;
CREATE POLICY "modelos_conquistas_select_all" ON public.modelos_conquistas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "conquistas_select_own_or_team" ON public.conquistas_concedidas;
CREATE POLICY "conquistas_select_own_or_team" ON public.conquistas_concedidas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfis p WHERE p.aluno_id = conquistas_concedidas.aluno_id AND p.id = auth.uid())
  OR public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor')
);

DROP POLICY IF EXISTS "placas_manage_team" ON public.solicitacoes_placas;
CREATE POLICY "placas_manage_team" ON public.solicitacoes_placas FOR ALL TO authenticated USING (public.obter_perfil_usuario(auth.uid()) IN ('admin', 'professor'));

DROP POLICY IF EXISTS "placas_aluno_own" ON public.solicitacoes_placas;
CREATE POLICY "placas_aluno_own" ON public.solicitacoes_placas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfis p WHERE p.aluno_id = solicitacoes_placas.aluno_id AND p.id = auth.uid())
);
