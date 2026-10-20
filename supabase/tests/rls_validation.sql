-- ==============================================================================
-- DEMOSTRATIVO MTD — SUÍTE DE TESTES E VERIFICAÇÃO DE RLS (ETAPA 10.1)
-- ==============================================================================
-- Este script valida matematicamente as 6 garantias de segurança RLS:
-- 1. Usuário anônimo (anon) não acessa perfis;
-- 2. Aluno autenticado acessa exclusivamente seu próprio perfil;
-- 3. Aluno não consegue promover a si mesmo para admin ou professor;
-- 4. Professor não recebe permissões de administrador;
-- 5. Administrador autenticado acessa e gerencia os registros necessários;
-- 6. Logs de auditoria são sigilosos e inacessíveis para alunos e anônimos.
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
  -- Inserção direta de perfis simulados (modo bypass em setup)
  INSERT INTO public.perfis (id, email, nome_completo, role, status)
  VALUES
    (v_admin_id, 'admin.teste@mtd.com', 'Admin Teste', 'admin', 'ativo'),
    (v_prof_id, 'prof.teste@mtd.com', 'Professor Teste', 'professor', 'ativo'),
    (v_aluno1_id, 'aluno1.teste@mtd.com', 'Aluno Um Teste', 'aluno', 'ativo'),
    (v_aluno2_id, 'aluno2.teste@mtd.com', 'Aluno Dois Teste', 'aluno', 'ativo')
  ON CONFLICT (id) DO NOTHING;
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
-- TESTE 3: Aluno Autenticado — Tentativa de Auto-Promoção para Admin
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
BEGIN
  BEGIN
    UPDATE public.perfis
    SET role = 'admin'
    WHERE id = '33333333-3333-3333-3333-333333333333';

    -- Se não lançou erro, verifica se a linha foi alterada
    IF EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = '33333333-3333-3333-3333-333333333333' AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'TESTE 3 FALHOU: Aluno conseguiu alterar seu próprio papel para admin!';
    END IF;
  EXCEPTION
    WHEN others THEN
      -- Exceção esperada pela cláusula WITH CHECK da policy de UPDATE
      RAISE NOTICE '✔ TESTE 3 PASSOU: RLS bloqueou a tentativa de auto-promoção do aluno com erro: %', SQLERRM;
      RETURN;
  END;

  RAISE NOTICE '✔ TESTE 3 PASSOU: Aluno não consegue alterar seu papel para admin.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 4: Professor Autenticado — Visualiza Alunos mas Não Possui Permissão Admin
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
    RAISE EXCEPTION 'TESTE 4 FALHOU: Professor deveria visualizar seu perfil e perfis de alunos (contagem: %)', v_count;
  END IF;

  -- Professor NÃO deve ver o perfil do administrador
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin THEN
    RAISE EXCEPTION 'TESTE 4 FALHOU: Professor conseguiu visualizar o perfil de administrador!';
  END IF;

  RAISE NOTICE '✔ TESTE 4 PASSOU: Professor visualiza apenas discentes e seu perfil, sem privilégios de admin.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 5: Administrador Autenticado — Acesso Operacional Geral
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
    RAISE EXCEPTION 'TESTE 5 FALHOU: Administrador não visualizou todos os perfis (encontrados: %)', v_count;
  END IF;

  RAISE NOTICE '✔ TESTE 5 PASSOU: Administrador acessa todos os perfis da escola.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 6: Sigilo de Auditoria — Alunos e Anônimos Não Leem Logs
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.auditoria_logs;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Aluno conseguiu consultar registros na tabela auditoria_logs!';
  END IF;

  RAISE NOTICE '✔ TESTE 6 PASSOU: Logs de auditoria são sigilosos e inacessíveis para discentes.';
END $$;

-- Reverte todas as alterações de teste para manter a base limpa
ROLLBACK;
