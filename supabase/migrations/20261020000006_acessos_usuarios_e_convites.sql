-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 6 (ETAPA 10.2C1)
-- Fundação de Contas de Acesso, Convites Administrativos e Menor Privilégio
-- ==============================================================================

-- 1. TIPOS ENUMERADOS PARA CONTAS DE ACESSO
DO $$ BEGIN
  CREATE TYPE public.tipo_acesso_usuario AS ENUM ('aluno', 'professor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.status_acesso_usuario AS ENUM (
    'processando',
    'convite_pendente',
    'ativo',
    'bloqueado',
    'erro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA CENTRAL DE VÍNCULO: public.acessos_usuarios
CREATE TABLE IF NOT EXISTS public.acessos_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE RESTRICT,
  professor_id UUID REFERENCES public.professores(id) ON DELETE RESTRICT,
  perfil_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  email_normalizado TEXT NOT NULL,
  tipo public.tipo_acesso_usuario NOT NULL,
  status public.status_acesso_usuario NOT NULL DEFAULT 'convite_pendente',
  convidado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  convite_enviado_em TIMESTAMPTZ,
  acesso_ativado_em TIMESTAMPTZ,
  ultimo_erro_interno TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Regras de Integridade Mandatórias:
  -- 1. Exatamente um entre aluno_id e professor_id preenchido, compatível com o tipo
  CONSTRAINT chk_acessos_exatamente_um_vinculo CHECK (
    (aluno_id IS NOT NULL AND professor_id IS NULL AND tipo = 'aluno'::public.tipo_acesso_usuario) OR
    (aluno_id IS NULL AND professor_id IS NOT NULL AND tipo = 'professor'::public.tipo_acesso_usuario)
  ),

  -- 2. Formato do e-mail normalizado (minúsculas sem espaços)
  CONSTRAINT chk_acessos_email_format CHECK (
    email_normalizado ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ),

  -- 3. Unicidades estritas:
  CONSTRAINT unq_acessos_aluno_id UNIQUE (aluno_id),
  CONSTRAINT unq_acessos_professor_id UNIQUE (professor_id),
  CONSTRAINT unq_acessos_perfil_id UNIQUE (perfil_id),
  CONSTRAINT unq_acessos_email_normalizado UNIQUE (email_normalizado)
);

-- Índices B-Tree para buscas e relacionamentos frequentes
CREATE INDEX IF NOT EXISTS idx_acessos_aluno_id ON public.acessos_usuarios(aluno_id);
CREATE INDEX IF NOT EXISTS idx_acessos_professor_id ON public.acessos_usuarios(professor_id);
CREATE INDEX IF NOT EXISTS idx_acessos_perfil_id ON public.acessos_usuarios(perfil_id);
CREATE INDEX IF NOT EXISTS idx_acessos_email_norm ON public.acessos_usuarios(email_normalizado);
CREATE INDEX IF NOT EXISTS idx_acessos_status ON public.acessos_usuarios(status);

-- Trigger de updated_at para acessos_usuarios
DROP TRIGGER IF EXISTS trg_acessos_usuarios_updated_at ON public.acessos_usuarios;
CREATE TRIGGER trg_acessos_usuarios_updated_at
  BEFORE UPDATE ON public.acessos_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger de normalização do e-mail
CREATE OR REPLACE FUNCTION public.normalize_acesso_email_before_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_normalizado IS NOT NULL THEN
    NEW.email_normalizado := lower(trim(NEW.email_normalizado));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_email_acessos ON public.acessos_usuarios;
CREATE TRIGGER trg_normalize_email_acessos
  BEFORE INSERT OR UPDATE ON public.acessos_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_acesso_email_before_save();

-- 3. ROW LEVEL SECURITY (RLS) E PRIVILÉGIOS DE ACESSOS_USUARIOS
ALTER TABLE public.acessos_usuarios ENABLE ROW LEVEL SECURITY;

-- DEFAULT DENY: revoga todas as permissões de anon e proíbe escritas diretas de authenticated
REVOKE ALL ON public.acessos_usuarios FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.acessos_usuarios FROM authenticated;
GRANT SELECT ON public.acessos_usuarios TO authenticated;

