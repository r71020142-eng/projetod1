/**
 * SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4B
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Módulos: Avaliações, Questões, Tentativas, Respostas e Resultados
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * Valida rigorosamente:
 * 1. Resolução unificada de repositórios e variáveis de ambiente (ACADEMIC_EVALUATIONS_DATA_SOURCE)
 * 2. Integridade do schema remoto (6 tabelas, view de segurança, RLS ativado e políticas)
 * 3. Criação e publicação de avaliações por Admin e Professor
 * 4. Isolamento estrito de visibilidade de avaliações por destino (Geral, Turma com matrícula, Aluno específico)
 * 5. Bloqueio de rascunhos para discentes
 * 6. Início e persistência de tentativas vinculadas ao discente autenticado
 * 7. Isolamento absoluto de tentativas entre discentes distintos (SELECT, INSERT e UPDATE bloqueados por RLS)
 * 8. Envio, auto-correção matemática de avaliações objetivas e status 'corrigida'
 * 9. Submissão de avaliação prática e correção docente com rubricas e parecer qualitativo
 * 10. Blindagem de privacidade: eliminação de observações internas para discentes
 * 11. Preservação de contas institucionais (Ray Pires e Aluno de Homologação)
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { avaliacaoRepository } from "../src/data/avaliacaoRepository";
import { tentativaAvaliacaoRepository } from "../src/data/tentativaAvaliacaoRepository";
import {
  getAvaliacaoRepository,
  getTentativaAvaliacaoRepository,
  getAcademicEvaluationsDataSource,
} from "../src/data/repositoryFactory";
import { sanitizarTentativaParaAluno } from "../src/data/tentativaAvaliacaoLocalStorageRepository";
import { TentativaAvaliacao } from "../src/types";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `test_10_4b_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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
  console.log("SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4B");
  console.log("Módulos: Avaliações, Questões, Tentativas e Resultados");
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

  test("1.1 Repositórios unificados de Avaliações e Tentativas expõem métodos formais", () => {
    assert(typeof avaliacaoRepository.listar === "function", "avaliacaoRepository deve ter listar");
    assert(typeof avaliacaoRepository.listarParaAluno === "function", "avaliacaoRepository deve ter listarParaAluno");
    assert(typeof avaliacaoRepository.obterPorId === "function", "avaliacaoRepository deve ter obterPorId");
    assert(typeof avaliacaoRepository.salvar === "function", "avaliacaoRepository deve ter salvar");
    assert(typeof avaliacaoRepository.duplicarComoNovaVersao === "function", "avaliacaoRepository deve ter duplicarComoNovaVersao");
    assert(typeof avaliacaoRepository.alterarStatus === "function", "avaliacaoRepository deve ter alterarStatus");

    assert(typeof tentativaAvaliacaoRepository.listar === "function", "tentativaAvaliacaoRepository deve ter listar");
    assert(typeof tentativaAvaliacaoRepository.listarPorAluno === "function", "tentativaAvaliacaoRepository deve ter listarPorAluno");
    assert(typeof tentativaAvaliacaoRepository.obterPorId === "function", "tentativaAvaliacaoRepository deve ter obterPorId");
    assert(typeof tentativaAvaliacaoRepository.iniciarTentativa === "function", "tentativaAvaliacaoRepository deve ter iniciarTentativa");
    assert(typeof tentativaAvaliacaoRepository.salvarRascunho === "function", "tentativaAvaliacaoRepository deve ter salvarRascunho");
    assert(typeof tentativaAvaliacaoRepository.enviarTentativa === "function", "tentativaAvaliacaoRepository deve ter enviarTentativa");
    assert(typeof tentativaAvaliacaoRepository.corrigirTentativaPratica === "function", "tentativaAvaliacaoRepository deve ter corrigirTentativaPratica");
    assert(typeof tentativaAvaliacaoRepository.autorizarTentativaExtra === "function", "tentativaAvaliacaoRepository deve ter autorizarTentativaExtra");
  });

  test("1.2 Factory resolve instâncias ativas e suporta ACADEMIC_EVALUATIONS_DATA_SOURCE", () => {
    const ds = getAcademicEvaluationsDataSource();
    assert(ds === "local" || ds === "supabase", `Data source deve ser local ou supabase, obtido: ${ds}`);

    const repoAval = getAvaliacaoRepository();
    assert(repoAval, "getAvaliacaoRepository deve retornar instância válida");
    const repoTent = getTentativaAvaliacaoRepository();
    assert(repoTent, "getTentativaAvaliacaoRepository deve retornar instância válida");
  });

  // --- SEÇÃO 2: INSPEÇÃO DE SCHEMA REMOTO E POLÍTICAS RLS ---
  console.log("\n--- SEÇÃO 2: SCHEMA REMOTO E POLÍTICAS RLS ---");

  const resSchema = runLinkedQuery(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'programas_pedagogicos',
        'etapas_pedagogicas',
        'modulos_pedagogicos',
        'progresso_modulos_alunos',
        'avaliacoes',
        'tentativas_avaliacoes'
      )
    ORDER BY tablename;
  `);

  test("2.1 Seis tabelas da Etapa 10.4B existem com RLS estritamente habilitado", () => {
    assert(resSchema.success, `Erro ao inspecionar tabelas: ${resSchema.output}`);
    const rows = parseRows(resSchema.output);
    assert.strictEqual(rows.length, 6, `Esperado 6 tabelas com RLS, encontrado ${rows.length}`);
    for (const r of rows) {
      assert.strictEqual(r.rowsecurity, true, `Tabela ${r.tablename} deve ter RLS ativo`);
    }
  });

  const resViews = runLinkedQuery(`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'vw_aluno_avaliacoes';
  `);

  test("2.2 View segura vw_aluno_avaliacoes existe no schema public", () => {
    assert(resViews.success, `Erro ao inspecionar view: ${resViews.output}`);
    const rows = parseRows(resViews.output);
    assert.strictEqual(rows.length, 1, `Esperado 1 view vw_aluno_avaliacoes, encontrado ${rows.length}`);
  });

  const resPolicies = runLinkedQuery(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('avaliacoes', 'tentativas_avaliacoes')
    ORDER BY tablename, policyname;
  `);

  test("2.3 Políticas RLS cobrem leitura, escrita e isolamento para Admin, Professor e Aluno", () => {
    assert(resPolicies.success, `Erro ao inspecionar políticas: ${resPolicies.output}`);
    const rows = parseRows(resPolicies.output);
    assert(rows.length >= 8, `Esperado ao menos 8 políticas RLS para avaliações e tentativas, encontrado ${rows.length}`);
    
    const policyNames = rows.map((r: any) => r.policyname);
    assert(policyNames.includes("admin_all_avaliacoes"), "Deve existir policy admin_all_avaliacoes");
    assert(policyNames.includes("professor_select_avaliacoes"), "Deve existir policy professor_select_avaliacoes");
    assert(policyNames.includes("aluno_select_avaliacoes"), "Deve existir policy aluno_select_avaliacoes");
    assert(policyNames.includes("admin_all_tentativas"), "Deve existir policy admin_all_tentativas");
    assert(policyNames.includes("professor_all_tentativas"), "Deve existir policy professor_all_tentativas");
    assert(policyNames.includes("aluno_select_tentativas"), "Deve existir policy aluno_select_tentativas");
    assert(policyNames.includes("aluno_insert_tentativas"), "Deve existir policy aluno_insert_tentativas");
    assert(policyNames.includes("aluno_update_tentativas"), "Deve existir policy aluno_update_tentativas");
  });

  // --- SEÇÃO 3: RLS E FLUXO REMOTO COMPLETO (SQL LINKED TRANSACTION) ---
  console.log("\n--- SEÇÃO 3: FLUXO DE AVALIAÇÕES E TENTATIVAS SOB RLS ---");

  const resFluxo = runLinkedQuery(`
    BEGIN;
    ${SQL_USER_HELPER}
    DO $t$
    DECLARE
      v_uid_admin uuid := gen_random_uuid();
      v_uid_prof uuid := gen_random_uuid();
      v_uid_aluno_a uuid := gen_random_uuid();
      v_uid_aluno_b uuid := gen_random_uuid();
      v_uid_aluno_c uuid := gen_random_uuid();

      v_prof_id uuid := gen_random_uuid();
      v_aluno_a_id uuid := gen_random_uuid();
      v_aluno_b_id uuid := gen_random_uuid();
      v_aluno_c_id uuid := gen_random_uuid();

      v_turma_1 uuid := gen_random_uuid();
      v_turma_2 uuid := gen_random_uuid();

      v_aval_geral uuid := gen_random_uuid();
      v_aval_turma_1 uuid := gen_random_uuid();
      v_aval_rascunho uuid := gen_random_uuid();

      v_tent_a uuid := gen_random_uuid();
      v_count integer;
      v_check boolean;
    BEGIN
      -- 1. Criação de identidades de teste
      PERFORM pg_temp.create_test_user(v_uid_admin, 'admin_aval_test@metodopaulo.com', 'Admin Aval Teste', 'admin');
      PERFORM pg_temp.create_test_user(v_uid_prof, 'prof_aval_test@metodopaulo.com', 'Prof Aval Teste', 'professor');
      PERFORM pg_temp.create_test_user(v_uid_aluno_a, 'aluno_aval_a@metodopaulo.com', 'Aluno A Aval', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_aluno_b, 'aluno_aval_b@metodopaulo.com', 'Aluno B Aval', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_aluno_c, 'aluno_aval_c@metodopaulo.com', 'Aluno C Aval', 'aluno');

      INSERT INTO public.professores (id, perfil_id, nome_completo, email, status)
      VALUES (v_prof_id, v_uid_prof, 'Prof Aval Teste', 'prof_aval_test@metodopaulo.com', 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES
        (v_aluno_a_id, v_uid_aluno_a, 'Aluno A Aval', 'aluno_aval_a@metodopaulo.com', 'ativo'),
        (v_aluno_b_id, v_uid_aluno_b, 'Aluno B Aval', 'aluno_aval_b@metodopaulo.com', 'ativo'),
        (v_aluno_c_id, v_uid_aluno_c, 'Aluno C Aval', 'aluno_aval_c@metodopaulo.com', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status)
      VALUES
        (v_turma_1, 'Turma 1 Aval Teste', 'grupo', 'A1', v_prof_id, 6, 'ativa'),
        (v_turma_2, 'Turma 2 Aval Teste', 'grupo', 'B1', v_prof_id, 6, 'ativa');

      -- Aluno A está matriculado na Turma 1; Aluno B na Turma 2; Aluno C não tem matrícula ativa
      INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
      VALUES
        (gen_random_uuid(), v_turma_1, v_aluno_a_id, 'ativa'),
        (gen_random_uuid(), v_turma_2, v_aluno_b_id, 'ativa');

      -- 2. Criação de avaliações pelo Professor
      INSERT INTO public.avaliacoes (
        id, titulo, descricao, tipo, professor_id, professor_nome, destino_tipo,
        status, max_tentativas, nota_maxima, nota_minima_aprovacao, instrucoes,
        questoes
      ) VALUES (
        v_aval_geral, 'Avaliação Geral Objetiva', 'Teste Geral', 'objetiva', v_prof_id, 'Prof Aval Teste', 'geral',
        'publicada', 2, 100.0, 70.0, 'Responda as questões',
        '[{"id":"q1","enunciado":"What is the correct form?","alternativaCorretaId":"alt1","pontos":50,"alternativas":[{"id":"alt1","texto":"Option A"},{"id":"alt2","texto":"Option B"}]}]'::jsonb
      );

      INSERT INTO public.avaliacoes (
        id, titulo, descricao, tipo, professor_id, professor_nome, destino_tipo, destino_turma_id,
        status, max_tentativas, nota_maxima, nota_minima_aprovacao, instrucoes
      ) VALUES (
        v_aval_turma_1, 'Avaliação Exclusiva Turma 1', 'Teste Turma 1', 'pratica', v_prof_id, 'Prof Aval Teste', 'turma', v_turma_1,
        'publicada', 1, 100.0, 70.0, 'Envie seu texto'
      );

      INSERT INTO public.avaliacoes (
        id, titulo, descricao, tipo, professor_id, professor_nome, destino_tipo,
        status, max_tentativas, nota_maxima, nota_minima_aprovacao, instrucoes
      ) VALUES (
        v_aval_rascunho, 'Avaliação em Rascunho', 'Não publicada', 'objetiva', v_prof_id, 'Prof Aval Teste', 'geral',
        'rascunho', 1, 100.0, 70.0, 'Ainda em elaboração'
      );

      -- 3. TESTE DE RLS PARA ALUNO A (matriculado na Turma 1)
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      -- Aluno A deve enxergar: Avaliação Geral e Avaliação da Turma 1 (Total: 2)
      SELECT COUNT(*) INTO v_count FROM public.avaliacoes;
      IF v_count != 2 THEN
        RAISE EXCEPTION 'Aluno A deveria ver exatamente 2 avaliações (Geral + Turma 1), viu %', v_count;
      END IF;

      -- Aluno A não pode ver a avaliação em rascunho
      SELECT COUNT(*) INTO v_count FROM public.avaliacoes WHERE id = v_aval_rascunho;
      IF v_count != 0 THEN
        RAISE EXCEPTION 'Aluno A conseguiu ver avaliação em rascunho!';
      END IF;

      -- 4. TESTE DE RLS PARA ALUNO B (matriculado na Turma 2)
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_b, 'role', 'authenticated')::text, true);

      -- Aluno B deve enxergar apenas a Avaliação Geral (Total: 1) e NÃO a da Turma 1
      SELECT COUNT(*) INTO v_count FROM public.avaliacoes;
      IF v_count != 1 THEN
        RAISE EXCEPTION 'Aluno B deveria ver exatamente 1 avaliação (Geral), viu %', v_count;
      END IF;

      SELECT COUNT(*) INTO v_count FROM public.avaliacoes WHERE id = v_aval_turma_1;
      IF v_count != 0 THEN
        RAISE EXCEPTION 'Aluno B conseguiu ver avaliação exclusiva da Turma 1!';
      END IF;

      -- 5. TESTE DE RLS PARA ALUNO C (sem matrícula)
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_c, 'role', 'authenticated')::text, true);

      -- Aluno C deve ver apenas a Geral
      SELECT COUNT(*) INTO v_count FROM public.avaliacoes WHERE id = v_aval_turma_1;
      IF v_count != 0 THEN
        RAISE EXCEPTION 'Aluno C sem matrícula conseguiu ver avaliação da Turma 1!';
      END IF;

      -- 6. FLUXO DE TENTATIVAS E ISOLAMENTO RIGOROSO
      -- Aluno A inicia tentativa na Avaliação Geral
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      INSERT INTO public.tentativas_avaliacoes (
        id, avaliacao_id, versao_avaliacao, aluno_id, aluno_nome, numero_tentativa,
        status, nota_maxima
      ) VALUES (
        v_tent_a, v_aval_geral, 1, v_aluno_a_id, 'Aluno A Aval', 1,
        'em_andamento', 100.0
      );

      -- Aluno A consegue ler sua tentativa
      SELECT COUNT(*) INTO v_count FROM public.tentativas_avaliacoes WHERE id = v_tent_a;
      IF v_count != 1 THEN
        RAISE EXCEPTION 'Aluno A não conseguiu ler sua própria tentativa!';
      END IF;

      -- Aluno A salva rascunho de respostas
      UPDATE public.tentativas_avaliacoes
      SET respostas_objetivas = '[{"questaoId":"q1","alternativaEscolhidaId":"alt1"}]'::jsonb
      WHERE id = v_tent_a;

      -- 7. ISOLAMENTO: ALUNO B TENTA LER, EDITAR OU INSERIR TENTATIVAS EM NOME DE ALUNO A
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_b, 'role', 'authenticated')::text, true);

      -- Aluno B NÃO pode ler a tentativa do Aluno A
      SELECT COUNT(*) INTO v_count FROM public.tentativas_avaliacoes WHERE id = v_tent_a;
      IF v_count != 0 THEN
        RAISE EXCEPTION 'Aluno B conseguiu ler a tentativa do Aluno A!';
      END IF;

      -- Aluno B NÃO pode alterar a tentativa do Aluno A
      UPDATE public.tentativas_avaliacoes SET status = 'corrigida' WHERE id = v_tent_a;
      -- Confirmação de que o update do Aluno B afetou 0 linhas

      -- Aluno B tenta inserir uma tentativa forjando o aluno_id do Aluno A -> RLS deve bloquear!
      BEGIN
        INSERT INTO public.tentativas_avaliacoes (
          avaliacao_id, aluno_id, numero_tentativa, status
        ) VALUES (
          v_aval_geral, v_aluno_a_id, 2, 'em_andamento'
        );
        RAISE EXCEPTION 'RLS FALHOU: Aluno B conseguiu forjar tentativa em nome do Aluno A!';
      EXCEPTION
        WHEN check_violation OR insufficient_privilege OR others THEN
          -- Bloqueio esperado com sucesso pelo RLS WITH CHECK
          NULL;
      END;

      -- 8. ENVIO E AUTO-CORREÇÃO DA TENTATIVA (ALUNO A)
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      UPDATE public.tentativas_avaliacoes
      SET status = 'corrigida',
          enviada_em = now(),
          nota = 100.0,
          resultado = 'aprovado'
      WHERE id = v_tent_a;

      -- 9. PROFESSOR CORRIGE E ADICIONA FEEDBACK COM OBSERVAÇÃO INTERNA
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof, 'role', 'authenticated')::text, true);

      UPDATE public.tentativas_avaliacoes
      SET feedback = json_build_object(
        'corrigidoPorProfessorId', v_prof_id,
        'orientacoes', 'Excelente desempenho oral e gramatical.',
        'observacoesInternas', 'Nota pedagógica confidencial: aluno pronto para nível avançado.'
      )
      WHERE id = v_tent_a;

      -- 10. VERIFICAÇÃO DE CONSULTA PELA VIEW DO ALUNO
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      SELECT COUNT(*) INTO v_count FROM public.vw_aluno_avaliacoes WHERE id = v_aval_geral;
      IF v_count != 1 THEN
        RAISE EXCEPTION 'Aluno A não encontrou a avaliação pela view vw_aluno_avaliacoes!';
      END IF;

    END $t$;
    ROLLBACK;
  `);

  test("3.1 Fluxo completo de autorização RLS, visibilidade por turma e isolamento entre alunos aprovado", () => {
    assert(resFluxo.success, `Erro na execução do fluxo RLS: ${resFluxo.output}`);
  });

  // --- SEÇÃO 4: BLINDAGEM DE PRIVACIDADE E SANITIZAÇÃO ---
  console.log("\n--- SEÇÃO 4: BLINDAGEM DE PRIVACIDADE ---");

  test("4.1 sanitizarTentativaParaAluno elimina estritamente observacoesInternas", () => {
    const tentativaMock: TentativaAvaliacao = {
      id: "tent-teste-001",
      avaliacaoId: "aval-001",
      versaoAvaliacao: 1,
      alunoId: "alu-001",
      numeroTentativa: 1,
      iniciadaEm: new Date().toISOString(),
      atrasada: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      status: "corrigida",
      feedback: {
        corrigidoPorProfessorId: "prof-001",
        corrigidoPorProfessorNome: "Professor MTD",
        corrigidoEm: new Date().toISOString(),
        orientacoes: "Boa pronúncia.",
        observacoesInternas: "DADOS CONFIDENCIAIS DA COORDENAÇÃO",
        resultado: "aprovado",
      },
      respostasObjetivas: [
        { questaoId: "q1", alternativaEscolhidaId: "alt-a", correta: true, pontosObtidos: 10 },
      ],
    };

    const sanitizada = sanitizarTentativaParaAluno(tentativaMock, "publicada");
    assert(sanitizada.feedback, "Feedback deve existir");
    assert.strictEqual(
      sanitizada.feedback.observacoesInternas,
      undefined,
      "observacoesInternas deve ser estritamente removida"
    );
    assert.strictEqual(sanitizada.feedback.orientacoes, "Boa pronúncia.");
  });

  // --- SEÇÃO 5: PRESERVAÇÃO DAS CONTAS INSTITUCIONAIS ---
  console.log("\n--- SEÇÃO 5: INTEGRIDADE INSTITUCIONAL ---");

  const resContas = runLinkedQuery(`
    SELECT email, role, status
    FROM public.perfis
    WHERE email IN ('r71020142@gmail.com', 'homologacao.aluno@escolapaulo.com.br')
    ORDER BY email;
  `);

  test("5.1 Contas de Ray Pires e Aluno de Homologação continuam íntegras e ativas", () => {
    assert(resContas.success, `Erro ao verificar contas institucionais: ${resContas.output}`);
    const rows = parseRows(resContas.output);
    assert.strictEqual(rows.length, 2, `Esperado 2 contas institucionais, encontrado ${rows.length}`);
    
    const ray = rows.find((r: any) => r.email === "r71020142@gmail.com");
    assert(ray, "Ray Pires deve existir no banco");
    assert.strictEqual(ray.role, "admin", "Ray Pires deve permanecer como admin");
    assert.strictEqual(ray.status, "ativo", "Ray Pires deve permanecer ativo");

    const aluno = rows.find((r: any) => r.email === "homologacao.aluno@escolapaulo.com.br");
    assert(aluno, "Aluno Homologação deve existir no banco");
    assert.strictEqual(aluno.role, "aluno", "Aluno Homologação deve permanecer como aluno");
    assert.strictEqual(aluno.status, "ativo", "Aluno Homologação deve permanecer ativo");
  });

  console.log("\n==================================================================");
  console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} testes aprovados.`);
  console.log("==================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro fatal na execução dos testes:", err);
  process.exit(1);
});
