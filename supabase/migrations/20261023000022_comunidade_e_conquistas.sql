-- ==============================================================================
-- MIGRATION: 20261023000022_comunidade_e_conquistas.sql
-- DEMOSTRATIVO MTD - MÉTODO PAULO
--
-- Criação das estruturas de persistência para Comunidade e Conquistas/Gamificação:
-- 1. public.espacos_comunidade
-- 2. public.publicacoes_comunidade
-- 3. public.comentarios_comunidade
-- 4. public.denuncias_comunidade
-- 5. public.oportunidades_comunidade
-- 6. public.interesses_oportunidades
-- 7. public.modelos_conquistas
-- 8. public.conquistas_concedidas
-- 9. public.solicitacoes_placas
-- 10. public.eventos_pontos
-- 11. public.notificacoes_sistema
-- 12. Políticas de Row Level Security (RLS) alinhadas às funções canônicas do banco
-- ==============================================================================

-- 1. ESPAÇOS DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.espacos_comunidade (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'geral' CHECK (tipo IN ('geral', 'turma', 'nivel', 'objetivo', 'oportunidades')),
  icone TEXT NOT NULL DEFAULT 'MessageCircle',
  cor_tema TEXT NOT NULL DEFAULT 'indigo',
  visibilidade TEXT NOT NULL DEFAULT 'geral',
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  turma_nome TEXT NULL,
  nivel_minimo TEXT NULL,
  nivel_alvo TEXT NULL,
  objetivo_alvo TEXT NULL,
  imagem_url TEXT NULL,
  regras TEXT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  apenas_leitura_alunos BOOLEAN NOT NULL DEFAULT FALSE,
  permitir_publicacao_aluno BOOLEAN NOT NULL DEFAULT TRUE,
  permitir_comentarios BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por_id TEXT NULL,
  criado_por_nome TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'rascunho', 'arquivado')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PUBLICAÇÕES DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.publicacoes_comunidade (
  id TEXT PRIMARY KEY,
  espaco_id TEXT NOT NULL REFERENCES public.espacos_comunidade(id) ON DELETE CASCADE,
  espaco_nome TEXT NULL,
  autor_id TEXT NOT NULL,
  autor_nome TEXT NOT NULL,
  autor_papel TEXT NOT NULL CHECK (autor_papel IN ('admin', 'professor', 'aluno', 'administrador')),
  autor_avatar TEXT NULL,
  tipo TEXT NOT NULL DEFAULT 'discussao',
  titulo TEXT NULL,
  conteudo TEXT NOT NULL,
  link_externo TEXT NULL,
  fixada BOOLEAN NOT NULL DEFAULT FALSE,
  fechada_para_respostas BOOLEAN NOT NULL DEFAULT FALSE,
  comentarios_permitidos BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'publicada', 'oculto', 'oculta', 'oculto_moderacao', 'removido', 'removida', 'arquivada', 'denunciada')),
  total_curtidas INTEGER NOT NULL DEFAULT 0,
  total_comentarios INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  reacoes JSONB NOT NULL DEFAULT '{}'::JSONB,
  reacoes_usuarios TEXT[] NOT NULL DEFAULT '{}',
  moderado_por_id TEXT NULL,
  observacoes_internas TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. COMENTÁRIOS DE PUBLICAÇÕES
CREATE TABLE IF NOT EXISTS public.comentarios_comunidade (
  id TEXT PRIMARY KEY,
  publicacao_id TEXT NOT NULL REFERENCES public.publicacoes_comunidade(id) ON DELETE CASCADE,
  espaco_id TEXT NULL,
  autor_id TEXT NOT NULL,
  autor_nome TEXT NOT NULL,
  autor_papel TEXT NOT NULL CHECK (autor_papel IN ('admin', 'professor', 'aluno', 'administrador')),
  autor_avatar TEXT NULL,
  conteudo TEXT NOT NULL,
  resposta_a_comentario_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'publicada', 'oculto', 'oculta', 'oculto_moderacao', 'removido', 'removida')),
  total_curtidas INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. DENÚNCIAS DE CONTEÚDO
CREATE TABLE IF NOT EXISTS public.denuncias_comunidade (
  id TEXT PRIMARY KEY,
  tipo_conteudo TEXT NOT NULL CHECK (tipo_conteudo IN ('publicacao', 'comentario')),
  conteudo_id TEXT NOT NULL,
  publicacao_id TEXT NULL,
  motivo TEXT NOT NULL,
  descricao TEXT NULL,
  denunciante_id TEXT NOT NULL,
  denunciante_nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'analisada', 'rejeitada', 'acao_aplicada', 'procedente', 'sob_analise')),
  resolvido_por_id TEXT NULL,
  resolvido_em TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. OPORTUNIDADES E INTERCÂMBIOS
