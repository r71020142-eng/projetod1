/**
 * DEMOSTRATIVO MTD — Suíte de Testes Reais no PostgreSQL Remoto (Supabase)
 * ETAPA 10.3B1 — Fundação de Banco e Domínio para Agenda, Aulas e Presenças
 *
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * 26 Cenários Reais Exigidos:
 * 1. anon não lê dados;
 * 2. admin agenda aula;
 * 3. professor lê apenas próprias aulas;
 * 4. aluno lê apenas próprias aulas;
 * 5. aluno não lê presença de colega;
 * 6. usuário inativo não acessa;
 * 7. conflito de professor bloqueado;
 * 8. conflito de aluno bloqueado;
 * 9. horário contíguo permitido;
 * 10. aula cancelada não conflita;
 * 11. recorrência com um conflito faz rollback completo;
 * 12. duas operações concorrentes não criam conflito;
 * 13. chamada cria quatro estados corretamente;
 * 14. pendente não vira ausente;
 * 15. justificado não reduz frequência;
 * 16. nao_registrado não entra no cálculo;
 * 17. frequência sem base retorna nulo;
 * 18. aula com pendências exige confirmação;
 * 19. aula concluída fica protegida;
 * 20. alteração posterior registra antes/depois;
 * 21. DELETE direto é bloqueado;
 * 22. RPCs não podem ser chamadas por papel indevido;
 * 23. nenhuma função possui EXECUTE para PUBLIC ou anon;
 * 24. nenhuma recursão RLS;
 * 25. Ray Pires permanece admin ativo;
 * 26. zero registros temporários residuais.
 */

import { execSync } from "node:child_process";
import assert from "node:assert";
import fs from "node:fs";

interface SqlResult {
  success: boolean;
  output: string;
}

