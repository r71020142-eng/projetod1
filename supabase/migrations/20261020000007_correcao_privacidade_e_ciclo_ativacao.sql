-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 7 (CORREÇÃO OBRIGATÓRIA DA ETAPA 10.2C1)
-- Privacidade de Acessos, Sanitização de Dados Sensíveis e Ciclo de Ativação Pós-Senha
-- ==============================================================================

-- 1. ADIÇÃO DE 'sem_acesso' AO ENUM status_acesso_usuario (SE NÃO EXISTIR)
DO $$ BEGIN
  ALTER TYPE public.status_acesso_usuario ADD VALUE IF NOT EXISTS 'sem_acesso' BEFORE 'processando';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. PRIVACIDADE ESTRITA DE public.acessos_usuarios
-- Remoção mandatória da política self_select_acessos que expunha colunas sensíveis (ultimo_erro_interno, convidado_por)
-- RLS no PostgreSQL filtra linhas e não colunas. Portanto, o acesso direto à tabela é exclusivo para administradores ativos.
DROP POLICY IF EXISTS self_select_acessos ON public.acessos_usuarios;

-- Garantia de que a política admin_select_acessos é a única autorizada para SELECT
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

-- Revoga explicitamente qualquer privilégio público ou anônimo
REVOKE ALL ON public.acessos_usuarios FROM PUBLIC;
REVOKE ALL ON public.acessos_usuarios FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.acessos_usuarios FROM authenticated;
GRANT SELECT ON public.acessos_usuarios TO authenticated;