-- Políticas de Consulta (SELECT):
-- Admin ativo consulta todos os registros
DROP POLICY IF EXISTS admin_select_acessos ON public.acessos_usuarios;
CREATE POLICY admin_select_acessos ON public.acessos_usuarios
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'::public.user_role
        AND p.status = 'ativo'::public.profile_status
    )
  );

-- Usuário autenticado consulta exclusivamente seu próprio vínculo
DROP POLICY IF EXISTS self_select_acessos ON public.acessos_usuarios;
CREATE POLICY self_select_acessos ON public.acessos_usuarios
  FOR SELECT
  TO authenticated
  USING (
    perfil_id = auth.uid()
  );

-- 4. ADAPTAÇÃO SEGURA DO TRIGGER HANDLE_NEW_USER (MENOR PRIVILÉGIO EM CONVITES)
-- Regras de Segurança:
-- - Se o e-mail possuir convite administrativo em andamento (status 'processando' ou 'convite_pendente'),
--   o perfil inicial é criado com status 'inativo' e role 'aluno', impedindo qualquer acesso
--   antes que a função transacional de vínculo conclua atomicamente a validação.
-- - Se não houver convite administrativo, mantém a criação como 'aluno' e 'ativo'.
-- - Papel NUNCA é lido de raw_user_meta_data.
-- - Ray Pires e perfis pré-existentes são estritamente preservados com ON CONFLICT (id) DO NOTHING.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_nome TEXT;
  v_email_norm TEXT;
  v_tem_convite BOOLEAN := false;
  v_status_inicial public.profile_status;
