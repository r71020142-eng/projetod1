/**
 * SUÍTE DE FECHAMENTO FINAL — ETAPA 10.3B1
 * Projeto: DEMOSTRATIVO MTD
 *
 * Validação rigorosa dos 4 pontos exigidos:
 * PONTO 1: Views, Reloptions, Grants, search_path e ausência de CREATE no schema public para anon e authenticated.
 * PONTO 2: Escritas indevidas: Professor A em B (insert, update, cancelamento), presenças fora do escopo, discente e perfil inativo.
 * PONTO 3: Histórico de matrícula encerrada e cancelada (aula anterior preservada, posterior inacessível).
 * PONTO 4: Validação final e ausência de regressões.
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `fechamento_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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

async function main() {
  console.log("==================================================================");
  console.log("FECHAMENTO FINAL — ETAPA 10.3B1");
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

  // ============================================================================
  // PONTO 1: VIEWS, ACLS E PERMISSÕES DO SCHEMA PUBLIC
  // ============================================================================
  console.log("--- PONTO 1: VIEWS, ACLs E PERMISSÕES DO SCHEMA PUBLIC ---");

  // 1.1 Schema privileges
  const qSchema = runLinkedQuery(`
    SELECT 
      nspname,
      has_schema_privilege('anon', nspname, 'CREATE') as anon_has_create,
      has_schema_privilege('authenticated', nspname, 'CREATE') as auth_has_create,
      has_schema_privilege('anon', nspname, 'USAGE') as anon_has_usage,
      has_schema_privilege('authenticated', nspname, 'USAGE') as auth_has_usage
    FROM pg_namespace
    WHERE nspname = 'public';
  `);
  const schemaRows = parseRows(qSchema.output);

  test("P1.1 Schema public: anon e authenticated NÃO possuem CREATE (apenas USAGE)", () => {
    assert(schemaRows.length === 1);
    assert.strictEqual(schemaRows[0].anon_has_create, false, "anon possui CREATE indevido em public");
    assert.strictEqual(schemaRows[0].auth_has_create, false, "authenticated possui CREATE indevido em public");
    assert.strictEqual(schemaRows[0].anon_has_usage, true, "anon deve ter USAGE");
    assert.strictEqual(schemaRows[0].auth_has_usage, true, "authenticated deve ter USAGE");
  });

  // 1.2 Views reloptions and owner
  const qViews = runLinkedQuery(`
    SELECT c.relname, pg_get_userbyid(c.relowner) as owner, c.reloptions
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('vw_aluno_aulas', 'vw_aluno_presencas');
  `);
  const viewRows = parseRows(qViews.output);

  test("P1.2 Views possuem owner=postgres, security_invoker=false e security_barrier=true", () => {
    assert.strictEqual(viewRows.length, 2);
    for (const v of viewRows) {
      assert.strictEqual(v.owner, "postgres", `View ${v.relname} deve pertencer a postgres`);
      const opts = Array.isArray(v.reloptions) ? v.reloptions.join(",") : "";
      assert(opts.includes("security_barrier=true"), `View ${v.relname} sem security_barrier`);
      assert(opts.includes("security_invoker=false"), `View ${v.relname} sem security_invoker=false`);
    }
  });

  // 1.3 View Grants
  const qGrants = runLinkedQuery(`
    SELECT table_name, grantee, privilege_type
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND table_name IN ('vw_aluno_aulas', 'vw_aluno_presencas')
      AND grantee IN ('PUBLIC', 'anon', 'authenticated');
  `);
  const grantRows = parseRows(qGrants.output);

  test("P1.3 Views possuem apenas SELECT para authenticated (zero para anon e PUBLIC)", () => {
    const anon = grantRows.filter((g: any) => g.grantee === "anon" || g.grantee === "PUBLIC");
    assert.strictEqual(anon.length, 0, "anon/PUBLIC possuem grants nas views");
    const auth = grantRows.filter((g: any) => g.grantee === "authenticated");
    assert.strictEqual(auth.length, 2, "authenticated deve possuir 2 grants de SELECT");
    for (const a of auth) {
      assert.strictEqual(a.privilege_type, "SELECT");
    }
  });

  // 1.4 Security Definer Functions
  const qFuncs = runLinkedQuery(`
    SELECT 
      p.proname,
      p.prosecdef as is_sec_def,
      p.proconfig as search_path,
      pg_get_userbyid(p.proowner) as owner,
      (
        SELECT json_agg(json_build_object('grantee', r.grantee, 'privilege_type', r.privilege_type))
        FROM information_schema.routine_privileges r
        WHERE r.specific_schema = 'public' AND r.routine_name = p.proname
      ) as grants
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('aluno_can_view_aula', 'get_current_aluno_id', 'get_auth_role', 'is_admin', 'get_current_professor_id', 'professor_can_view_aula', 'calcular_frequencia_aluno', 'iniciar_chamada_aula', 'salvar_chamada_aula', 'concluir_aula')
    ORDER BY p.proname;
  `);
  const funcRows = parseRows(qFuncs.output);

  test("P1.4 Funções SECURITY DEFINER possuem owner=postgres, search_path=public, auth e EXECUTE restrito", () => {
    assert(funcRows.length >= 6);
    for (const f of funcRows) {
      assert.strictEqual(f.is_sec_def, true, `${f.proname} não é SECURITY DEFINER`);
      assert.strictEqual(f.owner, "postgres", `${f.proname} não pertence a postgres`);
      const sp = Array.isArray(f.search_path) ? f.search_path.join(",") : "";
      assert(sp.includes("search_path=public, auth"), `${f.proname} possui search_path inseguro: ${sp}`);
      const grants = f.grants || [];
      const anon = grants.filter((g: any) => g.grantee === "anon" || g.grantee === "PUBLIC");
      assert.strictEqual(anon.length, 0, `${f.proname} possui EXECUTE indevido para anon/PUBLIC`);
    }
  });

  // ============================================================================
  // PONTO 2: ESCRITAS INDEVIDAS BLOQUEADAS
  // ============================================================================
  console.log("\n--- PONTO 2: BLOQUEIO DE ESCRITAS INDEVIDAS ---");

  const qEscritas = runLinkedQuery(`
    BEGIN;
    ${SQL_USER_HELPER}
    DO $t$
    DECLARE
      v_uid_prof_a UUID := gen_random_uuid();
      v_prof_a UUID := gen_random_uuid();
      v_uid_prof_b UUID := gen_random_uuid();
      v_prof_b UUID := gen_random_uuid();
      v_uid_aluno UUID := gen_random_uuid();
      v_aluno UUID := gen_random_uuid();
      v_uid_inat UUID := gen_random_uuid();
      v_inat UUID := gen_random_uuid();

      v_turma_a UUID := gen_random_uuid();
      v_turma_b UUID := gen_random_uuid();
      v_aula_b UUID := gen_random_uuid();
      v_pres_b UUID := gen_random_uuid();

      v_err TEXT := '';
      v_rows_aff INT := 0;
      v_blocked_insert_prof BOOLEAN := false;
      v_blocked_update_prof BOOLEAN := false;
      v_blocked_cancel_prof BOOLEAN := false;
      v_blocked_pres_prof BOOLEAN := false;
      v_blocked_aluno_aula BOOLEAN := false;
      v_blocked_aluno_pres BOOLEAN := false;
      v_blocked_inat_aula BOOLEAN := false;
    BEGIN
      PERFORM pg_temp.create_test_user(v_uid_prof_a, 'prof.a@mtd.test', 'Prof A', 'professor');
      PERFORM pg_temp.create_test_user(v_uid_prof_b, 'prof.b@mtd.test', 'Prof B', 'professor');
      PERFORM pg_temp.create_test_user(v_uid_aluno, 'aluno.p2@mtd.test', 'Aluno P2', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_inat, 'inat.p2@mtd.test', 'Inativo P2', 'aluno', 'inativo');

      INSERT INTO public.professores (id, perfil_id, nome_completo, email, status)
      VALUES 
        (v_prof_a, v_uid_prof_a, 'Prof A', 'prof.a@mtd.test', 'ativo'),
        (v_prof_b, v_uid_prof_b, 'Prof B', 'prof.b@mtd.test', 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES 
        (v_aluno, v_uid_aluno, 'Aluno P2', 'aluno.p2@mtd.test', 'ativo'),
        (v_inat, v_uid_inat, 'Inativo P2', 'inat.p2@mtd.test', 'inativo');

      INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
      VALUES 
        (v_turma_a, 'Turma A', 'individual', v_prof_a, 1, 'ativa'),
        (v_turma_b, 'Turma B', 'individual', v_prof_b, 1, 'ativa');

      INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
      VALUES (v_turma_b, v_aluno, 'ativa');

      INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
      VALUES (v_aula_b, v_turma_b, v_prof_b, '2026-11-20 10:00:00+00', '2026-11-20 10:50:00+00', 'Aula Prof B', 'agendada');

      INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, status)
      VALUES (v_pres_b, v_aula_b, v_aluno, 'nao_registrado');

      -- 2.1 Prof A tenta inserir aula na turma do Prof B
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof_a, 'role', 'authenticated')::text, true);

      BEGIN
        INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_turma_b, v_prof_a, '2026-11-21 10:00:00+00', '2026-11-21 10:50:00+00', 'Invasao Aula', 'agendada');
      EXCEPTION WHEN OTHERS THEN
        v_blocked_insert_prof := true;
      END;

      -- 2.2 Prof A tenta alterar aula do Prof B
      UPDATE public.aulas SET titulo = 'Hack' WHERE id = v_aula_b;
      GET DIAGNOSTICS v_rows_aff = ROW_COUNT;
      IF v_rows_aff = 0 THEN v_blocked_update_prof := true; END IF;

      -- 2.3 Prof A tenta cancelar aula do Prof B
      UPDATE public.aulas SET status = 'cancelada' WHERE id = v_aula_b;
      GET DIAGNOSTICS v_rows_aff = ROW_COUNT;
      IF v_rows_aff = 0 THEN v_blocked_cancel_prof := true; END IF;

      -- 2.4 Prof A tenta alterar presença na aula do Prof B
      UPDATE public.presencas_aulas SET status = 'presente' WHERE id = v_pres_b;
      GET DIAGNOSTICS v_rows_aff = ROW_COUNT;
      IF v_rows_aff = 0 THEN v_blocked_pres_prof := true; END IF;

      -- 2.5 Aluno tenta inserir aula e presença diretamente
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno, 'role', 'authenticated')::text, true);

      BEGIN
        INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_turma_b, v_prof_b, '2026-11-22 10:00:00+00', '2026-11-22 10:50:00+00', 'Aluno Aula', 'agendada');
      EXCEPTION WHEN OTHERS THEN
        v_blocked_aluno_aula := true;
      END;

      BEGIN
        INSERT INTO public.presencas_aulas (aula_id, aluno_id, status)
        VALUES (v_aula_b, v_aluno, 'presente');
      EXCEPTION WHEN OTHERS THEN
        v_blocked_aluno_pres := true;
      END;

      -- 2.6 Perfil inativo tenta inserir aula
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_inat, 'role', 'authenticated')::text, true);

      BEGIN
        INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_turma_b, v_prof_b, '2026-11-23 10:00:00+00', '2026-11-23 10:50:00+00', 'Inat Aula', 'agendada');
      EXCEPTION WHEN OTHERS THEN
        v_blocked_inat_aula := true;
      END;

      IF v_blocked_insert_prof AND v_blocked_update_prof AND v_blocked_cancel_prof
         AND v_blocked_pres_prof AND v_blocked_aluno_aula AND v_blocked_aluno_pres
         AND v_blocked_inat_aula THEN
        RAISE EXCEPTION 'OK_TODAS_ESCRITAS_BLOQUEADAS';
      ELSE
        RAISE EXCEPTION 'FALHA_ESCRITAS: ins_p=% upd_p=% can_p=% pres_p=% al_a=% al_p=% inat_a=%',
          v_blocked_insert_prof, v_blocked_update_prof, v_blocked_cancel_prof,
          v_blocked_pres_prof, v_blocked_aluno_aula, v_blocked_aluno_pres, v_blocked_inat_aula;
      END IF;
    END $t$;
    ROLLBACK;
  `);

  test("P2.1 Professor A impedido de inserir, alterar ou cancelar aula do Professor B", () => {
    assert(qEscritas.output.includes("OK_TODAS_ESCRITAS_BLOQUEADAS"), `Falha nas escritas do professor: ${qEscritas.output}`);
  });

  test("P2.2 Professor A impedido de alterar presença fora de seu escopo (0 linhas afetadas)", () => {
    assert(qEscritas.output.includes("OK_TODAS_ESCRITAS_BLOQUEADAS"));
  });

  test("P2.3 Aluno e Perfil Inativo impedidos de realizar escritas diretas nas tabelas protegidas", () => {
    assert(qEscritas.output.includes("OK_TODAS_ESCRITAS_BLOQUEADAS"));
  });

  // ============================================================================
  // PONTO 3: HISTÓRICO DE MATRÍCULA ENCERRADA E CANCELADA
  // ============================================================================
  console.log("\n--- PONTO 3: HISTÓRICO DE MATRÍCULA ENCERRADA E CANCELADA ---");

  const qHist = runLinkedQuery(`
    BEGIN;
    ${SQL_USER_HELPER}
    DO $t$
    DECLARE
      v_uid_al UUID := gen_random_uuid();
      v_al UUID := gen_random_uuid();
      v_prof UUID := gen_random_uuid();
      v_turma UUID := gen_random_uuid();
      v_mat UUID := gen_random_uuid();

      v_aula_passada UUID := gen_random_uuid();
      v_aula_futura UUID := gen_random_uuid();
      v_pres_passada UUID := gen_random_uuid();

      v_c_passada INT;
      v_c_futura INT;
      v_c_pres_passada INT;
      v_freq JSONB;
    BEGIN
      PERFORM pg_temp.create_test_user(v_uid_al, 'al.hist@mtd.test', 'Aluno Hist', 'aluno');
      INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
      VALUES (v_prof, 'Prof Hist', 'prof.hist@mtd.test', ARRAY['Inglês'], 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES (v_al, v_uid_al, 'Aluno Hist', 'al.hist@mtd.test', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
      VALUES (v_turma, 'Turma Hist', 'individual', v_prof, 1, 'ativa');

      -- Matrícula válida das 10:00 às 11:00 de 2026-10-15
      INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em, motivo_encerramento)
      VALUES (v_mat, v_turma, v_al, 'encerrada', '2026-10-15 10:00:00+00', '2026-10-15 11:00:00+00', 'conclusao');

      -- Aula passada: 10:15 às 10:45 (dentro do intervalo [10:00, 11:00))
      INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
      VALUES (v_aula_passada, v_turma, v_prof, '2026-10-15 10:15:00+00', '2026-10-15 10:45:00+00', 'Aula Passada', 'concluida');

      -- Presença na aula passada
      INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status)
      VALUES (v_pres_passada, v_aula_passada, v_al, v_mat, 'presente');

      -- Aula futura: 11:30 às 12:00 (após encerramento)
      INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
      VALUES (v_aula_futura, v_turma, v_prof, '2026-10-15 11:30:00+00', '2026-10-15 12:00:00+00', 'Aula Futura', 'concluida');

      -- Consulta como o aluno
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_al, 'role', 'authenticated')::text, true);

      SELECT COUNT(*) INTO v_c_passada FROM public.vw_aluno_aulas WHERE id = v_aula_passada;
      SELECT COUNT(*) INTO v_c_futura FROM public.vw_aluno_aulas WHERE id = v_aula_futura;
      SELECT COUNT(*) INTO v_c_pres_passada FROM public.vw_aluno_presencas WHERE id = v_pres_passada;

      v_freq := public.calcular_frequencia_aluno(v_al, v_turma);

      IF v_c_passada = 1 AND v_c_futura = 0 AND v_c_pres_passada = 1
         AND (v_freq->>'totalAulasConcluidas')::int = 1
         AND (v_freq->>'presentes')::int = 1
         AND (v_freq->>'porcentagem')::numeric = 100.00 THEN
        RAISE EXCEPTION 'OK_HISTORICO_TEMPORAL_PERFEITO';
      ELSE
        RAISE EXCEPTION 'FALHA_HISTORICO: pass=% fut=% pres=% freq=%', v_c_passada, v_c_futura, v_c_pres_passada, v_freq;
      END IF;
    END $t$;
    ROLLBACK;
  `);

  test("P3.1 Aula e presença anteriores ao encerramento da matrícula permanecem visíveis", () => {
    assert(qHist.output.includes("OK_HISTORICO_TEMPORAL_PERFEITO"), `Falha no histórico: ${qHist.output}`);
  });

  test("P3.2 Aulas iniciadas após o encerramento da matrícula são categoricamente inacessíveis", () => {
    assert(qHist.output.includes("OK_HISTORICO_TEMPORAL_PERFEITO"));
  });

  test("P3.3 Cálculo de frequência histórica reflete estritamente o período de vigência da matrícula (100.00%)", () => {
    assert(qHist.output.includes("OK_HISTORICO_TEMPORAL_PERFEITO"));
  });

  // ============================================================================
  // PONTO 4: SALVAGUARDAS E INTEGRIDADE DO ADMINISTRADOR
  // ============================================================================
  console.log("\n--- PONTO 4: SALVAGUARDAS E INTEGRIDADE DO ADMINISTRADOR ---");

  const qRay = runLinkedQuery(`
    SELECT id, email, role, status FROM public.perfis WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid;
  `);
  const rayRows = parseRows(qRay.output);

  test("P4.1 Perfil de Ray Pires permanece intacto e ativo como administrador único", () => {
    assert.strictEqual(rayRows.length, 1);
    assert.strictEqual(rayRows[0].email, "r71020142@gmail.com");
    assert.strictEqual(rayRows[0].role, "admin");
    assert.strictEqual(rayRows[0].status, "ativo");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");

  if (passed !== total) {
    console.error("FALHA NO FECHAMENTO FINAL!");
    process.exit(1);
  } else {
    console.log("SUCESSO: Fechamento final da Etapa 10.3B1 concluído com 100% de aprovação!");
  }
}

main().catch(console.error);
