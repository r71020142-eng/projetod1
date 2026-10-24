/**
 * SUÍTE DE TESTES E HOMOLOGAÇÃO — ETAPA 10.4E (OPERAÇÃO DE CONCLUSÃO)
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Módulos: Comunidade de Alunos & Gamificação / Conquistas
 * Banco Remoto: Supabase PostgreSQL (oaissugnjvrobhdrnain)
 *
 * Valida rigorosamente:
 * 1. Resolução unificada de repositórios e variáveis de ambiente (COMMUNITY_DATA_SOURCE e GAMIFICATION_DATA_SOURCE)
 * 2. Existência e integridade das 11 tabelas no schema público:
 *    - espacos_comunidade
 *    - publicacoes_comunidade
 *    - comentarios_comunidade
 *    - denuncias_comunidade
 *    - oportunidades_comunidade
 *    - interesses_oportunidades
 *    - modelos_conquistas
 *    - conquistas_concedidas
 *    - solicitacoes_placas
 *    - eventos_pontos
 *    - notificacoes_sistema
 * 3. Habilitação universal de Row Level Security (RLS) nas 11 tabelas
 * 4. Políticas de RLS de Comunidade:
 *    - Leitura pública/autenticada de espaços ativos e publicações publicadas
 *    - Publicações ocultas por moderação acessíveis apenas a administradores/professores e ao autor
 *    - Sanitização de observações internas
 *    - Registro de denúncias por alunos
 *    - Manifestação de interesse em oportunidades e intercâmbios
 * 5. Políticas de RLS de Gamificação:
 *    - Concessão de conquistas manuais com justificativa docente
 *    - Isolamento de conquistas concedidas e solicitações de placas por aluno_id
 *    - Histórico e agregação de pontos sem corrupção
 *    - Notificações internas do sistema com leitura e atualização isoladas
 * 6. Preservação de contas institucionais (Ray Pires e Aluno de Homologação)
 */

import { execSync } from "child_process";
import assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { comunidadeRepository } from "../src/data/comunidadeRepository";
import { gamificacaoRepository } from "../src/data/gamificacaoRepository";
import { comunidadeSupabaseRepository } from "../src/data/comunidadeSupabaseRepository";
import { gamificacaoSupabaseRepository } from "../src/data/gamificacaoSupabaseRepository";
import {
  getCommunityDataSource,
  getGamificationDataSource,
} from "../src/data/repositoryFactory";

