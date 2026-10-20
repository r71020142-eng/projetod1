-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO INICIAL (ETAPA 10.1)
-- Fundação de Perfis, RBAC, Auditoria e Row Level Security (RLS)
-- ==============================================================================

-- 1. TIPOS ENUMERADOS DE DOMÍNIO
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'professor', 'aluno');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('ativo', 'inativo', 'bloqueado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO DE TIMESTAMPS
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- 3. TABELA DE PERFIS DE USUÁRIOS (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'aluno',
  status public.profile_status NOT NULL DEFAULT 'ativo',
  avatar_url TEXT,
  telefone TEXT,
  aluno_id TEXT UNIQUE, -- Preparação de chave de migração para entidade discente
  professor_id TEXT UNIQUE, -- Preparação de chave de migração para entidade docente
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices B-Tree para buscas e relacionamentos frequentes
CREATE INDEX IF NOT EXISTS idx_perfis_role ON public.perfis(role);
CREATE INDEX IF NOT EXISTS idx_perfis_status ON public.perfis(status);
CREATE INDEX IF NOT EXISTS idx_perfis_aluno_id ON public.perfis(aluno_id);
CREATE INDEX IF NOT EXISTS idx_perfis_professor_id ON public.perfis(professor_id);

-- Trigger de updated_at para perfis
DROP TRIGGER IF EXISTS trg_perfis_updated_at ON public.perfis;
CREATE TRIGGER trg_perfis_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 4. FUNÇÕES DE AUTORIZAÇÃO SEGURAS (SECURITY DEFINER COM SEARCH_PATH FIXADO)
-- Retorna o papel do usuário autenticado atual baseado em auth.uid()
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.perfis
  WHERE id = auth.uid()
    AND status = 'ativo';

  RETURN v_role;
END;
$$;

-- Verifica se o usuário autenticado atual é administrador ativo
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (public.get_auth_role() = 'admin');
END;
$$;

-- Verifica se o usuário autenticado atual é professor ou administrador ativo
CREATE OR REPLACE FUNCTION public.is_professor_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (public.get_auth_role() IN ('admin', 'professor'));
END;
$$;

-- 5. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL NO SIGNUP (auth.users)
-- Regra de menor privilégio: todo novo usuário nasce estritamente como 'aluno'.
-- Ignora metadados públicos que tentem forçar 'role=admin'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
BEGIN
  -- Extrai nome dos metadados se existir, ou deriva do e-mail
  v_nome := coalesce(
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.perfis (id, email, nome_completo, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_nome,
    'aluno', -- Menor privilégio estrito; promoção a admin exige ação de administrador existente
    'ativo'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. TABELA DE AUDITORIA E LOGS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ator_role TEXT,
  acao TEXT NOT NULL, -- Ex: 'INSERT', 'UPDATE', 'DELETE', 'ROLE_CHANGE', 'STATUS_CHANGE'
  entidade TEXT NOT NULL, -- Ex: 'perfis', 'alunos', 'professores'
  identificador_entidade TEXT NOT NULL,
  valores_anteriores JSONB,
  valores_posteriores JSONB,
  metadados JSONB DEFAULT '{}'::jsonb, -- Metadados técnicos não sensíveis (sem senhas, tokens ou chaves)
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_auditoria_ator ON public.auditoria_logs(ator_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON public.auditoria_logs(entidade, identificador_entidade);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria_logs(created_at DESC);

-- 7. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS RLS PARA public.perfis (PADRÃO DE NEGAÇÃO ESTRITO)
-- ==============================================================================

-- 7.1. SELECT:
-- - Usuário anônimo: NEGADO.
-- - Aluno: acessa exclusivamente o próprio perfil.
-- - Professor: acessa seu próprio perfil e perfis de alunos.
-- - Admin: acessa todos os perfis.
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
CREATE POLICY "perfis_select_policy"
  ON public.perfis
  FOR SELECT
  TO authenticated
  USING (
    -- Próprio perfil
    auth.uid() = id
    -- Ou Administrador geral
    OR public.is_admin()
    -- Ou Professor consultando alunos
    OR (public.is_professor_or_admin() AND role = 'aluno')
  );

-- 7.2. UPDATE:
-- - Aluno/Professor pode atualizar dados de contato próprios (nome, telefone, avatar).
-- - Bloqueio estrito de auto-promoção: ninguém pode alterar seu próprio 'role' ou 'status'.
-- - Administrador pode atualizar papéis e status de qualquer perfil.
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;
CREATE POLICY "perfis_update_policy"
  ON public.perfis
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    -- Administrador pode alterar quaisquer campos válidos
    public.is_admin()
    -- Usuário comum só pode atualizar a si mesmo E o role/status devem permanecer idênticos aos atuais
    OR (
      auth.uid() = id
      AND role = (SELECT p.role FROM public.perfis p WHERE p.id = auth.uid())
      AND status = (SELECT p.status FROM public.perfis p WHERE p.id = auth.uid())
    )
  );

-- 7.3. INSERT:
-- Inserções diretas via API são exclusivas de administradores.
-- Usuários comuns são criados estritamente via trigger handle_new_user (security definer).
DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
CREATE POLICY "perfis_insert_policy"
  ON public.perfis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- 7.4. DELETE:
-- Somente administradores têm permissão para deletar perfis diretamente.
DROP POLICY IF EXISTS "perfis_delete_policy" ON public.perfis;
CREATE POLICY "perfis_delete_policy"
  ON public.perfis
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- ==============================================================================
-- POLÍTICAS RLS PARA public.auditoria_logs (APPEND-ONLY E SIGILO)
-- ==============================================================================

-- 7.5. SELECT: Apenas administradores podem ler logs de auditoria.
DROP POLICY IF EXISTS "auditoria_select_policy" ON public.auditoria_logs;
CREATE POLICY "auditoria_select_policy"
  ON public.auditoria_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- 7.6. INSERT: Usuários autenticados podem inserir logs de ações autorizadas.
DROP POLICY IF EXISTS "auditoria_insert_policy" ON public.auditoria_logs;
CREATE POLICY "auditoria_insert_policy"
  ON public.auditoria_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ator_id = auth.uid() OR ator_id IS NULL OR public.is_admin()
  );

-- 7.7. UPDATE e DELETE: Rigorosamente proibidos (Logs são imutáveis).
-- Como não há policies para UPDATE e DELETE, qualquer tentativa será rejeitada por padrão de negação do RLS.
