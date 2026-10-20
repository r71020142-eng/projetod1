/**
 * DEMOSTRATIVO MTD — Suíte de Testes Reais de Segurança no Banco de Dados (SQL/RLS)
 * ETAPA 10.2C1 — Correção Final de Segurança: ativar_acesso_pos_senha() exclusivo para service_role
 *
 * Testes executados diretamente no PostgreSQL remoto via CLI Supabase:
 * 1. Verifica ACL real via pg_proc: apenas service_role possui EXECUTE.
 * 2. Verifica information_schema.routine_privileges: apenas service_role.
 * 3. Confirma que PUBLIC não recebeu EXECUTE automaticamente.
 * 4. authenticated tenta chamar ativar_acesso_pos_senha → permission denied (42501).
 * 5. anon tenta chamar ativar_acesso_pos_senha → permission denied (42501).
 * 6. service_role executa com UID válido de admin → resposta controlada de proteção.
 * 7. Ciclo completo transacional: perfil inativo → convite_pendente → ativação service_role → ativo.
 * 8. Idempotência: segunda ativação retorna sucesso sem erro.
 * 9. ultimo_erro_interno continua inacessível para authenticated via SELECT direto.
 * 10. Ray Pires permanece admin ativo.
 */

import { execSync } from "node:child_process";
import assert from "node:assert";

interface SqlResult {
  success: boolean;
  output: string;
}

function runLinkedQuery(sql: string): SqlResult {
  const tmpFile = `/tmp/mtd_sql_test_${Date.now()}.sql`;
  const fs = require("node:fs");
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
    try { fs.unlinkSync(tmpFile); } catch { /* ignora */ }
  }
}

