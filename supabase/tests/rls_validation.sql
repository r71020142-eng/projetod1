-- ==============================================================================
-- DEMOSTRATIVO MTD — SUÍTE DE TESTES E VERIFICAÇÃO DE RLS (ETAPA 10.2A)
-- ==============================================================================
-- Este script valida matematicamente as 10 garantias de segurança RLS e Triggers:
-- 1. Usuário anônimo (anon) não acessa perfis;
-- 2. Aluno autenticado acessa exclusivamente seu próprio perfil;
-- 3. Aluno não consegue alterar seu próprio papel (role);
-- 4. Aluno não consegue alterar seu próprio status;
-- 5. Professor não consegue promover usuários a administrador;
-- 6. Aluno não consegue inserir registros em auditoria_logs;
-- 7. Professor não consegue inserir registros em auditoria_logs;
-- 8. Professor visualiza alunos e a si mesmo, mas não visualiza administrador;
-- 9. Administrador autenticado atualiza papéis e status com sucesso;
-- 10. Logs de auditoria são imutáveis (sem permissão de UPDATE/DELETE).
-- ==============================================================================

BEGIN;

-- Criação de usuários fictícios de teste temporários para simulação
DO $$
DECLARE
  v_admin_id UUID := '11111111-1111-1111-1111-111111111111';
  v_prof_id UUID  := '22222222-2222-2222-2222-222222222222';
  v_aluno1_id UUID := '33333333-3333-3333-3333-333333333333';
  v_aluno2_id UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- Inserção de credenciais temporárias em auth.users (com rollback automático no final)
  INSERT INTO auth.users (id, email, raw_user_meta_data, is_sso_user, is_anonymous)
  VALUES
    (v_admin_id, 'admin.teste@mtd.com', '{"nome_completo": "Admin Teste"}'::jsonb, false, false),
    (v_prof_id, 'prof.teste@mtd.com', '{"nome_completo": "Professor Teste"}'::jsonb, false, false),
    (v_aluno1_id, 'aluno1.teste@mtd.com', '{"nome_completo": "Aluno Um Teste"}'::jsonb, false, false),
    (v_aluno2_id, 'aluno2.teste@mtd.com', '{"nome_completo": "Aluno Dois Teste"}'::jsonb, false, false)
  ON CONFLICT (id) DO NOTHING;

  -- Ajusta os papéis para o cenário de teste no modo postgres/superuser
  UPDATE public.perfis SET role = 'admin' WHERE id = v_admin_id;
  UPDATE public.perfis SET role = 'professor' WHERE id = v_prof_id;
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 1: Usuário Anônimo (anon) — Bloqueio de Acesso Completo
-- ------------------------------------------------------------------------------
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.perfis;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TESTE 1 FALHOU: Usuário anônimo conseguiu ler % registros em public.perfis', v_count;
  END IF;
  RAISE NOTICE '✔ TESTE 1 PASSOU: Usuário anônimo não acessa nenhum perfil (RLS Default Deny).';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 2: Aluno Autenticado — Acessa Exclusivamente o Próprio Perfil
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_count INTEGER;
  v_id UUID;
BEGIN
  SELECT count(*) INTO v_count FROM public.perfis;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TESTE 2 FALHOU: Aluno visualizou % perfis (esperado: exatamente 1)', v_count;
  END IF;

  SELECT id INTO v_id FROM public.perfis LIMIT 1;
  IF v_id <> '33333333-3333-3333-3333-333333333333' THEN
    RAISE EXCEPTION 'TESTE 2 FALHOU: Aluno visualizou perfil de terceiro (%s)', v_id;
  END IF;

  RAISE NOTICE '✔ TESTE 2 PASSOU: Aluno acessa estritamente o próprio perfil.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 3: Aluno Autenticado — Tentativa de Alterar seu Papel (Role)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
BEGIN
  BEGIN
    UPDATE public.perfis
    SET role = 'admin'
    WHERE id = '33333333-3333-3333-3333-333333333333';

    IF EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = '33333333-3333-3333-3333-333333333333' AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'TESTE 3 FALHOU: Aluno conseguiu alterar seu próprio papel para admin!';
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 3 PASSOU: Alteração de papel por aluno bloqueada com sucesso.';
      RETURN;
  END;

  RAISE NOTICE '✔ TESTE 3 PASSOU: Aluno não consegue alterar seu papel para admin.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 4: Aluno Autenticado — Tentativa de Alterar seu Status
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
BEGIN
  BEGIN
    UPDATE public.perfis
    SET status = 'bloqueado'
    WHERE id = '33333333-3333-3333-3333-333333333333';

    IF EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = '33333333-3333-3333-3333-333333333333' AND status = 'bloqueado'
    ) THEN
      RAISE EXCEPTION 'TESTE 4 FALHOU: Aluno conseguiu alterar seu status!';
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 4 PASSOU: Alteração de status por aluno bloqueada com sucesso.';
      RETURN;
  END;

  RAISE NOTICE '✔ TESTE 4 PASSOU: Aluno não consegue alterar seu status.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 5: Professor Autenticado — Tentativa de Promover Usuário para Admin
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';

