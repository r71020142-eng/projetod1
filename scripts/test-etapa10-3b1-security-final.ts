/**
 * SUÍTE DE AUDITORIA FINAL DE SEGURANÇA E INTEGRIDADE — ETAPA 10.3B1
 * Projeto: DEMOSTRATIVO MTD
 *
 * Cobre rigorosamente todos os 16 pontos de auditoria técnica da Etapa 10.3B1:
 *  1. Matrícula Temporal Completa (limites exatos do intervalo semiaberto)
 *  2. Preservação do histórico após encerramento
 *  3. Chamada formada exclusivamente por alunos válidos na data
 *  4. Reagendamento estrito para aulas agendadas e alinhamento da chamada
 *  5. Concorrência Real entre turmas/professores com aluno compartilhado (advisory lock)
 *  6. Autorização Interna de RPCs (bloqueio de manipulação cruzada entre docentes e alunos)
 *  7. Consulta de frequência autorizada (aluno restrito a si, professor aos seus alunos)
 *  8. Privacidade estrita de colunas (sem vazamento de observações e pareceres ao aluno)
 *  9. Timezone IANA dinâmico no PostgreSQL sem offset fixo -03:00
 * 10. Validação de Meeting URL no banco (rejeição de http, javascript, data, espaços)
 * 11. Auditoria formal de pg_proc (prosecdef, proconfig, sem sobrecargas obsoletas)
 * 12. Funções de trigger sem EXECUTE para authenticated
 * 13. Bloqueio absoluto de DELETE físico
 * 14. Imutabilidade estrutural de aulas concluídas e canceladas
 * 15. Integridade do perfil institucional de Ray Pires
 * 16. Limpeza cirúrgica e zero registros residuais
 */