-- 3. RPC SANITIZADA PARA CONSULTA DO PRÓPRIO ACESSO (SEGURO PARA O PORTAL DO USUÁRIO)
-- Retorna estritamente as colunas públicas essenciais. NUNCA expõe ultimo_erro_interno, convidado_por ou IDs internos.
CREATE OR REPLACE FUNCTION public.consultar_proprio_acesso()
RETURNS TABLE (
  tipo public.tipo_acesso_usuario,
  status public.status_acesso_usuario,
  convite_enviado_em TIMESTAMPTZ,
  acesso_ativado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Requer que o usuário esteja autenticado
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.tipo,
    a.status,
    a.convite_enviado_em,
    a.acesso_ativado_em
  FROM public.acessos_usuarios a
  WHERE a.perfil_id = auth.uid();
END;
$$;

-- Concede execução segura da RPC apenas para usuários autenticados
REVOKE ALL ON FUNCTION public.consultar_proprio_acesso() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consultar_proprio_acesso() FROM anon;
GRANT EXECUTE ON FUNCTION public.consultar_proprio_acesso() TO authenticated;

-- 4. CORREÇÃO DA FUNÇÃO TRANSACIONAL vincular_acesso_usuario
-- Regra mandatória: O perfil deve nascer como 'inativo' e a conta como 'convite_pendente'.
-- O usuário convidado NÃO PODE ter perfil ativo antes de definir a própria senha.
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
  -- 1. Proteção de integridade institucional (Ray Pires e administradores intocáveis)
  IF p_auth_user_id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid THEN
    RAISE EXCEPTION 'Operação inválida: O administrador principal não pode ser vinculado via convite.';
  END IF;

  -- 2. Localiza e bloqueia o registro de acesso para atualização
  SELECT * INTO v_acesso
  FROM public.acessos_usuarios
  WHERE id = p_acesso_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de acesso % não encontrado.', p_acesso_id;
  END IF;

  -- 3. Localiza e valida o usuário em auth.users
  SELECT lower(trim(email)) INTO v_user_email
  FROM auth.users
  WHERE id = p_auth_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário Auth % não encontrado.', p_auth_user_id;
  END IF;

  -- 4. Confirma se os e-mails conferem exatamente
  IF v_user_email <> v_acesso.email_normalizado THEN
    RAISE EXCEPTION 'Divergência de identidade: e-mail Auth (%) diferente do cadastro operacional (%).',
      v_user_email, v_acesso.email_normalizado;
  END IF;

  -- 5. Processamento conforme o tipo de cadastro
  IF v_acesso.tipo = 'aluno'::public.tipo_acesso_usuario THEN
    v_target_role := 'aluno'::public.user_role;

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

  -- 6. Cria ou atualiza o perfil em menor privilégio ('inativo' e role inferida)
  -- NUNCA ativa o perfil neste momento! Permanece inativo até a definição de senha.
  INSERT INTO public.perfis (id, email, nome_completo, role, status, aluno_id, professor_id)
  VALUES (
    p_auth_user_id,
    v_user_email,
    v_nome_operacional,
    v_target_role,
    'inativo'::public.profile_status,
    CASE WHEN v_acesso.tipo = 'aluno'::public.tipo_acesso_usuario THEN v_acesso.aluno_id::text ELSE NULL END,
    CASE WHEN v_acesso.tipo = 'professor'::public.tipo_acesso_usuario THEN v_acesso.professor_id::text ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = v_target_role,
    status = 'inativo'::public.profile_status,
    email = v_user_email,
    nome_completo = v_nome_operacional,
    aluno_id = CASE WHEN v_acesso.tipo = 'aluno'::public.tipo_acesso_usuario THEN v_acesso.aluno_id::text ELSE public.perfis.aluno_id END,
    professor_id = CASE WHEN v_acesso.tipo = 'professor'::public.tipo_acesso_usuario THEN v_acesso.professor_id::text ELSE public.perfis.professor_id END;

  -- 7. Atualiza acessos_usuarios com perfil_id e status convite_pendente
  UPDATE public.acessos_usuarios
  SET
    perfil_id = p_auth_user_id,
    status = 'convite_pendente'::public.status_acesso_usuario,
    convite_enviado_em = timezone('utc'::text, now()),
    ultimo_erro_interno = NULL
  WHERE id = p_acesso_id;

  -- 8. Registro de auditoria institucional
  INSERT INTO public.auditoria_logs (
    ator_id,
    ator_role,
    acao,
    entidade,
    identificador_entidade,
    valores_anteriores,
    valores_posteriores
  )
  VALUES (
    v_acesso.convidado_por,
    'admin',
    'vincular_acesso_inativo',
    'acessos_usuarios',
    p_acesso_id::text,
    jsonb_build_object('status_anterior', v_acesso.status),
    jsonb_build_object(
      'tipo', v_acesso.tipo,
      'auth_user_id', p_auth_user_id,
      'aluno_id', v_acesso.aluno_id,
      'professor_id', v_acesso.professor_id,
      'role_atribuida', v_target_role,
      'perfil_status', 'inativo',
      'acesso_status', 'convite_pendente'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'acesso_id', p_acesso_id,
    'auth_user_id', p_auth_user_id,
    'role', v_target_role,
    'status', 'convite_pendente'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.vincular_acesso_usuario FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vincular_acesso_usuario FROM anon;
REVOKE ALL ON FUNCTION public.vincular_acesso_usuario FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_acesso_usuario TO service_role;

-- 5. RPC DE ATIVAÇÃO PÓS-DEFINIÇÃO DE SENHA (ativar_acesso_pos_senha)
-- Executada pelo próprio usuário autenticado logo após definir a senha no fluxo PKCE.
-- Identifica o usuário estritamente por auth.uid().
CREATE OR REPLACE FUNCTION public.ativar_acesso_pos_senha()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_acesso RECORD;
  v_role public.user_role;
  v_status_anterior public.status_acesso_usuario;
BEGIN
  -- 1. Identifica o usuário estritamente pela sessão autenticada (auth.uid())
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso não autenticado. Operação negada.';
  END IF;

  -- 2. Localiza o registro de acesso vinculado a este perfil
  SELECT * INTO v_acesso
  FROM public.acessos_usuarios
  WHERE perfil_id = v_user_id
  FOR UPDATE;

  -- Se não existir registro de acesso, busca apenas o perfil do usuário
  IF NOT FOUND THEN
    SELECT role INTO v_role
    FROM public.perfis
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Nenhum convite pendente para ativação.',
      'role', COALESCE(v_role, 'aluno'::public.user_role)
    );
  END IF;

  v_status_anterior := v_acesso.status;

  -- 3. Idempotência: Se já estiver ativo, retorna com sucesso
  IF v_acesso.status = 'ativo'::public.status_acesso_usuario THEN
    SELECT role INTO v_role
    FROM public.perfis
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'ativo',
      'role', COALESCE(v_role, 'aluno'::public.user_role),
      'message', 'Conta já ativada anteriormente.'
    );
  END IF;

  -- 4. Validação do estado atual: só pode ativar se estiver em 'convite_pendente'
  IF v_acesso.status <> 'convite_pendente'::public.status_acesso_usuario THEN
    RAISE EXCEPTION 'Status inválido para ativação: % (esperado: convite_pendente).', v_acesso.status;
  END IF;

  -- 5. Transição atômica para ativo em acessos_usuarios
  UPDATE public.acessos_usuarios
  SET
    status = 'ativo'::public.status_acesso_usuario,
    acesso_ativado_em = timezone('utc'::text, now()),
    ultimo_erro_interno = NULL
  WHERE id = v_acesso.id;

  -- 6. Ativa o perfil correspondente em public.perfis
  UPDATE public.perfis
  SET
    status = 'ativo'::public.profile_status
  WHERE id = v_user_id
  RETURNING role INTO v_role;

  -- 7. Registro de auditoria institucional
  INSERT INTO public.auditoria_logs (
    ator_id,
    ator_role,
    acao,
    entidade,
    identificador_entidade,
    valores_anteriores,
    valores_posteriores
  )
  VALUES (
    v_user_id,
    COALESCE(v_role::text, 'aluno'),
    'ativar_acesso_pos_senha',
    'acessos_usuarios',
    v_acesso.id::text,
    jsonb_build_object('status_anterior', v_status_anterior, 'perfil_status_anterior', 'inativo'),
    jsonb_build_object('status_novo', 'ativo', 'perfil_status_novo', 'ativo', 'ativado_em', timezone('utc'::text, now()))
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'ativo',
    'role', v_role,
    'message', 'Acesso ativado com sucesso após definição de senha.'
  );
END;
$$;

-- Permissões estritas: revoga de anon e public, concede apenas a authenticated
REVOKE ALL ON FUNCTION public.ativar_acesso_pos_senha() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ativar_acesso_pos_senha() FROM anon;
GRANT EXECUTE ON FUNCTION public.ativar_acesso_pos_senha() TO authenticated;
