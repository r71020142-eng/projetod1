-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 8 (CORREÇÃO FINAL DE SEGURANÇA — ETAPA 10.2C1)
-- Restrição de ativar_acesso_pos_senha() exclusivamente a service_role.
--
-- Problema: A função anterior era acessível para 'authenticated', permitindo que
-- qualquer sessão autenticada (incluindo sessões de convite antes da definição de
-- senha) chamasse a RPC diretamente via PostgREST, sem que updateUser({ password })
-- tivesse sido executado de fato.
--
-- Solução: A função passa a:
-- 1. Aceitar execução somente pelo papel service_role (nunca por authenticated/anon/PUBLIC);
-- 2. Receber o UID como parâmetro p_auth_user_id UUID, passado exclusivamente pela
--    Server Action server-only após updateUser() ter sido confirmado com sucesso;
-- 3. Manter SECURITY DEFINER com search_path estrito;
-- 4. Ser idempotente, atômica e auditar em auditoria_logs.
-- ==============================================================================

-- 1. DROP OBRIGATÓRIO: Remover a versão anterior (sem parâmetro) antes de recriar
--    com assinatura diferente. O DROP precisa corresponder à assinatura exata anterior.
DROP FUNCTION IF EXISTS public.ativar_acesso_pos_senha();

-- 2. NOVA FUNÇÃO PRIVILEGIADA: ativar_acesso_pos_senha(p_auth_user_id UUID)
--    - Apenas service_role pode chamar esta função.
--    - Identifica o acesso exclusivamente pelo p_auth_user_id passado pelo servidor.
--    - Nunca aceita role, tipo ou e-mail oriundos do formulário ou da URL.
CREATE OR REPLACE FUNCTION public.ativar_acesso_pos_senha(p_auth_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_acesso RECORD;
  v_perfil RECORD;
  v_role public.user_role;
  v_status_anterior_acesso public.status_acesso_usuario;
  v_status_anterior_perfil public.profile_status;
BEGIN
  -- 1. Rejeita explicitamente UIDs nulos
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'UID inválido: o identificador do usuário não pode ser nulo.';
  END IF;

  -- 2. Proteção de integridade institucional: proíbe ativação do administrador principal
  IF p_auth_user_id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid THEN
    RAISE EXCEPTION 'Operação proibida: o administrador principal não pode ser ativado por convite.';
  END IF;

  -- 3. Confirma existência do usuário em auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_user_id) THEN
    RAISE EXCEPTION 'Usuário % não encontrado em auth.users.', p_auth_user_id;
  END IF;

  -- 4. Localiza o registro de acesso vinculado a este usuário (via perfil_id)
  SELECT * INTO v_acesso
  FROM public.acessos_usuarios
  WHERE perfil_id = p_auth_user_id
  FOR UPDATE;

  -- 5. Se não existir registro de convite, considera redefinição de senha comum
  IF NOT FOUND THEN
    SELECT role, status INTO v_role, v_status_anterior_perfil
    FROM public.perfis
    WHERE id = p_auth_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Nenhum convite pendente para ativação. Redefinição de senha concluída.',
      'role', COALESCE(v_role, 'aluno'::public.user_role),
      'tipo', 'redefinicao_comum'
    );
  END IF;

  v_status_anterior_acesso := v_acesso.status;

  -- 6. Idempotência: Já ativo significa que a ativação já ocorreu com sucesso anteriormente
  IF v_acesso.status = 'ativo'::public.status_acesso_usuario THEN
    SELECT role INTO v_role FROM public.perfis WHERE id = p_auth_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'status', 'ativo',
      'role', COALESCE(v_role, 'aluno'::public.user_role),
      'message', 'Conta já ativada anteriormente. Idempotente.',
      'tipo', 'convite_ativado'
    );
  END IF;

  -- 7. Estado inválido: convite deve estar em 'convite_pendente' para ser ativado
  IF v_acesso.status <> 'convite_pendente'::public.status_acesso_usuario THEN
    RAISE EXCEPTION
      'Estado inválido para ativação: acesso está em "%" (esperado: "convite_pendente"). Contate o administrador.',
      v_acesso.status;
  END IF;

  -- 8. Lê o perfil atual antes da ativação (para auditoria e determinação do role)
  SELECT role, status INTO v_role, v_status_anterior_perfil
  FROM public.perfis
  WHERE id = p_auth_user_id
  FOR UPDATE;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Perfil % não encontrado em public.perfis.', p_auth_user_id;
  END IF;

  -- 9. Transição atômica: acessos_usuarios → ativo
  UPDATE public.acessos_usuarios
  SET
    status          = 'ativo'::public.status_acesso_usuario,
    acesso_ativado_em = timezone('utc', now()),
    ultimo_erro_interno = NULL
  WHERE id = v_acesso.id;

  -- 10. Transição atômica: perfis → ativo
  UPDATE public.perfis
  SET status = 'ativo'::public.profile_status
  WHERE id = p_auth_user_id;

  -- 11. Auditoria institucional em public.auditoria_logs
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
    p_auth_user_id,
    v_role::text,
    'ativar_acesso_pos_senha',
    'acessos_usuarios',
    v_acesso.id::text,
    jsonb_build_object(
      'acesso_status_anterior',  v_status_anterior_acesso,
      'perfil_status_anterior',  v_status_anterior_perfil
    ),
    jsonb_build_object(
      'acesso_status_novo',  'ativo',
      'perfil_status_novo',  'ativo',
      'ativado_em',          timezone('utc', now())
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'ativo',
    'role',   v_role,
    'message', 'Acesso ativado com sucesso após definição de senha.',
    'tipo', 'convite_ativado'
  );
END;
$$;

-- 3. REVOGAÇÃO TOTAL: remove qualquer EXECUTE pré-existente de todos os papéis
--    (inclui PUBLIC, anon, authenticated, postgres).
REVOKE ALL ON FUNCTION public.ativar_acesso_pos_senha(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ativar_acesso_pos_senha(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.ativar_acesso_pos_senha(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.ativar_acesso_pos_senha(UUID) FROM postgres;

-- 4. CONCESSÃO EXCLUSIVA: apenas service_role pode executar a função
GRANT EXECUTE ON FUNCTION public.ativar_acesso_pos_senha(UUID) TO service_role;

-- 5. Verificação inline: confirma que a ACL contém exclusivamente service_role
DO $$
DECLARE
  v_acl TEXT;
BEGIN
  SELECT pg_catalog.array_to_string(p.proacl, ',')
  INTO v_acl
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'ativar_acesso_pos_senha'
    AND p.pronargs = 1;

  -- Verifica que 'authenticated' NÃO tem EXECUTE
  IF v_acl ILIKE '%authenticated=X%' THEN
    RAISE EXCEPTION
      'FALHA DE SEGURANÇA: authenticated ainda possui permissão EXECUTE em ativar_acesso_pos_senha! ACL atual: %',
      v_acl;
  END IF;

  -- Verifica que 'anon' NÃO tem EXECUTE
  IF v_acl ILIKE '%anon=X%' THEN
    RAISE EXCEPTION
      'FALHA DE SEGURANÇA: anon ainda possui permissão EXECUTE em ativar_acesso_pos_senha! ACL atual: %',
      v_acl;
  END IF;

  RAISE NOTICE 'Verificação de ACL aprovada. Permissão EXECUTE restrita a service_role. ACL: %', v_acl;
END;
$$;
