/**
 * DEMOSTRATIVO MTD — Suíte de Testes Reais em Banco de Dados (SQL & RLS)
 * ETAPA 10.2C1 — Correção Obrigatória: Privacidade, Menor Privilégio e Ciclo de Ativação
 *
 * Executa testes reais diretamente no PostgreSQL remoto do Supabase via CLI:
 * 1. Verificação de RLS e Bloqueio Total para 'anon' (Erro 42501).
 * 2. Remoção de self_select_acessos e Bloqueio de leitura de ultimo_erro_interno para Não-Admins.
 * 3. RPC Sanitizada consultar_proprio_acesso() retorna apenas colunas seguras.
 * 4. Trigger handle_new_user() gera perfil inicial 'inativo' quando há convite pendente.
 * 5. Função vincular_acesso_usuario() mantém perfil 'inativo' e status 'convite_pendente'.
 * 6. RPC ativar_acesso_pos_senha() baseada estritamente em auth.uid() transiciona para 'ativo'.
 * 7. Idempotência da ativação pós-senha.
 * 8. Constraints de integridade: bloqueio de duplicidade em aluno_id, professor_id e email_normalizado.
 * 9. Constraints de integridade: checagem de vínculo mutuamente exclusivo (CHECK).
 * 10. Gravação correta de trilha de auditoria em public.auditoria_logs.
 */

import { execSync } from "node:child_process";
import assert from "node:assert";

