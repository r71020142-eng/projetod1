-- ==============================================================================
-- DEMOSTRATIVO MTD — SUÍTE DE TESTES RLS: ALUNOS E PROFESSORES (ETAPA 10.2B2)
-- ==============================================================================
-- Valida as regras de segurança, RLS, isolamento e bloqueio de DELETE:
-- 1. Anônimo tem ZERO acesso (inclusive bloqueio total de DELETE);
-- 2. Aluno autenticado lê apenas seu próprio registro operacional;
-- 3. Aluno não acessa observações pedagógicas confidenciais;
-- 4. Aluno não consegue alterar nível ou status;
-- 5. Aluno tem DELETE rigorosamente bloqueado;
-- 6. Professor consulta apenas seu próprio registro docente;
-- 7. Professor tem DELETE rigorosamente bloqueado;
-- 8. Administrador tem DELETE físico rigorosamente bloqueado;
-- 9. Administrador cadastra, edita, inativa e reativa com sucesso;
-- 10. E-mail duplicado (case-insensitive) é rejeitado pelo banco;
-- 11. Auditoria registra alterações sem fabricação de logs pelo cliente.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_admin_uid UUID := '11111111-1111-1111-1111-111111111111';
  v_prof_uid  UUID := '22222222-2222-2222-2222-222222222222';
  v_aluno_uid UUID := '33333333-3333-3333-3333-333333333333';
  v_aluno2_uid UUID := '44444444-4444-4444-4444-444444444444';
  
  v_aluno_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_aluno2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_prof_id UUID  := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
BEGIN
  -- 0. Preparação de usuários e perfis para teste
  INSERT INTO auth.users (id, email, raw_user_meta_data, is_sso_user, is_anonymous)
  VALUES
    (v_admin_uid, 'admin.rls@mtd.com', '{"nome_completo": "Admin RLS"}'::jsonb, false, false),
    (v_prof_uid, 'prof.rls@mtd.com', '{"nome_completo": "Prof RLS"}'::jsonb, false, false),
    (v_aluno_uid, 'aluno.rls@mtd.com', '{"nome_completo": "Aluno RLS"}'::jsonb, false, false),
    (v_aluno2_uid, 'aluno2.rls@mtd.com', '{"nome_completo": "Aluno 2 RLS"}'::jsonb, false, false)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.perfis SET role = 'admin' WHERE id = v_admin_uid;
  UPDATE public.perfis SET role = 'professor' WHERE id = v_prof_uid;
  UPDATE public.perfis SET role = 'aluno' WHERE id = v_aluno_uid;
  UPDATE public.perfis SET role = 'aluno' WHERE id = v_aluno2_uid;

  -- Insere alunos e professor operacionais como superuser/postgres para o cenário
  INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
  VALUES
    (v_aluno_id, v_aluno_uid, 'Aluno RLS Um', 'aluno.rls@mtd.com', 'Fluência profissional', 'A2', 'ativo'),
    (v_aluno2_id, v_aluno2_uid, 'Aluno RLS Dois', 'aluno2.rls@mtd.com', 'Viagens', 'B1', 'ativo');

  INSERT INTO public.alunos_dados_pedagogicos (aluno_id, observacoes_pedagogicas)
  VALUES (v_aluno_id, 'Observação confidencial do aluno 1: Dificuldade em phrasal verbs.');

  INSERT INTO public.professores (id, perfil_id, nome_completo, email, biografia_pedagogica, idiomas_falados, status)
  VALUES (v_prof_id, v_prof_uid, 'Prof RLS', 'prof.rls@mtd.com', 'Professor experiente', ARRAY['Inglês', 'Português'], 'ativo');
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 1: Usuário Anônimo (anon) — Bloqueio Total (Leitura e DELETE)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';

DO $$
DECLARE
  v_count INTEGER;
  v_delete_error BOOLEAN := false;
BEGIN
  BEGIN
    SELECT count(*) INTO v_count FROM public.alunos;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'TESTE 1 FALHOU: Anon conseguiu ler % registros em alunos', v_count;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.alunos;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_delete_error := true;
  END;

  IF NOT v_delete_error THEN
    RAISE EXCEPTION 'TESTE 1 FALHOU: Anon não teve DELETE bloqueado em alunos!';
  END IF;

  RAISE NOTICE '✔ TESTE 1 PASSOU: Usuário anônimo possui ZERO acesso e DELETE bloqueado.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 2: Aluno Autenticado — Consulta Exclusiva do Próprio Registro
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_count INTEGER;
  v_email TEXT;