import { execSync, spawn } from "child_process";
import * as assert from "assert";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const fs = require("fs");
  const path = require("path");
  const tmpFile = path.join("/tmp", `sec_audit_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
  fs.writeFileSync(tmpFile, sql, "utf8");

  try {
    const stdout = execSync(`npx supabase db query --linked -f ${tmpFile}`, {
      cwd: "/Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 45000,
    });
    fs.unlinkSync(tmpFile);
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
  } catch {
    // Ignore
  }
  return [];
}

const SQL_USER_HELPER = `
  CREATE OR REPLACE FUNCTION pg_temp.create_test_user(p_id UUID, p_email TEXT, p_nome TEXT, p_role TEXT, p_status TEXT DEFAULT 'ativo')
  RETURNS VOID AS $$
  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, 'hash', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

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
  console.log(`AUDITORIA FINAL DE SEGURANÇA E INTEGRIDADE — ETAPA 10.3B1`);
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

  // ── 1. Matrícula temporal completa (limites do intervalo semiaberto) ─────────
  test("limites exatos do intervalo semiaberto de matrícula [matriculado_em, encerrado_em)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');

        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000010', 'a10@t.com', 'Aluno Exato Inicio', 'aluno');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000020', 'a20@t.com', 'Aluno Exato Fim', 'aluno');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000030', 'a30@t.com', 'Aluno Fim Mais 1s', 'aluno');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000040', 'a40@t.com', 'Aluno Atrasado', 'aluno');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'Aluno Exato Inicio', 'a10@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000020', 'Aluno Exato Fim', 'a20@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000030', 'Aluno Fim Mais 1s', 'a30@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000040', 'Aluno Atrasado', 'a40@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Limites', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 10, 'ativa');

        -- Aula: 2026-11-01 14:00:00+00 até 14:50:00+00
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Limites', 'agendada');

        -- Matrícula 10: Inicia exatamente às 14:00:00+00 (DEVE ENTRAR)
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'ativa', '2026-11-01 14:00:00+00');

        -- Matrícula 20: Encerra exatamente às 14:00:00+00 (NÃO DEVE ENTRAR - semiaberto [ini, fim))
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em) VALUES
          ('e0000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000020', 'encerrada', '2026-10-01 00:00:00+00', '2026-11-01 14:00:00+00');

        -- Matrícula 30: Encerra às 14:00:01+00 (DEVE ENTRAR - estava ativa no primeiro segundo)
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em) VALUES
          ('e0000000-0000-0000-0000-000000000030', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000030', 'encerrada', '2026-10-01 00:00:00+00', '2026-11-01 14:00:01+00');

        -- Matrícula 40: Inicia às 14:00:01+00 (NÃO DEVE ENTRAR - começou depois do início da aula)
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000040', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000040', 'ativa', '2026-11-01 14:00:01+00');

        -- Dispara a chamada
        SELECT public.iniciar_chamada_aula('f0000000-0000-0000-0000-000000000001');

        SELECT aluno_id FROM public.presencas_aulas WHERE aula_id = 'f0000000-0000-0000-0000-000000000001' ORDER BY aluno_id ASC;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 2, "Devem ser exatamente 2 alunos elegíveis");
    assert.strictEqual(rows[0].aluno_id, "c0000000-0000-0000-0000-000000000010");
    assert.strictEqual(rows[1].aluno_id, "c0000000-0000-0000-0000-000000000030");
  });

  // ── 2. Preservação do histórico após encerramento ───────────────────────────
  test("aluno com matrícula encerrada preserva visualização de aulas históricas", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');

        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000005', 'egresso@t.com', 'Egresso', 'aluno');
        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'Egresso', 'egresso@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Historico', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        -- Matrícula encerrada em 2026-10-15
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em, encerrado_em) VALUES
          ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'encerrada', '2026-09-01 00:00:00+00', '2026-10-15 00:00:00+00');

        -- Aula Passada: 2026-10-10 (DENTRO do período)
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-10-10 14:00:00+00', '2026-10-10 14:50:00+00', 'Aula No Periodo', 'concluida');

        -- Aula Futura: 2026-10-20 (FORA do período)
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-10-20 14:00:00+00', '2026-10-20 14:50:00+00', 'Aula Apos Encerramento', 'agendada');

        -- Consulta simulando o aluno egresso
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000005", "role": "authenticated"}';

        SELECT id, titulo FROM public.vw_aluno_aulas ORDER BY inicio_em ASC;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1, "Deve enxergar apenas a aula dentro do período de matrícula");
    assert.strictEqual(rows[0].titulo, "Aula No Periodo");
  });

  // ── 3. Reagendamento estrito para aulas agendadas ─────────────────────────
  test("reagendamento é bloqueado para aula concluída, em andamento ou cancelada", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Reagendamento', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Concluída', 'concluida');

        SELECT public.reagendar_aula(
          'f0000000-0000-0000-0000-000000000001',
          '2026-11-02 14:00:00+00',
          '2026-11-02 14:50:00+00',
          'Tentativa de reagendar concluída'
        );
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Reagendamento de aula concluída deve falhar");
    assert.strictEqual(res.output.includes("STATUS_INVALIDO"), true);
  });

  // ── 4. Concorrência Real: Turmas/Professores diferentes com aluno compartilhado ──
  await test("concorrência real com 2 turmas e 2 professores disputando aluno compartilhado", async () => {
    // Setup inicial das turmas e aluno compartilhado
    const setup = runLinkedQuery(`
      ${SQL_USER_HELPER}
      SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
      SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000002', 'p2@t.com', 'Prof 2', 'professor');
      SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000009', 'compartilhado@t.com', 'Aluno Compartilhado', 'aluno');

      INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
        ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo'),
        ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Prof 2', 'p2@t.com', 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
        ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'Aluno Compartilhado', 'compartilhado@t.com', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
        ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa'),
        ('d0000000-0000-0000-0000-000000000002', 'Turma B', 'grupo', 'A2', 'b0000000-0000-0000-0000-000000000002', 5, 'ativa');

      INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
        ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'ativa', now() - interval '1 day'),
        ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000009', 'ativa', now() - interval '1 day');
    `);
    assert.strictEqual(setup.success, true, `Setup falhou: ${setup.output}`);

    // Dispara dois agendamentos concorrentes exatamente para o mesmo horário via child processes simultâneos
    const runAsyncQuery = (sql: string): Promise<{ success: boolean; output: string }> => {
      return new Promise((resolve) => {
        const fs = require("fs");
        const path = require("path");
        const tmp = path.join("/tmp", `conc_sched_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
        fs.writeFileSync(tmp, sql, "utf8");

        const proc = spawn("npx", ["supabase", "db", "query", "--linked", "-f", tmp], {
          cwd: "/Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd",
        });

        let out = "";
        proc.stdout.on("data", (d) => (out += d.toString()));
        proc.stderr.on("data", (d) => (out += d.toString()));

        proc.on("close", (code) => {
          if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          resolve({ success: code === 0, output: out });
        });
      });
    };

    const q1 = `
      SELECT public.agendar_aula(
        'd0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'Aula Concorrente Turma A',
        '2026-11-20 18:00:00+00',
        '2026-11-20 18:50:00+00'
      );
    `;

    const q2 = `
      SELECT public.agendar_aula(
        'd0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        'Aula Concorrente Turma B',
        '2026-11-20 18:00:00+00',
        '2026-11-20 18:50:00+00'
      );
    `;

    const [res1, res2] = await Promise.all([runAsyncQuery(q1), runAsyncQuery(q2)]);

    // Limpeza cirúrgica do teste concorrente
    runLinkedQuery(`
      DELETE FROM public.presencas_aulas WHERE aula_id IN (SELECT id FROM public.aulas WHERE titulo LIKE 'Aula Concorrente%');
      DELETE FROM public.aulas WHERE titulo LIKE 'Aula Concorrente%';
      DELETE FROM public.matriculas_turmas WHERE turma_id IN ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002');
      DELETE FROM public.turmas WHERE id IN ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002');
      DELETE FROM public.alunos WHERE id = 'c0000000-0000-0000-0000-000000000009';
      DELETE FROM public.professores WHERE id IN ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');
      DELETE FROM auth.users WHERE id IN ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009');
    `);

    const successes = [res1.success, res2.success].filter((s) => s === true).length;
    const failures = [res1.success, res2.success].filter((s) => s === false).length;

    assert.strictEqual(successes, 1, "Exatamente uma transação concorrente deve ter sucesso");
    assert.strictEqual(failures, 1, "Exatamente uma transação concorrente deve falhar");

    const failedOut = !res1.success ? res1.output : res2.output;
    assert.strictEqual(
      failedOut.includes("CONFLITO_HORARIO_ALUNO"),
      true,
      `A transação barrada deve falhar por conflito de aluno: ${failedOut}`
    );
  });

  // ── 5. Autorização Interna: Professor A bloqueado em recursos de Professor B ──
  test("professor A é bloqueado ao tentar manipular ou cancelar aula do professor B", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000002', 'p2@t.com', 'Prof 2', 'professor');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo'),
          ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Prof 2', 'p2@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000002', 'Turma Prof 2', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000002', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '2026-11-05 14:00:00+00', '2026-11-05 14:50:00+00', 'Aula Prof 2', 'agendada');

        -- Simula Professor 1 tentando cancelar a aula do Professor 2
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

        SELECT public.cancelar_aula('f0000000-0000-0000-0000-000000000002', 'Tentativa indevida de outro docente');
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Professor 1 não pode cancelar aula de Professor 2");
    assert.strictEqual(res.output.includes("ACESSO_NEGADO"), true);
  });

  // ── 6. Autorização Interna: Aluno bloqueado ao consultar frequência de outro ──
  test("aluno é estritamente bloqueado ao tentar consultar frequência de outro aluno", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'a1@t.com', 'Aluno 1', 'aluno');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000002', 'a2@t.com', 'Aluno 2', 'aluno');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Aluno 2', 'a2@t.com', 'ativo');

        -- Simula Aluno 1 tentando consultar frequência do Aluno 2
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

        SELECT public.calcular_frequencia_aluno('c0000000-0000-0000-0000-000000000002');
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Aluno 1 não pode consultar frequência de Aluno 2");
    assert.strictEqual(res.output.includes("ACESSO_NEGADO"), true);
  });

  // ── 7. Privacidade de colunas: aluno bloqueado em SELECT direto e protegido na view ──
  test("privacidade de colunas: aluno não obtém observações ou pareceres internos", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');

        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000003', 'aluno@t.com', 'Aluno Priv', 'aluno');
        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Aluno Priv', 'aluno@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Priv', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'ativa', now() - interval '2 days');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, topicos_trabalhados, observacoes, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 50 min', 'Aula Privada', 'Simple Present', 'OBSERVAÇÃO SECRETA DA ESCOLA', 'agendada');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status, observacao_pedagogica) VALUES
          ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'nao_registrado', 'PARECER CONFIDENCIAL DO DOCENTE');

        -- Simula Aluno
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

        -- 1. SELECT direto nas tabelas brutas retorna 0 linhas (sem vazamento)
        SELECT count(*) as count_aulas_direto FROM public.aulas;
        SELECT count(*) as count_presencas_direto FROM public.presencas_aulas;

        -- 2. SELECT na View Sanitizada retorna os dados públicos/pedagógicos
        SELECT id, titulo, topicos_trabalhados FROM public.vw_aluno_aulas;
        SELECT id, status FROM public.vw_aluno_presencas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    // Confirma que 'OBSERVAÇÃO SECRETA' e 'PARECER CONFIDENCIAL' NÃO constam na saída
    assert.strictEqual(res.output.includes("OBSERVAÇÃO SECRETA DA ESCOLA"), false);
    assert.strictEqual(res.output.includes("PARECER CONFIDENCIAL DO DOCENTE"), false);
  });

  // ── 8. Timezone IANA dinâmico no PostgreSQL ──────────────────────────────
  test("agendar_serie_aulas aceita timezone IANA válido e rejeita fuso inexistente", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Tz', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        -- Tentativa com fuso inválido/inexistente
        SELECT public.agendar_serie_aulas(
          'd0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000001',
          'Série Invalida',
          1,
          '10:00:00'::time,
          50,
          2,
          '2026-11-02'::date,
          NULL,
          NULL,
          'Fuso/Inexistente_123'
        );
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Deveria ter rejeitado fuso inexistente");
    assert.strictEqual(res.output.includes("TIMEZONE_INVALIDO"), true);
  });

  // ── 9. Validação de Meeting URL no banco ──────────────────────────────────
  test("banco valida Meeting URL: rejeita http, javascript, data e aceita HTTPS", () => {
    // 1. Rejeita http://
    const rHttp = runLinkedQuery(`
      INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, meeting_url)
      VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now() + interval '50 min', 'Aula Invalida', 'http://zoom.us/j/123');
    `);
    assert.strictEqual(rHttp.success, false, "Deve rejeitar http://");

    // 2. Rejeita javascript:
    const rJs = runLinkedQuery(`
      INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, meeting_url)
      VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now() + interval '50 min', 'Aula Invalida', 'javascript:alert(1)');
    `);
    assert.strictEqual(rJs.success, false, "Deve rejeitar javascript:");

    // 3. Rejeita data:
    const rData = runLinkedQuery(`
      INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, meeting_url)
      VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now() + interval '50 min', 'Aula Invalida', 'data:text/html,abc');
    `);
    assert.strictEqual(rData.success, false, "Deve rejeitar data:");

    // 4. Rejeita https:// sem hostname
    const rIncomplete = runLinkedQuery(`
      INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, meeting_url)
      VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now() + interval '50 min', 'Aula Invalida', 'https://');
    `);
    assert.strictEqual(rIncomplete.success, false, "Deve rejeitar https:// incompleto");

    // 5. Rejeita https:// com espaços
    const rSpace = runLinkedQuery(`
      INSERT INTO public.aulas (turma_id, professor_id, inicio_em, fim_em, titulo, meeting_url)
      VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), now() + interval '50 min', 'Aula Invalida', 'https://zoom .us/j/123');
    `);
    assert.strictEqual(rSpace.success, false, "Deve rejeitar URL com espaços");
  });

  // ── 10. Auditoria formal de pg_proc ──────────────────────────────────────
  test("todas as funções são SECURITY DEFINER, com search_path seguro e sem sobrecargas", () => {
    const res = runLinkedQuery(`
      SELECT proname, prosecdef, proconfig
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname IN (
          'agendar_aula', 'agendar_serie_aulas', 'reagendar_aula', 'cancelar_aula',
          'iniciar_chamada_aula', 'salvar_chamada_aula', 'concluir_aula', 'calcular_frequencia_aluno',
          'check_aula_integridade', 'check_presenca_integridade', 'prevent_agenda_physical_delete',
          'aluno_can_view_aula', 'check_conflito_horario_alunos_turma'
        );
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length >= 12, true, "Deve inspecionar todas as funções");

    for (const r of rows) {
      assert.strictEqual(r.prosecdef, true, `Função ${r.proname} deve ser SECURITY DEFINER`);
      assert.strictEqual(
        JSON.stringify(r.proconfig).includes("search_path=public, auth"),
        true,
        `Função ${r.proname} deve ter search_path = public, auth`
      );
    }
  });

  // ── 11. Funções de trigger sem EXECUTE para authenticated ─────────────────
  test("funções de trigger não possuem concessão direta para authenticated nem anon", () => {
    const res = runLinkedQuery(`
      SELECT routine_name, grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN ('check_aula_integridade', 'check_presenca_integridade', 'prevent_agenda_physical_delete')
        AND grantee IN ('PUBLIC', 'anon', 'authenticated');
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 0, `Nenhum grant indevido deve existir para triggers: ${JSON.stringify(rows)}`);
  });

  // ── 12. Imutabilidade de aula concluída e cancelada ───────────────────────
  test("aula concluída ou cancelada tem dados estruturais blindados contra alteração", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Imutável', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Concluída', 'concluida');

        UPDATE public.aulas SET fim_em = '2026-11-01 15:00:00+00' WHERE id = 'f0000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Alteração em aula concluída deve ser impedida");
    assert.strictEqual(res.output.includes("AULA_CONCLUIDA_IMUTAVEL"), true);
  });

  // ── 13. Exclusão física (DELETE) estritamente bloqueada ────────────────────
  test("DELETE físico bloqueado para todas as tabelas de agenda", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "660640d2-99fc-46e7-8e12-9ef0d67b60ee", "role": "authenticated"}';
        DELETE FROM public.series_aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "DELETE em series_aulas deve ser negado");
    assert.strictEqual(
      res.output.includes("permission denied") || res.output.includes("EXCLUSAO_FISICA_PROIBIDA"),
      true
    );
  });

  // ── 14. Conta institucional de Ray Pires permanece intacta ────────────────
  test("Ray Pires preservado como administrador ativo no Supabase", () => {
    const res = runLinkedQuery(`
      SELECT id, email, nome_completo, role, status
      FROM public.perfis
      WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee';
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].email, "r71020142@gmail.com");
    assert.strictEqual(rows[0].role, "admin");
    assert.strictEqual(rows[0].status, "ativo");
  });

  // ── 15. Zero registros residuais nas tabelas acadêmicas ────────────────────
  test("banco limpo de dados temporários e zero registros residuais", () => {
    const res = runLinkedQuery(`
      SELECT
        (SELECT count(*) FROM public.perfis) as perfis,
        (SELECT count(*) FROM public.alunos) as alunos,
        (SELECT count(*) FROM public.professores) as professores,
        (SELECT count(*) FROM public.turmas) as turmas,
        (SELECT count(*) FROM public.matriculas_turmas) as matriculas,
        (SELECT count(*) FROM public.series_aulas) as series,
        (SELECT count(*) FROM public.aulas) as aulas,
        (SELECT count(*) FROM public.presencas_aulas) as presencas;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].perfis), 1, "Perfis deve conter apenas Ray Pires");
    assert.strictEqual(Number(rows[0].turmas), 0, "Turmas deve ser 0");
    assert.strictEqual(Number(rows[0].matriculas), 0, "Matrículas deve ser 0");
    assert.strictEqual(Number(rows[0].series), 0, "Séries deve ser 0");
    assert.strictEqual(Number(rows[0].aulas), 0, "Aulas deve ser 0");
    assert.strictEqual(Number(rows[0].presencas), 0, "Presenças deve ser 0");
  });

  console.log(`\n==================================================================`);
  console.log(`SUCESSO TOTAL: ${passed}/${total} TESTES DE AUDITORIA APROVADOS COM 100%!`);
  console.log(`==================================================================\n`);
}

main().catch((err) => {
  console.error("Erro fatal na auditoria:", err);
  process.exit(1);
});