async function main() {
  console.log("==================================================================");
  console.log("SUÍTE DE TESTES REAIS — ETAPA 10.2C1 CORREÇÃO FINAL DE SEGURANÇA");
  console.log("ativar_acesso_pos_senha() → service_role exclusivo");
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
      // Falha imediata para garantir que o relatório não seja falso-positivo
      process.exit(1);
    }
  }

  // ── 1. ACL real em pg_proc ──────────────────────────────────────────────────
  test("pg_proc: ativar_acesso_pos_senha possui apenas service_role na ACL", () => {
    const res = runLinkedQuery(`
      SELECT pg_catalog.array_to_string(p.proacl, ',') AS acl
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'ativar_acesso_pos_senha' AND p.pronargs = 1;
    `);
    assert(res.success, `Falha ao consultar pg_proc: ${res.output}`);
    assert(
      !res.output.includes("authenticated=X"),
      "authenticated NÃO deve ter EXECUTE na ACL real"
    );
    assert(
      !res.output.includes("anon=X"),
      "anon NÃO deve ter EXECUTE na ACL real"
    );
    assert(
      res.output.includes("service_role=X"),
      "service_role DEVE ter EXECUTE na ACL real"
    );
  });

  // ── 2. information_schema.routine_privileges ───────────────────────────────
  test("information_schema.routine_privileges: apenas service_role tem EXECUTE em ativar_acesso_pos_senha", () => {
    const res = runLinkedQuery(`
      SELECT grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public' AND routine_name = 'ativar_acesso_pos_senha';
    `);
    assert(res.success, `Falha ao consultar routine_privileges: ${res.output}`);
    assert(
      !res.output.includes('"grantee": "authenticated"'),
      "authenticated NÃO deve aparecer em routine_privileges"
    );
    assert(
      !res.output.includes('"grantee": "anon"'),
      "anon NÃO deve aparecer em routine_privileges"
    );
    assert(
      res.output.includes('"grantee": "service_role"'),
      "service_role DEVE aparecer em routine_privileges"
    );
  });

  // ── 3. PUBLIC não recebeu EXECUTE automático ───────────────────────────────
  test("PUBLIC não possui EXECUTE implícito em ativar_acesso_pos_senha", () => {
    const res = runLinkedQuery(`
      SELECT pg_catalog.array_to_string(p.proacl, ',') AS acl
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'ativar_acesso_pos_senha' AND p.pronargs = 1;
    `);
    assert(res.success, `Falha ao consultar ACL: ${res.output}`);
    // Extrai o valor da string ACL do JSON retornado
    const aclMatch = res.output.match(/"acl":\s*"([^"]+)"/);
    const acl = aclMatch ? aclMatch[1] : "";
    // Verifica que os únicos papéis com EXECUTE são postgres (dono) e service_role
    // PUBLIC seria representado como "=X" (sem prefixo de papel)
    const tokens = acl.split(",");
    for (const token of tokens) {
      const t = token.trim();
      if (t.startsWith("postgres=") || t.startsWith("service_role=")) continue;
      assert(
        !t.includes("=X"),
        `Papel inesperado com EXECUTE encontrado: "${t}". ACL: ${acl}`
      );
    }
    assert(acl.includes("service_role=X"), `service_role deve estar na ACL. ACL: ${acl}`);
  });

  // ── 4. authenticated recebe permission denied (42501) ─────────────────────
  test("authenticated tenta chamar ativar_acesso_pos_senha e recebe permission denied (42501)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE authenticated;
        SELECT public.ativar_acesso_pos_senha('660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid);
      ROLLBACK;
    `);
    assert(
      !res.success && (res.output.includes("42501") || res.output.includes("permission denied")),
      `authenticated deveria receber 42501, obteve: ${res.output}`
    );
  });

  // ── 5. anon recebe permission denied (42501) ───────────────────────────────
  test("anon tenta chamar ativar_acesso_pos_senha e recebe permission denied (42501)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE anon;
        SELECT public.ativar_acesso_pos_senha('660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid);
      ROLLBACK;
    `);
    assert(
      !res.success && (res.output.includes("42501") || res.output.includes("permission denied")),
      `anon deveria receber 42501, obteve: ${res.output}`
    );
  });

  // ── 6. service_role protege o admin principal ──────────────────────────────
  test("service_role: Ray Pires é rejeitado por proteção de integridade institucional", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE service_role;
        SELECT public.ativar_acesso_pos_senha('660640d2-99fc-46e7-8e12-9ef0d67b60ee'::uuid);
      ROLLBACK;
    `);
    assert(
      !res.success && res.output.includes("administrador principal"),
      `Proteção de Ray Pires deve rejeitar com mensagem clara. Obteve: ${res.output}`
    );
  });

  // ── 7. Ciclo completo transacional (rollback ao final para não poluir banco) ─
  test("Ciclo completo: perfil inativo → vínculo → service_role ativa → ativo (com rollback)", () => {
    const res = runLinkedQuery(`
      DO $tciclo$
      DECLARE
        v_aluno_id UUID := gen_random_uuid();
        v_user_id  UUID := gen_random_uuid();
        v_acesso_id UUID := gen_random_uuid();
        v_meta     JSONB;
        v_perfil_status public.profile_status;
        v_acesso_status public.status_acesso_usuario;
        v_ativado_em TIMESTAMPTZ;
        v_result JSONB;
        v_audit_count INTEGER;
      BEGIN
        v_meta := jsonb_build_object('provider','email','providers',jsonb_build_array('email'));

        INSERT INTO public.alunos (id, nome_completo, email, status)
        VALUES (v_aluno_id, 'Aluno Seg Ciclo', 'seg.ciclo@mtd.com', 'ativo');

        INSERT INTO public.acessos_usuarios (id, aluno_id, email_normalizado, tipo, status, ultimo_erro_interno)
        VALUES (v_acesso_id, v_aluno_id, 'seg.ciclo@mtd.com', 'aluno', 'processando', 'CONFIDENCIAL');

        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'seg.ciclo@mtd.com', 'hash', now(), v_meta, '{}'::jsonb, now(), now());

        SELECT status INTO v_perfil_status FROM public.perfis WHERE id = v_user_id;
        IF v_perfil_status <> 'inativo' THEN
          RAISE EXCEPTION 'FALHA trigger: status=%', v_perfil_status;
        END IF;

        PERFORM public.vincular_acesso_usuario(v_acesso_id, v_user_id);

        SELECT status INTO v_perfil_status FROM public.perfis WHERE id = v_user_id;
        IF v_perfil_status <> 'inativo' THEN
          RAISE EXCEPTION 'FALHA pós-vínculo: status=%', v_perfil_status;
        END IF;

        SELECT status INTO v_acesso_status FROM public.acessos_usuarios WHERE id = v_acesso_id;
        IF v_acesso_status <> 'convite_pendente' THEN
          RAISE EXCEPTION 'FALHA acesso status=%', v_acesso_status;
        END IF;

        -- Ativação privilegiada (postgres/service_role no contexto deste DO block)
        SELECT public.ativar_acesso_pos_senha(v_user_id) INTO v_result;

        SELECT status INTO v_perfil_status FROM public.perfis WHERE id = v_user_id;
        SELECT status, acesso_ativado_em INTO v_acesso_status, v_ativado_em
          FROM public.acessos_usuarios WHERE id = v_acesso_id;

        IF v_perfil_status <> 'ativo' THEN RAISE EXCEPTION 'FALHA perfil pós-ativação=%', v_perfil_status; END IF;
        IF v_acesso_status <> 'ativo' THEN RAISE EXCEPTION 'FALHA acesso pós-ativação=%', v_acesso_status; END IF;
        IF v_ativado_em IS NULL THEN RAISE EXCEPTION 'FALHA acesso_ativado_em nulo!'; END IF;

        SELECT count(*) INTO v_audit_count
        FROM public.auditoria_logs WHERE entidade='acessos_usuarios' AND identificador_entidade = v_acesso_id::text;
        IF v_audit_count < 2 THEN RAISE EXCEPTION 'FALHA auditoria: %', v_audit_count; END IF;

        -- Idempotência
        SELECT public.ativar_acesso_pos_senha(v_user_id) INTO v_result;

        RAISE EXCEPTION 'CICLO_COMPLETO_APROVADO';
      END $tciclo$;
    `);
    assert(
      res.output.includes("CICLO_COMPLETO_APROVADO"),
      `Ciclo completo falhou: ${res.output}`
    );
  });

  // ── 8. ultimo_erro_interno inacessível via SELECT direto por authenticated ─
  test("ultimo_erro_interno inacessível via SELECT direto por authenticated (RLS bloqueia)", () => {
    const res = runLinkedQuery(`
      BEGIN;
        SET LOCAL ROLE authenticated;
        SET LOCAL "request.jwt.claim.sub" = '660640d2-99fc-46e7-8e12-9ef0d67b60ee';
        SELECT ultimo_erro_interno FROM public.acessos_usuarios LIMIT 1;
      ROLLBACK;
    `);
    // Deve retornar 0 linhas (policy admin bloqueia) ou permission denied
    const rows = res.output.match(/"rows":\s*\[([^\]]*)\]/);
    if (rows) {
      assert(
        rows[1].trim() === "",
        "authenticated não deve obter linhas de acessos_usuarios com ultimo_erro_interno"
      );
    }
    // Se caiu em permission denied também é aceitável
    if (!res.success) {
      assert(
        res.output.includes("42501") || res.output.includes("permission denied"),
        `Esperado 0 linhas ou permission denied. Obteve: ${res.output}`
      );
    }
  });

  // ── 9. Ray Pires permanece admin ativo ─────────────────────────────────────
  test("Ray Pires permanece admin ativo em public.perfis (UID intocado)", () => {
    const res = runLinkedQuery(`
      SELECT id, email, role, status FROM public.perfis
      WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee';
    `);
    assert(res.success, `Falha ao consultar Ray Pires: ${res.output}`);
    assert(res.output.includes('"role": "admin"'), "role deve ser admin");
    assert(res.output.includes('"status": "ativo"'), "status deve ser ativo");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES REAIS APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");
  console.log("SUCESSO: Todos os testes de segurança SQL validados no banco remoto!\n");
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