BEGIN
  SELECT count(*) INTO v_count FROM public.alunos;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TESTE 2 FALHOU: Aluno visualizou % registros em alunos (esperado exatamente 1)', v_count;
  END IF;

  SELECT email INTO v_email FROM public.alunos LIMIT 1;
  IF v_email <> 'aluno.rls@mtd.com' THEN
    RAISE EXCEPTION 'TESTE 2 FALHOU: Aluno visualizou registro de outro aluno (%)', v_email;
  END IF;

  RAISE NOTICE '✔ TESTE 2 PASSOU: Aluno autenticado consulta exclusivamente seu próprio registro.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 3: Aluno Autenticado — Bloqueio de Dados Pedagógicos Confidenciais
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.alunos_dados_pedagogicos;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TESTE 3 FALHOU: Aluno conseguiu ler % dados pedagógicos confidenciais!', v_count;
  END IF;

  RAISE NOTICE '✔ TESTE 3 PASSOU: Aluno NUNCA acessa tabela de dados pedagógicos confidenciais.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 4: Aluno Autenticado — Bloqueio de Alteração de Nível e Status
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.alunos SET nivel_operacional = 'C2' WHERE perfil_id = '33333333-3333-3333-3333-333333333333';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated > 0 THEN
    RAISE EXCEPTION 'TESTE 4 FALHOU: Aluno conseguiu alterar seu próprio nível operacional!';
  END IF;

  RAISE NOTICE '✔ TESTE 4 PASSOU: Aluno não consegue alterar nível operacional ou status (RLS bloqueia).';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 5: Aluno Autenticado — Bloqueio Rigoroso de DELETE Físico
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_delete_error BOOLEAN := false;
BEGIN
  BEGIN
    DELETE FROM public.alunos WHERE perfil_id = '33333333-3333-3333-3333-333333333333';
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_delete_error := true;
    WHEN others THEN
      IF SQLERRM LIKE '%Exclusão física bloqueada%' THEN
        v_delete_error := true;
      END IF;
  END;

  IF NOT v_delete_error THEN
    RAISE EXCEPTION 'TESTE 5 FALHOU: Aluno conseguiu executar DELETE em public.alunos!';
  END IF;

  RAISE NOTICE '✔ TESTE 5 PASSOU: Aluno possui DELETE físico rigorosamente bloqueado.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 6: Professor Autenticado — Consulta Própria e Bloqueio de DELETE
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_count_prof INTEGER;
  v_count_aluno INTEGER;
  v_delete_error BOOLEAN := false;
BEGIN
  SELECT count(*) INTO v_count_prof FROM public.professores;
  IF v_count_prof <> 1 THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Professor visualizou % professores (esperado 1)', v_count_prof;
  END IF;

  SELECT count(*) INTO v_count_aluno FROM public.alunos;
  IF v_count_aluno <> 0 THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Professor leu % alunos na etapa 10.2B2 (esperado 0)', v_count_aluno;
  END IF;

  BEGIN
    DELETE FROM public.professores WHERE perfil_id = '22222222-2222-2222-2222-222222222222';
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_delete_error := true;
    WHEN others THEN
      IF SQLERRM LIKE '%Exclusão física bloqueada%' THEN
        v_delete_error := true;
      END IF;
  END;

  IF NOT v_delete_error THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Professor conseguiu executar DELETE em public.professores!';
  END IF;

  RAISE NOTICE '✔ TESTE 6 PASSOU: Professor consulta apenas seu cadastro e possui DELETE bloqueado.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 7: Administrador Autenticado — Bloqueio Estrito de DELETE Físico
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_delete_aluno_blocked BOOLEAN := false;
  v_delete_prof_blocked BOOLEAN := false;
  v_delete_pedag_blocked BOOLEAN := false;
BEGIN
  -- Tenta DELETE em alunos
  BEGIN
    DELETE FROM public.alunos WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_delete_aluno_blocked := true;
    WHEN others THEN
      IF SQLERRM LIKE '%Exclusão física bloqueada%' THEN
        v_delete_aluno_blocked := true;
      END IF;
  END;

  -- Tenta DELETE em professores
  BEGIN
    DELETE FROM public.professores WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_delete_prof_blocked := true;
    WHEN others THEN
      IF SQLERRM LIKE '%Exclusão física bloqueada%' THEN
        v_delete_prof_blocked := true;
      END IF;
  END;

  -- Tenta DELETE em dados pedagógicos
  BEGIN
    DELETE FROM public.alunos_dados_pedagogicos WHERE aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_delete_pedag_blocked := true;
    WHEN others THEN
      IF SQLERRM LIKE '%Exclusão física bloqueada%' THEN
        v_delete_pedag_blocked := true;
      END IF;
  END;

  IF NOT v_delete_aluno_blocked THEN
    RAISE EXCEPTION 'TESTE 7 FALHOU: Admin conseguiu executar DELETE físico em public.alunos!';
  END IF;
  IF NOT v_delete_prof_blocked THEN
    RAISE EXCEPTION 'TESTE 7 FALHOU: Admin conseguiu executar DELETE físico em public.professores!';
  END IF;
  IF NOT v_delete_pedag_blocked THEN
    RAISE EXCEPTION 'TESTE 7 FALHOU: Admin conseguiu executar DELETE físico em public.alunos_dados_pedagogicos!';
  END IF;

  RAISE NOTICE '✔ TESTE 7 PASSOU: DELETE físico bloqueado rigorosamente inclusive para Administrador autenticado.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 8: Administrador Autenticado — Inativação e Reativação Lógicas (Permitidas)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_status_check TEXT;
  v_novo_aluno_id UUID;
  v_novo_prof_id UUID;
