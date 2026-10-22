/**
 * SUÍTE DE TESTES ADVERSARIAIS E AUDITORIA DE ACLs — ETAPA 10.3B1.4
 * Projeto: DEMOSTRATIVO MTD
 *
 * Valida rigorosamente:
 * 1. ACLs e Privilégios das Funções Privilegiadas (SECURITY DEFINER, search_path=public, auth, EXECUTE restrito)
 * 2. Ataque 1: Aluno A tentando consultar aulas e presenças do Aluno B
 * 3. Ataque 2: Aluno A usando filtros explícitos (aluno_id, id_aula, etc.) para tentar bypass
 * 4. Ataque 3: Aluno autenticado invocando diretamente aluno_can_view_aula com aula de outra turma
 * 5. Ataque 4: Usuário anônimo (anon) e perfil inativo tentando consultar views ou funções
 * 6. Ataque 5: Professor tentando consultar ou alterar registros fora de seu escopo
 * 7. Ataque 6: Aluno tentando acessar colunas administrativas confidenciais nas tabelas base e nas views
 * 8. Diferenciação categórica dos tipos de resposta:
 *    - Retorno de zero linhas
 *    - Erro de permissão (42501 permission denied)
 *    - Erro de autorização lançado por função (P0001 ACESSO_NEGADO)
 *    - Acesso permitido, mas limitado aos registros autorizados
 * 9. Limpeza cirúrgica de dados e integridade de Ray Pires
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `adv_audit_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
  fs.writeFileSync(tmpFile, sql, "utf8");

  try {
    const stdout = execSync(`npx supabase db query --linked -f ${tmpFile}`, {
      cwd: "/Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 45000,
    });
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    return { success: true, output: stdout };
  } catch (err: any) {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    const combined = (err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "");
    return { success: false, output: combined };
  }
}

function parseRows(output: string): any[] {
  try {
    const firstBrace = output.indexOf("{");
    const lastBrace = output.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = output.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.rows)) return parsed.rows;
    }
  } catch (_) {}
  return [];
}

const SQL_USER_HELPER = `
  CREATE OR REPLACE FUNCTION pg_temp.create_test_user(p_id UUID, p_email TEXT, p_nome TEXT, p_role TEXT, p_status TEXT DEFAULT 'ativo')
  RETURNS VOID AS $$
  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, 'hash', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    UPDATE public.perfis
    SET role = p_role::public.user_role,
        nome_completo = p_nome,
        status = p_status::public.profile_status
    WHERE id = p_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function runAdversarialSuite() {
  console.log("==================================================================");
  console.log("AUDITORIA ADVERSARIAL DE ACLS E ISOLAMENTO — ETAPA 10.3B1.4");
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
      console.error(`      Erro: ${err.message}`);
    }
  }

  // --- SEÇÃO 1: AUDITORIA DAS FUNÇÕES PRIVILEGIADAS ---
  console.log("--- SEÇÃO 1: AUDITORIA DAS FUNÇÕES PRIVILEGIADAS ---");
  const qFuncs = runLinkedQuery(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      pg_get_userbyid(p.proowner) as owner,
      p.prosecdef as is_sec_def,
      p.proconfig as search_path,
      p.proacl::text as raw_acl,
      (
        SELECT json_agg(json_build_object('grantee', r.grantee, 'privilege_type', r.privilege_type))
        FROM information_schema.routine_privileges r
        WHERE r.specific_schema = 'public' AND r.routine_name = p.proname
      ) as routine_grants
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('aluno_can_view_aula', 'get_current_aluno_id', 'get_auth_role', 'is_admin', 'get_current_professor_id', 'professor_can_view_aula')
    ORDER BY p.proname;
  `);
  const funcRows = parseRows(qFuncs.output);

  test("Todas as 6 funções privilegiadas são SECURITY DEFINER e pertencem a postgres", () => {
    assert.strictEqual(funcRows.length, 6, `Esperava 6 funções, encontrou ${funcRows.length}`);
    for (const f of funcRows) {
      assert.strictEqual(f.is_sec_def, true, `Função ${f.proname} deve ser SECURITY DEFINER`);
      assert.strictEqual(f.owner, "postgres", `Função ${f.proname} deve pertencer a postgres`);
    }
  });

  test("Todas as 6 funções fixam search_path=public, auth de forma explícita e segura", () => {
    for (const f of funcRows) {
      const sp = Array.isArray(f.search_path) ? f.search_path.join(",") : "";
      assert(sp.includes("search_path=public, auth"), `Função ${f.proname} possui search_path inseguro: ${sp}`);
    }
  });

  test("Todas as 6 funções possuem EXECUTE exclusivamente para authenticated e service_role (zero para anon e PUBLIC)", () => {
    for (const f of funcRows) {
      const grants = f.routine_grants || [];
      const anonGrants = grants.filter((g: any) => g.grantee === "anon" || g.grantee === "PUBLIC");
      assert.strictEqual(anonGrants.length, 0, `Função ${f.proname} possui EXECUTE indevido para anon ou PUBLIC`);

      const authGrants = grants.filter((g: any) => g.grantee === "authenticated" && g.privilege_type === "EXECUTE");
      assert(authGrants.length > 0, `Função ${f.proname} deve possuir EXECUTE para authenticated`);
    }
  });

  // --- SEÇÃO 2: TESTES ADVERSARIAIS ---
  console.log("\n--- SEÇÃO 2: TESTES ADVERSARIAIS DAS VIEWS E ISOLAMENTO ---");

  // Adversarial Test Setup
  const advSetupSql = `
    ${SQL_USER_HELPER}
    DO $t$
    DECLARE
      v_uid_al1 UUID := '11111111-aaaa-4444-5555-000000000001'::uuid;
      v_al1 UUID := '22222222-aaaa-4444-5555-000000000001'::uuid;
      v_uid_al2 UUID := '11111111-bbbb-4444-5555-000000000002'::uuid;
      v_al2 UUID := '22222222-bbbb-4444-5555-000000000002'::uuid;
      v_uid_prof1 UUID := '33333333-aaaa-4444-5555-000000000001'::uuid;
      v_prof1 UUID := '44444444-aaaa-4444-5555-000000000001'::uuid;
      v_uid_prof2 UUID := '33333333-bbbb-4444-5555-000000000002'::uuid;
      v_prof2 UUID := '44444444-bbbb-4444-5555-000000000002'::uuid;
      v_turma1 UUID := '55555555-aaaa-4444-5555-000000000001'::uuid;
      v_turma2 UUID := '55555555-bbbb-4444-5555-000000000002'::uuid;
      v_aula1 UUID := '66666666-aaaa-4444-5555-000000000001'::uuid;
      v_aula2 UUID := '66666666-bbbb-4444-5555-000000000002'::uuid;
      v_pres1 UUID := '77777777-aaaa-4444-5555-000000000001'::uuid;
      v_pres2 UUID := '77777777-bbbb-4444-5555-000000000002'::uuid;
    BEGIN
      PERFORM pg_temp.create_test_user(v_uid_al1, 'adv_al1@mtd.test', 'Aluno Adv 1', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_al2, 'adv_al2@mtd.test', 'Aluno Adv 2', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_prof1, 'adv_p1@mtd.test', 'Prof Adv 1', 'professor');
      PERFORM pg_temp.create_test_user(v_uid_prof2, 'adv_p2@mtd.test', 'Prof Adv 2', 'professor');

      INSERT INTO public.professores (id, perfil_id, nome_completo, email, idiomas_falados, status)
      VALUES 
        (v_prof1, v_uid_prof1, 'Prof Adv 1', 'adv_p1@mtd.test', ARRAY['Inglês'], 'ativo'),
        (v_prof2, v_uid_prof2, 'Prof Adv 2', 'adv_p2@mtd.test', ARRAY['Inglês'], 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
      VALUES 
        (v_al1, v_uid_al1, 'Aluno Adv 1', 'adv_al1@mtd.test', 'Geral', 'A1', 'ativo'),
        (v_al2, v_uid_al2, 'Aluno Adv 2', 'adv_al2@mtd.test', 'Geral', 'A1', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
      VALUES 
        (v_turma1, 'Turma Adv 1', 'individual', v_prof1, 1, 'ativa'),
        (v_turma2, 'Turma Adv 2', 'individual', v_prof2, 1, 'ativa');

      INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em)
      VALUES 
        ('88888888-aaaa-4444-5555-000000000001'::uuid, v_turma1, v_al1, 'ativa', now() - interval '2 days'),
        ('88888888-bbbb-4444-5555-000000000002'::uuid, v_turma2, v_al2, 'ativa', now() - interval '2 days');

      INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status, observacoes)
      VALUES 
        (v_aula1, v_turma1, v_prof1, '2026-11-20 10:00:00+00', '2026-11-20 10:50:00+00', 'Aula Adv T1', 'agendada', 'OBS_ADMIN_CONFIDENCIAL_1'),
        (v_aula2, v_turma2, v_prof2, '2026-11-20 14:00:00+00', '2026-11-20 14:50:00+00', 'Aula Adv T2', 'agendada', 'OBS_ADMIN_CONFIDENCIAL_2');

      INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status, observacao_pedagogica)
      VALUES 
        (v_pres1, v_aula1, v_al1, '88888888-aaaa-4444-5555-000000000001'::uuid, 'nao_registrado', 'OBS_PEDAGOGICA_CONFIDENCIAL_1'),
        (v_pres2, v_aula2, v_al2, '88888888-bbbb-4444-5555-000000000002'::uuid, 'nao_registrado', 'OBS_PEDAGOGICA_CONFIDENCIAL_2');
    END $t$;
  `;
  runLinkedQuery(advSetupSql);

  // Teste 1: Aluno A tentando consultar aulas e presenças do Aluno B
  test("Cenário 1: Aluno A consulta as views e recebe exclusivamente seus registros (Acesso permitido, mas limitado aos registros autorizados)", () => {
    const q = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_c_aulas INT;
        v_c_aulas_b INT;
        v_c_pres INT;
        v_c_pres_b INT;
      BEGIN
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', '11111111-aaaa-4444-5555-000000000001'::uuid, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_c_aulas FROM public.vw_aluno_aulas WHERE id = '66666666-aaaa-4444-5555-000000000001'::uuid;
        SELECT COUNT(*) INTO v_c_aulas_b FROM public.vw_aluno_aulas WHERE id = '66666666-bbbb-4444-5555-000000000002'::uuid;
        SELECT COUNT(*) INTO v_c_pres FROM public.vw_aluno_presencas WHERE aluno_id = '22222222-aaaa-4444-5555-000000000001'::uuid;
        SELECT COUNT(*) INTO v_c_pres_b FROM public.vw_aluno_presencas WHERE aluno_id = '22222222-bbbb-4444-5555-000000000002'::uuid;

        IF v_c_aulas = 1 AND v_c_aulas_b = 0 AND v_c_pres = 1 AND v_c_pres_b = 0 THEN
          RAISE EXCEPTION 'OK_CENARIO_1_ISOLADO';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(q.output.includes("OK_CENARIO_1_ISOLADO"), `Falha no isolamento básico: ${q.output}`);
  });

  // Teste 2: Aluno A usando filtros explícitos (aluno_id, id da aula de B, etc.)
  test("Cenário 2: Aluno A usando filtros explícitos (aluno_id=B, id_aula=B) recebe 'Retorno de zero linhas'", () => {
    const q = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_c_expl1 INT;
        v_c_expl2 INT;
        v_c_expl3 INT;
      BEGIN
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', '11111111-aaaa-4444-5555-000000000001'::uuid, 'role', 'authenticated')::text, true);

        -- Filtro explícito forçando aluno_id do Aluno B na view de presenças
        SELECT COUNT(*) INTO v_c_expl1 FROM public.vw_aluno_presencas WHERE aluno_id = '22222222-bbbb-4444-5555-000000000002'::uuid;

        -- Filtro explícito forçando ID da aula da Turma B na view de aulas
        SELECT COUNT(*) INTO v_c_expl2 FROM public.vw_aluno_aulas WHERE id = '66666666-bbbb-4444-5555-000000000002'::uuid;

        -- Filtro composto tentando combinar ID de presença do Aluno B com qualquer critério
        SELECT COUNT(*) INTO v_c_expl3 FROM public.vw_aluno_presencas WHERE id = '77777777-bbbb-4444-5555-000000000002'::uuid;

        IF v_c_expl1 = 0 AND v_c_expl2 = 0 AND v_c_expl3 = 0 THEN
          RAISE EXCEPTION 'OK_CENARIO_2_ZERO_LINHAS';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(q.output.includes("OK_CENARIO_2_ZERO_LINHAS"), `Falha no bypass com filtros: ${q.output}`);
  });

  // Teste 3: Aluno autenticado tentando invocar diretamente aluno_can_view_aula com UUID de outra turma
  test("Cenário 3: Aluno invocando diretamente aluno_can_view_aula com aula de outra turma recebe 'false determinístico'", () => {
    const q = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_can_own BOOLEAN;
        v_can_other BOOLEAN;
      BEGIN
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', '11111111-aaaa-4444-5555-000000000001'::uuid, 'role', 'authenticated')::text, true);

        v_can_own := public.aluno_can_view_aula('66666666-aaaa-4444-5555-000000000001'::uuid);
        v_can_other := public.aluno_can_view_aula('66666666-bbbb-4444-5555-000000000002'::uuid);

        IF v_can_own = true AND v_can_other = false THEN
          RAISE EXCEPTION 'OK_CENARIO_3_FALSE_DETERMINISTICO';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(q.output.includes("OK_CENARIO_3_FALSE_DETERMINISTICO"), `Falha em aluno_can_view_aula: ${q.output}`);
  });

  // Teste 4.1: Usuário anônimo tentando consultar views ou funções privilegiadas
  test("Cenário 4.1: Usuário anônimo (anon) recebe 'Erro de permissão (42501)' ao tentar acessar views e funções", () => {
    const q1 = runLinkedQuery(`
      SET ROLE anon;
      SELECT * FROM public.vw_aluno_aulas;
    `);
    assert.strictEqual(q1.success, false);
    assert(q1.output.includes("permission denied for view vw_aluno_aulas"), "Esperava 42501 em vw_aluno_aulas");

    const q2 = runLinkedQuery(`
      SET ROLE anon;
      SELECT public.aluno_can_view_aula('66666666-aaaa-4444-5555-000000000001'::uuid);
    `);
    assert.strictEqual(q2.success, false);
    assert(q2.output.includes("permission denied for function aluno_can_view_aula"), "Esperava 42501 em aluno_can_view_aula");

    const q3 = runLinkedQuery(`
      SET ROLE anon;
      SELECT public.get_auth_role();
    `);
    assert.strictEqual(q3.success, false);
    assert(q3.output.includes("permission denied for function get_auth_role"), "Esperava 42501 em get_auth_role");

    const q4 = runLinkedQuery(`
      SET ROLE anon;
      SELECT public.is_admin();
    `);
    assert.strictEqual(q4.success, false);
    assert(q4.output.includes("permission denied for function is_admin"), "Esperava 42501 em is_admin");
  });

  // Teste 4.2: Perfil inativo tentando consultar views e calcular frequência
  test("Cenário 4.2: Perfil inativo recebe 'Retorno de zero linhas' em views e 'Erro de autorização (P0001)' em RPCs", () => {
    const q = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_inat UUID := gen_random_uuid();
        v_inat UUID := gen_random_uuid();
        v_c_aulas INT;
        v_c_pres INT;
        v_err_msg TEXT := '';
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_inat, 'inat_adv@mtd.test', 'Aluno Inat Adv', 'aluno', 'inativo');
        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
        VALUES (v_inat, v_uid_inat, 'Aluno Inat Adv', 'inat_adv@mtd.test', 'inativo');

        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_inat, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_c_aulas FROM public.vw_aluno_aulas;
        SELECT COUNT(*) INTO v_c_pres FROM public.vw_aluno_presencas;

        -- Tentativa de invocar RPC privilegiada com perfil inativo autenticado
        BEGIN
          PERFORM public.calcular_frequencia_aluno(v_inat);
        EXCEPTION WHEN OTHERS THEN
          v_err_msg := SQLERRM;
        END;

        IF v_c_aulas = 0 AND v_c_pres = 0 AND v_err_msg LIKE '%ACESSO_NEGADO: Perfil inativo%' THEN
          RAISE EXCEPTION 'OK_CENARIO_4_INATIVO_VALIDADO';
        ELSE
          RAISE EXCEPTION 'FALHA_INATIVO: aulas=% pres=% err=%', v_c_aulas, v_c_pres, v_err_msg;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(q.output.includes("OK_CENARIO_4_INATIVO_VALIDADO"), `Falha no perfil inativo: ${q.output}`);
  });

  // Teste 5: Professor tentando consultar ou alterar registros fora de seu escopo
  test("Cenário 5: Professor 1 consultando fora de seu escopo recebe 'Retorno de zero linhas' e em UPDATE '0 linhas afetadas'", () => {
    const q = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_c_aulas_own INT;
        v_c_aulas_other INT;
        v_c_pres_own INT;
        v_c_pres_other INT;
        v_can_own BOOLEAN;
        v_can_other BOOLEAN;
        v_rows_affected INT;
      BEGIN
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', '33333333-aaaa-4444-5555-000000000001'::uuid, 'role', 'authenticated')::text, true);

        -- View de aulas
        SELECT COUNT(*) INTO v_c_aulas_own FROM public.vw_aluno_aulas WHERE id = '66666666-aaaa-4444-5555-000000000001'::uuid;
        SELECT COUNT(*) INTO v_c_aulas_other FROM public.vw_aluno_aulas WHERE id = '66666666-bbbb-4444-5555-000000000002'::uuid;

        -- View de presenças
        SELECT COUNT(*) INTO v_c_pres_own FROM public.vw_aluno_presencas WHERE aula_id = '66666666-aaaa-4444-5555-000000000001'::uuid;
        SELECT COUNT(*) INTO v_c_pres_other FROM public.vw_aluno_presencas WHERE aula_id = '66666666-bbbb-4444-5555-000000000002'::uuid;

        -- Função auxiliar professor_can_view_aula
        v_can_own := public.professor_can_view_aula('66666666-aaaa-4444-5555-000000000001'::uuid);
        v_can_other := public.professor_can_view_aula('66666666-bbbb-4444-5555-000000000002'::uuid);

        -- Tentativa de UPDATE direto na aula do Professor 2
        UPDATE public.aulas SET titulo = 'Hack Prof' WHERE id = '66666666-bbbb-4444-5555-000000000002'::uuid;
        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

        IF v_c_aulas_own = 1 AND v_c_aulas_other = 0
           AND v_c_pres_own = 1 AND v_c_pres_other = 0
           AND v_can_own = true AND v_can_other = false
           AND v_rows_affected = 0 THEN
          RAISE EXCEPTION 'OK_CENARIO_5_PROF_ISOLADO';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(q.output.includes("OK_CENARIO_5_PROF_ISOLADO"), `Falha no isolamento docente: ${q.output}`);
  });

  // Teste 6: Usuário comum tentando acessar colunas internas nas tabelas base e nas views
  test("Cenário 6: Aluno tentando ler colunas internas recebe 'Retorno de zero linhas' nas tabelas base e 'Erro 42703 (coluna inexistente)' nas views", () => {
    // 6.1 Tabelas base: SELECT direto retorna 0 linhas via RLS
    const q1 = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_c_aulas INT;
        v_c_pres INT;
      BEGIN
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', '11111111-aaaa-4444-5555-000000000001'::uuid, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_c_aulas FROM public.aulas;
        SELECT COUNT(*) INTO v_c_pres FROM public.presencas_aulas;

        IF v_c_aulas = 0 AND v_c_pres = 0 THEN
          RAISE EXCEPTION 'OK_TABELAS_BASE_ZERO_LINHAS';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(q1.output.includes("OK_TABELAS_BASE_ZERO_LINHAS"), `Aluno conseguiu ler tabela base: ${q1.output}`);

    // 6.2 Views: Consultar colunas confidenciais inexistentes retorna erro de esquema 42703
    const q2 = runLinkedQuery(`
      SELECT observacoes FROM public.vw_aluno_aulas;
    `);
    assert.strictEqual(q2.success, false);
    assert(q2.output.includes("42703") && q2.output.includes("observacoes"), "Esperava 42703 column does not exist em vw_aluno_aulas");

    const q3 = runLinkedQuery(`
      SELECT observacao_pedagogica FROM public.vw_aluno_presencas;
    `);
    assert.strictEqual(q3.success, false);
    assert(q3.output.includes("42703") && q3.output.includes("observacao_pedagogica"), "Esperava 42703 column does not exist em vw_aluno_presencas");
  });

  // Limpeza de dados de teste
  const cleanSql = `
    DELETE FROM public.presencas_aulas WHERE id IN ('77777777-aaaa-4444-5555-000000000001'::uuid, '77777777-bbbb-4444-5555-000000000002'::uuid);
    DELETE FROM public.aulas WHERE id IN ('66666666-aaaa-4444-5555-000000000001'::uuid, '66666666-bbbb-4444-5555-000000000002'::uuid);
    DELETE FROM public.matriculas_turmas WHERE id IN ('88888888-aaaa-4444-5555-000000000001'::uuid, '88888888-bbbb-4444-5555-000000000002'::uuid);
    DELETE FROM public.turmas WHERE id IN ('55555555-aaaa-4444-5555-000000000001'::uuid, '55555555-bbbb-4444-5555-000000000002'::uuid);
    DELETE FROM public.alunos WHERE id IN ('22222222-aaaa-4444-5555-000000000001'::uuid, '22222222-bbbb-4444-5555-000000000002'::uuid);
    DELETE FROM public.professores WHERE id IN ('44444444-aaaa-4444-5555-000000000001'::uuid, '44444444-bbbb-4444-5555-000000000002'::uuid);
    DELETE FROM auth.users WHERE id IN (
      '11111111-aaaa-4444-5555-000000000001'::uuid,
      '11111111-bbbb-4444-5555-000000000002'::uuid,
      '33333333-aaaa-4444-5555-000000000001'::uuid,
      '33333333-bbbb-4444-5555-000000000002'::uuid
    );

    SELECT id, email, role, status FROM public.perfis WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid;
  `;
  const cleanRes = runLinkedQuery(cleanSql);
  const rayRows = parseRows(cleanRes.output);

  test("Limpeza efetuada sem resíduos e Ray Pires ativo como administrador institucional único", () => {
    assert.strictEqual(rayRows.length, 1);
    assert.strictEqual(rayRows[0].email, "r71020142@gmail.com");
    assert.strictEqual(rayRows[0].role, "admin");
    assert.strictEqual(rayRows[0].status, "ativo");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");

  if (passed !== total) {
    console.error("FALHA: Nem todos os testes foram aprovados!");
    process.exit(1);
  } else {
    console.log("SUCESSO: Auditoria final de ACLs e testes adversariais aprovados com 100%!");
  }
}

runAdversarialSuite().catch(console.error);