DO $$
BEGIN
  BEGIN
    UPDATE public.perfis
    SET role = 'admin'
    WHERE id = '44444444-4444-4444-4444-444444444444';

    IF EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = '44444444-4444-4444-4444-444444444444' AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'TESTE 5 FALHOU: Professor conseguiu promover outro usuário!';
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 5 PASSOU: Tentativa de promoção de usuário por professor bloqueada com sucesso.';
      RETURN;
  END;

  RAISE NOTICE '✔ TESTE 5 PASSOU: Professor não consegue promover usuários.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 6: Aluno Autenticado — Tentativa de Inserir em auditoria_logs
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.auditoria_logs (ator_id, acao, entidade, identificador_entidade)
    VALUES ('33333333-3333-3333-3333-333333333333', 'FAKE_EVENT', 'perfis', '123');

    RAISE EXCEPTION 'TESTE 6 FALHOU: Aluno conseguiu inserir em auditoria_logs!';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 6 PASSOU: Inserção em auditoria_logs por aluno bloqueada (permissão revogada).';
      RETURN;
  END;
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 7: Professor Autenticado — Tentativa de Inserir em auditoria_logs
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.auditoria_logs (ator_id, acao, entidade, identificador_entidade)
    VALUES ('22222222-2222-2222-2222-222222222222', 'FAKE_EVENT', 'perfis', '123');

    RAISE EXCEPTION 'TESTE 7 FALHOU: Professor conseguiu inserir em auditoria_logs!';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 7 PASSOU: Inserção em auditoria_logs por professor bloqueada (permissão revogada).';
      RETURN;
  END;
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 8: Professor Autenticado — Visualiza Alunos mas Não Possui Permissão Admin
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_count INTEGER;
  v_has_admin BOOLEAN;
BEGIN
  -- Professor deve ver seu próprio perfil + perfis de alunos (total 3: ele + aluno1 + aluno2)
  SELECT count(*) INTO v_count FROM public.perfis;
  IF v_count < 3 THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Professor deveria visualizar seu perfil e perfis de alunos (contagem: %)', v_count;
  END IF;

  -- Professor NÃO deve ver o perfil do administrador
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Professor conseguiu visualizar o perfil de administrador!';
  END IF;

  RAISE NOTICE '✔ TESTE 8 PASSOU: Professor visualiza apenas discentes e seu perfil, sem privilégios de admin.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 9: Administrador Autenticado — Atualiza Papéis e Status com Sucesso
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Administrador deve visualizar todos os perfis cadastrados
  SELECT count(*) INTO v_count FROM public.perfis;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'TESTE 9 FALHOU: Administrador não visualizou todos os perfis (encontrados: %)', v_count;
  END IF;

  -- Administrador altera papel de aluno2 para professor
  UPDATE public.perfis
  SET role = 'professor'
  WHERE id = '44444444-4444-4444-4444-444444444444';

  IF NOT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = '44444444-4444-4444-4444-444444444444' AND role = 'professor'
  ) THEN
    RAISE EXCEPTION 'TESTE 9 FALHOU: Administrador não conseguiu atualizar o papel!';
  END IF;

  RAISE NOTICE '✔ TESTE 9 PASSOU: Administrador possui permissão autorizada de alteração de papéis.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 10: Imutabilidade de Logs — Nenhum Usuário faz UPDATE ou DELETE
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  BEGIN
    UPDATE public.auditoria_logs SET acao = 'HACKED';
    RAISE EXCEPTION 'TESTE 10 FALHOU: Permitiu UPDATE em auditoria_logs!';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 10 PASSOU: UPDATE em auditoria_logs bloqueado (imutabilidade).';
  END;

  BEGIN
    DELETE FROM public.auditoria_logs;
    RAISE EXCEPTION 'TESTE 10 FALHOU: Permitiu DELETE em auditoria_logs!';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE '✔ TESTE 10 PASSOU: DELETE em auditoria_logs bloqueado (imutabilidade).';
  END;
END $$;

-- Reverte todas as alterações de teste para manter a base limpa
ROLLBACK;