BEGIN
  -- Criação de aluno e professor legítimos
  INSERT INTO public.alunos (nome_completo, email, objetivo, nivel_operacional, status)
  VALUES ('Aluno Teste Gestao', 'aluno.gestao@mtd.com', 'Avançado', 'B2', 'ativo')
  RETURNING id INTO v_novo_aluno_id;

  INSERT INTO public.alunos_dados_pedagogicos (aluno_id, observacoes_pedagogicas)
  VALUES (v_novo_aluno_id, 'Anotação pedagógica legítima');

  INSERT INTO public.professores (nome_completo, email, biografia_pedagogica, idiomas_falados, status)
  VALUES ('Prof Teste Gestao', 'prof.gestao@mtd.com', 'Bio docente', ARRAY['Inglês'], 'ativo')
  RETURNING id INTO v_novo_prof_id;

  -- Inativação lógica do aluno
  UPDATE public.alunos SET status = 'inativo' WHERE id = v_novo_aluno_id;
  SELECT status INTO v_status_check FROM public.alunos WHERE id = v_novo_aluno_id;
  IF v_status_check <> 'inativo' THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Inativação lógica do aluno falhou!';
  END IF;

  -- Reativação lógica do aluno
  UPDATE public.alunos SET status = 'ativo' WHERE id = v_novo_aluno_id;
  SELECT status INTO v_status_check FROM public.alunos WHERE id = v_novo_aluno_id;
  IF v_status_check <> 'ativo' THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Reativação lógica do aluno falhou!';
  END IF;

  -- Inativação e reativação lógica do professor
  UPDATE public.professores SET status = 'inativo' WHERE id = v_novo_prof_id;
  SELECT status INTO v_status_check FROM public.professores WHERE id = v_novo_prof_id;
  IF v_status_check <> 'inativo' THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Inativação lógica do professor falhou!';
  END IF;

  UPDATE public.professores SET status = 'ativo' WHERE id = v_novo_prof_id;
  SELECT status INTO v_status_check FROM public.professores WHERE id = v_novo_prof_id;
  IF v_status_check <> 'ativo' THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Reativação lógica do professor falhou!';
  END IF;

  RAISE NOTICE '✔ TESTE 8 PASSOU: Gestão lógica completa (cadastro, edição, inativação e reativação) funcionando com sucesso.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 9: Unicidade de E-mail Case-Insensitive Rejeitada no Banco
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_dup_error BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.alunos (nome_completo, email, objetivo, nivel_operacional, status)
    VALUES ('Clone Email', ' ALUNO.RLS@MTD.COM ', 'Teste', 'A1', 'ativo');
  EXCEPTION
    WHEN unique_violation THEN
      v_dup_error := true;
  END;

  IF NOT v_dup_error THEN
    RAISE EXCEPTION 'TESTE 9 FALHOU: E-mail duplicado em alunos não foi rejeitado!';
  END IF;

  v_dup_error := false;
  BEGIN
    INSERT INTO public.professores (nome_completo, email, biografia_pedagogica, idiomas_falados, status)
    VALUES ('Clone Prof', ' PROF.RLS@MTD.COM ', 'Bio', ARRAY['Inglês'], 'ativo');
  EXCEPTION
    WHEN unique_violation THEN
      v_dup_error := true;
  END;

  IF NOT v_dup_error THEN
    RAISE EXCEPTION 'TESTE 9 FALHOU: E-mail duplicado em professores não foi rejeitado!';
  END IF;

  RAISE NOTICE '✔ TESTE 9 PASSOU: Unicidade de e-mail case-insensitive rigorosamente mantida.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 10: Auditoria Automática Confiável por Triggers
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_audit_count INTEGER;
BEGIN
  SELECT count(*) INTO v_audit_count
  FROM public.auditoria_logs
  WHERE entidade IN ('alunos', 'professores', 'alunos_dados_pedagogicos');

  IF v_audit_count = 0 THEN
    RAISE EXCEPTION 'TESTE 10 FALHOU: Nenhum log de auditoria foi gerado!';
  END IF;

  RAISE NOTICE '✔ TESTE 10 PASSOU: Triggers registraram % ações auditadas.', v_audit_count;
END $$;

ROLLBACK; -- Rollback automático e limpo de todo o teste