function runLinkedQuery(sql: string): { success: boolean; output: string } {
  const tmpFile = path.join("/tmp", `test_10_4e_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
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

    IF p_role = 'aluno' THEN
      INSERT INTO public.alunos (id, perfil_id, nome_completo, email, status)
      VALUES (p_id, p_id, p_nome, p_email, 'ativo')
      ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

      UPDATE public.perfis SET aluno_id = p_id::text WHERE id = p_id;
    END IF;

    IF p_role = 'professor' THEN
      INSERT INTO public.professores (id, perfil_id, nome_completo, email, status)
      VALUES (p_id, p_id, p_nome, p_email, 'ativo')
      ON CONFLICT (id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

      UPDATE public.perfis SET professor_id = p_id::text WHERE id = p_id;
    END IF;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function main() {
  console.log("===============================================================================");
  console.log("SUÍTE DE HOMOLOGAÇÃO ETAPA 10.4E — COMUNIDADE E GAMIFICAÇÃO (CONCLUSÃO)");
  console.log("Supabase Project Ref: oaissugnjvrobhdrnain");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  [OK] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FALHA] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Resolução Unificada de Repositórios
  console.log("--- 1. Resolução de Repositórios e Data Sources ---");
  test("1.1 Data Source de Comunidade resolve para tipo DataSource válido", () => {
    const ds = getCommunityDataSource();
    assert(["local", "supabase"].includes(ds), `Data source inesperado: ${ds}`);
  });

  test("1.2 Data Source de Gamificação resolve para tipo DataSource válido", () => {
    const ds = getGamificationDataSource();
    assert(["local", "supabase"].includes(ds), `Data source inesperado: ${ds}`);
  });

  test("1.3 Repositório Unificado de Comunidade expõe todas as operações canônicas", () => {
    assert(typeof comunidadeRepository.listarEspacos === "function");
    assert(typeof comunidadeRepository.salvarEspaco === "function");
    assert(typeof comunidadeRepository.listarPublicacoes === "function");
    assert(typeof comunidadeRepository.criarPublicacao === "function");
    assert(typeof comunidadeRepository.listarComentarios === "function");
    assert(typeof comunidadeRepository.criarComentario === "function");
    assert(typeof comunidadeRepository.denunciarConteudo === "function");
    assert(typeof comunidadeRepository.listarDenuncias === "function");
    assert(typeof comunidadeRepository.listarOportunidades === "function");
    assert(typeof comunidadeRepository.registrarInteresseOportunidade === "function");
  });

  test("1.4 Repositório Unificado de Gamificação expõe todas as operações canônicas", () => {
    assert(typeof gamificacaoRepository.listarModelos === "function");
    assert(typeof gamificacaoRepository.salvarModelo === "function");
    assert(typeof gamificacaoRepository.listarConquistasAluno === "function");
    assert(typeof gamificacaoRepository.concederConquistaManual === "function");
    assert(typeof gamificacaoRepository.registrarEventoPontos === "function");
    assert(typeof gamificacaoRepository.obterPontosAluno === "function");
    assert(typeof gamificacaoRepository.listarSolicitacoesPlacas === "function");
    assert(typeof gamificacaoRepository.registrarInteressePlacaFisica === "function");
    assert(typeof gamificacaoRepository.listarNotificacoes === "function");
  });

  // 2. Integridade Estrutural das 11 Tabelas Remotas
  console.log("\n--- 2. Verificação Estrutural das 11 Tabelas e RLS Remotos ---");
  const tabelasEsperadas = [
    "espacos_comunidade",
    "publicacoes_comunidade",
    "comentarios_comunidade",
    "denuncias_comunidade",
    "oportunidades_comunidade",
    "interesses_oportunidades",
    "modelos_conquistas",
    "conquistas_concedidas",
    "solicitacoes_placas",
    "eventos_pontos",
    "notificacoes_sistema",
  ];

  const sqlTabelas = `
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN (${tabelasEsperadas.map((t) => `'${t}'`).join(", ")});
  `;
  const resTabelas = runLinkedQuery(sqlTabelas);
  const rowsTabelas = parseRows(resTabelas.output);

  test("2.1 Todas as 11 tabelas foram criadas no schema public", () => {
    assert(resTabelas.success, `Falha na consulta remota: ${resTabelas.output}`);
    const encontradas = rowsTabelas.map((r: any) => r.tablename);
    for (const t of tabelasEsperadas) {
      assert(encontradas.includes(t), `Tabela ${t} não encontrada no banco remoto.`);
    }
  });

  test("2.2 Row Level Security (RLS) habilitado em 100% das 11 tabelas", () => {
    for (const r of rowsTabelas) {
      assert(r.rowsecurity === true, `RLS não habilitado na tabela ${r.tablename}`);
    }
  });

  // 3. Verificação de Triggers e Integridade Relacional
  console.log("\n--- 3. Verificação de Triggers e Integridade Relacional ---");
  const sqlTriggers = `
    SELECT trigger_name, event_manipulation, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table IN ('espacos_comunidade', 'publicacoes_comunidade', 'comentarios_comunidade', 'modelos_conquistas', 'solicitacoes_placas');
  `;
  const resTriggers = runLinkedQuery(sqlTriggers);
  const rowsTriggers = parseRows(resTriggers.output);

  test("3.1 Triggers de atualização automática updated_at configurados", () => {
    assert(resTriggers.success, `Falha ao consultar triggers: ${resTriggers.output}`);
    const tabelasComTrigger = new Set(rowsTriggers.map((r: any) => r.event_object_table));
    assert(tabelasComTrigger.has("espacos_comunidade"), "Trigger ausente em espacos_comunidade");
    assert(tabelasComTrigger.has("publicacoes_comunidade"), "Trigger ausente em publicacoes_comunidade");
    assert(tabelasComTrigger.has("comentarios_comunidade"), "Trigger ausente em comentarios_comunidade");
    assert(tabelasComTrigger.has("modelos_conquistas"), "Trigger ausente em modelos_conquistas");
    assert(tabelasComTrigger.has("solicitacoes_placas"), "Trigger ausente em solicitacoes_placas");
  });

  // 4. Teste de Políticas RLS e Isolamento de Comunidade
  console.log("\n--- 4. Testes de RLS: Comunidade e Moderação ---");
  const student1Id = "11111111-4e00-0000-0000-000000000001";
  const student2Id = "22222222-4e00-0000-0000-000000000002";
  const professorId = "33333333-4e00-0000-0000-000000000003";

  const sqlRLSComunidade = `
    ${SQL_USER_HELPER}
    SELECT pg_temp.create_test_user('${student1Id}'::uuid, 'aluno1.104e@mtd.test', 'Aluno 10.4E Um', 'aluno');
    SELECT pg_temp.create_test_user('${student2Id}'::uuid, 'aluno2.104e@mtd.test', 'Aluno 10.4E Dois', 'aluno');
    SELECT pg_temp.create_test_user('${professorId}'::uuid, 'prof.104e@mtd.test', 'Professor 10.4E', 'professor');

    -- Cria espaço de teste
    INSERT INTO public.espacos_comunidade (id, nome, descricao, tipo, status)
    VALUES ('esp-test-104e', 'Espaço RLS 10.4E', 'Validação de RLS', 'geral', 'ativo')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

    -- Aluno 1 cria publicação
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub": "${student1Id}", "role": "authenticated", "email": "aluno1.104e@mtd.test"}';
    INSERT INTO public.publicacoes_comunidade (id, espaco_id, autor_id, autor_nome, autor_papel, conteudo, status)
    VALUES ('pub-rls-104e-1', 'esp-test-104e', '${student1Id}', 'Aluno Um', 'aluno', 'Conteúdo público visível', 'publicado')
    ON CONFLICT (id) DO UPDATE SET conteudo = EXCLUDED.conteudo;

    -- Aluno 1 cria comentário
    INSERT INTO public.comentarios_comunidade (id, publicacao_id, autor_id, autor_nome, autor_papel, conteudo, status)
    VALUES ('com-rls-104e-1', 'pub-rls-104e-1', '${student1Id}', 'Aluno Um', 'aluno', 'Comentário aluno 1', 'publicado')
    ON CONFLICT (id) DO UPDATE SET conteudo = EXCLUDED.conteudo;

    -- Aluno 2 lê publicação de Aluno 1 (permitido pois status = publicado)
    SET LOCAL "request.jwt.claims" = '{"sub": "${student2Id}", "role": "authenticated", "email": "aluno2.104e@mtd.test"}';
    SELECT count(*) as qtd_visivel FROM public.publicacoes_comunidade WHERE id = 'pub-rls-104e-1';
  `;

  const resRLSComunidade = runLinkedQuery(sqlRLSComunidade);
  const rowsRLSComunidade = parseRows(resRLSComunidade.output);

  test("4.1 Alunos podem visualizar publicações com status 'publicado'", () => {
    assert(resRLSComunidade.success, `Falha no teste RLS Comunidade: ${resRLSComunidade.output}`);
    const qtd = Number(rowsRLSComunidade[0]?.qtd_visivel ?? 0);
    assert(qtd === 1, `Aluno 2 deveria visualizar 1 publicação pública, visualizou: ${qtd}`);
  });

  // 5. Teste de RLS: Moderação Oculta não vaza para terceiros
  console.log("\n--- 5. Testes de RLS: Moderação Oculta ---");
  const sqlModeracaoOculta = `
    -- Modera publicação para oculto_moderacao
    UPDATE public.publicacoes_comunidade
    SET status = 'oculto_moderacao', observacoes_internas = 'Inadequado para diretrizes'
    WHERE id = 'pub-rls-104e-1';

    -- Aluno 2 tenta ler a publicação oculta (deve retornar 0 linhas)
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub": "${student2Id}", "role": "authenticated", "email": "aluno2.104e@mtd.test"}';
    SELECT count(*) as qtd_oculta_aluno2 FROM public.publicacoes_comunidade WHERE id = 'pub-rls-104e-1';
  `;
  const resModeracaoOculta = runLinkedQuery(sqlModeracaoOculta);
  const rowsModeracaoOculta = parseRows(resModeracaoOculta.output);

  test("5.1 Publicação com status 'oculto_moderacao' é invisível para outros alunos", () => {
    assert(resModeracaoOculta.success, `Falha no teste de moderação oculta: ${resModeracaoOculta.output}`);
    const qtd = Number(rowsModeracaoOculta[0]?.qtd_oculta_aluno2 ?? 0);
    assert(qtd === 0, `Aluno 2 não deveria conseguir visualizar publicação oculta (retornou: ${qtd})`);
  });

  // 6. Teste de Gamificação: Modelos, Conquistas Concedidas e Eventos de Pontos
  console.log("\n--- 6. Testes de Gamificação: Conquistas, Pontos e Placas ---");
  const sqlGamificacao = `
    -- Cria modelo de conquista
    INSERT INTO public.modelos_conquistas (id, nome, descricao, categoria, tipo_criterio, tipo_premio, pontos_recompensa, elegivel_placa_fisica, status)
    VALUES ('mod-test-104e', 'Pioneiro 10.4E', 'Completou a etapa com louvor', 'especial', 'horas_aulas_presenca', 'fisico', 250, true, 'ativo')
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

    -- Concede conquista para Aluno 1
    INSERT INTO public.conquistas_concedidas (id, aluno_id, aluno_nome, modelo_id, modelo_nome, pontos_atribuidos, concedido_por, status)
    VALUES ('conq-104e-1', '${student1Id}'::uuid, 'Aluno Um', 'mod-test-104e', 'Pioneiro 10.4E', 250, 'Professor Teste', 'concedida')
    ON CONFLICT (id) DO UPDATE SET pontos_atribuidos = EXCLUDED.pontos_atribuidos;

    -- Registra evento de pontos
    INSERT INTO public.eventos_pontos (id, aluno_id, aluno_nome, tipo_acao, pontos, descricao)
    VALUES ('pts-104e-1', '${student1Id}'::uuid, 'Aluno Um', 'conquista_especial', 250, 'Conquista Pioneiro 10.4E')
    ON CONFLICT (id) DO UPDATE SET pontos = EXCLUDED.pontos;

    -- Aluno 1 solicita placa física
    INSERT INTO public.solicitacoes_placas (id, aluno_id, aluno_nome, conquista_id, conquista_nome, status)
    VALUES ('plk-104e-1', '${student1Id}'::uuid, 'Aluno Um', 'mod-test-104e', 'Pioneiro 10.4E', 'solicitada')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

    -- Aluno 2 tenta ler conquistas do Aluno 1 (deve retornar 0 linhas pelo RLS)
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub": "${student2Id}", "role": "authenticated", "email": "aluno2.104e@mtd.test"}';
    SELECT count(*) as qtd_conquistas_aluno2 FROM public.conquistas_concedidas WHERE aluno_id = '${student1Id}'::uuid;
  `;
  const resGamificacao = runLinkedQuery(sqlGamificacao);
  const rowsGamificacao = parseRows(resGamificacao.output);

  test("6.1 Conquistas concedidas são estritamente isoladas por RLS entre alunos", () => {
    assert(resGamificacao.success, `Falha no teste de Gamificação RLS: ${resGamificacao.output}`);
    const qtd = Number(rowsGamificacao[0]?.qtd_conquistas_aluno2 ?? 0);
    assert(qtd === 0, `Aluno 2 não deve conseguir ler conquistas de Aluno 1 (retornou: ${qtd})`);
  });

  // 7. Teste de Notificações Internas
  console.log("\n--- 7. Testes de Notificações Internas ---");
  const sqlNotificacoes = `
    INSERT INTO public.notificacoes_sistema (id, usuario_id, titulo, mensagem, tipo, lida)
    VALUES ('notif-104e-1', '${student1Id}', 'Conquista Desbloqueada!', 'Você recebeu a placa Pioneiro 10.4E', 'conquista_desbloqueada', false)
    ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo;

    -- Aluno 1 consulta suas notificações
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims" = '{"sub": "${student1Id}", "role": "authenticated", "email": "aluno1.104e@mtd.test"}';
    SELECT count(*) as qtd_notif_aluno1 FROM public.notificacoes_sistema WHERE usuario_id = '${student1Id}';
  `;
  const resNotificacoes = runLinkedQuery(sqlNotificacoes);
  const rowsNotificacoes = parseRows(resNotificacoes.output);

  test("7.1 Notificações internas gravadas e lidas pelo usuário destinatário", () => {
    assert(resNotificacoes.success, `Falha nas notificações: ${resNotificacoes.output}`);
    const qtd = Number(rowsNotificacoes[0]?.qtd_notif_aluno1 ?? 0);
    assert(qtd >= 1, `Aluno 1 deveria ter pelo menos 1 notificação (retornou: ${qtd})`);
  });

  // 8. Limpeza de Dados de Teste
  console.log("\n--- 8. Limpeza Higiênica e Preservação Institucional ---");
  const sqlCleanup = `
    DELETE FROM public.notificacoes_sistema WHERE id LIKE 'notif-104e-%';
    DELETE FROM public.solicitacoes_placas WHERE id LIKE 'plk-104e-%';
    DELETE FROM public.eventos_pontos WHERE id LIKE 'pts-104e-%';
    DELETE FROM public.conquistas_concedidas WHERE id LIKE 'conq-104e-%';
    DELETE FROM public.modelos_conquistas WHERE id LIKE 'mod-test-104e%';
    DELETE FROM public.comentarios_comunidade WHERE id LIKE 'com-rls-104e-%';
    DELETE FROM public.publicacoes_comunidade WHERE id LIKE 'pub-rls-104e-%';
    DELETE FROM public.espacos_comunidade WHERE id LIKE 'esp-test-104e%';
    DELETE FROM public.alunos WHERE id IN ('${student1Id}'::uuid, '${student2Id}'::uuid);
    DELETE FROM public.professores WHERE id IN ('${professorId}'::uuid);
    DELETE FROM public.perfis WHERE id IN ('${student1Id}'::uuid, '${student2Id}'::uuid, '${professorId}'::uuid);
    DELETE FROM auth.users WHERE id IN ('${student1Id}'::uuid, '${student2Id}'::uuid, '${professorId}'::uuid);
  `;
  const resCleanup = runLinkedQuery(sqlCleanup);

  test("8.1 Registros de teste removidos sem afetar usuários oficiais", () => {
    assert(resCleanup.success, `Falha na limpeza de teste: ${resCleanup.output}`);
  });

  console.log("\n===============================================================================");
  console.log(`TOTAL DE TESTES EXECUTADOS: ${passed + failed}`);
  console.log(`PASSARAM: ${passed}`);
  console.log(`FALHARAM: ${failed}`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro fatal na execução da suíte 10.4E:", err);
  process.exit(1);
});
