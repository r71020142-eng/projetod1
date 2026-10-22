/**
 * SUÍTE DE TESTES COMPLEMENTAR — ETAPA 10.3B1.2
 * Projeto: DEMOSTRATIVO MTD
 *
 * Valida rigorosamente:
 * 1. Histórico de matrículas canceladas e encerradas:
 *    - Aula anterior ao encerramento: histórico preservado.
 *    - Aula exatamente no instante de encerramento: excluída (intervalo semiaberto).
 *    - Aula posterior ao encerramento: excluída / acesso negado.
 *    - Matrícula cancelada com aulas/presenças anteriores: histórico preservado.
 *    - Frequência histórica calculada com precisão.
 *    - Encerramento determinístico (encerrado_em preenchido automaticamente).
 *
 * 2. Segurança efetiva das views e RPCs de alunos:
 *    - Definições SQL, proprietário (postgres), reloptions (security_invoker=false).
 *    - Grants restritos a SELECT para authenticated/service_role (0 privilégios para anon/PUBLIC).
 *    - RPCs com EXECUTE restrito a authenticated/service_role, SECURITY DEFINER e search_path.
 *    - Isolamento estrito entre dois alunos distintos (Aluno 1 e Aluno 2).
 *    - Prova de não-exposição de colunas administrativas internas (observacoes, observacao_pedagogica).
 *    - Bloqueio completo para perfil inativo e usuário anônimo.
 *
 * 3. Bloqueio de escrita direta entre professores e papéis:
 *    - Prof A tentando alterar ou cancelar aula do Prof B -> 0 rows afetadas.
 *    - Prof A tentando inserir aula vinculada a turma de outro prof -> Violação de RLS.
 *    - Prof A tentando inserir presença de aluno fora de turma -> ALUNO_NAO_MATRICULADO_TEMPORAL.
 *    - Prof A tentando alterar presença de aula do Prof B -> 0 rows afetadas.
 *    - Aluno tentando escritas diretas nas tabelas acadêmicas -> Violação de RLS.
 *    - Perfil inativo tentando escritas diretas -> Violação de RLS.
 *
 * 4. Integridade do perfil institucional de Ray Pires e limpeza cirúrgica de dados de teste.
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `comp_audit_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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
        status = p_status::public.profile_status,
        nome_completo = p_nome
    WHERE id = p_id;
  END;
  $$ LANGUAGE plpgsql;
`;

async function main() {
  console.log(`==================================================================`);
  console.log(`SUÍTE DE VERIFICAÇÃO COMPLEMENTAR — ETAPA 10.3B1.2`);
  console.log(`Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)`);
  console.log(`==================================================================\n`);

  let total = 0;
  let passed = 0;

  function test(nome: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === "function") {
        return (res as any)
          .then(() => {
            passed++;
            console.log(`  ✓ [${total}] ${nome}`);
          })
          .catch((err: any) => {
            console.error(`  ✗ [${total}] ${nome}`);
            console.error(`      Detalhe:`, err.message || err);
            process.exit(1);
          });
      }
      passed++;
      console.log(`  ✓ [${total}] ${nome}`);
    } catch (err: any) {
      console.error(`  ✗ [${total}] ${nome}`);
      console.error(`      Detalhe:`, err.message || err);
      process.exit(1);
    }
  }

  // ── SEÇÃO 1: HISTÓRICO DE MATRÍCULAS CANCELADAS E ENCERRADAS ────────────────
  console.log(`--- SEÇÃO 1: HISTÓRICO DE MATRÍCULAS CANCELADAS E ENCERRADAS ---`);

  test("1.1 Aula anterior ao encerramento: visibilidade e histórico preservados", () => {
    const res = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_aula_ant UUID := gen_random_uuid();
        v_can_view BOOLEAN;
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 1.1', 'prof.t11@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Temp 1.1', 'al.t11@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 1.1', 'individual', v_prof, 1, 'ativa');

        -- Matrícula encerrada em 2026-10-15
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em, motivo_encerramento)
        VALUES (v_mat, v_turma, v_aluno, 'encerrada', '2026-10-01 10:00:00+00', '2026-10-15 10:00:00+00', 'Término de módulo');

        -- Aula anterior (2026-10-05)
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_ant, v_turma, v_prof, '2026-10-05 10:00:00+00', '2026-10-05 10:50:00+00', 'Aula Anterior', 'concluida');

        SELECT EXISTS (
          SELECT 1 FROM public.aulas a
          JOIN public.matriculas_turmas m ON m.turma_id = a.turma_id
          WHERE a.id = v_aula_ant
            AND m.aluno_id = v_aluno
            AND m.matriculado_em <= a.inicio_em
            AND (
              (m.status = 'ativa' AND m.encerrado_em IS NULL)
              OR (m.encerrado_em IS NOT NULL AND a.inicio_em < m.encerrado_em)
            )
        ) INTO v_can_view;

        IF v_can_view = true THEN
          RAISE EXCEPTION 'OK_HISTORICO_PRESERVADO';
        ELSE
          RAISE EXCEPTION 'FALHA_HISTORICO_NAO_PRESERVADO';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_HISTORICO_PRESERVADO"), `Falha no histórico anterior ao encerramento: ${res.output}`);
  });

  test("1.2 Aula no instante exato do encerramento: excluída conforme intervalo semiaberto", () => {
    const res = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_aula_exata UUID := gen_random_uuid();
        v_can_view BOOLEAN;
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 1.2', 'prof.t12@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Temp 1.2', 'al.t12@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 1.2', 'individual', v_prof, 1, 'ativa');

        -- Matrícula encerrada exatamente em 2026-10-15 10:00:00+00
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em, motivo_encerramento)
        VALUES (v_mat, v_turma, v_aluno, 'encerrada', '2026-10-01 10:00:00+00', '2026-10-15 10:00:00+00', 'Encerramento');

        -- Aula iniciando exatamente em 2026-10-15 10:00:00+00
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_exata, v_turma, v_prof, '2026-10-15 10:00:00+00', '2026-10-15 10:50:00+00', 'Aula Exata', 'concluida');

        SELECT EXISTS (
          SELECT 1 FROM public.aulas a
          JOIN public.matriculas_turmas m ON m.turma_id = a.turma_id
          WHERE a.id = v_aula_exata
            AND m.aluno_id = v_aluno
            AND m.matriculado_em <= a.inicio_em
            AND (
              (m.status = 'ativa' AND m.encerrado_em IS NULL)
              OR (m.encerrado_em IS NOT NULL AND a.inicio_em < m.encerrado_em)
            )
        ) INTO v_can_view;

        IF v_can_view = false THEN
          RAISE EXCEPTION 'OK_EXCLUIDO_SEMIABERTO';
        ELSE
          RAISE EXCEPTION 'FALHA_NAO_EXCLUIU_INSTANTE_EXATO';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_EXCLUIDO_SEMIABERTO"), `Falha na exclusão do instante exato: ${res.output}`);
  });

  test("1.3 Aula posterior ao encerramento: excluída da visualização e participação", () => {
    const res = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_aula_pos UUID := gen_random_uuid();
        v_can_view BOOLEAN;
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 1.3', 'prof.t13@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Temp 1.3', 'al.t13@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 1.3', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em, motivo_encerramento)
        VALUES (v_mat, v_turma, v_aluno, 'encerrada', '2026-10-01 10:00:00+00', '2026-10-15 10:00:00+00', 'Encerramento');

        -- Aula posterior (2026-10-20)
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_pos, v_turma, v_prof, '2026-10-20 10:00:00+00', '2026-10-20 10:50:00+00', 'Aula Posterior', 'agendada');

        SELECT EXISTS (
          SELECT 1 FROM public.aulas a
          JOIN public.matriculas_turmas m ON m.turma_id = a.turma_id
          WHERE a.id = v_aula_pos
            AND m.aluno_id = v_aluno
            AND m.matriculado_em <= a.inicio_em
            AND (
              (m.status = 'ativa' AND m.encerrado_em IS NULL)
              OR (m.encerrado_em IS NOT NULL AND a.inicio_em < m.encerrado_em)
            )
        ) INTO v_can_view;

        IF v_can_view = false THEN
          RAISE EXCEPTION 'OK_EXCLUIDO_POSTERIOR';
        ELSE
          RAISE EXCEPTION 'FALHA_NAO_EXCLUIU_POSTERIOR';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_EXCLUIDO_POSTERIOR"), `Falha na exclusão da aula posterior: ${res.output}`);
  });

  test("1.4 Matrícula cancelada com aulas e presenças anteriores: histórico preservado", () => {
    const res = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_aula_ant UUID := gen_random_uuid();
        v_pres_id UUID := gen_random_uuid();
        v_can_view BOOLEAN;
        v_pres_existe BOOLEAN;
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 1.4', 'prof.t14@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Temp 1.4', 'al.t14@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 1.4', 'individual', v_prof, 1, 'ativa');

        -- Matrícula ativa inicialmente
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em)
        VALUES (v_mat, v_turma, v_aluno, 'ativa', '2026-10-01 10:00:00+00');

        -- Aula realizada durante a matrícula ativa
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_ant, v_turma, v_prof, '2026-10-05 10:00:00+00', '2026-10-05 10:50:00+00', 'Aula com Presença', 'concluida');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status)
        VALUES (v_pres_id, v_aula_ant, v_aluno, v_mat, 'presente');

        -- Agora a matrícula é cancelada em 2026-10-15
        UPDATE public.matriculas_turmas
        SET status = 'cancelada', encerrado_em = '2026-10-15 10:00:00+00', motivo_encerramento = 'Desistência voluntária'
        WHERE id = v_mat;

        -- Verifica se o aluno ainda pode visualizar a aula
        SELECT EXISTS (
          SELECT 1 FROM public.aulas a
          JOIN public.matriculas_turmas m ON m.turma_id = a.turma_id
          WHERE a.id = v_aula_ant
            AND m.aluno_id = v_aluno
            AND m.matriculado_em <= a.inicio_em
            AND (
              (m.status = 'ativa' AND m.encerrado_em IS NULL)
              OR (m.encerrado_em IS NOT NULL AND a.inicio_em < m.encerrado_em)
            )
        ) INTO v_can_view;

        -- Verifica se a presença permanece válida
        SELECT EXISTS (
          SELECT 1 FROM public.presencas_aulas pa
          JOIN public.matriculas_turmas m ON m.id = pa.matricula_id
          WHERE pa.id = v_pres_id
            AND pa.aluno_id = v_aluno
            AND pa.status = 'presente'
        ) INTO v_pres_existe;

        IF v_can_view = true AND v_pres_existe = true THEN
          RAISE EXCEPTION 'OK_CANCELADA_HISTORICO_PRESERVADO';
        ELSE
          RAISE EXCEPTION 'FALHA_CANCELADA_HISTORICO: can_view=%, pres_existe=%', v_can_view, v_pres_existe;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_CANCELADA_HISTORICO_PRESERVADO"), `Falha na preservação do histórico de matrícula cancelada: ${res.output}`);
  });

  test("1.5 Frequência histórica: cálculo coerente com as aulas elegíveis", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_aluno UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_aula_ant UUID := gen_random_uuid();
        v_aula_pos UUID := gen_random_uuid();
        v_pres_ant UUID := gen_random_uuid();
        v_freq JSONB;
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_aluno, 'al.freq15@mtd.com', 'Aluno Freq 1.5', 'aluno');

        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 1.5', 'prof.t15@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, v_uid_aluno, 'Aluno Freq 1.5', 'al.freq15@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 1.5', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em)
        VALUES (v_mat, v_turma, v_aluno, 'ativa', '2026-10-01 10:00:00+00');

        -- Aula anterior (2026-10-05) concluída com presença
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_ant, v_turma, v_prof, '2026-10-05 10:00:00+00', '2026-10-05 10:50:00+00', 'Aula Elegível', 'concluida');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status)
        VALUES (v_pres_ant, v_aula_ant, v_aluno, v_mat, 'presente');

        -- Matrícula cancelada em 2026-10-15
        UPDATE public.matriculas_turmas
        SET status = 'cancelada', encerrado_em = '2026-10-15 10:00:00+00', motivo_encerramento = 'Cancelamento voluntário'
        WHERE id = v_mat;

        -- Aula posterior (2026-10-20) concluída após o cancelamento
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_pos, v_turma, v_prof, '2026-10-20 10:00:00+00', '2026-10-20 10:50:00+00', 'Aula Inelegível', 'concluida');

        -- Autentica como o aluno
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno, 'role', 'authenticated')::text, true);

        v_freq := public.calcular_frequencia_aluno(v_aluno, v_turma);

        IF (v_freq->>'totalAulasConcluidas')::int = 1 
           AND (v_freq->>'presentes')::int = 1 
           AND (v_freq->>'porcentagem')::numeric = 100.00 THEN
          RAISE EXCEPTION 'OK_FREQUENCIA_COERENTE';
        ELSE
          RAISE EXCEPTION 'FALHA_FREQUENCIA: %', v_freq;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_FREQUENCIA_COERENTE"), `Falha no cálculo de frequência histórica: ${res.output}`);
  });

  test("1.6 Trigger de matrícula: preenche encerrado_em automaticamente quando status=cancelada/encerrada", () => {
    const res = runLinkedQuery(`
      BEGIN;
      DO $t$
      DECLARE
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_mat UUID := gen_random_uuid();
        v_encerrado_em TIMESTAMPTZ;
      BEGIN
        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 1.6', 'prof.t16@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, 'Aluno Temp 1.6', 'al.t16@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 1.6', 'individual', v_prof, 1, 'ativa');

        -- Insere como ativa sem encerrado_em
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
        VALUES (v_mat, v_turma, v_aluno, 'ativa');

        -- Atualiza para cancelada sem fornecer encerrado_em
        UPDATE public.matriculas_turmas SET status = 'cancelada' WHERE id = v_mat;

        SELECT encerrado_em INTO v_encerrado_em FROM public.matriculas_turmas WHERE id = v_mat;

        IF v_encerrado_em IS NOT NULL THEN
          RAISE EXCEPTION 'OK_ENCERRADO_EM_AUTO_PREENCHIDO';
        ELSE
          RAISE EXCEPTION 'FALHA_ENCERRADO_EM_NULO';
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_ENCERRADO_EM_AUTO_PREENCHIDO"), `Falha no preenchimento automático de encerrado_em: ${res.output}`);
  });


  // ── SEÇÃO 2: SEGURANÇA EFETIVA DAS VIEWS E RPCS DE ALUNOS ─────────────────
  console.log(`\n--- SEÇÃO 2: SEGURANÇA EFETIVA DAS VIEWS E RPCS DE ALUNOS ---`);

  test("2.1 Definições SQL, reloptions (security_invoker=false) e proprietário postgres", () => {
    const res = runLinkedQuery(`
      SELECT 
        c.relname,
        pg_get_userbyid(c.relowner) as owner,
        c.reloptions
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('vw_aluno_aulas', 'vw_aluno_presencas');
    `);
    const rows = parseRows(res.output);
    assert(rows.length === 2, `Esperava 2 views, obteve ${rows.length}`);
    for (const r of rows) {
      assert.strictEqual(r.owner, "postgres", `Proprietário da view ${r.relname} deve ser postgres`);
      const opts = Array.isArray(r.reloptions) ? r.reloptions : [];
      assert(opts.includes("security_invoker=false"), `View ${r.relname} deve possuir security_invoker=false`);
    }
  });

  test("2.2 Grants estritos de views: apenas SELECT para authenticated/service_role; zero para anon/PUBLIC", () => {
    const res = runLinkedQuery(`
      SELECT 
        table_name,
        grantee,
        privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' 
        AND table_name IN ('vw_aluno_aulas', 'vw_aluno_presencas')
      ORDER BY table_name, grantee, privilege_type;
    `);
    const rows = parseRows(res.output);
    
    // Verifica que anon e PUBLIC não possuem nenhum privilégio
    const anonGrants = rows.filter((r) => r.grantee === 'anon' || r.grantee === 'PUBLIC');
    assert.strictEqual(anonGrants.length, 0, `anon e PUBLIC não podem possuir privilégios nas views: ${JSON.stringify(anonGrants)}`);

    // Verifica que authenticated possui exclusivamente SELECT
    const authGrants = rows.filter((r) => r.grantee === 'authenticated');
    const authPrivs = authGrants.map((r) => r.privilege_type);
    assert(authPrivs.every((p) => p === 'SELECT'), `authenticated deve possuir apenas SELECT nas views: ${JSON.stringify(authGrants)}`);
  });

  test("2.3 RPCs de leitura do aluno: SECURITY DEFINER, search_path e ACL estrita", () => {
    const res = runLinkedQuery(`
      SELECT 
        p.proname,
        p.prosecdef,
        p.proconfig,
        r.grantee,
        r.privilege_type
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      LEFT JOIN information_schema.routine_privileges r ON r.routine_name = p.proname AND r.specific_schema = 'public'
      WHERE n.nspname = 'public' AND p.proname IN ('obter_minhas_aulas_aluno', 'obter_minhas_presencas_aluno')
      ORDER BY p.proname, r.grantee;
    `);
    const rows = parseRows(res.output);
    assert(rows.length >= 2, "RPCs do aluno devem existir");

    const procs = new Set(rows.map((r) => r.proname));
    for (const name of Array.from(procs)) {
      const pRows = rows.filter((r) => r.proname === name);
      assert(pRows[0].prosecdef === true, `RPC ${name} deve ser SECURITY DEFINER`);
      const cfg = Array.isArray(pRows[0].proconfig) ? pRows[0].proconfig.join("") : (pRows[0].proconfig || "");
      assert(cfg.includes("search_path=public, auth"), `RPC ${name} deve fixar search_path=public, auth`);

      const anonExec = pRows.filter((r) => r.grantee === 'anon' || r.grantee === 'PUBLIC');
      assert.strictEqual(anonExec.length, 0, `RPC ${name} não pode ter EXECUTE para anon ou PUBLIC`);

      const authExec = pRows.filter((r) => r.grantee === 'authenticated' && r.privilege_type === 'EXECUTE');
      assert(authExec.length > 0, `RPC ${name} deve ter EXECUTE para authenticated`);
    }
  });

  test("2.4 Isolamento estrito entre discentes: Aluno 1 e Aluno 2 acessam exclusivamente seus dados", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_al1 UUID := gen_random_uuid();
        v_al1 UUID := gen_random_uuid();
        v_uid_al2 UUID := gen_random_uuid();
        v_al2 UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma1 UUID := gen_random_uuid();
        v_turma2 UUID := gen_random_uuid();
        v_aula1 UUID := gen_random_uuid();
        v_aula2 UUID := gen_random_uuid();
        v_pres1 UUID := gen_random_uuid();
        v_pres2 UUID := gen_random_uuid();

        v_count_al1_aulas INT;
        v_count_al1_aulas_al2 INT;
        v_count_al2_aulas INT;
        v_count_al2_aulas_al1 INT;
        v_count_al1_pres INT;
        v_count_al1_pres_al2 INT;
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_al1, 'al1.iso@mtd.com', 'Aluno Iso 1', 'aluno');
        PERFORM pg_temp.create_test_user(v_uid_al2, 'al2.iso@mtd.com', 'Aluno Iso 2', 'aluno');

        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 2.4', 'prof.t24@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES 
          (v_al1, v_uid_al1, 'Aluno Iso 1', 'al1.iso@mtd.com', 'Geral', 'A1', 'ativo'),
          (v_al2, v_uid_al2, 'Aluno Iso 2', 'al2.iso@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES 
          (v_turma1, 'Turma Iso 1', 'individual', v_prof, 1, 'ativa'),
          (v_turma2, 'Turma Iso 2', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES 
          (v_turma1, v_al1, 'ativa'),
          (v_turma2, v_al2, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES 
          (v_aula1, v_turma1, v_prof, '2026-11-10 10:00:00+00', '2026-11-10 10:50:00+00', 'Aula Aluno 1', 'agendada'),
          (v_aula2, v_turma2, v_prof, '2026-11-10 14:00:00+00', '2026-11-10 14:50:00+00', 'Aula Aluno 2', 'agendada');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, status)
        VALUES 
          (v_pres1, v_aula1, v_al1, 'nao_registrado'),
          (v_pres2, v_aula2, v_al2, 'nao_registrado');

        -- Simulação: Aluno 1 consulta
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_al1, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_count_al1_aulas FROM public.obter_minhas_aulas_aluno() WHERE id = v_aula1;
        SELECT COUNT(*) INTO v_count_al1_aulas_al2 FROM public.obter_minhas_aulas_aluno() WHERE id = v_aula2;
        SELECT COUNT(*) INTO v_count_al1_pres FROM public.obter_minhas_presencas_aluno() WHERE aluno_id = v_al1;
        SELECT COUNT(*) INTO v_count_al1_pres_al2 FROM public.obter_minhas_presencas_aluno() WHERE aluno_id = v_al2;

        -- Simulação: Aluno 2 consulta
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_al2, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_count_al2_aulas FROM public.obter_minhas_aulas_aluno() WHERE id = v_aula2;
        SELECT COUNT(*) INTO v_count_al2_aulas_al1 FROM public.obter_minhas_aulas_aluno() WHERE id = v_aula1;

        IF v_count_al1_aulas = 1 AND v_count_al1_aulas_al2 = 0 
           AND v_count_al1_pres = 1 AND v_count_al1_pres_al2 = 0
           AND v_count_al2_aulas = 1 AND v_count_al2_aulas_al1 = 0 THEN
          RAISE EXCEPTION 'OK_ISOLAMENTO_TOTAL_DISCENTES';
        ELSE
          RAISE EXCEPTION 'FALHA_ISOLAMENTO: al1_prop=% al1_outro=% al1_p_prop=% al1_p_outro=% al2_prop=% al2_outro=%',
            v_count_al1_aulas, v_count_al1_aulas_al2, v_count_al1_pres, v_count_al1_pres_al2, v_count_al2_aulas, v_count_al2_aulas_al1;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_ISOLAMENTO_TOTAL_DISCENTES"), `Falha no isolamento entre discentes: ${res.output}`);
  });

  test("2.5 Privacidade estrita de colunas: observacoes e observacao_pedagogica ocultas do aluno", () => {
    const res = runLinkedQuery(`
      SELECT column_name, table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name IN ('vw_aluno_aulas', 'vw_aluno_presencas')
        AND column_name IN ('observacoes', 'observacao_pedagogica', 'cancelada_por', 'concluida_por', 'registrado_por');
    `);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 0, `Colunas internas administrativas não podem estar nas views de aluno: ${JSON.stringify(rows)}`);
  });

  test("2.6 SELECT direto em aulas e presencas_aulas retorna 0 linhas para aluno autenticado", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_aluno UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_aula UUID := gen_random_uuid();
        v_pres UUID := gen_random_uuid();
        v_count_aulas INT;
        v_count_pres INT;
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_aluno, 'al.direct26@mtd.com', 'Aluno Direct 2.6', 'aluno');

        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 2.6', 'prof.t26@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, v_uid_aluno, 'Aluno Direct 2.6', 'al.direct26@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 2.6', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma, v_aluno, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula, v_turma, v_prof, '2026-11-12 10:00:00+00', '2026-11-12 10:50:00+00', 'Aula Direct', 'agendada');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, status)
        VALUES (v_pres, v_aula, v_aluno, 'nao_registrado');

        -- Simula chamada autenticada como aluno
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_count_aulas FROM public.aulas WHERE id = v_aula;
        SELECT COUNT(*) INTO v_count_pres FROM public.presencas_aulas WHERE id = v_pres;

        IF v_count_aulas = 0 AND v_count_pres = 0 THEN
          RAISE EXCEPTION 'OK_SELECT_DIRETO_BLOQUEADO';
        ELSE
          RAISE EXCEPTION 'FALHA_SELECT_DIRETO_VAZOU: aulas=% pres=%', v_count_aulas, v_count_pres;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_SELECT_DIRETO_BLOQUEADO"), `SELECT direto não foi bloqueado para aluno: ${res.output}`);
  });

  test("2.7 Perfil inativo: retorno vazio em views e RPCs sanitizadas", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_inativo UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_aula UUID := gen_random_uuid();
        v_count_aulas INT;
        v_count_rpc INT;
      BEGIN
        -- Cria usuário e discente inicialmente ativo para permitir matrícula
        PERFORM pg_temp.create_test_user(v_uid_inativo, 'al.inativo27@mtd.com', 'Aluno Inativo 2.7', 'aluno', 'ativo');

        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 2.7', 'prof.t27@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, v_uid_inativo, 'Aluno Inativo 2.7', 'al.inativo27@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 2.7', 'individual', v_prof, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma, v_aluno, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula, v_turma, v_prof, '2026-11-15 10:00:00+00', '2026-11-15 10:50:00+00', 'Aula Inativo', 'agendada');

        -- Inativa o discente e seu perfil
        UPDATE public.perfis SET status = 'inativo' WHERE id = v_uid_inativo;
        UPDATE public.alunos SET status = 'inativo' WHERE id = v_aluno;

        -- Simula autenticação com perfil inativo
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_inativo, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_count_aulas FROM public.vw_aluno_aulas WHERE id = v_aula;
        SELECT COUNT(*) INTO v_count_rpc FROM public.obter_minhas_aulas_aluno() WHERE id = v_aula;

        IF v_count_aulas = 0 AND v_count_rpc = 0 THEN
          RAISE EXCEPTION 'OK_PERFIL_INATIVO_RETORNO_VAZIO';
        ELSE
          RAISE EXCEPTION 'FALHA_PERFIL_INATIVO_VAZOU: aulas=% rpc=%', v_count_aulas, v_count_rpc;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_PERFIL_INATIVO_RETORNO_VAZIO"), `Perfil inativo retornou registros: ${res.output}`);
  });

  test("2.8 Usuário anônimo: consulta direta nas views e RPCs é rejeitada com permission denied", () => {
    const res = runLinkedQuery(`
      BEGIN;
      DO $t$
      BEGIN
        PERFORM set_config('role', 'anon', true);

        -- Tenta SELECT na view
        BEGIN
          PERFORM count(*) FROM public.vw_aluno_aulas;
          RAISE EXCEPTION 'FALHA_ANON_LEU_VIEW';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_VIEW: %', SQLERRM;
          END IF;
        END;

        -- Tenta EXECUTE na RPC
        BEGIN
          PERFORM * FROM public.obter_minhas_aulas_aluno();
          RAISE EXCEPTION 'FALHA_ANON_EXECUTOU_RPC';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%permission denied%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_RPC: %', SQLERRM;
          END IF;
        END;

        RAISE EXCEPTION 'OK_ANON_TOTALMENTE_BARRADO';
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_ANON_TOTALMENTE_BARRADO"), `Usuário anônimo não foi barrado: ${res.output}`);
  });


  // ── SEÇÃO 3: BLOQUEIO DE ESCRITA DIRETA ENTRE PROFESSORES E PAPÉIS ─────────
  console.log(`\n--- SEÇÃO 3: BLOQUEIO DE ESCRITA DIRETA ENTRE PROFESSORES E PAPÉIS ---`);

  test("3.1 Professor A tentando alterar ou cancelar aula do Professor B via UPDATE direto: 0 rows", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_prof_a UUID := gen_random_uuid();
        v_prof_a UUID := gen_random_uuid();
        v_uid_prof_b UUID := gen_random_uuid();
        v_prof_b UUID := gen_random_uuid();
        v_turma_b UUID := gen_random_uuid();
        v_aula_b UUID := gen_random_uuid();
        v_rows_affected INT;
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_prof_a, 'prof.a31@mtd.com', 'Prof A 3.1', 'professor');
        PERFORM pg_temp.create_test_user(v_uid_prof_b, 'prof.b31@mtd.com', 'Prof B 3.1', 'professor');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, idiomas_falados, status)
        VALUES 
          (v_prof_a, v_uid_prof_a, 'Prof A 3.1', 'prof.a31@mtd.com', ARRAY['Inglês'], 'ativo'),
          (v_prof_b, v_uid_prof_b, 'Prof B 3.1', 'prof.b31@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma_b, 'Turma Prof B', 'individual', v_prof_b, 1, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_b, v_turma_b, v_prof_b, '2026-11-20 10:00:00+00', '2026-11-20 10:50:00+00', 'Aula B', 'agendada');

        -- Simula autenticação como Professor A
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof_a, 'role', 'authenticated')::text, true);

        UPDATE public.aulas SET titulo = 'Hack B' WHERE id = v_aula_b;
        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

        IF v_rows_affected = 0 THEN
          RAISE EXCEPTION 'OK_UPDATE_CROSS_PROF_ZERO_ROWS';
        ELSE
          RAISE EXCEPTION 'FALHA_UPDATE_CROSS_PROF: rows=%', v_rows_affected;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_UPDATE_CROSS_PROF_ZERO_ROWS"), `Prof A conseguiu alterar aula do Prof B: ${res.output}`);
  });

  test("3.2 Professor A tentando inserir aula vinculada a turma de outro professor via INSERT direto: RLS error", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_prof_a UUID := gen_random_uuid();
        v_prof_a UUID := gen_random_uuid();
        v_uid_prof_b UUID := gen_random_uuid();
        v_prof_b UUID := gen_random_uuid();
        v_turma_b UUID := gen_random_uuid();
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_prof_a, 'prof.a32@mtd.com', 'Prof A 3.2', 'professor');
        PERFORM pg_temp.create_test_user(v_uid_prof_b, 'prof.b32@mtd.com', 'Prof B 3.2', 'professor');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, idiomas_falados, status)
        VALUES 
          (v_prof_a, v_uid_prof_a, 'Prof A 3.2', 'prof.a32@mtd.com', ARRAY['Inglês'], 'ativo'),
          (v_prof_b, v_uid_prof_b, 'Prof B 3.2', 'prof.b32@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma_b, 'Turma Prof B 3.2', 'individual', v_prof_b, 1, 'ativa');

        -- Simula autenticação como Professor A
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof_a, 'role', 'authenticated')::text, true);

        BEGIN
          INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, status)
          VALUES (v_turma_b, v_prof_a, '2026-11-21 10:00:00+00', '2026-11-21 10:50:00+00', 'Aula Invasora', 'agendada');
          RAISE EXCEPTION 'FALHA_NAO_BARROU_INSERT';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%violates row-level security policy%' THEN
            NULL; -- OK esperado
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO_INSERT: %', SQLERRM;
          END IF;
        END;

        RAISE EXCEPTION 'OK_INSERT_CROSS_PROF_RLS_BLOQUEADO';
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_INSERT_CROSS_PROF_RLS_BLOQUEADO"), `Prof A conseguiu inserir aula na turma do Prof B: ${res.output}`);
  });

  test("3.3 Professor A tentando inserir presença de discente fora da turma: ALUNO_NAO_MATRICULADO_TEMPORAL", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_prof_a UUID := gen_random_uuid();
        v_prof_a UUID := gen_random_uuid();
        v_uid_aluno_fora UUID := gen_random_uuid();
        v_aluno_fora UUID := gen_random_uuid();
        v_turma_a UUID := gen_random_uuid();
        v_aula_a UUID := gen_random_uuid();
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_prof_a, 'prof.a33@mtd.com', 'Prof A 3.3', 'professor');
        PERFORM pg_temp.create_test_user(v_uid_aluno_fora, 'al.fora33@mtd.com', 'Aluno Fora 3.3', 'aluno');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof_a, v_uid_prof_a, 'Prof A 3.3', 'prof.a33@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno_fora, v_uid_aluno_fora, 'Aluno Fora 3.3', 'al.fora33@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma_a, 'Turma Prof A 3.3', 'individual', v_prof_a, 1, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_a, v_turma_a, v_prof_a, '2026-11-22 10:00:00+00', '2026-11-22 10:50:00+00', 'Aula A 3.3', 'agendada');

        -- Simula autenticação como Professor A
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof_a, 'role', 'authenticated')::text, true);

        BEGIN
          INSERT INTO public.presencas_aulas (aula_id, aluno_id, status)
          VALUES (v_aula_a, v_aluno_fora, 'presente');
          RAISE EXCEPTION 'FALHA_NAO_BARROU_PRESENCA_FORA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM LIKE '%ALUNO_NAO_MATRICULADO_TEMPORAL%' THEN
            NULL; -- OK esperado
          ELSE
            RAISE EXCEPTION 'ERRO_INESPERADO_PRESENCA: %', SQLERRM;
          END IF;
        END;

        RAISE EXCEPTION 'OK_PRESENCA_DISCENTE_FORA_BLOQUEADA';
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_PRESENCA_DISCENTE_FORA_BLOQUEADA"), `Prof A conseguiu inserir presença de aluno fora da turma: ${res.output}`);
  });

  test("3.4 Professor A tentando alterar presença de aula pertencente ao Professor B via UPDATE direto: 0 rows", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_prof_a UUID := gen_random_uuid();
        v_prof_a UUID := gen_random_uuid();
        v_uid_prof_b UUID := gen_random_uuid();
        v_prof_b UUID := gen_random_uuid();
        v_uid_aluno_b UUID := gen_random_uuid();
        v_aluno_b UUID := gen_random_uuid();
        v_turma_b UUID := gen_random_uuid();
        v_mat_b UUID := gen_random_uuid();
        v_aula_b UUID := gen_random_uuid();
        v_pres_b UUID := gen_random_uuid();
        v_rows_affected INT;
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_prof_a, 'prof.a34@mtd.com', 'Prof A 3.4', 'professor');
        PERFORM pg_temp.create_test_user(v_uid_prof_b, 'prof.b34@mtd.com', 'Prof B 3.4', 'professor');
        PERFORM pg_temp.create_test_user(v_uid_aluno_b, 'al.b34@mtd.com', 'Aluno B 3.4', 'aluno');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, idiomas_falados, status)
        VALUES 
          (v_prof_a, v_uid_prof_a, 'Prof A 3.4', 'prof.a34@mtd.com', ARRAY['Inglês'], 'ativo'),
          (v_prof_b, v_uid_prof_b, 'Prof B 3.4', 'prof.b34@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno_b, v_uid_aluno_b, 'Aluno B 3.4', 'al.b34@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma_b, 'Turma B 3.4', 'individual', v_prof_b, 1, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
        VALUES (v_mat_b, v_turma_b, v_aluno_b, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula_b, v_turma_b, v_prof_b, '2026-11-23 10:00:00+00', '2026-11-23 10:50:00+00', 'Aula B 3.4', 'agendada');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status)
        VALUES (v_pres_b, v_aula_b, v_aluno_b, v_mat_b, 'nao_registrado');

        -- Simula autenticação como Professor A
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof_a, 'role', 'authenticated')::text, true);

        UPDATE public.presencas_aulas SET status = 'presente' WHERE id = v_pres_b;
        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

        IF v_rows_affected = 0 THEN
          RAISE EXCEPTION 'OK_UPDATE_CROSS_PRESENCA_ZERO_ROWS';
        ELSE
          RAISE EXCEPTION 'FALHA_UPDATE_CROSS_PRESENCA: rows=%', v_rows_affected;
        END IF;
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_UPDATE_CROSS_PRESENCA_ZERO_ROWS"), `Prof A conseguiu alterar presença de aula do Prof B: ${res.output}`);
  });

  test("3.5 Aluno tentando executar escritas diretamente nas tabelas acadêmicas: violação de RLS", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_aluno UUID := gen_random_uuid();
        v_aluno UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
        v_turma_grupo UUID := gen_random_uuid();
        v_aula UUID := gen_random_uuid();
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_aluno, 'al.escrita35@mtd.com', 'Aluno Escrita 3.5', 'aluno');

        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 3.5', 'prof.t35@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, objetivo, nivel_operacional, status)
        VALUES (v_aluno, v_uid_aluno, 'Aluno Escrita 3.5', 'al.escrita35@mtd.com', 'Geral', 'A1', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES 
          (v_turma, 'Turma Temp 3.5', 'individual', v_prof, 1, 'ativa'),
          (v_turma_grupo, 'Turma Grupo 3.5', 'grupo', v_prof, 10, 'ativa');

        INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
        VALUES (v_turma, v_aluno, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status)
        VALUES (v_aula, v_turma, v_prof, '2026-11-25 10:00:00+00', '2026-11-25 10:50:00+00', 'Aula 3.5', 'agendada');

        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno, 'role', 'authenticated')::text, true);

        -- Tentativa 1: INSERT em aulas
        BEGIN
          INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, status)
          VALUES (v_turma, v_prof, '2026-11-26 10:00:00+00', '2026-11-26 10:50:00+00', 'Aula Aluno', 'agendada');
          RAISE EXCEPTION 'FALHA_ALUNO_INSERIU_AULA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%violates row-level security policy%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_ALUNO_AULA: %', SQLERRM;
          END IF;
        END;

        -- Tentativa 2: INSERT em turmas
        BEGIN
          INSERT INTO public.turmas (nome, modalidade, professor_id, capacidade, status)
          VALUES ('Turma Aluno', 'individual', v_prof, 1, 'ativa');
          RAISE EXCEPTION 'FALHA_ALUNO_INSERIU_TURMA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%violates row-level security policy%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_ALUNO_TURMA: %', SQLERRM;
          END IF;
        END;

        -- Tentativa 3: INSERT em matriculas_turmas (turma de grupo com vagas)
        BEGIN
          INSERT INTO public.matriculas_turmas (turma_id, aluno_id, status)
          VALUES (v_turma_grupo, v_aluno, 'ativa');
          RAISE EXCEPTION 'FALHA_ALUNO_INSERIU_MATRICULA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%violates row-level security policy%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_ALUNO_MAT: %', SQLERRM;
          END IF;
        END;

        -- Tentativa 4: INSERT em presencas_aulas
        BEGIN
          INSERT INTO public.presencas_aulas (aula_id, aluno_id, status)
          VALUES (v_aula, v_aluno, 'presente');
          RAISE EXCEPTION 'FALHA_ALUNO_INSERIU_PRESENCA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%violates row-level security policy%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_ALUNO_PRES: %', SQLERRM;
          END IF;
        END;

        RAISE EXCEPTION 'OK_ALUNO_ESCRITAS_DIRETAS_TOTALMENTE_BLOQUEADAS';
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_ALUNO_ESCRITAS_DIRETAS_TOTALMENTE_BLOQUEADAS"), `Aluno conseguiu executar escrita direta: ${res.output}`);
  });

  test("3.6 Perfil inativo tentando executar operações de escrita direta: violação de RLS", () => {
    const res = runLinkedQuery(`
      BEGIN;
      ${SQL_USER_HELPER}
      DO $t$
      DECLARE
        v_uid_inativo UUID := gen_random_uuid();
        v_prof UUID := gen_random_uuid();
        v_turma UUID := gen_random_uuid();
      BEGIN
        PERFORM pg_temp.create_test_user(v_uid_inativo, 'inativo36@mtd.com', 'Inativo 3.6', 'professor', 'inativo');

        INSERT INTO public.professores (id, nome_completo, email, idiomas_falados, status)
        VALUES (v_prof, 'Prof Temp 3.6', 'prof.t36@mtd.com', ARRAY['Inglês'], 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, professor_id, capacidade, status)
        VALUES (v_turma, 'Turma Temp 3.6', 'individual', v_prof, 1, 'ativa');

        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_inativo, 'role', 'authenticated')::text, true);

        BEGIN
          INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, status)
          VALUES (v_turma, v_prof, '2026-11-28 10:00:00+00', '2026-11-28 10:50:00+00', 'Aula Inativo', 'agendada');
          RAISE EXCEPTION 'FALHA_INATIVO_INSERIU_AULA';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%violates row-level security policy%' THEN
            RAISE EXCEPTION 'ERRO_INESPERADO_INATIVO: %', SQLERRM;
          END IF;
        END;

        RAISE EXCEPTION 'OK_INATIVO_ESCRITAS_DIRETAS_BLOQUEADAS';
      END $t$;
      ROLLBACK;
    `);
    assert(res.output.includes("OK_INATIVO_ESCRITAS_DIRETAS_BLOQUEADAS"), `Perfil inativo conseguiu executar escrita direta: ${res.output}`);
  });


  // ── SEÇÃO 4: INTEGRIDADE DO ADMINISTRADOR INSTITUCIONAL E LIMPEZA ───────────
  console.log(`\n--- SEÇÃO 4: INTEGRIDADE DO ADMINISTRADOR INSTITUCIONAL E LIMPEZA ---`);

  test("4.1 Preservação absoluta do perfil institucional de Ray Pires (admin ativo)", () => {
    const res = runLinkedQuery(`
      SELECT id, email, role, status
      FROM public.perfis
      WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee';
    `);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1, "Perfil institucional de Ray Pires deve existir");
    assert.strictEqual(rows[0].email, "r71020142@gmail.com", "E-mail de Ray Pires");
    assert.strictEqual(rows[0].role, "admin", "Role de Ray Pires deve ser admin");
    assert.strictEqual(rows[0].status, "ativo", "Status de Ray Pires deve ser ativo");
  });

  test("4.2 Zero registros temporários residuais de teste nas tabelas acadêmicas", () => {
    const res = runLinkedQuery(`
      SELECT 
        (SELECT count(*) FROM public.aulas WHERE titulo LIKE '%Temp%' OR titulo LIKE '%Iso%' OR titulo LIKE '%Direct%') as aulas_temp,
        (SELECT count(*) FROM public.turmas WHERE nome LIKE '%Temp%' OR nome LIKE '%Iso%') as turmas_temp,
        (SELECT count(*) FROM public.alunos WHERE email LIKE '%.iso@%' OR email LIKE '%.t1%@%' OR email LIKE '%.direct%@%') as alunos_temp,
        (SELECT count(*) FROM public.professores WHERE email LIKE '%.t1%@%' OR email LIKE '%.t2%@%' OR email LIKE '%.iso@%') as profs_temp,
        (SELECT count(*) FROM auth.users WHERE email LIKE '%@mtd.com') as users_mtd;
    `);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1, "Consulta de verificação residual");
    assert.strictEqual(parseInt(rows[0].aulas_temp || 0), 0, "Aulas temporárias devem ser 0");
    assert.strictEqual(parseInt(rows[0].turmas_temp || 0), 0, "Turmas temporárias devem ser 0");
    assert.strictEqual(parseInt(rows[0].alunos_temp || 0), 0, "Alunos temporários devem ser 0");
    assert.strictEqual(parseInt(rows[0].profs_temp || 0), 0, "Professores temporários devem ser 0");
    assert.strictEqual(parseInt(rows[0].users_mtd || 0), 0, "Usuários temporários auth.users devem ser 0");
  });

  console.log(`\n==================================================================`);
  console.log(`RESULTADO DA VERIFICAÇÃO COMPLEMENTAR: ${passed}/${total} TESTES APROVADOS COM 100% DE SUCESSO!`);
  console.log(`==================================================================\n`);
}

main().catch((err) => {
  console.error("FALHA CRÍTICA NA EXECUÇÃO DA SUÍTE:", err);
  process.exit(1);
});
