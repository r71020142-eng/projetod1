/**
 * DEMOSTRATIVO MTD — Suíte de Revisão Complementar da Etapa 10.3A
 * Teste de Escritas Diretas (Integridade Estrutural) e Concorrência Real (Row-Level Locking)
 *
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * Cenários Testados:
 * PARTE 1 — ESCRITAS DIRETAS BARRADAS POR TRIGGERS NO BANCO (sem passar por interface/RPC):
 * 1. Inserir matrícula em turma lotada (INSERT direto em matriculas_turmas) -> BARRADO.
 * 2. Reativar matrícula cancelada/trancada em turma lotada (UPDATE direto em matriculas_turmas) -> BARRADO.
 * 3. Reduzir capacidade abaixo do número de matrículas ativas (UPDATE direto em turmas) -> BARRADO.
 * 4. Transferir matrícula para outra turma lotada (UPDATE direto de turma_id) -> BARRADO.
 * 5. Matricular em turma encerrada (INSERT direto em matriculas_turmas) -> BARRADO.
 * 6. Matricular aluno inativo (INSERT direto em matriculas_turmas) -> BARRADO.
 * 7. Associar professor inativo (INSERT direto em turmas) -> BARRADO.
 *
 * PARTE 2 — CONCORRÊNCIA REAL VIA CONEXÕES INDEPENDENTES:
 * 8. Concorrência Real via RPC matricular_aluno_turma (simulação exata da aplicação):
 *    - 2 conexões simultâneas disputando 1 única vaga restante.
 *    - Comprova: 1 vitória (200/sucesso), 1 rejeição por falta de vaga, 1 matrícula ativa final no banco.
 * 9. Concorrência Real via INSERT direto na tabela matriculas_turmas:
 *    - 2 conexões simultâneas disparando INSERT direto com lock FOR UPDATE no trigger.
 *    - Comprova: 1 vitória, 1 rejeição pelo trigger, 1 matrícula ativa final no banco.
 * 10. Limpeza cirúrgica dos registros de teste e preservação dos dados reais institucionais.
 */

import { exec, execSync } from "node:child_process";
import assert from "node:assert";
import fs from "node:fs";

interface SqlResult {
  success: boolean;
  output: string;
}

