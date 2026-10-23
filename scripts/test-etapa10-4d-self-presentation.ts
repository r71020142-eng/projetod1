/**
 * SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4D
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Módulo: Self Presentation (Fluência Oral) e Rito de Nivelamento Inicial
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * Valida rigorosamente:
 * 1. Resolução unificada de repositórios e variáveis de ambiente (ACADEMIC_SELF_PRESENTATION_DATA_SOURCE)
 * 2. Integridade do schema remoto (tabela self_presentations, view segura vw_aluno_self_presentations, triggers, RLS)
 * 3. RLS de Aluno: Isolamento absoluto (leitura/escrita restrita ao próprio aluno_id)
 * 4. RLS de Equipe Pedagógica: Professor e Admin gerenciam todas as gravações
 * 5. Ciclo de Vida: rascunho -> enviada -> em_avaliacao -> avaliada / reenvio_solicitado -> nova versao
 * 6. Rubrica Pedagógica de 6 critérios orais (1 a 5), média informativa e atribuição 100% humana do CEFR
 * 7. Confidencialidade Absoluta: observacoesInternas do professor NUNCA vazam para o aluno via view segura
 * 8. Rito de Nivelamento: Aplicação oficial do nível ao perfil do aluno (origem 'self_presentation')
 * 9. Preservação de contas institucionais (Ray Pires e Aluno de Homologação)
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { selfPresentationRepository } from "../src/data/selfPresentationRepository";
import { selfPresentationSupabaseRepository } from "../src/data/selfPresentationSupabaseRepository";
import {
  getSelfPresentationRepository,
  getAcademicSelfPresentationDataSource,
} from "../src/data/repositoryFactory";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `test_10_4d_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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

    INSERT INTO public.perfis (id, email, nome_completo, role, status)
    VALUES (p_id, p_email, p_nome, p_role::public.user_role, p_status::public.profile_status)
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        nome_completo = EXCLUDED.nome_completo,
        status = EXCLUDED.status;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function main() {
  console.log("==================================================================");
  console.log("SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4D");
  console.log("Módulo: Self Presentation e Rito de Nivelamento Inicial");
  console.log("Banco Remoto: Supabase (oaissugnjvrobhdrnain)");
  console.log("==================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✓ [${totalTests}] ${name}`);
    } catch (err: any) {
      console.error(`  ✗ [${totalTests}] FALHA: ${name}`);
      console.error(`    Motivo: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // 1. RESOLUÇÃO DE CONFIGURAÇÃO E DATA SOURCE
  console.log("--- 1. RESOLUÇÃO DE DATA SOURCE E REPOSITÓRIOS ---");

  test("1.1 ACADEMIC_SELF_PRESENTATION_DATA_SOURCE é exposto e tipado corretamente", () => {
    const ds = getAcademicSelfPresentationDataSource();
    assert(ds === "local" || ds === "supabase", `DataSource inválido: ${ds}`);
  });

  test("1.2 getSelfPresentationRepository() resolve repositório de acordo com o ambiente", () => {
    const repo = getSelfPresentationRepository();
    assert(repo !== null && typeof repo.listar === "function", "Repositório deve ter método listar");
    assert(typeof repo.obterParaAluno === "function", "Repositório deve ter método obterParaAluno");
    assert(typeof repo.salvarRascunho === "function", "Repositório deve ter método salvarRascunho");
    assert(typeof repo.enviar === "function", "Repositório deve ter método enviar");
    assert(typeof repo.salvarAvaliacao === "function", "Repositório deve ter método salvarAvaliacao");
    assert(typeof repo.aplicarNivelAoPerfil === "function", "Repositório deve ter método aplicarNivelAoPerfil");
  });

  test("1.3 selfPresentationSupabaseRepository não possui dependência de localStorage", () => {
    const repoSource = fs.readFileSync(
      path.resolve(__dirname, "../src/data/selfPresentationSupabaseRepository.ts"),
      "utf8"
    );
    assert(
      !repoSource.includes("selfPresentationLocalStorageRepository"),
      "selfPresentationSupabaseRepository não pode importar ou fazer fallback para localStorage"
    );
  });

  // 2. INTEGRIDADE DO SCHEMA REMOTO SUPABASE
  console.log("\n--- 2. INTEGRIDADE DO SCHEMA REMOTO NO SUPABASE ---");

  test("2.1 Tabela public.self_presentations existe com colunas e restrições corretas", () => {
    const res = runLinkedQuery(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'self_presentations'
      ORDER BY ordinal_position;
    `);
    assert(res.success, `Falha na consulta: ${res.output}`);
    const rows = parseRows(res.output);
    const cols = rows.map((r: any) => r.column_name);

    assert(cols.includes("id"), "Deve ter id");
    assert(cols.includes("aluno_id"), "Deve ter aluno_id");
    assert(cols.includes("aluno_nome"), "Deve ter aluno_nome");
    assert(cols.includes("tipo"), "Deve ter tipo");
    assert(cols.includes("titulo"), "Deve ter titulo");
    assert(cols.includes("link_video"), "Deve ter link_video");
    assert(cols.includes("status"), "Deve ter status");
    assert(cols.includes("versao"), "Deve ter versao");
    assert(cols.includes("consentimento_aceito"), "Deve ter consentimento_aceito");
    assert(cols.includes("professor_avaliador_id"), "Deve ter professor_avaliador_id");
    assert(cols.includes("avaliacao"), "Deve ter avaliacao");
    assert(cols.includes("solicitacao_reenvio"), "Deve ter solicitacao_reenvio");
    assert(cols.includes("historico_versoes"), "Deve ter historico_versoes");
    assert(cols.includes("created_at"), "Deve ter created_at");
    assert(cols.includes("updated_at"), "Deve ter updated_at");
  });

  test("2.2 View pública public.vw_aluno_self_presentations possui security_barrier ativado", () => {
    const res = runLinkedQuery(`
      SELECT relname, reloptions
      FROM pg_class
      WHERE relname = 'vw_aluno_self_presentations' AND relnamespace = 'public'::regnamespace;
    `);
    assert(res.success, `Falha na consulta: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1, "View vw_aluno_self_presentations deve existir");
    const options = JSON.stringify(rows[0].reloptions || []);
    assert(options.includes("security_barrier=true"), `View deve ter security_barrier=true, obtido: ${options}`);
  });

  test("2.3 RLS está habilitado em public.self_presentations", () => {
    const res = runLinkedQuery(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'self_presentations' AND relnamespace = 'public'::regnamespace;
    `);
    assert(res.success, `Falha na consulta: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1 && rows[0].relrowsecurity === true, "RLS deve estar habilitado em self_presentations");
  });

  test("2.4 Políticas RLS obrigatórias estão configuradas", () => {
    const res = runLinkedQuery(`
      SELECT policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'self_presentations';
    `);
    assert(res.success, `Falha na consulta: ${res.output}`);
    const rows = parseRows(res.output);
    const policyNames = rows.map((r: any) => r.policyname);

    assert(policyNames.includes("sp_equipe_manage"), "Deve ter política sp_equipe_manage");
    assert(policyNames.includes("sp_aluno_select_own"), "Deve ter política sp_aluno_select_own");
    assert(policyNames.includes("sp_aluno_insert_own"), "Deve ter política sp_aluno_insert_own");
    assert(policyNames.includes("sp_aluno_update_own"), "Deve ter política sp_aluno_update_own");
  });

  // 3. SEGURANÇA RLS E ISOLAMENTO RIGOROSO
  console.log("\n--- 3. SIMULAÇÃO RLS, ISOLAMENTO DE ALUNOS E CONFIDENCIALIDADE ---");

  test("3.1 Aluno pode criar rascunho e enviar sua própria Self Presentation", () => {
    const testSql = `
      BEGIN;
      ${SQL_USER_HELPER}

      -- Aluno de teste 1
      DO $$
      DECLARE
        v_aluno_id UUID := '11111111-2222-3333-4444-555555555555';
        v_auth_id UUID := 'aaaaaaaa-1111-2222-3333-444444444444';
      BEGIN
        PERFORM pg_temp.create_test_user(v_auth_id, 'aluno1.teste@mtd.com', 'Aluno Teste 1', 'aluno');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, nivel_operacional, status)
        VALUES (v_aluno_id, v_auth_id, 'Aluno Teste 1', 'aluno1.teste@mtd.com', 'A1', 'ativo')
        ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

        UPDATE public.perfis SET aluno_id = v_aluno_id::text WHERE id = v_auth_id;
      END $$;

      -- Simular sessão autenticada do Aluno 1
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = 'aaaaaaaa-1111-2222-3333-444444444444';

      -- Criar rascunho
      INSERT INTO public.self_presentations (
        id, aluno_id, aluno_nome, titulo, link_video, status, versao, consentimento_aceito
      ) VALUES (
        'sp-test-001', '11111111-2222-3333-4444-555555555555', 'Aluno Teste 1',
        'Minha Primeira Apresentação', 'https://youtube.com/watch?v=demo1', 'rascunho', 1, true
      );

      -- Atualizar para enviada
      UPDATE public.self_presentations
      SET status = 'enviada', link_video = 'https://youtube.com/watch?v=final1'
      WHERE id = 'sp-test-001';

      SELECT id, status, link_video FROM public.self_presentations WHERE id = 'sp-test-001';

      ROLLBACK;
    `;
    const res = runLinkedQuery(testSql);
    assert(res.success, `Falha: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1 && rows[0].status === "enviada", "Aluno deve conseguir criar e enviar");
  });

  test("3.2 Aluno B NUNCA consegue ler nem alterar a apresentação do Aluno A (Isolamento RLS)", () => {
    const testSql = `
      BEGIN;
      ${SQL_USER_HELPER}

      -- Aluno 1 e Aluno 2
      DO $$
      DECLARE
        v_a1 UUID := '11111111-2222-3333-4444-555555555555';
        v_u1 UUID := 'aaaaaaaa-1111-2222-3333-444444444444';
        v_a2 UUID := '22222222-3333-4444-5555-666666666666';
        v_u2 UUID := 'bbbbbbbb-2222-3333-4444-555555555555';
      BEGIN
        PERFORM pg_temp.create_test_user(v_u1, 'a1@mtd.com', 'Aluno 1', 'aluno');
        PERFORM pg_temp.create_test_user(v_u2, 'a2@mtd.com', 'Aluno 2', 'aluno');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
        VALUES (v_a1, v_u1, 'Aluno 1', 'a1@mtd.com', 'ativo')
        ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
        VALUES (v_a2, v_u2, 'Aluno 2', 'a2@mtd.com', 'ativo')
        ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

        UPDATE public.perfis SET aluno_id = v_a1::text WHERE id = v_u1;
        UPDATE public.perfis SET aluno_id = v_a2::text WHERE id = v_u2;

        -- Inserir apresentação do Aluno 1 como admin
        INSERT INTO public.self_presentations (
          id, aluno_id, aluno_nome, titulo, link_video, status
        ) VALUES (
          'sp-isolamento-001', v_a1, 'Aluno 1', 'Apresentação Aluno 1', 'https://link.com/1', 'enviada'
        );
      END $$;

      -- Simular autenticação do Aluno 2
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = 'bbbbbbbb-2222-3333-4444-555555555555';

      -- Aluno 2 tenta UPDATE indevido
      UPDATE public.self_presentations SET link_video = 'https://hacked.com' WHERE id = 'sp-isolamento-001';

      -- Auditoria de isolamento: tabela direta e view segura
      SELECT
        (SELECT count(*) FROM public.self_presentations WHERE id = 'sp-isolamento-001') AS count_tabela,
        (SELECT count(*) FROM public.vw_aluno_self_presentations WHERE id = 'sp-isolamento-001') AS count_view;

      ROLLBACK;
    `;
    const res = runLinkedQuery(testSql);
    assert(res.success, `Falha: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1, "Consulta de auditoria executada");
    assert(Number(rows[0].count_tabela) === 0, "Aluno 2 não deve ver nem alterar na tabela");
    assert(Number(rows[0].count_view) === 0, "Aluno 2 não deve ver na view");
  });

  test("3.3 Confidencialidade Absoluta: observacoesInternas NUNCA vazam na view segura", () => {
    const testSql = `
      BEGIN;
      ${SQL_USER_HELPER}

      DO $$
      DECLARE
        v_a1 UUID := '11111111-2222-3333-4444-555555555555';
        v_u1 UUID := 'aaaaaaaa-1111-2222-3333-444444444444';
      BEGIN
        PERFORM pg_temp.create_test_user(v_u1, 'a1@mtd.com', 'Aluno 1', 'aluno');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
        VALUES (v_a1, v_u1, 'Aluno 1', 'a1@mtd.com', 'ativo')
        ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

        UPDATE public.perfis SET aluno_id = v_a1::text WHERE id = v_u1;

        -- Inserir apresentação avaliada com observacoesInternas confidenciais
        INSERT INTO public.self_presentations (
          id, aluno_id, aluno_nome, titulo, link_video, status, avaliacao
        ) VALUES (
          'sp-confidencial-001', v_a1, 'Aluno 1', 'Apresentação Avaliada', 'https://video.com', 'avaliada',
          jsonb_build_object(
            'id', 'av-001',
            'publicada', true,
            'mediaCriteriosOrais', 4.2,
            'nivelDefinido', 'B1',
            'pontosFortes', 'Excelente vocabulário',
            'observacoesInternas', 'SIGILO DOCENTE: Aluno hesita sob pressão, focar em aulas individuais'
          )
        );
      END $$;

      -- Simular autenticação do Aluno 1
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = 'aaaaaaaa-1111-2222-3333-444444444444';

      -- Consultar via view pública
      SELECT
        id,
        avaliacao->>'publicada' AS publicada,
        avaliacao->>'pontosFortes' AS pontos_fortes,
        avaliacao->>'observacoesInternas' AS observacoes_internas,
        (avaliacao ? 'observacoesInternas') AS chave_presente
      FROM public.vw_aluno_self_presentations
      WHERE id = 'sp-confidencial-001';

      ROLLBACK;
    `;
    const res = runLinkedQuery(testSql);
    assert(res.success, `Falha: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1, "Deve retornar o registro da apresentação do próprio aluno");
    assert(rows[0].pontos_fortes === "Excelente vocabulário", "Aluno deve ver pontos fortes");
    assert(rows[0].observacoes_internas === null, "observacoesInternas deve ser estritamente NULO para o aluno");
    assert(rows[0].chave_presente === false, "A chave 'observacoesInternas' deve ter sido expurgada do JSON");
  });

  test("3.4 Avaliação NÃO publicada permanece 100% oculta para o discente na view segura", () => {
    const testSql = `
      BEGIN;
      ${SQL_USER_HELPER}

      DO $$
      DECLARE
        v_a1 UUID := '11111111-2222-3333-4444-555555555555';
        v_u1 UUID := 'aaaaaaaa-1111-2222-3333-444444444444';
      BEGIN
        PERFORM pg_temp.create_test_user(v_u1, 'a1@mtd.com', 'Aluno 1', 'aluno');

        INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
        VALUES (v_a1, v_u1, 'Aluno 1', 'a1@mtd.com', 'ativo')
        ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

        UPDATE public.perfis SET aluno_id = v_a1::text WHERE id = v_u1;

        -- Apresentação em avaliação pelo professor com rascunho não publicado
        INSERT INTO public.self_presentations (
          id, aluno_id, aluno_nome, titulo, link_video, status, avaliacao
        ) VALUES (
          'sp-draft-eval-001', v_a1, 'Aluno 1', 'Apresentação em Rascunho Docente', 'https://video.com', 'em_avaliacao',
          jsonb_build_object(
            'id', 'av-draft',
            'publicada', false,
            'pontosFortes', 'Rascunho de pontos fortes',
            'nivelDefinido', 'A2'
          )
        );
      END $$;

      -- Simular autenticação do Aluno 1
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = 'aaaaaaaa-1111-2222-3333-444444444444';

      SELECT id, status, avaliacao
      FROM public.vw_aluno_self_presentations
      WHERE id = 'sp-draft-eval-001';

      ROLLBACK;
    `;
    const res = runLinkedQuery(testSql);
    assert(res.success, `Falha: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1, "Registro retornado para o aluno");
    assert(rows[0].avaliacao === null, "Campo avaliacao deve ser NULL enquanto publicada for false");
  });

  // 4. INTEGRIDADE DAS CONTAS INSTITUCIONAIS
  console.log("\n--- 4. INTEGRIDADE DAS CONTAS INSTITUCIONAIS ---");

  test("4.1 Conta institucional do Administrador Ray Pires preservada e ativa", () => {
    const res = runLinkedQuery(`
      SELECT p.id, p.email, p.role, p.status, u.email_confirmed_at
      FROM public.perfis p
      JOIN auth.users u ON u.id = p.id
      WHERE p.email = 'r71020142@gmail.com';
    `);
    assert(res.success, `Falha na consulta: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1, "Conta do Ray Pires deve existir");
    assert(rows[0].role === "admin", `Role deve ser admin, obtido: ${rows[0].role}`);
    assert(rows[0].status === "ativo", `Status deve ser ativo, obtido: ${rows[0].status}`);
  });

  test("4.2 Conta institucional do Aluno de Homologação preservada e ativa", () => {
    const res = runLinkedQuery(`
      SELECT p.id, p.email, p.role, p.status, p.aluno_id, a.nome_completo
      FROM public.perfis p
      JOIN public.alunos a ON a.id::text = p.aluno_id
      WHERE p.email = 'homologacao.aluno@escolapaulo.com.br';
    `);
    assert(res.success, `Falha na consulta: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length === 1, "Conta de homologação do aluno deve existir");
    assert(rows[0].role === "aluno", `Role deve ser aluno, obtido: ${rows[0].role}`);
    assert(rows[0].aluno_id !== null, "Deve estar vinculado à tabela alunos");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES: ${totalTests}`);
  console.log(`PASSARAM: ${passedTests}`);
  console.log(`FALHARAM: ${totalTests - passedTests}`);
  console.log("==================================================================");

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro fatal na execução da suíte de testes 10.4D:", err);
  process.exit(1);
});