CREATE TABLE IF NOT EXISTS public.oportunidades_comunidade (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'intercambio',
  pais TEXT NULL,
  instituicao TEXT NULL,
  link_externo TEXT NULL,
  nivel_minimo TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'rascunho')),
  total_interessados INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. INTERESSES EM OPORTUNIDADES
CREATE TABLE IF NOT EXISTS public.interesses_oportunidades (
  id TEXT PRIMARY KEY,
  oportunidade_id TEXT NOT NULL REFERENCES public.oportunidades_comunidade(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NULL,
  nivel_atual TEXT NULL,
  mensagem TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. MODELOS DE CONQUISTAS (GAMIFICAÇÃO)
CREATE TABLE IF NOT EXISTS public.modelos_conquistas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  titulo TEXT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'Award',
  cor TEXT NOT NULL DEFAULT 'indigo',
  categoria TEXT NOT NULL,
  tipo_criterio TEXT NOT NULL DEFAULT 'geral',
  tipo_marco TEXT NULL,
  tipo_premio TEXT NOT NULL DEFAULT 'digital',
  regra_criterio JSONB NOT NULL DEFAULT '{}'::JSONB,
  pontos_recompensa INTEGER NOT NULL DEFAULT 100,
  habilitar_placa_fisica BOOLEAN NOT NULL DEFAULT FALSE,
  elegivel_placa_fisica BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'ativa', 'rascunho', 'arquivado', 'arquivada')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. CONQUISTAS CONCEDIDAS AOS ALUNOS
CREATE TABLE IF NOT EXISTS public.conquistas_concedidas (
  id TEXT PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NULL,
  modelo_id TEXT NOT NULL REFERENCES public.modelos_conquistas(id) ON DELETE CASCADE,
  modelo_nome TEXT NULL,
  categoria TEXT NULL,
  tipo_premio TEXT NULL,
  origem TEXT NULL,
  pontos_atribuidos INTEGER NOT NULL DEFAULT 0,
  concedido_por TEXT NULL,
  professor_id UUID REFERENCES public.professores(id) ON DELETE SET NULL,
  professor_nome TEXT NULL,
  justificativa_docente TEXT NULL,
  status TEXT NOT NULL DEFAULT 'concedida' CHECK (status IN ('concedida', 'revogada', 'desbloqueada')),
  notificada BOOLEAN NOT NULL DEFAULT FALSE,
  concedida_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_aluno_conquista UNIQUE (aluno_id, modelo_id)
);

-- 9. SOLICITAÇÕES DE PLACAS FÍSICAS
CREATE TABLE IF NOT EXISTS public.solicitacoes_placas (
  id TEXT PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  conquista_id TEXT NOT NULL REFERENCES public.modelos_conquistas(id) ON DELETE RESTRICT,
  conquista_nome TEXT NULL,
  nivel_marco TEXT NULL,
  nome_gravacao TEXT NULL,
  endereco_entrega JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'solicitada' CHECK (status IN ('elegivel', 'interesse_registrado', 'solicitada', 'em_analise', 'aprovado', 'aprovada', 'em_producao', 'pronta', 'enviado', 'enviada', 'entregue', 'rejeitada', 'cancelado')),
  codigo_rastreio TEXT NULL,
  codigo_validacao TEXT NULL,
  motivo_rejeicao TEXT NULL,
  observacoes_internas TEXT NULL,
  historico_status JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  solicitada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. EVENTOS DE PONTOS
CREATE TABLE IF NOT EXISTS public.eventos_pontos (
  id TEXT PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NULL,
  tipo_acao TEXT NOT NULL,
  pontos INTEGER NOT NULL DEFAULT 0,
  origem_id TEXT NULL,
  descricao TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. NOTIFICAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.notificacoes_sistema (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'geral',
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_pub_espaco_status ON public.publicacoes_comunidade(espaco_id, status);
CREATE INDEX IF NOT EXISTS idx_comentarios_pub ON public.comentarios_comunidade(publicacao_id, status);
CREATE INDEX IF NOT EXISTS idx_conquistas_aluno ON public.conquistas_concedidas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_placas_aluno ON public.solicitacoes_placas(aluno_id, status);
CREATE INDEX IF NOT EXISTS idx_eventos_pontos_aluno ON public.eventos_pontos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON public.notificacoes_sistema(usuario_id, lida);

-- TRIGGERS DE UPDATED_AT (utilizando a função canônica set_current_timestamp_updated_at)
DROP TRIGGER IF EXISTS trg_espacos_updated_at ON public.espacos_comunidade;
CREATE TRIGGER trg_espacos_updated_at
  BEFORE UPDATE ON public.espacos_comunidade
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_publicacoes_updated_at ON public.publicacoes_comunidade;
CREATE TRIGGER trg_publicacoes_updated_at
  BEFORE UPDATE ON public.publicacoes_comunidade
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_comentarios_updated_at ON public.comentarios_comunidade;
CREATE TRIGGER trg_comentarios_updated_at
  BEFORE UPDATE ON public.comentarios_comunidade
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_modelos_conquistas_updated_at ON public.modelos_conquistas;
CREATE TRIGGER trg_modelos_conquistas_updated_at
  BEFORE UPDATE ON public.modelos_conquistas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_solicitacoes_placas_updated_at ON public.solicitacoes_placas;
CREATE TRIGGER trg_solicitacoes_placas_updated_at
  BEFORE UPDATE ON public.solicitacoes_placas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- HABILITAR RLS
ALTER TABLE public.espacos_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denuncias_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades_comunidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interesses_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas_concedidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_placas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_sistema ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: ESPAÇOS
DROP POLICY IF EXISTS "espacos_select_all" ON public.espacos_comunidade;
CREATE POLICY "espacos_select_all" ON public.espacos_comunidade FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "espacos_manage_admin" ON public.espacos_comunidade;
CREATE POLICY "espacos_manage_admin" ON public.espacos_comunidade FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POLÍTICAS RLS: PUBLICAÇÕES
DROP POLICY IF EXISTS "pub_select_publicadas" ON public.publicacoes_comunidade;
CREATE POLICY "pub_select_publicadas" ON public.publicacoes_comunidade FOR SELECT TO authenticated
  USING (
    status IN ('publicado', 'publicada')
    OR public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

DROP POLICY IF EXISTS "pub_insert_auth" ON public.publicacoes_comunidade;
CREATE POLICY "pub_insert_auth" ON public.publicacoes_comunidade FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

DROP POLICY IF EXISTS "pub_update_auth" ON public.publicacoes_comunidade;
CREATE POLICY "pub_update_auth" ON public.publicacoes_comunidade FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

DROP POLICY IF EXISTS "pub_delete_auth" ON public.publicacoes_comunidade;
CREATE POLICY "pub_delete_auth" ON public.publicacoes_comunidade FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

-- POLÍTICAS RLS: COMENTÁRIOS
DROP POLICY IF EXISTS "comentarios_select_publicados" ON public.comentarios_comunidade;
CREATE POLICY "comentarios_select_publicados" ON public.comentarios_comunidade FOR SELECT TO authenticated
  USING (
    status IN ('publicado', 'publicada')
    OR public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

DROP POLICY IF EXISTS "comentarios_insert_auth" ON public.comentarios_comunidade;
CREATE POLICY "comentarios_insert_auth" ON public.comentarios_comunidade FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

DROP POLICY IF EXISTS "comentarios_update_auth" ON public.comentarios_comunidade;
CREATE POLICY "comentarios_update_auth" ON public.comentarios_comunidade FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.get_current_professor_id() IS NOT NULL
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

DROP POLICY IF EXISTS "comentarios_delete_auth" ON public.comentarios_comunidade;
CREATE POLICY "comentarios_delete_auth" ON public.comentarios_comunidade FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR autor_id = auth.uid()::text
    OR autor_id = public.get_current_aluno_id()::text
  );

-- POLÍTICAS RLS: MODELOS DE CONQUISTAS
DROP POLICY IF EXISTS "modelos_conquistas_select_all" ON public.modelos_conquistas;
CREATE POLICY "modelos_conquistas_select_all" ON public.modelos_conquistas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "modelos_conquistas_manage_admin" ON public.modelos_conquistas;
CREATE POLICY "modelos_conquistas_manage_admin" ON public.modelos_conquistas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- POLÍTICAS RLS: CONQUISTAS CONCEDIDAS
DROP POLICY IF EXISTS "conquistas_select_own_or_team" ON public.conquistas_concedidas;
CREATE POLICY "conquistas_select_own_or_team" ON public.conquistas_concedidas FOR SELECT TO authenticated
  USING (aluno_id = public.get_current_aluno_id() OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "conquistas_manage_team" ON public.conquistas_concedidas;
CREATE POLICY "conquistas_manage_team" ON public.conquistas_concedidas FOR ALL TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- POLÍTICAS RLS: SOLICITAÇÕES DE PLACAS
DROP POLICY IF EXISTS "placas_manage_team" ON public.solicitacoes_placas;
CREATE POLICY "placas_manage_team" ON public.solicitacoes_placas FOR ALL TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "placas_aluno_own" ON public.solicitacoes_placas;
CREATE POLICY "placas_aluno_own" ON public.solicitacoes_placas FOR SELECT TO authenticated
  USING (aluno_id = public.get_current_aluno_id());

DROP POLICY IF EXISTS "placas_aluno_insert" ON public.solicitacoes_placas;
CREATE POLICY "placas_aluno_insert" ON public.solicitacoes_placas FOR INSERT TO authenticated
  WITH CHECK (aluno_id = public.get_current_aluno_id() OR public.is_admin());

-- POLÍTICAS RLS: EVENTOS DE PONTOS
DROP POLICY IF EXISTS "pontos_select_own_or_team" ON public.eventos_pontos;
CREATE POLICY "pontos_select_own_or_team" ON public.eventos_pontos FOR SELECT TO authenticated
  USING (aluno_id = public.get_current_aluno_id() OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- POLÍTICAS RLS: NOTIFICAÇÕES
DROP POLICY IF EXISTS "notificacoes_select_own" ON public.notificacoes_sistema;
CREATE POLICY "notificacoes_select_own" ON public.notificacoes_sistema FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()::text OR usuario_id = public.get_current_aluno_id()::text OR public.is_admin());

DROP POLICY IF EXISTS "notificacoes_update_own" ON public.notificacoes_sistema;
CREATE POLICY "notificacoes_update_own" ON public.notificacoes_sistema FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid()::text OR usuario_id = public.get_current_aluno_id()::text OR public.is_admin());

DROP POLICY IF EXISTS "notificacoes_insert_auth" ON public.notificacoes_sistema;
CREATE POLICY "notificacoes_insert_auth" ON public.notificacoes_sistema FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid()::text OR usuario_id = public.get_current_aluno_id()::text OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- POLÍTICAS RLS: DENÚNCIAS
DROP POLICY IF EXISTS "denuncias_select_team_or_own" ON public.denuncias_comunidade;
CREATE POLICY "denuncias_select_team_or_own" ON public.denuncias_comunidade FOR SELECT TO authenticated
  USING (denunciante_id = auth.uid()::text OR denunciante_id = public.get_current_aluno_id()::text OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "denuncias_insert_auth" ON public.denuncias_comunidade;
CREATE POLICY "denuncias_insert_auth" ON public.denuncias_comunidade FOR INSERT TO authenticated
  WITH CHECK (denunciante_id = auth.uid()::text OR denunciante_id = public.get_current_aluno_id()::text OR public.is_admin());

DROP POLICY IF EXISTS "denuncias_manage_team" ON public.denuncias_comunidade;
CREATE POLICY "denuncias_manage_team" ON public.denuncias_comunidade FOR ALL TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- POLÍTICAS RLS: OPORTUNIDADES
DROP POLICY IF EXISTS "oportunidades_select_all" ON public.oportunidades_comunidade;
CREATE POLICY "oportunidades_select_all" ON public.oportunidades_comunidade FOR SELECT TO authenticated
  USING (status = 'ativa' OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "oportunidades_manage_team" ON public.oportunidades_comunidade;
CREATE POLICY "oportunidades_manage_team" ON public.oportunidades_comunidade FOR ALL TO authenticated
  USING (public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- POLÍTICAS RLS: INTERESSES EM OPORTUNIDADES
DROP POLICY IF EXISTS "interesses_select_own_or_team" ON public.interesses_oportunidades;
CREATE POLICY "interesses_select_own_or_team" ON public.interesses_oportunidades FOR SELECT TO authenticated
  USING (aluno_id = public.get_current_aluno_id() OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

DROP POLICY IF EXISTS "interesses_insert_own" ON public.interesses_oportunidades;
CREATE POLICY "interesses_insert_own" ON public.interesses_oportunidades FOR INSERT TO authenticated
  WITH CHECK (aluno_id = public.get_current_aluno_id() OR public.is_admin());

DROP POLICY IF EXISTS "interesses_delete_own_or_team" ON public.interesses_oportunidades;
CREATE POLICY "interesses_delete_own_or_team" ON public.interesses_oportunidades FOR DELETE TO authenticated
  USING (aluno_id = public.get_current_aluno_id() OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- POLÍTICAS RLS: INSERT DE EVENTOS DE PONTOS
DROP POLICY IF EXISTS "pontos_insert_team_or_own" ON public.eventos_pontos;
CREATE POLICY "pontos_insert_team_or_own" ON public.eventos_pontos FOR INSERT TO authenticated
  WITH CHECK (aluno_id = public.get_current_aluno_id() OR public.is_admin() OR public.get_current_professor_id() IS NOT NULL);

-- ATRIBUIÇÃO EXPLÍCITA DE PRIVILÉGIOS (GRANTS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.espacos_comunidade TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publicacoes_comunidade TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios_comunidade TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.denuncias_comunidade TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades_comunidade TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interesses_oportunidades TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_conquistas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conquistas_concedidas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_placas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_pontos TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes_sistema TO authenticated, service_role;