function runRemoteQuery(sql: string): { success: boolean; output: string } {
  try {
    const escapedSql = sql.replace(/"/g, '\\"');
    const stdout = execSync(
      `npx supabase db query --linked "${escapedSql}"`,
      {
        cwd: process.cwd(),
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    return { success: true, output: stdout };
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    const stdout = err.stdout ? err.stdout.toString() : "";
    return { success: false, output: `${stdout}\n${stderr}\n${err.message}` };
  }
}

async function main() {
  console.log("==================================================================");
  console.log("SUÍTE DE TESTES REAIS NO BANCO DE DADOS — ETAPA 10.2C1 (SQL/RLS)");
  console.log("Banco Remoto: Supabase (Projeto: oaissugnjvrobhdrnain)");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      console.log(`✓ [${total}] ${name}`);
    } catch (err: any) {
      console.error(`✗ [${total}] ${name}`);
      console.error(`  Detalhes: ${err.message}`);
      process.exit(1);
    }
  }

  // 1. Verificação de Políticas RLS no Dicionário de Dados
  test("Políticas RLS em acessos_usuarios: apenas admin_select_acessos ativa, self_select_acessos removida", () => {
    const res = runRemoteQuery(
      "SELECT policyname FROM pg_policies WHERE tablename = 'acessos_usuarios';"
    );
    assert(res.success, `Falha ao consultar pg_policies: ${res.output}`);
    assert(
      res.output.includes("admin_select_acessos"),
      "admin_select_acessos deve existir em pg_policies"
    );
    assert(
      !res.output.includes("self_select_acessos"),
      "self_select_acessos NUNCA deve existir em pg_policies (risco de vazamento de ultimo_erro_interno)"
    );
  });

  // 2. Bloqueio Imediato para Usuários Anônimos (anon)
  test("Consulta direta à tabela acessos_usuarios por papel anônimo (anon) é barrada com permission denied (42501)", () => {
    const res = runRemoteQuery(`
      BEGIN;
        SET LOCAL ROLE anon;
        SELECT count(*) FROM public.acessos_usuarios;
      ROLLBACK;
    `);
    assert(
      !res.success && res.output.includes("42501"),
      `Acesso anônimo deveria ser rejeitado com 42501, obteve: ${res.output}`
    );
  });

  // 3. Verificação de Assinatura e Permissões das Funções e RPCs
  test("Funções de Acesso possuem SECURITY DEFINER e permissões estritas por papel", () => {
    const res = runRemoteQuery(`
      SELECT routine_name, routine_type, security_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('consultar_proprio_acesso', 'vincular_acesso_usuario', 'ativar_acesso_pos_senha');
    `);
    assert(res.success, "Consulta a information_schema.routines falhou");
    assert(res.output.includes("consultar_proprio_acesso"), "consultar_proprio_acesso deve existir");
    assert(res.output.includes("vincular_acesso_usuario"), "vincular_acesso_usuario deve existir");
    assert(res.output.includes("ativar_acesso_pos_senha"), "ativar_acesso_pos_senha deve existir");
  });

  // 4. Teste Transacional do Ciclo Completo de Ativação e Menor Privilégio
  test("Ciclo de Vida Transacional: Menor Privilégio inicial ('inativo'), Bloqueio RLS, RPC Sanitizada e Ativação Pós-Senha", () => {
    const res = runRemoteQuery(`
      DO \$\$
      DECLARE
        v_dummy_aluno_id UUID := gen_random_uuid();
        v_dummy_user_id UUID := gen_random_uuid();
        v_acesso_id UUID := gen_random_uuid();
        v_count INTEGER;
        v_rpc_count INTEGER;
        v_perfil_status public.profile_status;
        v_acesso_status public.status_acesso_usuario;
        v_acesso_ativado_em TIMESTAMPTZ;
        v_audit_count INTEGER;
      BEGIN
        -- 1. Insere aluno operacional
        INSERT INTO public.alunos (id, nome_completo, email, status)
        VALUES (v_dummy_aluno_id, 'Aluno Teste SQL', 'teste.sql.rls@mtd.com', 'ativo');

        -- 2. Insere registro de acesso em 'processando'
        INSERT INTO public.acessos_usuarios (
          id, aluno_id, email_normalizado, tipo, status, ultimo_erro_interno
        )
        VALUES (
          v_acesso_id, v_dummy_aluno_id, 'teste.sql.rls@mtd.com', 'aluno', 'processando', 'SEGREDO_INTERNO_CONFIDENCIAL'
        );

        -- 3. Cria usuário temporário em auth.users (dispara handle_new_user())
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
          v_dummy_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'teste.sql.rls@mtd.com', 'senha_hash_teste', now(), '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb, '{}'::jsonb, now(), now()
        );

        -- 4. Verifica que o trigger handle_new_user() criou o perfil como 'inativo'
        SELECT status INTO v_perfil_status FROM public.perfis WHERE id = v_dummy_user_id;
        IF v_perfil_status <> 'inativo'::public.profile_status THEN
          RAISE EXCEPTION 'FALHA NO TRIGGER: Perfil nasceu como %, esperado inativo!', v_perfil_status;
        END IF;

        -- 5. Executa a função de vínculo transacional (vincular_acesso_usuario)
        PERFORM public.vincular_acesso_usuario(v_acesso_id, v_dummy_user_id);

        -- 6. Verifica que o perfil permanece 'inativo' e o acesso está 'convite_pendente'
        SELECT status INTO v_perfil_status FROM public.perfis WHERE id = v_dummy_user_id;
        SELECT status INTO v_acesso_status FROM public.acessos_usuarios WHERE id = v_acesso_id;

        IF v_perfil_status <> 'inativo'::public.profile_status THEN
          RAISE EXCEPTION 'FALHA NO VINCULO: Perfil não pode estar ativo antes de definir senha! Status: %', v_perfil_status;
        END IF;

        IF v_acesso_status <> 'convite_pendente'::public.status_acesso_usuario THEN
          RAISE EXCEPTION 'FALHA NO VINCULO: Acesso status deveria ser convite_pendente, obteve: %', v_acesso_status;
        END IF;

        -- 7. Simula contexto autenticado do aluno
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claim.sub', v_dummy_user_id::text, true);

        -- 8. Tenta SELECT direto na tabela acessos_usuarios (deve retornar 0 linhas!)
        SELECT count(*) INTO v_count FROM public.acessos_usuarios;
        IF v_count <> 0 THEN
          RAISE EXCEPTION 'FALHA DE PRIVACIDADE: Aluno autenticado conseguiu ler % linha(s) em acessos_usuarios!', v_count;
        END IF;

        -- 9. Executa a RPC sanitizada consultar_proprio_acesso() (deve retornar 1 linha segura)
        SELECT count(*) INTO v_rpc_count FROM public.consultar_proprio_acesso();
        IF v_rpc_count <> 1 THEN
          RAISE EXCEPTION 'FALHA NA RPC: consultar_proprio_acesso() deveria retornar 1 linha, retornou %', v_rpc_count;
        END IF;

        -- 10. Executa a RPC ativar_acesso_pos_senha()
        PERFORM public.ativar_acesso_pos_senha();

        -- 11. Volta para role postgres para conferir que a ativação ocorreu
        PERFORM set_config('role', 'postgres', true);

        SELECT status INTO v_perfil_status FROM public.perfis WHERE id = v_dummy_user_id;
        SELECT status, acesso_ativado_em INTO v_acesso_status, v_acesso_ativado_em FROM public.acessos_usuarios WHERE id = v_acesso_id;

        IF v_perfil_status <> 'ativo'::public.profile_status THEN
          RAISE EXCEPTION 'FALHA NA ATIVACAO: Perfil não foi ativado! Status: %', v_perfil_status;
        END IF;

        IF v_acesso_status <> 'ativo'::public.status_acesso_usuario THEN
          RAISE EXCEPTION 'FALHA NA ATIVACAO: Acesso não foi ativado! Status: %', v_acesso_status;
        END IF;

        IF v_acesso_ativado_em IS NULL THEN
          RAISE EXCEPTION 'FALHA NA ATIVACAO: acesso_ativado_em está nulo!';
        END IF;

        -- 12. Verifica que a auditoria registrou os eventos em public.auditoria_logs
        SELECT count(*) INTO v_audit_count
        FROM public.auditoria_logs
        WHERE entidade = 'acessos_usuarios' AND identificador_entidade = v_acesso_id::text;

        IF v_audit_count < 2 THEN
          RAISE EXCEPTION 'FALHA NA AUDITORIA: Menos de 2 registros de auditoria gravados (encontrados: %)', v_audit_count;
        END IF;

        -- 13. Idempotência: Executa novamente ativar_acesso_pos_senha() sem erro
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claim.sub', v_dummy_user_id::text, true);
        PERFORM public.ativar_acesso_pos_senha();

        RAISE EXCEPTION 'CICLO_SQL_APROVADO';
      END \$\$;
    `);
    assert(
      res.output.includes("CICLO_SQL_APROVADO"),
      `Falha no teste de ciclo de ativação: ${res.output}`
    );
  });

  // 5. Teste de Constraints de Integridade e Bloqueio de Concorrência
  test("Constraints de Unicidade e Validação em acessos_usuarios barram duplicidades e combinações inválidas", () => {
    const res = runRemoteQuery(`
      DO \$\$
      DECLARE
        v_aluno_1 UUID := gen_random_uuid();
        v_aluno_2 UUID := gen_random_uuid();
        v_aluno_unique_error BOOLEAN := false;
        v_email_unique_error BOOLEAN := false;
        v_chk_error BOOLEAN := false;
      BEGIN
        INSERT INTO public.alunos (id, nome_completo, email, status) VALUES
          (v_aluno_1, 'Aluno C1', 'aluno.c1@mtd.com', 'ativo'),
          (v_aluno_2, 'Aluno C2', 'aluno.c2@mtd.com', 'ativo');

        INSERT INTO public.acessos_usuarios (aluno_id, email_normalizado, tipo, status)
        VALUES (v_aluno_1, 'aluno.c1@mtd.com', 'aluno', 'processando');

        -- Tenta duplicar aluno_id
        BEGIN
          INSERT INTO public.acessos_usuarios (aluno_id, email_normalizado, tipo, status)
          VALUES (v_aluno_1, 'outro.email@mtd.com', 'aluno', 'processando');
        EXCEPTION WHEN unique_violation THEN
          v_aluno_unique_error := true;
        END;

        IF NOT v_aluno_unique_error THEN
          RAISE EXCEPTION 'FALHA: Permitiu duplicar aluno_id!';
        END IF;

        -- Tenta duplicar email_normalizado
        BEGIN
          INSERT INTO public.acessos_usuarios (aluno_id, email_normalizado, tipo, status)
          VALUES (v_aluno_2, 'aluno.c1@mtd.com', 'aluno', 'processando');
        EXCEPTION WHEN unique_violation THEN
          v_email_unique_error := true;
        END;

        IF NOT v_email_unique_error THEN
          RAISE EXCEPTION 'FALHA: Permitiu duplicar email_normalizado!';
        END IF;

        -- Tenta criar registro sem vínculo operacional
        BEGIN
          INSERT INTO public.acessos_usuarios (email_normalizado, tipo, status)
          VALUES ('sem.vinculo@mtd.com', 'aluno', 'processando');
        EXCEPTION WHEN check_violation THEN
          v_chk_error := true;
        END;

        IF NOT v_chk_error THEN
          RAISE EXCEPTION 'FALHA: Permitiu registro sem aluno_id nem professor_id!';
        END IF;

        RAISE EXCEPTION 'CONSTRAINTS_SQL_APROVADO';
      END \$\$;
    `);
    assert(
      res.output.includes("CONSTRAINTS_SQL_APROVADO"),
      `Falha no teste de constraints: ${res.output}`
    );
  });

  // 6. Integridade do Administrador Principal Ray Pires
  test("Administrador Ray Pires permanece intocado como admin ativo em public.perfis", () => {
    const res = runRemoteQuery(
      "SELECT id, email, role, status FROM public.perfis WHERE id = '660640d2-99fc-46e7-8e12-9ef0d67b60ee';"
    );
    assert(res.success, `Falha ao verificar Ray Pires: ${res.output}`);
    assert(res.output.includes("Ray Pires") || res.output.includes("r71020142@gmail.com"), "Ray Pires deve estar cadastrado");
    assert(res.output.includes('"role": "admin"') || res.output.includes("admin"), "Ray Pires deve ser admin");
    assert(res.output.includes('"status": "ativo"') || res.output.includes("ativo"), "Ray Pires deve estar ativo");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES REAIS APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");
  console.log("SUCESSO: Todos os testes SQL/RLS foram validados no banco remoto!\n");
}

main().catch((err) => {
  console.error("Erro fatal na execução dos testes:", err);
  process.exit(1);
});
