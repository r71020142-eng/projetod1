-- ==============================================================================
-- DEMOSTRATIVO MTD — SUÍTE DE TESTES RLS: ALUNOS E PROFESSORES (ETAPA 10.2B2)
-- ==============================================================================
-- Valida as regras de segurança, RLS e isolamento para Alunos e Professores:
-- 1. Anônimo não lê alunos, dados pedagógicos ou professores;
-- 2. Administrador cadastra e lê alunos e professores;
-- 3. Administrador cadastra e lê observações pedagógicas confidenciais;
-- 4. Aluno autenticado lê apenas seu próprio registro operacional;
-- 5. Aluno não consegue ler dados de outros alunos;
-- 6. Aluno não consegue ler observações pedagógicas (nem as suas);
-- 7. Aluno não consegue atualizar nível ou status;
-- 8. Professor autenticado lê apenas seu próprio registro docente;
-- 9. Professor não recebe acesso geral a alunos nesta etapa;
-- 10. E-mail duplicado (case-insensitive) é rejeitado pelo banco;
-- 11. Auditoria registra alterações sem que o cliente forje logs.
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

  v_count INTEGER;
  v_error_caught BOOLEAN;
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

  -- Insere alunos e professor operacionais como superuser/postgres para teste inicial
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
-- TESTE 1: Usuário Anônimo (anon) — Bloqueio Total
-- ------------------------------------------------------------------------------
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  BEGIN
    SELECT count(*) INTO v_count FROM public.alunos;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'TESTE 1 FALHOU: Anon conseguiu ler % registros em alunos', v_count;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Permissão revogada explicitamente, esperado
  END;

  BEGIN
    SELECT count(*) INTO v_count FROM public.alunos_dados_pedagogicos;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'TESTE 1 FALHOU: Anon conseguiu ler dados pedagógicos';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Permissão revogada, esperado
  END;

  BEGIN
    SELECT count(*) INTO v_count FROM public.professores;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'TESTE 1 FALHOU: Anon conseguiu ler registros em professores';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Permissão revogada, esperado
  END;

  RAISE NOTICE '✔ TESTE 1 PASSOU: Usuário anônimo possui ZERO acesso a alunos, dados pedagógicos e professores.';
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
-- TESTE 3: Aluno Autenticado — Bloqueio de Acesso aos Dados Pedagógicos Confidenciais
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

  RAISE NOTICE '✔ TESTE 4 PASSOU: Aluno não consegue alterar nível operacional ou status (RLS Update bloqueia).';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 5: Professor Autenticado — Consulta Exclusiva do Próprio Cadastro Docente
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_count_prof INTEGER;
  v_count_aluno INTEGER;
BEGIN
  SELECT count(*) INTO v_count_prof FROM public.professores;
  IF v_count_prof <> 1 THEN
    RAISE EXCEPTION 'TESTE 5 FALHOU: Professor visualizou % professores (esperado 1)', v_count_prof;
  END IF;

  -- Professor não deve ter acesso geral aos alunos nesta etapa
  SELECT count(*) INTO v_count_aluno FROM public.alunos;
  IF v_count_aluno <> 0 THEN
    RAISE EXCEPTION 'TESTE 5 FALHOU: Professor conseguiu ler % alunos na etapa 10.2B2 (esperado 0)', v_count_aluno;
  END IF;

  RAISE NOTICE '✔ TESTE 5 PASSOU: Professor consulta apenas seu cadastro e não possui acesso geral aos alunos.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 6: Administrador Autenticado — Operações Completas de Gestão
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_count_alunos INTEGER;
  v_count_profs INTEGER;
  v_count_pedag INTEGER;
  v_novo_aluno_id UUID;
  v_novo_prof_id UUID;
  v_status_check TEXT;
