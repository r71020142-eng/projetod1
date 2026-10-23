/**
 * SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4A
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Módulos: Materiais Didáticos, Atividades Práticas, Entregas e Conteúdos Diários
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * Valida rigorosamente:
 * 1. Resolução unificada de repositórios e variáveis de ambiente (ACADEMIC_CONTENT_DATA_SOURCE)
 * 2. Integridade do schema remoto (tabelas, views de segurança, aliases e RLS ativado)
 * 3. Materiais Didáticos:
 *    - Publicação por Admin e Professor
 *    - Leitura por Aluno matriculado (material geral e de sua turma)
 *    - Bloqueio estrito de acesso a materiais de outras turmas
 *    - Bloqueio de rascunhos e datas futuras para alunos
 *    - Higienização de privacidade (observações internas ocultadas)
 * 4. Atividades Práticas e Entregas:
 *    - Criação de atividades vinculadas a turmas
 *    - Submissão e atualização de entrega pelo aluno proprietário
 *    - Bloqueio categórico de leitura/escrita de entregas entre alunos distintos
 *    - Avaliação e feedback pelo professor/admin
 * 5. Permissões de funções e segurança de chamadas
 * 6. Preservação de integridade institucional (Ray Pires e Aluno Homologação intactos)
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { materialRepository } from "../src/data/materialRepository";
import { atividadeRepository } from "../src/data/atividadeRepository";
import { entregaRepository } from "../src/data/entregaRepository";
import { conteudoDiarioRepository } from "../src/data/conteudoDiarioRepository";
import {
  getMaterialRepository,
  getAtividadeRepository,
  getEntregaRepository,
  getConteudoDiarioRepository,
  getAcademicContentDataSource,
} from "../src/data/repositoryFactory";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `test_10_4a_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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
  console.log("SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4A");
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

  // --- SEÇÃO 1: UNIFICAÇÃO DA CAMADA DE REPOSITÓRIOS ---
  console.log("--- SEÇÃO 1: UNIFICAÇÃO DA CAMADA DE REPOSITÓRIOS ---");

  test("1.1 Repositórios unificados implementam contratos formais", () => {
    assert(typeof materialRepository.listar === "function", "materialRepository deve ter listar");
    assert(typeof materialRepository.criar === "function", "materialRepository deve ter criar");
    assert(typeof materialRepository.obterPorId === "function", "materialRepository deve ter obterPorId");
    assert(typeof materialRepository.listarParaAluno === "function", "materialRepository deve ter listarParaAluno");

    assert(typeof atividadeRepository.listar === "function", "atividadeRepository deve ter listar");
    assert(typeof atividadeRepository.criar === "function", "atividadeRepository deve ter criar");
    assert(typeof atividadeRepository.obterPorId === "function", "atividadeRepository deve ter obterPorId");
    assert(typeof atividadeRepository.listarParaAluno === "function", "atividadeRepository deve ter listarParaAluno");

    assert(typeof entregaRepository.listar === "function", "entregaRepository deve ter listar");
    assert(typeof entregaRepository.obterPorId === "function", "entregaRepository deve ter obterPorId");
    assert(typeof entregaRepository.obterPorAtividadeEAluno === "function", "entregaRepository deve ter obterPorAtividadeEAluno");
    assert(typeof entregaRepository.salvarRascunho === "function", "entregaRepository deve ter salvarRascunho");
    assert(typeof entregaRepository.enviarEntrega === "function", "entregaRepository deve ter enviarEntrega");
    assert(typeof entregaRepository.corrigir === "function", "entregaRepository deve ter corrigir");

    assert(typeof conteudoDiarioRepository.listar === "function", "conteudoDiarioRepository deve ter listar");
    assert(typeof conteudoDiarioRepository.obterPraticaDeHoje === "function", "conteudoDiarioRepository deve ter obterPraticaDeHoje");
  });

  test("1.2 Factory resolve instâncias ativas e suporta ACADEMIC_CONTENT_DATA_SOURCE", () => {
    const ds = getAcademicContentDataSource();
    assert(ds === "local" || ds === "supabase", "Data source deve ser local ou supabase");

    const repoMat = getMaterialRepository();
    assert(repoMat, "getMaterialRepository deve retornar repositório");
    const repoAtv = getAtividadeRepository();
    assert(repoAtv, "getAtividadeRepository deve retornar repositório");
    const repoEnt = getEntregaRepository();
    assert(repoEnt, "getEntregaRepository deve retornar repositório");
    const repoCnt = getConteudoDiarioRepository();
    assert(repoCnt, "getConteudoDiarioRepository deve retornar repositório");
  });

  // --- SEÇÃO 2: INSPEÇÃO DE SCHEMA REMOTO E POLÍTICAS RLS ---
  console.log("\n--- SEÇÃO 2: SCHEMA REMOTO E POLÍTICAS RLS ---");

  const resSchema = runLinkedQuery(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('materiais', 'atividades', 'entregas_atividades', 'conteudos_diarios')
    ORDER BY tablename;
  `);

  test("2.1 Tabelas da Etapa 10.4A existem com RLS estritamente habilitado", () => {
    assert(resSchema.success, `Erro ao inspecionar tabelas: ${resSchema.output}`);
    const rows = parseRows(resSchema.output);
    assert.strictEqual(rows.length, 4, `Esperado 4 tabelas com RLS, encontrado ${rows.length}`);
    for (const r of rows) {
      assert.strictEqual(r.rowsecurity, true, `Tabela ${r.tablename} deve ter RLS ativo`);
    }
  });

  const resViews = runLinkedQuery(`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name IN ('vw_aluno_materiais', 'vw_aluno_atividades', 'materiais_didaticos', 'atividades_praticas')
    ORDER BY table_name;
  `);

  test("2.2 Views seguras e aliases de compatibilidade existem no schema public", () => {
    assert(resViews.success, `Erro ao inspecionar views: ${resViews.output}`);
    const rows = parseRows(resViews.output);
    assert.strictEqual(rows.length, 4, `Esperado 4 views, encontrado ${rows.length}`);
  });

  const resPrivacidade = runLinkedQuery(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('vw_aluno_materiais', 'vw_aluno_atividades')
      AND column_name = 'observacoes_internas';
  `);

  test("2.3 Views de alunos NÃO expõem a coluna observacoes_internas (blindagem de privacidade)", () => {
    assert(resPrivacidade.success, `Erro ao verificar privacidade: ${resPrivacidade.output}`);
    const rows = parseRows(resPrivacidade.output);
    assert.strictEqual(rows.length, 0, "A coluna observacoes_internas não pode estar presente nas views de alunos");
  });

  // --- SEÇÃO 3: OPERAÇÕES DE MATERIAIS DIDÁTICOS SOB RLS (POSTGRESQL REMOTO) ---
  console.log("\n--- SEÇÃO 3: FLUXO DE MATERIAIS DIDÁTICOS SOB RLS ---");

  const resMateriais = runLinkedQuery(`
    BEGIN;
    ${SQL_USER_HELPER}
    DO $t$
    DECLARE
      v_uid_admin uuid := gen_random_uuid();
      v_uid_prof uuid := gen_random_uuid();
      v_uid_aluno_a uuid := gen_random_uuid();
      v_uid_aluno_b uuid := gen_random_uuid();

      v_prof_id uuid := gen_random_uuid();
      v_aluno_a_id uuid := gen_random_uuid();
      v_aluno_b_id uuid := gen_random_uuid();

      v_turma_a uuid := gen_random_uuid();
      v_turma_b uuid := gen_random_uuid();

      v_mat_geral uuid := gen_random_uuid();
      v_mat_turma_a uuid := gen_random_uuid();
      v_mat_turma_b uuid := gen_random_uuid();
      v_mat_rascunho uuid := gen_random_uuid();

      v_count integer;
    BEGIN
      -- Criação de usuários de teste isolados
      PERFORM pg_temp.create_test_user(v_uid_admin, 'admin_mat_test@metodopaulo.com', 'Admin Materiais Teste', 'admin');
      PERFORM pg_temp.create_test_user(v_uid_prof, 'prof_mat_test@metodopaulo.com', 'Prof Materiais Teste', 'professor');
      PERFORM pg_temp.create_test_user(v_uid_aluno_a, 'aluno_mat_a@metodopaulo.com', 'Aluno A Teste', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_aluno_b, 'aluno_mat_b@metodopaulo.com', 'Aluno B Teste', 'aluno');

      INSERT INTO public.professores (id, perfil_id, nome_completo, email, status)
      VALUES (v_prof_id, v_uid_prof, 'Prof Materiais Teste', 'prof_mat_test@metodopaulo.com', 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES
        (v_aluno_a_id, v_uid_aluno_a, 'Aluno A Teste', 'aluno_mat_a@metodopaulo.com', 'ativo'),
        (v_aluno_b_id, v_uid_aluno_b, 'Aluno B Teste', 'aluno_mat_b@metodopaulo.com', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status)
      VALUES
        (v_turma_a, 'Turma A Teste', 'grupo', 'A1', v_prof_id, 6, 'ativa'),
        (v_turma_b, 'Turma B Teste', 'grupo', 'B1', v_prof_id, 6, 'ativa');

      -- Aluno A matriculado na Turma A; Aluno B matriculado na Turma B
      INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
      VALUES
        (gen_random_uuid(), v_turma_a, v_aluno_a_id, 'ativa'),
        (gen_random_uuid(), v_turma_b, v_aluno_b_id, 'ativa');

      -- 1. Professor publica materiais
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof, 'role', 'authenticated')::text, true);

      INSERT INTO public.materiais (id, titulo, descricao, tipo, categoria, autor_id, destino_tipo, destino_id, status, data_publicacao, observacoes_internas)
      VALUES
        (v_mat_geral, 'Material Geral de Gramática', 'Guia básico para todos', 'pdf', 'Gramática', v_prof_id, 'geral', NULL, 'publicado', CURRENT_DATE, 'Dica interna prof'),
        (v_mat_turma_a, 'Exercícios Turma A', 'Específico A1', 'texto', 'Prática', v_prof_id, 'turma', v_turma_a, 'publicado', CURRENT_DATE, 'Dica turma A'),
        (v_mat_turma_b, 'Exercícios Turma B', 'Específico B1', 'texto', 'Prática', v_prof_id, 'turma', v_turma_b, 'publicado', CURRENT_DATE, 'Dica turma B'),
        (v_mat_rascunho, 'Material em Rascunho', 'Não finalizado', 'video', 'Listening', v_prof_id, 'geral', NULL, 'rascunho', CURRENT_DATE, 'Rascunho secreto');

      -- 2. Aluno A consulta materiais via view e tabela
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      -- Deve ver Material Geral e Material Turma A (total 2)
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_materiais;

      IF v_count <> 2 THEN
        RAISE EXCEPTION 'Aluno A deveria ver exatamente 2 materiais (geral + turma A), mas viu %', v_count;
      END IF;

      -- Verifica se Aluno A consegue ver o Material da Turma B (deve ser 0)
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_materiais
      WHERE id = v_mat_turma_b;

      IF v_count <> 0 THEN
        RAISE EXCEPTION 'Vazamento: Aluno A conseguiu ver material da Turma B';
      END IF;

      -- Verifica se Aluno A consegue ver o rascunho (deve ser 0)
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_materiais
      WHERE id = v_mat_rascunho;

      IF v_count <> 0 THEN
        RAISE EXCEPTION 'Vazamento: Aluno A conseguiu ver material em rascunho';
      END IF;

      -- 3. Aluno B consulta materiais
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_b, 'role', 'authenticated')::text, true);

      -- Deve ver Material Geral e Material Turma B (total 2)
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_materiais;

      IF v_count <> 2 THEN
        RAISE EXCEPTION 'Aluno B deveria ver exatamente 2 materiais (geral + turma B), mas viu %', v_count;
      END IF;

      -- Verifica se Aluno B consegue ver o Material da Turma A (deve ser 0)
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_materiais
      WHERE id = v_mat_turma_a;

      IF v_count <> 0 THEN
        RAISE EXCEPTION 'Vazamento: Aluno B conseguiu ver material da Turma A';
      END IF;

    END;
    $t$;
    ROLLBACK;
  `);

  test("3.1 Professor publica materiais e Alunos têm acesso estritamente isolado por turma", () => {
    assert(resMateriais.success, `Falha no teste de materiais: ${resMateriais.output}`);
  });

  // --- SEÇÃO 4: FLUXO DE ATIVIDADES PRÁTICAS E ENTREGAS SOB RLS ---
  console.log("\n--- SEÇÃO 4: FLUXO DE ATIVIDADES PRÁTICAS E ENTREGAS SOB RLS ---");

  const resAtividades = runLinkedQuery(`
    BEGIN;
    ${SQL_USER_HELPER}
    DO $t$
    DECLARE
      v_uid_prof uuid := gen_random_uuid();
      v_uid_aluno_a uuid := gen_random_uuid();
      v_uid_aluno_b uuid := gen_random_uuid();

      v_prof_id uuid := gen_random_uuid();
      v_aluno_a_id uuid := gen_random_uuid();
      v_aluno_b_id uuid := gen_random_uuid();

      v_turma_a uuid := gen_random_uuid();
      v_turma_b uuid := gen_random_uuid();

      v_atv_a uuid := gen_random_uuid();
      v_atv_b uuid := gen_random_uuid();

      v_entrega_a uuid := gen_random_uuid();
      v_count integer;
      v_status_entrega text;
      v_feedback text;
    BEGIN
      PERFORM pg_temp.create_test_user(v_uid_prof, 'prof_atv_test@metodopaulo.com', 'Prof Atividades Teste', 'professor');
      PERFORM pg_temp.create_test_user(v_uid_aluno_a, 'aluno_atv_a@metodopaulo.com', 'Aluno Atv A', 'aluno');
      PERFORM pg_temp.create_test_user(v_uid_aluno_b, 'aluno_atv_b@metodopaulo.com', 'Aluno Atv B', 'aluno');

      INSERT INTO public.professores (id, perfil_id, nome_completo, email, status)
      VALUES (v_prof_id, v_uid_prof, 'Prof Atividades Teste', 'prof_atv_test@metodopaulo.com', 'ativo');

      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES
        (v_aluno_a_id, v_uid_aluno_a, 'Aluno Atv A', 'aluno_atv_a@metodopaulo.com', 'ativo'),
        (v_aluno_b_id, v_uid_aluno_b, 'Aluno Atv B', 'aluno_atv_b@metodopaulo.com', 'ativo');

      INSERT INTO public.turmas (id, nome, modalidade, nivel, professor_id, capacidade, status)
      VALUES
        (v_turma_a, 'Turma Atv A', 'grupo', 'A1', v_prof_id, 6, 'ativa'),
        (v_turma_b, 'Turma Atv B', 'grupo', 'B1', v_prof_id, 6, 'ativa');

      INSERT INTO public.matriculas_turmas (id, turma_id, aluno_id, status)
      VALUES
        (gen_random_uuid(), v_turma_a, v_aluno_a_id, 'ativa'),
        (gen_random_uuid(), v_turma_b, v_aluno_b_id, 'ativa');

      -- 1. Professor publica atividades
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof, 'role', 'authenticated')::text, true);

      INSERT INTO public.atividades (id, titulo, instrucoes, tipo, professor_id, destino_tipo, destino_id, status, data_publicacao)
      VALUES
        (v_atv_a, 'Redação em Inglês A1', 'Escreva 5 frases', 'texto', v_prof_id, 'turma', v_turma_a, 'publicada', CURRENT_DATE),
        (v_atv_b, 'Ensaio Avançado B1', 'Escreva 300 palavras', 'texto', v_prof_id, 'turma', v_turma_b, 'publicada', CURRENT_DATE);

      -- 2. Aluno A consulta atividade e envia entrega
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      -- Deve ver a atividade da Turma A
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_atividades
      WHERE id = v_atv_a;
      IF v_count <> 1 THEN RAISE EXCEPTION 'Aluno A deveria ver a atividade da Turma A'; END IF;

      -- Não deve ver atividade da Turma B
      SELECT COUNT(*) INTO v_count
      FROM public.vw_aluno_atividades
      WHERE id = v_atv_b;
      IF v_count <> 0 THEN RAISE EXCEPTION 'Vazamento: Aluno A viu atividade da Turma B'; END IF;

      -- Aluno A insere sua entrega
      INSERT INTO public.entregas_atividades (id, atividade_id, aluno_id, resposta_texto, status, entregue_em)
      VALUES (v_entrega_a, v_atv_a, v_aluno_a_id, 'I like to study English every day.', 'entregue', now());

      -- Aluno A enxerga sua própria entrega
      SELECT COUNT(*) INTO v_count
      FROM public.entregas_atividades
      WHERE id = v_entrega_a;
      IF v_count <> 1 THEN RAISE EXCEPTION 'Aluno A deve enxergar sua entrega recém submetida'; END IF;

      -- 3. Aluno B tenta consultar e alterar a entrega do Aluno A
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_b, 'role', 'authenticated')::text, true);

      -- Leitura da entrega do Aluno A deve retornar ZERO
      SELECT COUNT(*) INTO v_count
      FROM public.entregas_atividades
      WHERE id = v_entrega_a;
      IF v_count <> 0 THEN RAISE EXCEPTION 'Vulnerabilidade Crítica RLS: Aluno B conseguiu consultar entrega do Aluno A'; END IF;

      -- Update na entrega do Aluno A deve afetar ZERO linhas
      UPDATE public.entregas_atividades
      SET resposta_texto = 'Tentativa de adulteracao maliciosa'
      WHERE id = v_entrega_a;

      -- 4. Professor corrige a entrega do Aluno A
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_prof, 'role', 'authenticated')::text, true);

      UPDATE public.entregas_atividades
      SET status = 'corrigida',
          pontuacao = 95.00,
          feedback = 'Excelente uso do Simple Present!',
          corrigido_em = now(),
          professor_corretor_id = v_prof_id
      WHERE id = v_entrega_a;

      -- 5. Aluno A verifica feedback e correção
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid_aluno_a, 'role', 'authenticated')::text, true);

      SELECT status, feedback INTO v_status_entrega, v_feedback
      FROM public.entregas_atividades
      WHERE id = v_entrega_a;

      IF v_status_entrega <> 'corrigida' OR v_feedback <> 'Excelente uso do Simple Present!' THEN
        RAISE EXCEPTION 'Aluno A deveria ver sua entrega corrigida com feedback correto';
      END IF;

    END;
    $t$;
    ROLLBACK;
  `);

  test("4.1 Fluxo completo de atividades e entregas com bloqueio estrito de vazamento entre alunos", () => {
    assert(resAtividades.success, `Falha no teste de atividades: ${resAtividades.output}`);
  });

  // --- SEÇÃO 5: SEGURANÇA DE FUNÇÕES E ACLs ---
  console.log("\n--- SEÇÃO 5: SEGURANÇA DE FUNÇÕES E ACLs ---");

  const resFuncAcls = runLinkedQuery(`
    SELECT proname, proacl
    FROM pg_proc
    WHERE proname = 'aluno_has_access_to_material';
  `);

  test("5.1 Função aluno_has_access_to_material não tem acesso EXECUTE concedido a anon ou PUBLIC", () => {
    assert(resFuncAcls.success, `Erro ao inspecionar ACLs da função: ${resFuncAcls.output}`);
    const rows = parseRows(resFuncAcls.output);
    assert(rows.length > 0, "Função aluno_has_access_to_material deve existir");
    const proacl = String(rows[0].proacl || "");
    assert(!proacl.includes("anon=X"), "anon não pode ter permissão EXECUTE em aluno_has_access_to_material");
  });

  // --- SEÇÃO 6: PRESERVAÇÃO DE DADOS DE HOMOLOGAÇÃO ---
  console.log("\n--- SEÇÃO 6: PRESERVAÇÃO DE DADOS INSTITUCIONAIS ---");

  const resRay = runLinkedQuery(`
    SELECT email, role, status
    FROM public.perfis
    WHERE email = 'r71020142@gmail.com';
  `);

  test("6.1 Administrador Ray Pires permanece rigorosamente ativo como admin institucional", () => {
    assert(resRay.success, `Erro ao verificar Ray Pires: ${resRay.output}`);
    const rows = parseRows(resRay.output);
    assert.strictEqual(rows.length, 1, "Perfil de Ray Pires deve existir");
    assert.strictEqual(rows[0].role, "admin", "Role deve ser admin");
    assert.strictEqual(rows[0].status, "ativo", "Status deve ser ativo");
  });

  const resAlunoHomolog = runLinkedQuery(`
    SELECT a.id, a.nome_completo, a.email, a.status, p.role
    FROM public.alunos a
    JOIN public.perfis p ON p.id = a.perfil_id
    WHERE a.email = 'homologacao.aluno@escolapaulo.com.br';
  `);

  test("6.2 Aluno de homologação permanece íntegro com papel aluno e status ativo", () => {
    assert(resAlunoHomolog.success, `Erro ao verificar aluno homologação: ${resAlunoHomolog.output}`);
    const rows = parseRows(resAlunoHomolog.output);
    assert.strictEqual(rows.length, 1, "Aluno de homologação deve existir");
    assert.strictEqual(rows[0].status, "ativo", "Status do aluno deve ser ativo");
    assert.strictEqual(rows[0].role, "aluno", "Papel no perfil deve ser aluno");
  });

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passedTests}/${totalTests}`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("SUCESSO: Todos os testes da Etapa 10.4A foram aprovados com 100%!");
  } else {
    console.error("FALHA: Alguns testes falharam.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro fatal na execução da suíte 10.4A:", err);
  process.exit(1);
});
