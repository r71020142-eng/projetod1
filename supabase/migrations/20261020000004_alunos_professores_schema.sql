-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 4 (ETAPA 10.2B2)
-- Migração dos Módulos de Alunos e Professores para PostgreSQL com RLS e Auditoria
-- ==============================================================================

-- 1. TABELA public.alunos
CREATE TABLE IF NOT EXISTS public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID UNIQUE REFERENCES public.perfis(id) ON DELETE SET NULL,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  objetivo TEXT NOT NULL DEFAULT 'Geral',
  nivel_operacional TEXT NOT NULL DEFAULT 'nao_avaliado',
  status TEXT NOT NULL DEFAULT 'ativo',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_alunos_nivel CHECK (nivel_operacional IN ('nao_avaliado', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  CONSTRAINT chk_alunos_status CHECK (status IN ('ativo', 'inativo')),
  CONSTRAINT chk_alunos_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices B-Tree para buscas frequentes e unicidade de e-mail (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_email_lower ON public.alunos (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_alunos_perfil_id ON public.alunos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_alunos_status ON public.alunos(status);
CREATE INDEX IF NOT EXISTS idx_alunos_nivel ON public.alunos(nivel_operacional);

-- Trigger de updated_at para alunos
DROP TRIGGER IF EXISTS trg_alunos_updated_at ON public.alunos;
CREATE TRIGGER trg_alunos_updated_at
  BEFORE UPDATE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Função e triggers de normalização de e-mail (lowercase + trim)
CREATE OR REPLACE FUNCTION public.normalize_email_before_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_email_alunos ON public.alunos;
CREATE TRIGGER trg_normalize_email_alunos
  BEFORE INSERT OR UPDATE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_email_before_save();

-- 2. TABELA SEPARADA: public.alunos_dados_pedagogicos (DADOS CONFIDENCIAIS)
CREATE TABLE IF NOT EXISTS public.alunos_dados_pedagogicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL UNIQUE REFERENCES public.alunos(id) ON DELETE CASCADE,
  observacoes_pedagogicas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_alunos_dados_pedagogicos_aluno_id ON public.alunos_dados_pedagogicos(aluno_id);

-- Trigger de updated_at para alunos_dados_pedagogicos
DROP TRIGGER IF EXISTS trg_alunos_dados_pedagogicos_updated_at ON public.alunos_dados_pedagogicos;
CREATE TRIGGER trg_alunos_dados_pedagogicos_updated_at
  BEFORE UPDATE ON public.alunos_dados_pedagogicos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 3. TABELA public.professores
CREATE TABLE IF NOT EXISTS public.professores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID UNIQUE REFERENCES public.perfis(id) ON DELETE SET NULL,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  biografia_pedagogica TEXT,
  idiomas_falados TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ativo',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_professores_status CHECK (status IN ('ativo', 'inativo')),
  CONSTRAINT chk_professores_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices B-Tree para buscas frequentes e unicidade de e-mail (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_professores_email_lower ON public.professores (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_professores_perfil_id ON public.professores(perfil_id);
CREATE INDEX IF NOT EXISTS idx_professores_status ON public.professores(status);

-- Trigger de updated_at para professores
DROP TRIGGER IF EXISTS trg_professores_updated_at ON public.professores;
CREATE TRIGGER trg_professores_updated_at
  BEFORE UPDATE ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_normalize_email_professores ON public.professores;
CREATE TRIGGER trg_normalize_email_professores
  BEFORE INSERT OR UPDATE ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_email_before_save();

-- 4. FUNÇÃO E TRIGGERS DE AUDITORIA CONFIÁVEL PARA OPERAÇÕES
CREATE OR REPLACE FUNCTION public.log_entidade_operacional_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ator_id UUID;
  v_ator_role TEXT;
  v_acao TEXT;
  v_identificador TEXT;
  v_valores_anteriores JSONB;
  v_valores_posteriores JSONB;
BEGIN
  v_ator_id := auth.uid();
  v_ator_role := COALESCE(public.get_auth_role()::text, 'service_or_anon');
  
  IF TG_OP = 'INSERT' THEN
    v_acao := 'INSERT';
    v_identificador := NEW.id::text;
    v_valores_anteriores := NULL;
    v_valores_posteriores := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_identificador := NEW.id::text;
    v_valores_anteriores := to_jsonb(OLD);
    v_valores_posteriores := to_jsonb(NEW);
    
    -- Detecta ação semântica específica
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.status = 'inativo' THEN
        v_acao := 'STATUS_CHANGE_INATIVO';
      ELSIF NEW.status = 'ativo' THEN
        v_acao := 'STATUS_CHANGE_ATIVO';
      ELSE
        v_acao := 'STATUS_CHANGE';
      END IF;
    ELSE
      v_acao := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'DELETE';
    v_identificador := OLD.id::text;
    v_valores_anteriores := to_jsonb(OLD);
    v_valores_posteriores := NULL;
  END IF;

  INSERT INTO public.auditoria_logs (
    ator_id,
    ator_role,
    acao,
    entidade,
    identificador_entidade,
    valores_anteriores,
    valores_posteriores,
    metadados
  ) VALUES (
    v_ator_id,
    v_ator_role,
    v_acao,
    TG_TABLE_NAME,
    v_identificador,
    v_valores_anteriores,
    v_valores_posteriores,
    jsonb_build_object('client', 'trigger_sistema')
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_alunos ON public.alunos;
CREATE TRIGGER trg_audit_alunos
  AFTER INSERT OR UPDATE OR DELETE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_entidade_operacional_auditoria();

DROP TRIGGER IF EXISTS trg_audit_alunos_dados_pedagogicos ON public.alunos_dados_pedagogicos;
CREATE TRIGGER trg_audit_alunos_dados_pedagogicos
  AFTER INSERT OR UPDATE OR DELETE ON public.alunos_dados_pedagogicos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_entidade_operacional_auditoria();

DROP TRIGGER IF EXISTS trg_audit_professores ON public.professores;
CREATE TRIGGER trg_audit_professores
  AFTER INSERT OR UPDATE OR DELETE ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.log_entidade_operacional_auditoria();

-- 5. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) COM PADRÃO DEFAULT DENY
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos_dados_pedagogicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

-- 5.1. POLÍTICAS RLS PARA public.alunos
-- SELECT:
-- - Administradores têm leitura irrestrita.
-- - Aluno autenticado pode consultar apenas seu próprio registro (alunos.perfil_id = auth.uid()).
-- - Usuários anônimos ou professores sem vínculo têm acesso NEGADO.
DROP POLICY IF EXISTS "alunos_select_policy" ON public.alunos;
CREATE POLICY "alunos_select_policy"
  ON public.alunos
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND perfil_id = auth.uid())
  );

-- INSERT: Administradores apenas
DROP POLICY IF EXISTS "alunos_insert_policy" ON public.alunos;
CREATE POLICY "alunos_insert_policy"
  ON public.alunos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- UPDATE: Administradores apenas
DROP POLICY IF EXISTS "alunos_update_policy" ON public.alunos;
CREATE POLICY "alunos_update_policy"
  ON public.alunos
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- DELETE: Administradores apenas
DROP POLICY IF EXISTS "alunos_delete_policy" ON public.alunos;
CREATE POLICY "alunos_delete_policy"
  ON public.alunos
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- 5.2. POLÍTICAS RLS PARA public.alunos_dados_pedagogicos
-- Estritamente reservado para Administradores.
-- Alunos e professores NUNCA têm acesso de leitura ou escrita a essa tabela.
DROP POLICY IF EXISTS "alunos_dados_pedagogicos_admin_all" ON public.alunos_dados_pedagogicos;
CREATE POLICY "alunos_dados_pedagogicos_admin_all"
  ON public.alunos_dados_pedagogicos
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- 5.3. POLÍTICAS RLS PARA public.professores
-- SELECT:
-- - Administradores têm leitura irrestrita.
-- - Professor autenticado pode consultar apenas seu próprio registro (professores.perfil_id = auth.uid()).
-- - Usuários anônimos têm acesso NEGADO.
DROP POLICY IF EXISTS "professores_select_policy" ON public.professores;
CREATE POLICY "professores_select_policy"
  ON public.professores
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND perfil_id = auth.uid())
  );

-- INSERT: Administradores apenas
DROP POLICY IF EXISTS "professores_insert_policy" ON public.professores;
CREATE POLICY "professores_insert_policy"
  ON public.professores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- UPDATE: Administradores apenas
DROP POLICY IF EXISTS "professores_update_policy" ON public.professores;
CREATE POLICY "professores_update_policy"
  ON public.professores
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- DELETE: Administradores apenas
DROP POLICY IF EXISTS "professores_delete_policy" ON public.professores;
CREATE POLICY "professores_delete_policy"
  ON public.professores
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- 6. PERMISSÕES EXPLÍCITAS DE TABELA
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alunos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alunos_dados_pedagogicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.professores TO authenticated;

REVOKE ALL ON TABLE public.alunos FROM anon;
REVOKE ALL ON TABLE public.alunos_dados_pedagogicos FROM anon;
REVOKE ALL ON TABLE public.professores FROM anon;