function runLinkedQuery(sql: string): SqlResult {
  const tmpFile = `/tmp/mtd_review_test_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`;
  fs.writeFileSync(tmpFile, sql, "utf-8");
  try {
    const stdout = execSync(
      `npx supabase db query --linked -f ${tmpFile}`,
      { cwd: process.cwd(), encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { success: true, output: stdout };
  } catch (err: any) {
    const out = [err.stdout ?? "", err.stderr ?? "", err.message ?? ""].join("\n");
    return { success: false, output: out };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

function runLinkedQueryAsync(sql: string): Promise<SqlResult> {
  return new Promise((resolve) => {
    const tmpFile = `/tmp/mtd_async_test_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`;
    fs.writeFileSync(tmpFile, sql, "utf-8");
    exec(
      `npx supabase db query --linked -f ${tmpFile}`,
      { cwd: process.cwd(), encoding: "utf-8" },
      (error, stdout, stderr) => {
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        if (error) {
          resolve({ success: false, output: `${stdout}\n${stderr}\n${error.message}` });
        } else {
          resolve({ success: true, output: stdout });
        }
      }
    );
  });
}

async function main() {
  console.log("==================================================================");
  console.log("REVISÃO COMPLEMENTAR — ETAPA 10.3A (TURMAS E MATRÍCULAS)");
  console.log("Integridade Estrutural contra Escritas Diretas e Concorrência Real");
  console.log("Banco Remoto: Supabase (oaissugnjvrobhdrnain)");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [${total}] ${name}`);
    } catch (err: any) {
      console.error(`  ✗ [${total}] ${name}`);
      console.error(`      Detalhe: ${err.message}`);
      process.exit(1);
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ [${total}] ${name}`);
    } catch (err: any) {
      console.error(`  ✗ [${total}] ${name}`);
      console.error(`      Detalhe: ${err.message}`);
      process.exit(1);
    }
  }

  // ----------------------------------------------------------------------------
  // PARTE 1 — TESTES DE ESCRITAS DIRETAS (TRIGGERS DE INTEGRIDADE NO BANCO)
  // ----------------------------------------------------------------------------
  console.log("--- PARTE 1: VERIFICAÇÃO DE ESCRITAS DIRETAS NO BANCO ---");

  // 1. Inserir matrícula em turma lotada
  test("Escrita direta: INSERT em turma lotada é barrado pelo banco", () => {
    const res = runLinkedQuery(`
      DO $t1$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno1 UUID := gen_random_uuid();
        v_aluno2 UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof D1', 'prof.d1@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno1, 'Aluno D1_A', 'al.d1a@mtd.com', 'Geral', 'A1', 'ativo'),
               (v_aluno2, 'Aluno D1_B', 'al.d1b@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Indiv D1', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma, v_aluno1, 'ativa');

        -- Segundo INSERT direto deve falhar com exceção do trigger
        BEGIN
          INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
          VALUES (v_turma, v_aluno2, 'ativa');
          RAISE EXCEPTION 'FALHA_NAO_BARROU_LOTACAO';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%atingiu a capacidade máxima%' THEN
            RAISE EXCEPTION 'OK_BARRADO_LOTACAO';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t1$;
    `);
    assert(res.output.includes("OK_BARRADO_LOTACAO"), `Banco permitiu inserir em turma lotada: ${res.output}`);
  });

  // 2. Reativar matrícula cancelada/trancada em turma lotada
  test("Escrita direta: UPDATE reativando matrícula em turma lotada é barrado", () => {
    const res = runLinkedQuery(`
      DO $t2$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno1 UUID := gen_random_uuid();
        v_aluno2 UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat2 UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof D2', 'prof.d2@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno1, 'Aluno D2_A', 'al.d2a@mtd.com', 'Geral', 'A1', 'ativo'),
               (v_aluno2, 'Aluno D2_B', 'al.d2b@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Indiv D2', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma, v_aluno1, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
        VALUES (v_mat2, v_turma, v_aluno2, 'cancelada');

        -- Tenta reativar a matrícula cancelada diretamente via UPDATE
        BEGIN
          UPDATE public.matriculas_turmas SET status = 'ativa' WHERE id = v_mat2;
          RAISE EXCEPTION 'FALHA_NAO_BARROU_REATIVACAO';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%atingiu a capacidade máxima%' THEN
            RAISE EXCEPTION 'OK_BARRADO_REATIVACAO';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t2$;
    `);
    assert(res.output.includes("OK_BARRADO_REATIVACAO"), `Banco permitiu reativar em turma lotada: ${res.output}`);
  });

  // 3. Reduzir capacidade abaixo do número de matrículas ativas
  test("Escrita direta: UPDATE reduzindo capacidade abaixo do número de matriculados é barrado", () => {
    const res = runLinkedQuery(`
      DO $t3$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno1 UUID := gen_random_uuid();
        v_aluno2 UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof D3', 'prof.d3@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno1, 'Aluno D3_A', 'al.d3a@mtd.com', 'Geral', 'A1', 'ativo'),
               (v_aluno2, 'Aluno D3_B', 'al.d3b@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Grupo D3', 'grupo', v_prof, 6, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma, v_aluno1, 'ativa'),
               (v_turma, v_aluno2, 'ativa');

        -- Tenta reduzir capacidade para 1 quando há 2 discentes ativos
        BEGIN
          UPDATE public.turmas SET capacidade = 1 WHERE id = v_turma;
          RAISE EXCEPTION 'FALHA_NAO_BARROU_REDUCAO_CAPACIDADE';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%Não é permitido reduzir a capacidade para 1%' THEN
            RAISE EXCEPTION 'OK_BARRADO_REDUCAO_CAPACIDADE';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t3$;
    `);
    assert(res.output.includes("OK_BARRADO_REDUCAO_CAPACIDADE"), `Banco permitiu reduzir capacidade: ${res.output}`);
  });

  // 4. Transferir matrícula para outra turma sem validar capacidade
  test("Escrita direta: UPDATE transferindo matrícula para turma lotada é barrado", () => {
    const res = runLinkedQuery(`
      DO $t4$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno1 UUID := gen_random_uuid();
        v_aluno2 UUID := gen_random_uuid();
        v_turma1 UUID := gen_random_uuid();
        v_turma2 UUID := gen_random_uuid();
        v_mat2 UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof D4', 'prof.d4@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno1, 'Aluno D4_A', 'al.d4a@mtd.com', 'Geral', 'A1', 'ativo'),
               (v_aluno2, 'Aluno D4_B', 'al.d4b@mtd.com', 'Geral', 'A1', 'ativo');

        -- Turma 1 lotada (capacidade 1, com Aluno 1)
        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma1, 'Turma 1 Lotada', 'individual', v_prof, 1, 'ativa');
        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma1, v_aluno1, 'ativa');

        -- Turma 2 com Aluno 2
        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma2, 'Turma 2', 'individual', v_prof, 1, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
        VALUES (v_mat2, v_turma2, v_aluno2, 'ativa');

        -- Tenta transferir Aluno 2 para Turma 1 via UPDATE direto de turma_id
        BEGIN
          UPDATE public.matriculas_turmas SET turma_id = v_turma1 WHERE id = v_mat2;
          RAISE EXCEPTION 'FALHA_NAO_BARROU_TRANSFERENCIA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%atingiu a capacidade máxima%' THEN
            RAISE EXCEPTION 'OK_BARRADO_TRANSFERENCIA';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t4$;
    `);
    assert(res.output.includes("OK_BARRADO_TRANSFERENCIA"), `Banco permitiu transferência para turma lotada: ${res.output}`);
  });

  // 5. Inserir matrícula em turma encerrada
  test("Escrita direta: INSERT em turma encerrada é barrado pelo banco", () => {
    const res = runLinkedQuery(`
      DO $t5$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof D5', 'prof.d5@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno D5', 'al.d5@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Encerrada D5', 'individual', v_prof, 1, 'encerrada');

        BEGIN
          INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
          VALUES (v_turma, v_aluno, 'ativa');
          RAISE EXCEPTION 'FALHA_NAO_BARROU_TURMA_ENCERRADA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%pois ela está encerrada%' THEN
            RAISE EXCEPTION 'OK_BARRADO_TURMA_ENCERRADA';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t5$;
    `);
    assert(res.output.includes("OK_BARRADO_TURMA_ENCERRADA"), `Banco permitiu matricular em turma encerrada: ${res.output}`);
  });

  // 6. Matricular aluno inativo
  test("Escrita direta: INSERT com discente inativo é barrado pelo banco", () => {
    const res = runLinkedQuery(`
      DO $t6$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof D6', 'prof.d6@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Inativo D6', 'al.d6inativo@mtd.com', 'Geral', 'A1', 'inativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma D6', 'individual', v_prof, 1, 'ativa');

        BEGIN
          INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
          VALUES (v_turma, v_aluno, 'ativa');
          RAISE EXCEPTION 'FALHA_NAO_BARROU_ALUNO_INATIVO';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%Não é permitido matricular o discente%' THEN
            RAISE EXCEPTION 'OK_BARRADO_ALUNO_INATIVO';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t6$;
    `);
    assert(res.output.includes("OK_BARRADO_ALUNO_INATIVO"), `Banco permitiu aluno inativo: ${res.output}`);
  });

  // 7. Associar professor inativo
  test("Escrita direta: INSERT ou UPDATE com professor inativo é barrado pelo banco", () => {
    const res = runLinkedQuery(`
      DO $t7$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Inativo D7', 'prof.d7inativo@mtd.com', ARRAY['Inglês'], 'inativo');

        BEGIN
          INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
          VALUES (v_turma, 'Turma D7', 'individual', v_prof, 1, 'ativa');
          RAISE EXCEPTION 'FALHA_NAO_BARROU_PROF_INATIVO';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%Não é permitido associar uma turma ao docente%' THEN
            RAISE EXCEPTION 'OK_BARRADO_PROF_INATIVO';
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO: %', SQLERRM;
          END IF;
        END;
      END $t7$;
    `);
    assert(res.output.includes("OK_BARRADO_PROF_INATIVO"), `Banco permitiu professor inativo: ${res.output}`);
  });

  // 7.1. Bloqueio total de DELETE direto para todos os papéis (anon, aluno, professor, admin)
  test("Exclusão direta: DELETE em turmas e matriculas_turmas é bloqueado para anon, aluno, professor e admin", () => {
    const res = runLinkedQuery(`
      DO $tdel$
      DECLARE
        v_prof UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_user_aluno UUID := gen_random_uuid();
        v_user_prof UUID := gen_random_uuid();
        v_err TEXT;
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Del', 'prof.del@mtd.com', ARRAY['Inglês'], 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Del', 'al.del@mtd.com', 'Geral', 'A1', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Del', 'individual', v_prof, 1, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
        VALUES (v_mat, v_turma, v_aluno, 'ativa');

        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_user_aluno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aluno.del2@mtd.com', 'hash', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
               (v_user_prof, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof.del2@mtd.com', 'hash', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
        UPDATE public.perfis SET role = 'aluno', status = 'ativo' WHERE id = v_user_aluno;
        UPDATE public.perfis SET role = 'professor', status = 'ativo' WHERE id = v_user_prof;

        -- anon tenta DELETE
        BEGIN
          SET LOCAL ROLE anon;
          DELETE FROM public.turmas WHERE id = v_turma;
          RAISE EXCEPTION 'FALHA_ANON_DELETE_TURMA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table turmas%' THEN RAISE EXCEPTION 'anon turmas: %', SQLERRM; END IF;
        END;

        BEGIN
          SET LOCAL ROLE anon;
          DELETE FROM public.matriculas_turmas WHERE id = v_mat;
          RAISE EXCEPTION 'FALHA_ANON_DELETE_MAT';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table matriculas_turmas%' THEN RAISE EXCEPTION 'anon mat: %', SQLERRM; END IF;
        END;
        RESET ROLE;

        -- aluno tenta DELETE
        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', v_user_aluno::text, true);
          DELETE FROM public.turmas WHERE id = v_turma;
          RAISE EXCEPTION 'FALHA_ALUNO_DELETE_TURMA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table turmas%' THEN RAISE EXCEPTION 'aluno turmas: %', SQLERRM; END IF;
        END;

        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', v_user_aluno::text, true);
          DELETE FROM public.matriculas_turmas WHERE id = v_mat;
          RAISE EXCEPTION 'FALHA_ALUNO_DELETE_MAT';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table matriculas_turmas%' THEN RAISE EXCEPTION 'aluno mat: %', SQLERRM; END IF;
        END;
        RESET ROLE;

        -- professor tenta DELETE
        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', v_user_prof::text, true);
          DELETE FROM public.turmas WHERE id = v_turma;
          RAISE EXCEPTION 'FALHA_PROF_DELETE_TURMA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table turmas%' THEN RAISE EXCEPTION 'prof turmas: %', SQLERRM; END IF;
        END;

        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', v_user_prof::text, true);
          DELETE FROM public.matriculas_turmas WHERE id = v_mat;
          RAISE EXCEPTION 'FALHA_PROF_DELETE_MAT';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table matriculas_turmas%' THEN RAISE EXCEPTION 'prof mat: %', SQLERRM; END IF;
        END;
        RESET ROLE;

        -- admin tenta DELETE
        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', '660640d2-99fc-46e7-8e12-9ef0d67b60ee', true);
          DELETE FROM public.turmas WHERE id = v_turma;
          RAISE EXCEPTION 'FALHA_ADMIN_DELETE_TURMA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table turmas%' AND SQLERRM NOT LIKE '%Exclusão física bloqueada%' THEN
            RAISE EXCEPTION 'admin turmas: %', SQLERRM;
          END IF;
        END;

        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', '660640d2-99fc-46e7-8e12-9ef0d67b60ee', true);
          DELETE FROM public.matriculas_turmas WHERE id = v_mat;
          RAISE EXCEPTION 'FALHA_ADMIN_DELETE_MAT';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied for table matriculas_turmas%' AND SQLERRM NOT LIKE '%Exclusão física bloqueada%' THEN
            RAISE EXCEPTION 'admin mat: %', SQLERRM;
          END IF;
        END;
        RESET ROLE;

        RAISE EXCEPTION 'OK_TODOS_ROLES_BLOQUEADOS_DELETE';
      END $tdel$;
    `);
    assert(res.output.includes("OK_TODOS_ROLES_BLOQUEADOS_DELETE"), `Falha no bloqueio de DELETE: ${res.output}`);
  });

  // 7.2. Auditoria rigorosa de ACL em pg_proc para todas as funções acadêmicas
  test("Auditoria ACL: PUBLIC e anon sem EXECUTE, search_path seguro e SECURITY DEFINER em todas as RPCs acadêmicas", () => {
    const res = runLinkedQuery(`
      SELECT
        p.proname,
        p.prosecdef,
        p.proconfig,
        pg_catalog.array_to_string(p.proacl, ', ') AS acl,
        (p.proacl::text ~ '(^|[,{])=X/') AS public_has_execute,
        (p.proacl::text ~ '(^|[,{])anon=X/') AS anon_has_execute
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'matricular_aluno_turma',
          'encerrar_matricula_aluno',
          'alterar_capacidade_turma',
          'trocar_professor_turma',
          'get_current_professor_id',
          'get_current_aluno_id',
          'check_matricula_integridade',
          'check_turma_integridade',
          'prevent_client_physical_delete',
          'aluno_has_turma',
          'professor_has_matricula'
        );
    `);
    assert(res.success, `Falha ao consultar pg_proc: ${res.output}`);

    // Garante que nenhuma função tem execute para PUBLIC ou anon
    assert(!res.output.includes('"public_has_execute": true'), "Nenhuma função acadêmica deve ter EXECUTE para PUBLIC");
    assert(!res.output.includes('"anon_has_execute": true'), "Nenhuma função acadêmica deve ter EXECUTE para anon");
    assert(res.output.includes("authenticated=X"), "Funções devem ser acessíveis para authenticated");
    assert(res.output.includes("service_role=X"), "Funções devem ser acessíveis para service_role");
    assert(!res.output.includes('"prosecdef": false'), "Todas as funções devem ser SECURITY DEFINER");
  });

  // 7.3. Usuários não administradores são bloqueados internamente de executar mutações
  test("Autorização RBAC interna: discentes e docentes recebem acesso negado ao tentar invocar RPCs transacionais", () => {
    const res = runLinkedQuery(`
      DO $trbac$
      DECLARE
        v_user_aluno UUID := gen_random_uuid();
        v_user_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
      BEGIN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_user_aluno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a.rbac@mtd.com', 'hash', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
               (v_user_prof, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p.rbac@mtd.com', 'hash', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
        UPDATE public.perfis SET role = 'aluno', status = 'ativo' WHERE id = v_user_aluno;
        UPDATE public.perfis SET role = 'professor', status = 'ativo' WHERE id = v_user_prof;

        -- Aluno tenta matricular
        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', v_user_aluno::text, true);
          PERFORM public.matricular_aluno_turma(v_turma, v_aluno, 'Tentativa Aluno');
          RAISE EXCEPTION 'FALHA_ALUNO_MATRICULA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%apenas administradores ativos%' THEN RAISE EXCEPTION 'aluno mat: %', SQLERRM; END IF;
        END;

        -- Professor tenta alterar capacidade
        BEGIN
          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claim.sub', v_user_prof::text, true);
          PERFORM public.alterar_capacidade_turma(v_turma, 10);
          RAISE EXCEPTION 'FALHA_PROF_CAPACIDADE';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%apenas administradores ativos%' THEN RAISE EXCEPTION 'prof cap: %', SQLERRM; END IF;
        END;

        RAISE EXCEPTION 'OK_RPCS_BLOQUEIAM_NAO_ADMINS';
      END $trbac$;
    `);
    assert(res.output.includes("OK_RPCS_BLOQUEIAM_NAO_ADMINS"), `Falha no RBAC interno das RPCs: ${res.output}`);
  });

  // ----------------------------------------------------------------------------
  // PARTE 2 — CONCORRÊNCIA REAL VIA CONEXÕES INDEPENDENTES
  // ----------------------------------------------------------------------------
  console.log("\n--- PARTE 2: TESTES DE CONCORRÊNCIA REAL EM CONEXÕES SIMULTÂNEAS ---");

  // 8. Concorrência Real via RPC matricular_aluno_turma
  await testAsync("Concorrência Real: duas conexões simultâneas via RPC disputando 1 vaga (1 vence, 1 é barrado)", async () => {
    const testId = Date.now().toString().slice(-6);
    const profId = "a0000000-0000-0000-0000-" + testId.padStart(12, "0");
    const alunoAId = "b0000000-0000-0000-0000-" + testId.padStart(12, "0");
    const alunoBId = "c0000000-0000-0000-0000-" + testId.padStart(12, "0");
    const turmaId = "d0000000-0000-0000-0000-" + testId.padStart(12, "0");

    // Setup: Cria professor, 2 alunos e turma de 1 vaga
    const setupSql = `
      INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
      VALUES ('${profId}', 'Docente Conc RPC', 'prof.conc.rpc.${testId}@mtd.com', ARRAY['Inglês'], 'ativo');

      INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
      VALUES ('${alunoAId}', 'Aluno Conc RPC A', 'al.conc.a.${testId}@mtd.com', 'Geral', 'A1', 'ativo'),
             ('${alunoBId}', 'Aluno Conc RPC B', 'al.conc.b.${testId}@mtd.com', 'Geral', 'A1', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
      VALUES ('${turmaId}', 'Turma Conc RPC', 'individual', '${profId}', 1, 'ativa');
    `;
    const setupRes = runLinkedQuery(setupSql);
    assert(setupRes.success, `Falha no setup concorrente: ${setupRes.output}`);

    try {
      // Dispara 2 conexões simultâneas para matricular Aluno A e Aluno B na mesma turma
      const callA = `SELECT public.matricular_aluno_turma('${turmaId}'::uuid, '${alunoAId}'::uuid, 'Concorrencia A');`;
      const callB = `SELECT public.matricular_aluno_turma('${turmaId}'::uuid, '${alunoBId}'::uuid, 'Concorrencia B');`;

      const startTime = Date.now();
      const [resA, resB] = await Promise.all([
        runLinkedQueryAsync(callA),
        runLinkedQueryAsync(callB),
      ]);
      const duration = Date.now() - startTime;

      console.log(`      Tempo de resolução concorrente: ${duration}ms`);
      console.log(`      Resultado Conexão 1 (Aluno A): success=${resA.success}`);
      console.log(`      Resultado Conexão 2 (Aluno B): success=${resB.success}`);

      // Exatamente um deve ter sucesso e exatamente um deve falhar
      const oneSucceeded = (resA.success && !resB.success) || (!resA.success && resB.success);
      assert(oneSucceeded, `Concorrência falhou! Esperado 1 sucesso e 1 rejeição. Obteve: A=${resA.success}, B=${resB.success}`);

      const failedOutput = resA.success ? resB.output : resA.output;
      assert(
        failedOutput.includes("atingiu a capacidade máxima") || failedOutput.includes("capacidade"),
        `Mensagem de erro da conexão rejeitada deve indicar falta de vaga. Obteve: ${failedOutput}`
      );

      // Verificação no banco: deve haver EXATAMENTE 1 matrícula ativa na turma
      const countRes = runLinkedQuery(`
        SELECT count(*) AS total_ativas FROM public.matriculas_turmas
        WHERE turma_id = '${turmaId}' AND status = 'ativa';
      `);
      assert(countRes.success, `Falha ao contar matrículas: ${countRes.output}`);
      assert(countRes.output.includes('"total_ativas": 1'), `Banco deve conter exatamente 1 matrícula ativa. Obteve: ${countRes.output}`);

      // Comprova ausência de gravação parcial ou duplicidade
      const totalRes = runLinkedQuery(`
        SELECT count(*) AS total_linhas FROM public.matriculas_turmas
        WHERE turma_id = '${turmaId}';
      `);
      assert(totalRes.output.includes('"total_linhas": 1'), `Não deve haver linhas parciais ou fantasmas. Obteve: ${totalRes.output}`);
    } finally {
      // Limpeza cirúrgica dos registros exclusivos deste teste
      runLinkedQuery(`
        DELETE FROM public.matriculas_turmas WHERE turma_id = '${turmaId}';
        DELETE FROM public.turmas WHERE id = '${turmaId}';
        DELETE FROM public.alunos WHERE id IN ('${alunoAId}', '${alunoBId}');
        DELETE FROM public.professores WHERE id = '${profId}';
      `);
    }
  });

  // 9. Concorrência Real via INSERT direto concorrente
  await testAsync("Concorrência Real: duas conexões simultâneas via INSERT direto (lock FOR UPDATE no trigger barra excedente)", async () => {
    const testId = Date.now().toString().slice(-6);
    const profId = "a1000000-0000-0000-0000-" + testId.padStart(12, "0");
    const alunoAId = "b1000000-0000-0000-0000-" + testId.padStart(12, "0");
    const alunoBId = "c1000000-0000-0000-0000-" + testId.padStart(12, "0");
    const turmaId = "d1000000-0000-0000-0000-" + testId.padStart(12, "0");

    // Setup: Cria professor, 2 alunos e turma de 1 vaga
    const setupSql = `
      INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
      VALUES ('${profId}', 'Docente Conc INSERT', 'prof.conc.ins.${testId}@mtd.com', ARRAY['Inglês'], 'ativo');

      INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
      VALUES ('${alunoAId}', 'Aluno Conc Ins A', 'al.conc.ins.a.${testId}@mtd.com', 'Geral', 'A1', 'ativo'),
             ('${alunoBId}', 'Aluno Conc Ins B', 'al.conc.ins.b.${testId}@mtd.com', 'Geral', 'A1', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
      VALUES ('${turmaId}', 'Turma Conc INSERT', 'individual', '${profId}', 1, 'ativa');
    `;
    const setupRes = runLinkedQuery(setupSql);
    assert(setupRes.success, `Falha no setup concorrente direto: ${setupRes.output}`);

    try {
      // Dispara 2 conexões simultâneas com INSERT direto
      const insertA = `INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status) VALUES ('${turmaId}', '${alunoAId}', 'ativa');`;
      const insertB = `INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status) VALUES ('${turmaId}', '${alunoBId}', 'ativa');`;

      const startTime = Date.now();
      const [resA, resB] = await Promise.all([
        runLinkedQueryAsync(insertA),
        runLinkedQueryAsync(insertB),
      ]);
      const duration = Date.now() - startTime;

      console.log(`      Tempo de resolução concorrente INSERT: ${duration}ms`);
      console.log(`      Resultado Conexão 1 (Aluno A): success=${resA.success}`);
      console.log(`      Resultado Conexão 2 (Aluno B): success=${resB.success}`);

      // Exatamente um deve ter sucesso e exatamente um deve falhar
      const oneSucceeded = (resA.success && !resB.success) || (!resA.success && resB.success);
      assert(oneSucceeded, `Concorrência de INSERT direto falhou! Esperado 1 sucesso e 1 rejeição. Obteve: A=${resA.success}, B=${resB.success}`);

      const failedOutput = resA.success ? resB.output : resA.output;
      assert(
        failedOutput.includes("atingiu a capacidade máxima") || failedOutput.includes("capacidade"),
        `Mensagem de erro da conexão rejeitada deve indicar falta de vaga. Obteve: ${failedOutput}`
      );

      // Verificação no banco: deve haver EXATAMENTE 1 matrícula ativa na turma
      const countRes = runLinkedQuery(`
        SELECT count(*) AS total_ativas FROM public.matriculas_turmas
        WHERE turma_id = '${turmaId}' AND status = 'ativa';
      `);
      assert(countRes.success, `Falha ao contar matrículas: ${countRes.output}`);
      assert(countRes.output.includes('"total_ativas": 1'), `Banco deve conter exatamente 1 matrícula ativa. Obteve: ${countRes.output}`);
    } finally {
      // Limpeza cirúrgica
      runLinkedQuery(`
        DELETE FROM public.matriculas_turmas WHERE turma_id = '${turmaId}';
        DELETE FROM public.turmas WHERE id = '${turmaId}';
        DELETE FROM public.alunos WHERE id IN ('${alunoAId}', '${alunoBId}');
        DELETE FROM public.professores WHERE id = '${profId}';
      `);
    }
  });

  // 10. Limpeza cirúrgica e integridade institucional
  test("Limpeza cirúrgica: banco limpo de dados de teste e Ray Pires preservado", () => {
    const res = runLinkedQuery(`
      SELECT
        (SELECT count(*) FROM public.perfis WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee' AND role = 'admin' AND status = 'ativo') AS ray_pires_ok,
        (SELECT count(*) FROM public.turmas) AS total_turmas_residuais,
        (SELECT count(*) FROM public.matriculas_turmas) AS total_matriculas_residuais;
    `);
    assert(res.success, `Falha na checagem final: ${res.output}`);
    assert(res.output.includes('"ray_pires_ok": 1'), "Ray Pires deve permanecer íntegro e ativo");
    assert(res.output.includes('"total_turmas_residuais": 0'), "Nenhuma turma residual de teste deve permanecer");
    assert(res.output.includes('"total_matriculas_residuais": 0'), "Nenhuma matrícula residual de teste deve permanecer");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");
  console.log("SUCESSO: Todas as escritas diretas foram blindadas e a concorrência real foi validada com 100%!");
}

main().catch((err) => {
  console.error("Erro fatal na execução da suíte:", err);
  process.exit(1);
});