BEGIN
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  v_email_norm := lower(trim(NEW.email));

  -- Verifica se este e-mail possui convite administrativo pendente em acessos_usuarios
  SELECT EXISTS (
    SELECT 1 FROM public.acessos_usuarios
    WHERE email_normalizado = v_email_norm
      AND status IN ('processando'::public.status_acesso_usuario, 'convite_pendente'::public.status_acesso_usuario)
  ) INTO v_tem_convite;

  -- Se for originado de convite administrativo, perfil nasce em menor privilégio absoluto ('inativo')
  IF v_tem_convite THEN
    v_status_inicial := 'inativo'::public.profile_status;
  ELSE
    v_status_inicial := 'ativo'::public.profile_status;
  END IF;

  -- Resolução resiliente do nome completo
  v_nome := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'nome_completo'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
    NULLIF(trim(split_part(NEW.email, '@', 1)), ''),
    'Novo Usuário'
  );

  -- Inserção idempotente na tabela pública de perfis (sempre com role aluno, ignorando metadados)
  INSERT INTO public.perfis (id, email, nome_completo, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_nome,
    'aluno'::public.user_role,
    v_status_inicial
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. FUNÇÃO TRANSACIONAL DE VÍNCULO PRIVILEGIADA
-- Executada exclusivamente em contexto de serviço administrativo (service_role).
-- Valida integralmente os dados e realiza todas as alterações em uma única transação atômica.
CREATE OR REPLACE FUNCTION public.vincular_acesso_usuario(
  p_acesso_id UUID,
  p_auth_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_acesso RECORD;
  v_user_email TEXT;
  v_nome_operacional TEXT;
  v_target_role public.user_role;
BEGIN
  -- 1. Localiza e bloqueia o registro de acesso para atualização
  SELECT * INTO v_acesso
  FROM public.acessos_usuarios
  WHERE id = p_acesso_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de acesso % não encontrado.', p_acesso_id;
  END IF;

  -- 2. Localiza e valida o usuário em auth.users
  SELECT lower(trim(email)) INTO v_user_email
  FROM auth.users
  WHERE id = p_auth_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário Auth % não encontrado.', p_auth_user_id;
  END IF;

  -- 3. Confirma se os e-mails conferem exatamente
  IF v_user_email <> v_acesso.email_normalizado THEN
    RAISE EXCEPTION 'Divergência de identidade: e-mail Auth (%) diferente do cadastro operacional (%).',
      v_user_email, v_acesso.email_normalizado;
  END IF;

  -- 4. Processamento conforme o tipo de cadastro
  IF v_acesso.tipo = 'aluno'::public.tipo_acesso_usuario THEN
    v_target_role := 'aluno'::public.user_role;

    -- Obtém o nome e verifica existência do aluno
    SELECT nome_completo INTO v_nome_operacional
    FROM public.alunos
    WHERE id = v_acesso.aluno_id
    FOR UPDATE;

    IF v_nome_operacional IS NULL THEN
      RAISE EXCEPTION 'Aluno % não encontrado.', v_acesso.aluno_id;
    END IF;

    -- Atualiza perfil_id no aluno
    UPDATE public.alunos
    SET perfil_id = p_auth_user_id
    WHERE id = v_acesso.aluno_id;

  ELSIF v_acesso.tipo = 'professor'::public.tipo_acesso_usuario THEN
    v_target_role := 'professor'::public.user_role;

    -- Obtém o nome e verifica existência do professor
    SELECT nome_completo INTO v_nome_operacional
    FROM public.professores
    WHERE id = v_acesso.professor_id
    FOR UPDATE;

    IF v_nome_operacional IS NULL THEN
      RAISE EXCEPTION 'Professor % não encontrado.', v_acesso.professor_id;
    END IF;

    -- Atualiza perfil_id no professor
    UPDATE public.professores
    SET perfil_id = p_auth_user_id
    WHERE id = v_acesso.professor_id;

  ELSE
    RAISE EXCEPTION 'Tipo de acesso desconhecido: %', v_acesso.tipo;
  END IF;

  -- 5. Atualiza o perfil correspondente com o papel inferido e ativa o acesso
  INSERT INTO public.perfis (id, email, nome_completo, role, status, aluno_id, professor_id)
  VALUES (
    p_auth_user_id,
    v_user_email,
    v_nome_operacional,
    v_target_role,
    'ativo'::public.profile_status,
    CASE WHEN v_acesso.tipo = 'aluno'::public.tipo_acesso_usuario THEN v_acesso.aluno_id::text ELSE NULL END,
    CASE WHEN v_acesso.tipo = 'professor'::public.tipo_acesso_usuario THEN v_acesso.professor_id::text ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = v_target_role,
    status = 'ativo'::public.profile_status,
    email = v_user_email,
    nome_completo = v_nome_operacional,
    aluno_id = CASE WHEN v_acesso.tipo = 'aluno'::public.tipo_acesso_usuario THEN v_acesso.aluno_id::text ELSE public.perfis.aluno_id END,
    professor_id = CASE WHEN v_acesso.tipo = 'professor'::public.tipo_acesso_usuario THEN v_acesso.professor_id::text ELSE public.perfis.professor_id END;

  -- 6. Atualiza acessos_usuarios com perfil_id e data de envio
  UPDATE public.acessos_usuarios
  SET
    perfil_id = p_auth_user_id,
    status = 'convite_pendente'::public.status_acesso_usuario,
    convite_enviado_em = timezone('utc'::text, now()),
    ultimo_erro_interno = NULL
  WHERE id = p_acesso_id;

  -- 7. Registro de auditoria institucional
  INSERT INTO public.auditoria_logs (
    ator_id,
    ator_role,
    acao,
    tabela_afetada,
    registro_id,
    dados_anteriores,
    dados_novos
  )
  VALUES (
    v_acesso.convidado_por,
    'admin',
    'vincular_acesso',
    'acessos_usuarios',
    p_acesso_id,
    jsonb_build_object('status_anterior', v_acesso.status),
    jsonb_build_object(
      'tipo', v_acesso.tipo,
      'auth_user_id', p_auth_user_id,
      'aluno_id', v_acesso.aluno_id,
      'professor_id', v_acesso.professor_id,
      'role_atribuida', v_target_role,
      'status_novo', 'convite_pendente'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'acesso_id', p_acesso_id,
    'auth_user_id', p_auth_user_id,
    'role', v_target_role
  );
END;
$$;

-- Revoga execução pública e concede estritamente ao service_role
REVOKE ALL ON FUNCTION public.vincular_acesso_usuario FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vincular_acesso_usuario FROM anon;
REVOKE ALL ON FUNCTION public.vincular_acesso_usuario FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_acesso_usuario TO service_role;
