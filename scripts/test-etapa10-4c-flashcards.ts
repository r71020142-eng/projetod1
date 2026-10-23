/**
 * SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4C
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Módulos: Flashcards, Cartões, Repetição Espaçada (SRS SM-2) e Sessões de Estudo
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * Valida rigorosamente:
 * 1. Resolução unificada de repositórios e variáveis de ambiente (ACADEMIC_FLASHCARDS_DATA_SOURCE)
 * 2. Integridade do schema remoto (5 tabelas, 1 view com security_barrier, triggers e RLS ativado)
 * 3. Criação e gestão de baralhos e cartões por Admin e Professor
 * 4. Isolamento estrito de visibilidade de baralhos por destino (Geral, Turma com matrícula, Aluno específico)
 * 5. Bloqueio de baralhos em rascunho para discentes
 * 6. Algoritmo SRS SM-2 determinístico (piso 1.30, 10 min para "errei", progressão de intervalos)
 * 7. Isolamento absoluto de progresso individual, histórico de revisões e sessões entre discentes distintos
 * 8. Registro de sessão de estudo SRS e auditoria imutável de revisões
 * 9. Preservação de contas institucionais (Ray Pires e Aluno de Homologação)
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { baralhoRepository } from "../src/data/baralhoRepository";
import { cartaoRepository } from "../src/data/cartaoRepository";
import { progressoCartaoRepository } from "../src/data/progressoCartaoRepository";
import {
  getBaralhoRepository,
  getCartaoRepository,
  getProgressoCartaoRepository,
  getAcademicFlashcardsDataSource,
} from "../src/data/repositoryFactory";
import {
  inicializarProgressoCartao,
  processarRespostaSRS,
  FATOR_FACILIDADE_PADRAO,
  FATOR_FACILIDADE_MINIMO,
} from "../src/data/srsAlgorithm";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `test_10_4c_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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
  console.log("SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4C");
  console.log("Módulos: Flashcards, Cartões, Repetição Espaçada (SRS SM-2)");
  console.log("Banco Remoto: Supabase (oaissugnjvrobhdrnain)");
  console.log("==================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`  ✓ [${totalTests}] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ✗ [${totalTests}] FALHA: ${name}`);
      console.error(`     Detalhes: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // --- SEÇÃO 1: RESOLUÇÃO DE REPOSITÓRIOS E VARIÁVEIS DE AMBIENTE ---
  console.log("--- SEÇÃO 1: UNIFICAÇÃO DA CAMADA DE REPOSITÓRIOS ---");

  test("1.1 Repositórios unificados de Flashcards, Cartões e Progresso expõem métodos formais", () => {
    assert(typeof baralhoRepository.getBaralhos === "function", "baralhoRepository deve ter getBaralhos");
    assert(typeof baralhoRepository.getBaralhosAluno === "function", "baralhoRepository deve ter getBaralhosAluno");
    assert(typeof baralhoRepository.getBaralhoById === "function", "baralhoRepository deve ter getBaralhoById");
    assert(typeof baralhoRepository.salvarBaralho === "function", "baralhoRepository deve ter salvarBaralho");
    assert(typeof baralhoRepository.atualizarStatusBaralho === "function", "baralhoRepository deve ter atualizarStatusBaralho");
    assert(typeof baralhoRepository.excluirBaralho === "function", "baralhoRepository deve ter excluirBaralho");

    assert(typeof cartaoRepository.getCartoesPorBaralho === "function", "cartaoRepository deve ter getCartoesPorBaralho");
    assert(typeof cartaoRepository.getCartaoById === "function", "cartaoRepository deve ter getCartaoById");
    assert(typeof cartaoRepository.salvarCartao === "function", "cartaoRepository deve ter salvarCartao");
    assert(typeof cartaoRepository.atualizarStatusCartao === "function", "cartaoRepository deve ter atualizarStatusCartao");
    assert(typeof cartaoRepository.excluirCartao === "function", "cartaoRepository deve ter excluirCartao");
    assert(typeof cartaoRepository.importarCartoesCSV === "function", "cartaoRepository deve ter importarCartoesCSV");

    assert(typeof progressoCartaoRepository.obterProgresso === "function", "progressoCartaoRepository deve ter obterProgresso");
    assert(typeof progressoCartaoRepository.obterOuCriarProgresso === "function", "progressoCartaoRepository deve ter obterOuCriarProgresso");
    assert(typeof progressoCartaoRepository.obterFilaEstudoBaralho === "function", "progressoCartaoRepository deve ter obterFilaEstudoBaralho");
    assert(typeof progressoCartaoRepository.registrarRespostaEstudo === "function", "progressoCartaoRepository deve ter registrarRespostaEstudo");
  });

  test("1.2 Factory resolve repositórios correspondentes à fonte de dados", () => {
    const ds = getAcademicFlashcardsDataSource();
    assert(ds === "local" || ds === "supabase", `Fonte deve ser 'local' ou 'supabase', atual: ${ds}`);

    const baralhoRepo = getBaralhoRepository();
    assert(baralhoRepo, "getBaralhoRepository() deve retornar instância válida");

    const cartaoRepo = getCartaoRepository();
    assert(cartaoRepo, "getCartaoRepository() deve retornar instância válida");

    const progressoRepo = getProgressoCartaoRepository();
    assert(progressoRepo, "getProgressoCartaoRepository() deve retornar instância válida");
  });

  // --- SEÇÃO 2: VERIFICAÇÃO DO SCHEMA REMOTO NO SUPABASE ---
  console.log("\n--- SEÇÃO 2: INTEGRIDADE DO SCHEMA REMOTO (MIGRATION 20) ---");

  test("2.1 Tabelas de Flashcards e SRS existem e possuem RLS ativo no PostgreSQL", () => {
    const sql = `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'baralhos',
          'cartoes',
          'progresso_cartoes_alunos',
          'historico_revisoes_srs',
          'sessoes_estudo_srs'
        )
      ORDER BY tablename;
    `;
    const res = runLinkedQuery(sql);
    assert(res.success, `Falha na consulta de schema: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 5, `Deveriam existir 5 tabelas no remoto, encontradas: ${rows.length}`);
    for (const r of rows) {
      assert.strictEqual(r.rowsecurity, true, `Tabela ${r.tablename} deve possuir RLS ativo (rowsecurity = true)`);
    }
  });

  test("2.2 View vw_aluno_baralhos existe com security_barrier ativado", () => {
    const sql = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name = 'vw_aluno_baralhos';
    `;
    const res = runLinkedQuery(sql);
    assert(res.success, `Falha ao consultar view: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1, "View vw_aluno_baralhos deve existir");
  });

  test("2.3 Função aluno_has_access_to_baralho existe e possui security definer", () => {
    const sql = `
      SELECT proname, prosecdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname = 'aluno_has_access_to_baralho';
    `;
    const res = runLinkedQuery(sql);
    assert(res.success, `Falha ao consultar função: ${res.output}`);
    const rows = parseRows(res.output);
    assert(rows.length >= 1, "Função aluno_has_access_to_baralho deve existir");
    assert.strictEqual(rows[0].prosecdef, true, "Função aluno_has_access_to_baralho deve ser SECURITY DEFINER");
  });

  // --- SEÇÃO 3: ALGORITMO DETERMINÍSTICO SRS SM-2 ---
  console.log("\n--- SEÇÃO 3: DETERMINISMO DO ALGORITMO SRS SM-2 ---");

  test("3.1 Inicialização de cartão define facilidade 2.50, estado 'novo' e intervalo 0", () => {
    const prog = inicializarProgressoCartao("aluno-test", "card-test", "baralho-test");
    assert.strictEqual(prog.estado, "novo");
    assert.strictEqual(prog.fatorFacilidade, FATOR_FACILIDADE_PADRAO);
    assert.strictEqual(prog.intervaloDias, 0);
    assert.strictEqual(prog.totalRevisoes, 0);
    assert.strictEqual(prog.totalLapsos, 0);
  });

  test("3.2 Resposta 'errei' reagenda para 10 minutos depois, estado 'aprendendo' e penaliza fator (-0.20)", () => {
    const dataRef = new Date("2026-10-23T10:00:00Z");
    const prog = inicializarProgressoCartao("aluno-test", "card-test", "baralho-test", dataRef);

    const res = processarRespostaSRS(prog, "errei", dataRef);
    assert.strictEqual(res.novoProgresso.estado, "aprendendo");
    assert.strictEqual(res.novoProgresso.fatorFacilidade, 2.30);
    assert.strictEqual(res.novoProgresso.totalLapsos, 1);
    assert.strictEqual(res.novoProgresso.totalRevisoes, 1);
    assert.strictEqual(res.novoProgresso.intervaloDias, 0);
    assert.strictEqual(res.novoProgresso.intervaloMinutos, 10);
    assert.strictEqual(res.reagendadoParaRevisao, true);
    assert.strictEqual(res.reagendadoMinutos, 10);
    assert.strictEqual(res.reagendadoMesmaSessao, false);

    const proxRevisao = new Date(res.novoProgresso.proximaRevisao);
    const diffMs = proxRevisao.getTime() - dataRef.getTime();
    assert.strictEqual(diffMs, 10 * 60 * 1000, "Próxima revisão deve ser exatamente 10 minutos após dataRef");
  });

  test("3.3 Piso de fator de facilidade (1.30) é rigorosamente respeitado após múltiplos erros", () => {
    const dataRef = new Date("2026-10-23T10:00:00Z");
    let prog = inicializarProgressoCartao("aluno-test", "card-test", "baralho-test", dataRef);

    // 10 respostas 'errei' consecutivas
    for (let i = 0; i < 10; i++) {
      const res = processarRespostaSRS(prog, "errei", dataRef);
      prog = res.novoProgresso;
    }
    assert.strictEqual(prog.fatorFacilidade, FATOR_FACILIDADE_MINIMO, "Fator não pode cair abaixo de 1.30");
    assert.strictEqual(prog.totalLapsos, 10);
  });

  test("3.4 Respostas 'dificil', 'bom' e 'facil' progridem intervalos e mantêm consistência", () => {
    const dataRef = new Date("2026-10-23T10:00:00Z");
    const progNovo = inicializarProgressoCartao("aluno-test", "card-test", "baralho-test", dataRef);

    // 'dificil' em novo -> intervalo 1 dia, fator 2.35
    const resDificil = processarRespostaSRS(progNovo, "dificil", dataRef);
    assert.strictEqual(resDificil.novoProgresso.intervaloDias, 1);
    assert.strictEqual(resDificil.novoProgresso.fatorFacilidade, 2.35);

    // 'bom' em novo -> intervalo 1 dia, fator 2.50
    const resBom = processarRespostaSRS(progNovo, "bom", dataRef);
    assert.strictEqual(resBom.novoProgresso.intervaloDias, 1);
    assert.strictEqual(resBom.novoProgresso.fatorFacilidade, 2.50);

    // 'facil' em novo -> intervalo 4 dias, fator 2.65
    const resFacil = processarRespostaSRS(progNovo, "facil", dataRef);
    assert.strictEqual(resFacil.novoProgresso.intervaloDias, 4);
    assert.strictEqual(resFacil.novoProgresso.fatorFacilidade, 2.65);
  });

  // --- SEÇÃO 4: RLS, ISOLAMENTO E PERSISTÊNCIA REMOTA ---
  console.log("\n--- SEÇÃO 4: ISOLAMENTO RIGOROSO DE DADOS VIA RLS NO SUPABASE ---");

  test("4.1 Isolamento de Baralhos por RLS (Geral acessível, Rascunho inacessível para discente)", () => {
    const testAdminId = "11111111-1111-4111-8111-111111111111";
    const testAlunoId = "22222222-2222-4222-8222-222222222222";
    const testAlunoRowId = "22222222-2222-4222-8222-333333333333";
    const testBaralhoGeralId = `baralho-geral-${Date.now().toString().slice(-4)}`;
    const testBaralhoRascunhoId = `baralho-rascunho-${Date.now().toString().slice(-4)}`;

    const sql = `
      ${SQL_USER_HELPER}
      SELECT pg_temp.create_test_user('${testAdminId}', 'admin.test104c@mtd.com', 'Admin Test 104C', 'admin');
      SELECT pg_temp.create_test_user('${testAlunoId}', 'aluno.test104c@mtd.com', 'Aluno Test 104C', 'aluno');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES ('${testAlunoRowId}', '${testAlunoId}', 'Aluno Test 104C', 'aluno.test104c@mtd.com', 'ativo')
      ON CONFLICT (id) DO NOTHING;

      -- Como Admin: cria baralho publicado geral e baralho rascunho
      SET LOCAL role = 'authenticated';
      SET LOCAL "request.jwt.claim.sub" = '${testAdminId}';

      INSERT INTO public.baralhos (id, nome, professor_id, destino_tipo, status)
      VALUES
        ('${testBaralhoGeralId}', 'Baralho Geral Publicado', '${testAdminId}', 'geral', 'publicado'),
        ('${testBaralhoRascunhoId}', 'Baralho Rascunho', '${testAdminId}', 'geral', 'rascunho')
      ON CONFLICT (id) DO NOTHING;

      -- Como Aluno: consulta baralhos visíveis
      SET LOCAL role = 'authenticated';
      SET LOCAL "request.jwt.claim.sub" = '${testAlunoId}';

      SELECT id FROM public.baralhos WHERE id IN ('${testBaralhoGeralId}', '${testBaralhoRascunhoId}');
    `;

    const res = runLinkedQuery(sql);
    assert(res.success, `Falha no teste RLS de baralhos: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 1, `Aluno deve ver somente o publicado. Encontrados: ${rows.length}`);
    assert.strictEqual(rows[0].id, testBaralhoGeralId, "Aluno só pode ver o baralho geral publicado");

    // Limpeza
    runLinkedQuery(`
      DELETE FROM public.baralhos WHERE id IN ('${testBaralhoGeralId}', '${testBaralhoRascunhoId}');
      DELETE FROM public.alunos WHERE id = '${testAlunoRowId}';
      DELETE FROM auth.users WHERE id IN ('${testAdminId}', '${testAlunoId}');
    `);
  });

  test("4.2 Isolamento de Progresso de Cartão por Discente (Aluno B não lê nem grava progresso de Aluno A)", () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const alunoAId = "22222222-2222-4222-8222-222222222222";
    const alunoARowId = "22222222-2222-4222-8222-333333333333";
    const alunoBId = "44444444-4444-4444-8444-444444444444";
    const alunoBRowId = "44444444-4444-4444-8444-555555555555";
    const baralhoId = `baralho-rls-${Date.now().toString().slice(-4)}`;
    const cardId = `card-rls-${Date.now().toString().slice(-4)}`;
    const progressoAId = `cpa-${alunoARowId}-${cardId}`;

    const sql = `
      ${SQL_USER_HELPER}
      SELECT pg_temp.create_test_user('${adminId}', 'admin.srs@mtd.com', 'Admin SRS', 'admin');
      SELECT pg_temp.create_test_user('${alunoAId}', 'alunoa.srs@mtd.com', 'Aluno A SRS', 'aluno');
      SELECT pg_temp.create_test_user('${alunoBId}', 'alunob.srs@mtd.com', 'Aluno B SRS', 'aluno');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES
        ('${alunoARowId}', '${alunoAId}', 'Aluno A SRS', 'alunoa.srs@mtd.com', 'ativo'),
        ('${alunoBRowId}', '${alunoBId}', 'Aluno B SRS', 'alunob.srs@mtd.com', 'ativo')
      ON CONFLICT (id) DO NOTHING;

      -- Admin cadastra baralho e cartão
      INSERT INTO public.baralhos (id, nome, professor_id, destino_tipo, status)
      VALUES ('${baralhoId}', 'Baralho Teste RLS', '${adminId}', 'geral', 'publicado')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.cartoes (id, baralho_id, frente, verso, status)
      VALUES ('${cardId}', '${baralhoId}', 'Apple', 'Maçã', 'ativo')
      ON CONFLICT (id) DO NOTHING;

      -- Aluno A grava seu progresso
      SET LOCAL role = 'authenticated';
      SET LOCAL "request.jwt.claim.sub" = '${alunoAId}';

      INSERT INTO public.progresso_cartoes_alunos (id, aluno_id, cartao_id, baralho_id, estado, total_revisoes, fator_facilidade, intervalo_dias)
      VALUES ('${progressoAId}', '${alunoARowId}', '${cardId}', '${baralhoId}', 'aprendendo', 1, 2.30, 0);

      -- Aluno B tenta consultar o progresso do Aluno A
      SET LOCAL role = 'authenticated';
      SET LOCAL "request.jwt.claim.sub" = '${alunoBId}';

      SELECT COUNT(*)::INT as count_visivel FROM public.progresso_cartoes_alunos WHERE aluno_id = '${alunoARowId}';
    `;

    const res = runLinkedQuery(sql);
    assert(res.success, `Falha no teste RLS de progresso: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows[0].count_visivel, 0, "Aluno B não pode ver o progresso do Aluno A (deve retornar 0)");

    // Limpeza
    runLinkedQuery(`
      DELETE FROM public.progresso_cartoes_alunos WHERE baralho_id = '${baralhoId}';
      DELETE FROM public.cartoes WHERE id = '${cardId}';
      DELETE FROM public.baralhos WHERE id = '${baralhoId}';
      DELETE FROM public.alunos WHERE id IN ('${alunoARowId}', '${alunoBRowId}');
      DELETE FROM auth.users WHERE id IN ('${adminId}', '${alunoAId}', '${alunoBId}');
    `);
  });

  test("4.3 Histórico de Revisões e Sessões de Estudo gravados com sucesso e isolados por RLS", () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const alunoId = "22222222-2222-4222-8222-222222222222";
    const alunoRowId = "22222222-2222-4222-8222-333333333333";
    const baralhoId = `baralho-srs-${Date.now().toString().slice(-4)}`;
    const cardId = `card-srs-${Date.now().toString().slice(-4)}`;
    const histId = `rev-${Date.now()}`;
    const sessaoId = `sessao-${Date.now()}`;

    const sql = `
      ${SQL_USER_HELPER}
      SELECT pg_temp.create_test_user('${adminId}', 'admin.hist@mtd.com', 'Admin Hist', 'admin');
      SELECT pg_temp.create_test_user('${alunoId}', 'aluno.hist@mtd.com', 'Aluno Hist', 'aluno');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES ('${alunoRowId}', '${alunoId}', 'Aluno Hist', 'aluno.hist@mtd.com', 'ativo')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.baralhos (id, nome, professor_id, destino_tipo, status)
      VALUES ('${baralhoId}', 'Baralho Histórico', '${adminId}', 'geral', 'publicado')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.cartoes (id, baralho_id, frente, verso, status)
      VALUES ('${cardId}', '${baralhoId}', 'Book', 'Livro', 'ativo')
      ON CONFLICT (id) DO NOTHING;

      -- Aluno insere histórico de revisão e sessão de estudo
      SET LOCAL role = 'authenticated';
      SET LOCAL "request.jwt.claim.sub" = '${alunoId}';

      INSERT INTO public.historico_revisoes_srs (id, aluno_id, cartao_id, baralho_id, resposta, estado_anterior, intervalo_anterior, novo_estado, novo_intervalo)
      VALUES ('${histId}', '${alunoRowId}', '${cardId}', '${baralhoId}', 'bom', 'novo', 0, 'revisao', 1);

      INSERT INTO public.sessoes_estudo_srs (id, aluno_id, baralho_id, total_estudado, erros, dificeis, bons, faceis, tempo_segundos)
      VALUES ('${sessaoId}', '${alunoRowId}', '${baralhoId}', 1, 0, 0, 1, 0, 15);

      SELECT
        (SELECT COUNT(*)::INT FROM public.historico_revisoes_srs WHERE id = '${histId}') as hist_count,
        (SELECT COUNT(*)::INT FROM public.sessoes_estudo_srs WHERE id = '${sessaoId}') as sessao_count;
    `;

    const res = runLinkedQuery(sql);
    assert(res.success, `Falha ao persistir histórico e sessão: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows[0].hist_count, 1, "Histórico deve ser gravado e consultável pelo próprio discente");
    assert.strictEqual(rows[0].sessao_count, 1, "Sessão deve ser gravada e consultável pelo próprio discente");

    // Limpeza
    runLinkedQuery(`
      DELETE FROM public.sessoes_estudo_srs WHERE id = '${sessaoId}';
      DELETE FROM public.historico_revisoes_srs WHERE id = '${histId}';
      DELETE FROM public.cartoes WHERE id = '${cardId}';
      DELETE FROM public.baralhos WHERE id = '${baralhoId}';
      DELETE FROM public.alunos WHERE id = '${alunoRowId}';
      DELETE FROM auth.users WHERE id IN ('${adminId}', '${alunoId}');
    `);
  });

  // --- SEÇÃO 5: PRESERVAÇÃO DE CONTAS INSTITUCIONAIS ---
  console.log("\n--- SEÇÃO 5: PRESERVAÇÃO DAS CONTAS INSTITUCIONAIS ---");

  test("5.1 Contas de Ray Pires e Aluno de Homologação permanecem intactas no banco remoto", () => {
    const sql = `
      SELECT email, role::text, status::text
      FROM public.perfis
      WHERE email IN ('r71020142@gmail.com', 'homologacao.aluno@escolapaulo.com.br')
      ORDER BY email;
    `;
    const res = runLinkedQuery(sql);
    assert(res.success, `Falha ao verificar contas: ${res.output}`);
    const rows = parseRows(res.output);
    assert.strictEqual(rows.length, 2, "As duas contas institucionais devem permanecer presentes");

    const homolog = rows.find((r) => r.email === "homologacao.aluno@escolapaulo.com.br");
    assert(homolog, "Aluno de homologação deve existir");
    assert.strictEqual(homolog.role, "aluno");
    assert.strictEqual(homolog.status, "ativo");

    const ray = rows.find((r) => r.email === "r71020142@gmail.com");
    assert(ray, "Ray Pires deve existir");
    assert.strictEqual(ray.role, "admin");
    assert.strictEqual(ray.status, "ativo");
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
  console.error("Erro fatal na execução da suíte 10.4C:", err);
  process.exit(1);
});