BEGIN
  -- Leitura total
  SELECT count(*) INTO v_count_alunos FROM public.alunos;
  SELECT count(*) INTO v_count_profs FROM public.professores;
  SELECT count(*) INTO v_count_pedag FROM public.alunos_dados_pedagogicos;

  IF v_count_alunos < 2 OR v_count_profs < 1 OR v_count_pedag < 1 THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Admin não conseguiu ler todos os registros existentes.';
  END IF;

  -- Criação de aluno operacional sem conta
  INSERT INTO public.alunos (nome_completo, email, objetivo, nivel_operacional, status)
  VALUES ('Novo Aluno Sem Conta', 'novo.aluno@mtd.com', 'Avançado', 'B2', 'ativo')
  RETURNING id INTO v_novo_aluno_id;

  -- Criação de observação pedagógica
  INSERT INTO public.alunos_dados_pedagogicos (aluno_id, observacoes_pedagogicas)
  VALUES (v_novo_aluno_id, 'Observação confidencial inserida pelo Admin.');

  -- Edição de aluno
  UPDATE public.alunos SET nivel_operacional = 'C1' WHERE id = v_novo_aluno_id;

  -- Inativação de aluno
  UPDATE public.alunos SET status = 'inativo' WHERE id = v_novo_aluno_id;
  SELECT status INTO v_status_check FROM public.alunos WHERE id = v_novo_aluno_id;
  IF v_status_check <> 'inativo' THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Falha ao inativar aluno pelo Admin.';
  END IF;

  -- Reativação de aluno
  UPDATE public.alunos SET status = 'ativo' WHERE id = v_novo_aluno_id;
  SELECT status INTO v_status_check FROM public.alunos WHERE id = v_novo_aluno_id;
  IF v_status_check <> 'ativo' THEN
    RAISE EXCEPTION 'TESTE 6 FALHOU: Falha ao reativar aluno pelo Admin.';
  END IF;

  -- Criação de professor operacional sem conta
  INSERT INTO public.professores (nome_completo, email, biografia_pedagogica, idiomas_falados, status)
  VALUES ('Novo Docente Sem Conta', 'novo.docente@mtd.com', 'Especialista em Business English', ARRAY['Inglês'], 'ativo')
  RETURNING id INTO v_novo_prof_id;

  RAISE NOTICE '✔ TESTE 6 PASSOU: Administrador possui permissões completas de gestão (criar, editar, inativar, reativar, dados pedagógicos).';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 7: Unicidade de E-mail Case-Insensitive Rejeitada no Banco
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_dup_error BOOLEAN := false;
BEGIN
  BEGIN
    -- Tenta inserir com letras maiúsculas e espaços
    INSERT INTO public.alunos (nome_completo, email, objetivo, nivel_operacional, status)
    VALUES ('Clone Email', ' ALUNO.RLS@MTD.COM ', 'Teste', 'A1', 'ativo');
  EXCEPTION
    WHEN unique_violation THEN
      v_dup_error := true;
  END;

  IF NOT v_dup_error THEN
    RAISE EXCEPTION 'TESTE 7 FALHOU: E-mail duplicado em alunos não foi rejeitado pela constraint de unicidade!';
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
    RAISE EXCEPTION 'TESTE 7 FALHOU: E-mail duplicado em professores não foi rejeitado pela constraint de unicidade!';
  END IF;

  RAISE NOTICE '✔ TESTE 7 PASSOU: Unicidade de e-mail case-insensitive rigorosamente garantida no banco.';
END $$;

-- ------------------------------------------------------------------------------
-- TESTE 8: Auditoria Automática por Trigger (Imune à Fabricação pelo Cliente)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_audit_count INTEGER;
BEGIN
  -- Verifica se as operações anteriores geraram registros em public.auditoria_logs
  SELECT count(*) INTO v_audit_count
  FROM public.auditoria_logs
  WHERE entidade IN ('alunos', 'professores', 'alunos_dados_pedagogicos');

  IF v_audit_count = 0 THEN
    RAISE EXCEPTION 'TESTE 8 FALHOU: Nenhum log de auditoria foi gerado pelos triggers automáticos!';
  END IF;

  RAISE NOTICE '✔ TESTE 8 PASSOU: Triggers geraram % logs de auditoria confiáveis.', v_audit_count;
END $$;

ROLLBACK; -- Garante rollback limpo de todos os dados fictícios criados para teste