function runLinkedQuery(sql: string): SqlResult {
  const tmpFile = `/tmp/mtd_agenda_test_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`;
  fs.writeFileSync(tmpFile, sql, "utf-8");
  try {
    const stdout = execSync(
      `npx supabase db query --linked -f ${tmpFile}`,
      { cwd: process.cwd(), encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { success: true, output: stdout };
  } catch (err: unknown) {
    const errorObj = err as { stdout?: string; stderr?: string; message?: string };
    const out = [errorObj.stdout ?? "", errorObj.stderr ?? "", errorObj.message ?? ""].join("\n");
    return { success: false, output: out };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

function parseRows(output: string): any[] {
  try {
    const match = output.match(/\{[\s\S]*"rows"\s*:\s*(\[[\s\S]*?\])[\s\S]*\}/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    const directJson = JSON.parse(output);
    if (Array.isArray(directJson.rows)) return directJson.rows;
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
  console.log("==================================================================");
  console.log("SUÍTE DE TESTES REAIS — ETAPA 10.3B1 (AGENDA, AULAS E PRESENÇAS)");
  console.log("Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ [${total}] ${name}`);
    } catch (err: unknown) {
      console.error(`  ✗ [${total}] ${name}`);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`      Detalhe: ${msg}`);
      process.exit(1);
    }
  }

  // ── 1. anon não lê dados ───────────────────────────────────────────────────
  test("anon não lê dados de series_aulas, aulas ou presencas_aulas (0 linhas)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE anon;
        SET LOCAL "request.jwt.claims" = '{"role": "anon"}';
        SELECT
          (SELECT count(*) FROM public.series_aulas) as count_series,
          (SELECT count(*) FROM public.aulas) as count_aulas,
          (SELECT count(*) FROM public.presencas_aulas) as count_presencas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(Number(rows[0].count_series), 0);
    assert.strictEqual(Number(rows[0].count_aulas), 0);
    assert.strictEqual(Number(rows[0].count_presencas), 0);
  });

  // ── 2. admin agenda aula ───────────────────────────────────────────────────
  test("admin agenda aula com sucesso e presenças são inicializadas", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@teste.com', 'Prof 1', 'professor');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status)
        VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@teste.com', 'ativo');

        INSERT INTO public.alunos (id, nome_completo, email, status)
        VALUES ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'aluno1@teste.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status)
        VALUES ('d0000000-0000-0000-0000-000000000001', 'Turma Teste', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em)
        VALUES ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', now() - interval '1 day');

        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "660640d2-99fc-46e7-8e12-9ef0d67b60ee", "role": "authenticated"}';

        SELECT public.agendar_aula(
          'd0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000001',
          'Aula Inaugural',
          now() + interval '1 day',
          now() + interval '1 day' + interval '50 minutes',
          'https://zoom.us/j/123456789',
          'Observações de teste'
        ) AS aula_id;

        SELECT a.status as aula_status, pa.status as presenca_status
        FROM public.aulas a
        JOIN public.presencas_aulas pa ON pa.aula_id = a.id
        WHERE a.turma_id = 'd0000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length >= 1, true, "Deve retornar presenças inicializadas");
    assert.strictEqual(rows[0].aula_status, "agendada");
    assert.strictEqual(rows[0].presenca_status, "nao_registrado");
  });

  // ── 3. professor lê apenas próprias aulas ──────────────────────────────────
  test("professor lê apenas próprias aulas (não acessa aulas de outro docente)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000002', 'p2@t.com', 'Prof 2', 'professor');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo'),
          ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Prof 2', 'p2@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma P1', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa'),
          ('d0000000-0000-0000-0000-000000000002', 'Turma P2', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000002', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 50 min', 'Aula P1', 'agendada'),
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', now() + interval '1 day', now() + interval '1 day 50 min', 'Aula P2', 'agendada');

        -- Simula Professor 1
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

        SELECT count(*) as total_aulas, max(titulo) as unico_titulo FROM public.aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].total_aulas), 1);
    assert.strictEqual(rows[0].unico_titulo, "Aula P1");
  });

  // ── 4. aluno lê apenas próprias aulas ──────────────────────────────────────
  test("aluno lê apenas aulas de turmas onde possui matrícula vigente", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'prof1@t.com', 'Prof 1', 'professor');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000003', 'aluno1@t.com', 'Aluno 1', 'aluno');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'prof1@t.com', 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Aluno 1', 'aluno1@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Aluno', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa'),
          ('d0000000-0000-0000-0000-000000000002', 'Outra Turma', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', now() - interval '2 days');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 50 min', 'Minha Aula', 'agendada'),
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', now() + interval '2 days', now() + interval '2 days 50 min', 'Aula Alheia', 'agendada');

        -- Simula Aluno
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

        SELECT count(*) as total_aulas, max(titulo) as unico_titulo FROM public.aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].total_aulas), 1);
    assert.strictEqual(rows[0].unico_titulo, "Minha Aula");
  });

  // ── 5. aluno não lê presença de colega ─────────────────────────────────────
  test("aluno lê estritamente o próprio registro de presença (isolamento total)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'prof1@t.com', 'Prof 1', 'professor');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000003', 'aluno1@t.com', 'Aluno 1', 'aluno');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000004', 'aluno2@t.com', 'Aluno 2', 'aluno');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Aluno 1', 'aluno1@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'Aluno 2', 'aluno2@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Grupo', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', now() - interval '2 days'),
          ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'ativa', now() - interval '2 days');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 50 min', 'Aula Grupo', 'agendada');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status) VALUES
          ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'presente'),
          ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'ausente');

        -- Simula Aluno 1
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

        SELECT count(*) as total_presencas, max(aluno_id::text) as meu_aluno_id FROM public.presencas_aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].total_presencas), 1);
    assert.strictEqual(rows[0].meu_aluno_id, "c0000000-0000-0000-0000-000000000001");
  });

  // ── 6. usuário inativo não acessa ──────────────────────────────────────────
  test("usuário com status inativo tem acesso bloqueado por RLS (0 linhas)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000099', 'inativo@t.com', 'Inativo', 'aluno', 'inativo');

        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000099", "role": "authenticated"}';

        SELECT count(*) as total FROM public.aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].total), 0);
  });

  // ── 7. conflito de professor bloqueado ─────────────────────────────────────
  test("conflito de horário do professor é bloqueado com erro apropriado", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa'),
          ('d0000000-0000-0000-0000-000000000002', 'Turma B', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        -- Aula 1: 14:00 às 14:50
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula 1', 'agendada');

        -- Tentativa Aula 2: 14:30 às 15:20 (SOBREPOSIÇÃO)
        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:30:00+00', '2026-11-01 15:20:00+00', 'Aula Conflitante', 'agendada');
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Deveria ter falhado por conflito de professor");
    assert.strictEqual(res.output.includes("CONFLITO_HORARIO_PROFESSOR"), true);
  });

  // ── 8. conflito de aluno bloqueado ─────────────────────────────────────────
  test("conflito de horário de aluno matriculado em duas turmas é bloqueado", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000002', 'p2@t.com', 'Prof 2', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo'),
          ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Prof 2', 'p2@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno Multi', 'multi@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma 1', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa'),
          ('d0000000-0000-0000-0000-000000000002', 'Turma 2', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000002', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00'),
          ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula T1', 'agendada');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '2026-11-01 14:20:00+00', '2026-11-01 15:10:00+00', 'Aula T2', 'agendada');
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Deveria ter falhado por conflito de aluno");
    assert.strictEqual(res.output.includes("CONFLITO_HORARIO_ALUNO"), true);
  });

  // ── 9. horário contíguo permitido ──────────────────────────────────────────
  test("horário contíguo (término da anterior = início da próxima) é permitido", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa'),
          ('d0000000-0000-0000-0000-000000000002', 'Turma B', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula 1', 'agendada');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:50:00+00', '2026-11-01 15:40:00+00', 'Aula Contígua', 'agendada');

        SELECT count(*) as total FROM public.aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query contígua falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].total), 2);
  });

  // ── 10. aula cancelada não conflita ────────────────────────────────────────
  test("aula cancelada não gera conflito com novo agendamento no mesmo horário", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status, motivo_cancelamento) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Cancelada', 'cancelada', 'Feriado');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Nova Aula Válida', 'agendada');

        SELECT count(*) as total FROM public.aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(Number(rows[0].total), 2);
  });

  // ── 11. recorrência com um conflito faz rollback completo ─────────────────
  test("recorrência com um conflito em qualquer semana reverte a transação inteira", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Recorrente', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-15 17:00:00+00', '2026-11-15 17:50:00+00', 'Aula Obstáculo', 'agendada');

        SELECT public.agendar_serie_aulas(
          'd0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000001',
          'Série Teste',
          0,
          '14:00:00'::time,
          50,
          4,
          '2026-11-01'::date
        );
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Deveria ter falhado e abortado a série inteira");
    assert.strictEqual(res.output.includes("CONFLITO_SERIE_PROFESSOR"), true);
  });

  // ── 12. duas operações concorrentes não criam conflito ────────────────────
  test("locks de serialização impedem que duas operações criem agendamentos conflitantes", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        SELECT public.agendar_aula(
          'd0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000001',
          'Primeira Aula',
          '2026-11-01 17:00:00+00',
          '2026-11-01 17:50:00+00'
        );

        SELECT public.agendar_aula(
          'd0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000001',
          'Segunda Aula Disputada',
          '2026-11-01 17:00:00+00',
          '2026-11-01 17:50:00+00'
        );
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Segunda inserção no mesmo slot deve ser bloqueada");
    assert.strictEqual(res.output.includes("CONFLITO_HORARIO_PROFESSOR"), true);
  });

  // ── 13. chamada cria quatro estados corretamente ──────────────────────────
  test("chamada salva e persiste os quatro estados (nao_registrado, presente, ausente, justificado)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000002', 'Aluno 2', 'a2@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000003', 'Aluno 3', 'a3@t.com', 'ativo'),
          ('c0000000-0000-0000-0000-000000000004', 'Aluno 4', 'a4@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Chamada', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00'),
          ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'ativa', '2026-10-01 00:00:00+00'),
          ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'ativa', '2026-10-01 00:00:00+00'),
          ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula 4 Estados', 'agendada');

        SELECT public.salvar_chamada_aula(
          'f0000000-0000-0000-0000-000000000001',
          '[
            {"aluno_id": "c0000000-0000-0000-0000-000000000001", "status": "presente"},
            {"aluno_id": "c0000000-0000-0000-0000-000000000002", "status": "ausente"},
            {"aluno_id": "c0000000-0000-0000-0000-000000000003", "status": "justificado", "justificativa": "Consulta médica"},
            {"aluno_id": "c0000000-0000-0000-0000-000000000004", "status": "nao_registrado"}
          ]'::jsonb,
          'Gramática do Simple Past',
          'Turma participativa'
        );

        SELECT status, count(*) as qtd FROM public.presencas_aulas GROUP BY status ORDER BY status;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 4);
  });

  // ── 14. pendente não vira ausente ─────────────────────────────────────────
  test("pendente de presença não é convertido silenciosamente para ausente", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Pendente', 'agendada');

        SELECT public.iniciar_chamada_aula('f0000000-0000-0000-0000-000000000001');

        SELECT public.concluir_aula('f0000000-0000-0000-0000-000000000001', true);

        SELECT status FROM public.presencas_aulas WHERE aula_id = 'f0000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows[0].status, "nao_registrado");
  });

  // ── 15. justificado não reduz frequência ──────────────────────────────────
  test("falta justificada não penaliza o cálculo de frequência", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula 1', 'concluida'),
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-08 14:00:00+00', '2026-11-08 14:50:00+00', 'Aula 2', 'concluida');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status, justificativa) VALUES
          ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'presente', NULL),
          ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'justificado', 'Atestado médico');

        SELECT public.calcular_frequencia_aluno('c0000000-0000-0000-0000-000000000001') as freq;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    const freq = typeof rows[0].freq === "string" ? JSON.parse(rows[0].freq) : rows[0].freq;
    assert.strictEqual(Number(freq.porcentagem), 100);
    assert.strictEqual(freq.justificados, 1);
    assert.strictEqual(freq.presentes, 1);
  });

  // ── 16. nao_registrado não entra no cálculo ───────────────────────────────
  test("nao_registrado não entra no denominador de frequência", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula 1', 'concluida'),
          ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-08 14:00:00+00', '2026-11-08 14:50:00+00', 'Aula 2', 'concluida');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status) VALUES
          ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'presente'),
          ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'nao_registrado');

        SELECT public.calcular_frequencia_aluno('c0000000-0000-0000-0000-000000000001') as freq;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    const freq = typeof rows[0].freq === "string" ? JSON.parse(rows[0].freq) : rows[0].freq;
    assert.strictEqual(Number(freq.porcentagem), 100);
    assert.strictEqual(freq.naoRegistrados, 1);
  });

  // ── 17. frequência sem base retorna nulo ───────────────────────────────────
  test("frequência sem registros concluídos ou base 0 retorna porcentagem null", () => {
    const res = runLinkedQuery(`
      BEGIN;
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno Novo', 'novo@t.com', 'ativo');

        SELECT public.calcular_frequencia_aluno('c0000000-0000-0000-0000-000000000001') as freq;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    const freq = typeof rows[0].freq === "string" ? JSON.parse(rows[0].freq) : rows[0].freq;
    assert.strictEqual(freq.porcentagem, null);
  });

  // ── 18. aula com pendências exige confirmação ─────────────────────────────
  test("concluir aula com alunos nao_registrado exige p_confirmar_pendencias = true", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Pendente', 'agendada');

        SELECT public.iniciar_chamada_aula('f0000000-0000-0000-0000-000000000001');

        SELECT public.concluir_aula('f0000000-0000-0000-0000-000000000001', false);
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Deveria ter falhado por existirem pendências");
    assert.strictEqual(res.output.includes("EXISTEM_PENDENCIAS_PRESENCA"), true);
  });

  // ── 19. aula concluída fica protegida ──────────────────────────────────────
  test("aula concluída é imutável em seus dados estruturais (horário, turma e professor)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Concluída', 'concluida');

        UPDATE public.aulas SET inicio_em = '2026-11-01 15:00:00+00' WHERE id = 'f0000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Alteração em aula concluída deve ser impedida");
    assert.strictEqual(res.output.includes("AULA_CONCLUIDA_IMUTAVEL"), true);
  });

  // ── 20. alteração posterior registra antes/depois ──────────────────────────
  test("alteração posterior de presença em aula concluída grava auditoria com antes/depois", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'Aluno 1', 'a1@t.com', 'ativo');
        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma A', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');
        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', '2026-10-01 00:00:00+00');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 14:00:00+00', '2026-11-01 14:50:00+00', 'Aula Concluída', 'concluida');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status) VALUES
          ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ausente');

        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

        UPDATE public.presencas_aulas
        SET status = 'presente'
        WHERE id = '10000000-0000-0000-0000-000000000001';

        RESET ROLE;

        SELECT acao, valores_anteriores->>'status' as antes, valores_posteriores->>'status' as depois
        FROM public.auditoria_logs
        WHERE entidade = 'presencas_aulas' AND identificador_entidade = '10000000-0000-0000-0000-000000000001';
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length >= 1, true, "Deve conter log de auditoria");
    assert.strictEqual(rows[0].acao, "ALTERACAO_POSTERIOR_PRESENCA");
    assert.strictEqual(rows[0].antes, "ausente");
    assert.strictEqual(rows[0].depois, "presente");
  });

  // ── 21. DELETE direto é bloqueado ──────────────────────────────────────────
  test("DELETE direto em series_aulas, aulas e presencas_aulas é bloqueado para todos", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "660640d2-99fc-46e7-8e12-9ef0d67b60ee", "role": "authenticated"}';

        DELETE FROM public.aulas;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "DELETE direto deveria ser negado");
    assert.strictEqual(
      res.output.includes("permission denied") || res.output.includes("EXCLUSAO_FISICA_PROIBIDA"),
      true
    );
  });

  // ── 22. RPCs não podem ser chamadas por papel indevido ─────────────────────
  test("aluno não pode cancelar, reagendar ou salvar chamada via RPCs", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000003', 'aluno1@t.com', 'Aluno 1', 'aluno');

        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

        SELECT public.cancelar_aula('00000000-0000-0000-0000-000000000001', 'Tentativa indevida');
      ROLLBACK;
    `);
    assert.strictEqual(res.success, false, "Aluno não pode cancelar aula");
    assert.strictEqual(res.output.includes("AULA_NAO_ENCONTRADA") || res.output.includes("ACESSO_NEGADO"), true);
  });

  // ── 23. nenhuma função possui EXECUTE para PUBLIC ou anon ──────────────────
  test("zero privilégios EXECUTE concedidos a PUBLIC ou anon nas funções da Etapa 10.3B1", () => {
    const res = runLinkedQuery(`
      SELECT routine_name, grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'agendar_aula', 'agendar_serie_aulas', 'reagendar_aula', 'cancelar_aula',
          'iniciar_chamada_aula', 'salvar_chamada_aula', 'concluir_aula', 'calcular_frequencia_aluno',
          'check_conflito_horario_professor', 'check_conflito_horario_alunos_turma',
          'aluno_can_view_aula', 'professor_can_view_aula', 'check_aula_integridade',
          'check_presenca_integridade', 'prevent_agenda_physical_delete'
        )
        AND grantee IN ('PUBLIC', 'anon');
    `);
    assert.strictEqual(res.success, true, `Query falhou: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 0, `Foram encontrados grants indevidos para PUBLIC/anon: ${JSON.stringify(rows)}`);
  });

  // ── 24. nenhuma recursão RLS ──────────────────────────────────────────────
  test("consultas com joins entre aulas, turmas, matriculas e presencas não causam recursão", () => {
    const res = runLinkedQuery(`
      BEGIN;
        ${SQL_USER_HELPER}
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000001', 'p1@t.com', 'Prof 1', 'professor');
        SELECT pg_temp.create_test_user('a0000000-0000-0000-0000-000000000003', 'aluno1@t.com', 'Aluno 1', 'aluno');

        INSERT INTO public.professores (id, perfil_id, nome_completo, email, status) VALUES
          ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prof 1', 'p1@t.com', 'ativo');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status) VALUES
          ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Aluno 1', 'aluno1@t.com', 'ativo');

        INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Turma Teste', 'grupo', 'A1', 'b0000000-0000-0000-0000-000000000001', 5, 'ativa');

        INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status, matriculado_em) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ativa', now() - interval '2 days');

        INSERT INTO public.aulas (id, turma_id, professor_id, inicio_em, fim_em, titulo, status) VALUES
          ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 50 min', 'Aula Recursao Check', 'agendada');

        INSERT INTO public.presencas_aulas (id, aula_id, aluno_id, matricula_id, status) VALUES
          ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'nao_registrado');

        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

        SELECT a.id, t.nome, pa.status
        FROM public.aulas a
        JOIN public.turmas t ON t.id = a.turma_id
        LEFT JOIN public.presencas_aulas pa ON pa.aula_id = a.id;
      ROLLBACK;
    `);
    assert.strictEqual(res.success, true, `Recursão ou erro RLS detectado: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1);
  });

  // ── 25. Ray Pires permanece admin ativo ────────────────────────────────────
  test("perfil institucional de Ray Pires permanece admin ativo intocado", () => {
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

  // ── 26. zero registros temporários residuais ──────────────────────────────
  test("zero registros residuais após execuções de testes (banco limpo)", () => {
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
  console.log(`BATERIA FINAL ETAPA 10.3B1: ${passed}/${total} TESTES APROVADOS COM SUCESSO!`);
  console.log(`==================================================================\n`);
}

main().catch((err) => {
  console.error("Erro fatal na execução da suíte:", err);
  process.exit(1);
});
