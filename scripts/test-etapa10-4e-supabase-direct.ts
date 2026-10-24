/**
 * TESTE E2E DIRETO COM CLIENT SUPABASE — ETAPA 10.4E (CONCLUSÃO)
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Módulos: Comunidade de Alunos & Gamificação / Conquistas
 * Banco Remoto: Supabase (oaissugnjvrobhdrnain)
 *
 * Valida a persistência remota direta no Supabase através dos clientes e repositórios:
 * 1. Autenticação real do Aluno de Homologação via Supabase Auth
 * 2. Admin: Criação de espaço da comunidade
 * 3. Aluno: Criação de publicação na comunidade (status 'publicado')
 * 4. Aluno: Alternar reação na publicação (curtida)
 * 5. Aluno: Comentar na publicação
 * 6. Aluno: Registrar denúncia de moderação
 * 7. Admin: Listar denúncias e moderar publicação (ocultar e restaurar)
 * 8. Admin: Criação de oportunidade de intercâmbio
 * 9. Aluno: Manifestar interesse na oportunidade de intercâmbio
 * 10. Admin: Criação de modelo de conquista
 * 11. Admin: Concessão manual de conquista ao aluno com atribuição de pontos
 * 12. Aluno: Consulta de pontos e histórico de eventos
 * 13. Aluno: Solicitação / interesse em placa física de reconhecimento
 * 14. Admin: Atualização do status da placa com código de rastreio
 * 15. Aluno: Leitura e marcação de notificações como lidas
 * 16. Admin: Métricas administrativas unificadas de Comunidade e Gamificação
 * 17. Limpeza higiênica dos dados de teste
 */

// Polyfills para execução em ambiente Node.js 20 / CLI
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

import * as fs from "fs";
import * as path from "path";

// Carregar .env.local se variáveis não estiverem no ambiente
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { createClient } from "@supabase/supabase-js";
import assert from "assert";
import { comunidadeSupabaseRepository } from "../src/data/comunidadeSupabaseRepository";
import { gamificacaoSupabaseRepository } from "../src/data/gamificacaoSupabaseRepository";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !publishableKey || !secretKey) {
  console.error("Variáveis de ambiente do Supabase ausentes em .env.local.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, secretKey);
const studentClient = createClient(supabaseUrl, publishableKey);

async function runDirectE2ETests() {
  console.log("==================================================================");
  console.log("TESTE DIRETO DE PERSISTÊNCIA REMOTA — ETAPA 10.4E (CONCLUSÃO)");
  console.log("Módulos: Comunidade e Gamificação no Supabase");
  console.log("Banco Remoto: Supabase (oaissugnjvrobhdrnain)");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function test(desc: string, ok: boolean, msg?: string) {
    total++;
    if (ok) {
      passed++;
      console.log(`  ✓ [${total}] ${desc}`);
    } else {
      console.error(`  ✗ [${total}] FALHA: ${desc} — ${msg || ""}`);
      process.exitCode = 1;
    }
  }

  // 1. Autenticação do Aluno de Homologação
  console.log("--- 1. AUTENTICAÇÃO DO ALUNO DE HOMOLOGAÇÃO ---");
  const { data: authData, error: authErr } = await studentClient.auth.signInWithPassword({
    email: "homologacao.aluno@escolapaulo.com.br",
    password: "AlunoMTD2026!",
  });

  test("1.1 Login do aluno de homologação bem-sucedido", !authErr && !!authData.session, authErr?.message);
  assert(authData.session, "Sessão do aluno deve existir");

  const { data: perfilAluno } = await studentClient.from("perfis").select("id, aluno_id, nome_completo").single();
  assert(perfilAluno && perfilAluno.aluno_id, "Perfil de aluno deve possuir aluno_id vinculado");
  const alunoId = perfilAluno.aluno_id;
  const alunoNome = perfilAluno.nome_completo || "Aluno Homologação";
  console.log(`   Aluno ID: ${alunoId} | Nome: ${alunoNome}`);

  // IDs para limpeza
  const idsParaLimpar = {
    espacoId: `esp-direct-104e-${Date.now()}`,
    publicacaoId: "",
    comentarioId: "",
    denunciaId: "",
    oportunidadeId: `op-direct-104e-${Date.now()}`,
    interesseId: "",
    modeloId: `mod-direct-104e-${Date.now()}`,
    conquistaId: "",
    solicitacaoPlacaId: "",
    notificacaoId: "",
  };

  try {
    // 2. Admin: Criar Espaço da Comunidade
    console.log("\n--- 2. ADMIN: CRIAÇÃO DE ESPAÇO DA COMUNIDADE ---");
    const resEspaco = await comunidadeSupabaseRepository.salvarEspaco(
      {
        id: idsParaLimpar.espacoId,
        nome: "Espaço de Homologação 10.4E",
        descricao: "Espaço criado durante homologação do backend completo",
        tipo: "geral",
        status: "ativo",
        permitirPublicacaoAluno: true,
        permitirComentarios: true,
      },
      adminClient
    );

    test("2.1 Admin salva espaço da comunidade no Supabase", resEspaco.success && !!resEspaco.data, resEspaco.error);
    assert(resEspaco.data, "Dados do espaço devem existir");

    // 3. Aluno: Criar Publicação
    console.log("\n--- 3. ALUNO: PUBLICAÇÃO NA COMUNIDADE ---");
    const resPub = await comunidadeSupabaseRepository.criarPublicacao(
      {
        espacoId: idsParaLimpar.espacoId,
        autorId: alunoId,
        autorNome: alunoNome,
        autorPapel: "aluno",
        tipo: "discussao",
        titulo: "Dúvida sobre o Método Paulo",
        conteudo: "Olá a todos! Como vocês organizam a rotina de estudo de flashcards diários?",
      },
      undefined,
      [],
      studentClient
    );

    test("3.1 Aluno cria publicação no espaço da comunidade", resPub.success && !!resPub.data, resPub.error);
    assert(resPub.data, "Dados da publicação devem existir");
    idsParaLimpar.publicacaoId = resPub.data.id;

    // 4. Aluno: Alternar Reação na Publicação
    console.log("\n--- 4. ALUNO: REAÇÃO NA PUBLICAÇÃO ---");
    const resReacao = await comunidadeSupabaseRepository.alternarReacaoPublicacao(
      idsParaLimpar.publicacaoId,
      "curtida",
      alunoId,
      studentClient
    );

    test("4.1 Aluno reage à publicação (curtida)", resReacao.success && (resReacao.data?.reacoesCount || 0) >= 1, resReacao.error);

    // 5. Aluno: Comentar na Publicação
    console.log("\n--- 5. ALUNO: COMENTÁRIO NA PUBLICAÇÃO ---");
    const resComentario = await comunidadeSupabaseRepository.criarComentario(
      {
        publicacaoId: idsParaLimpar.publicacaoId,
        autorId: alunoId,
        autorNome: alunoNome,
        autorPapel: "aluno",
        conteudo: "Eu costumo estudar 15 minutos pela manhã!",
      },
      undefined,
      [],
      studentClient
    );

    test("5.1 Aluno adiciona comentário na publicação", resComentario.success && !!resComentario.data, resComentario.error);
    assert(resComentario.data, "Dados do comentário devem existir");
    idsParaLimpar.comentarioId = resComentario.data.id;

    // 6. Aluno: Registrar Denúncia de Conteúdo
    console.log("\n--- 6. ALUNO: DENÚNCIA DE CONTEÚDO ---");
    const resDenuncia = await comunidadeSupabaseRepository.denunciarConteudo(
      {
        alvoTipo: "publicacao",
        alvoId: idsParaLimpar.publicacaoId,
        publicacaoId: idsParaLimpar.publicacaoId,
        denuncianteId: alunoId,
        denuncianteNome: alunoNome,
        motivo: "outro",
        descricao: "Denúncia de teste de homologação",
      },
      studentClient
    );

    test("6.1 Aluno registra denúncia de conteúdo com sucesso", resDenuncia.success && !!resDenuncia.data, resDenuncia.error);
    if (resDenuncia.data) idsParaLimpar.denunciaId = resDenuncia.data.id;

    // 7. Admin: Moderação da Publicação
    console.log("\n--- 7. ADMIN: MODERAÇÃO DE PUBLICAÇÃO ---");
    const resOcultar = await comunidadeSupabaseRepository.moderarPublicacao(
      idsParaLimpar.publicacaoId,
      "ocultar",
      "Ocultada temporariamente para análise",
      "admin-001",
      "Administrador MTD",
      adminClient
    );
    test("7.1 Admin oculta publicação na moderação", resOcultar.success && (resOcultar.data?.status === "oculta" || (resOcultar.data?.status as any) === "oculto_moderacao"), resOcultar.error);

    const resRestaurar = await comunidadeSupabaseRepository.moderarPublicacao(
      idsParaLimpar.publicacaoId,
      "restaurar",
      "Conteúdo aprovado após verificação",
      "admin-001",
      "Administrador MTD",
      adminClient
    );
    test("7.2 Admin restaura publicação para publicado", resRestaurar.success && resRestaurar.data?.status === "publicada", resRestaurar.error);

    // 8. Oportunidades: Admin cria e Aluno manifesta interesse
    console.log("\n--- 8. OPORTUNIDADES E MANIFESTAÇÃO DE INTERESSE ---");
    const resOportunidade = await adminClient
      .from("oportunidades_comunidade")
      .insert({
        id: idsParaLimpar.oportunidadeId,
        titulo: "Intercâmbio Oxford 2027",
        descricao: "Programa de imersão linguística internacional",
        categoria: "intercambio",
        status: "ativa",
      })
      .select()
      .single();

    test("8.1 Admin cadastra oportunidade de intercâmbio", !resOportunidade.error && !!resOportunidade.data, resOportunidade.error?.message);

    const resInteresse = await comunidadeSupabaseRepository.registrarInteresseOportunidade(
      {
        oportunidadeId: idsParaLimpar.oportunidadeId,
        alunoId,
        alunoNome,
        alunoEmail: "homologacao.aluno@escolapaulo.com.br",
        alunoNivelAtual: "B1",
        observacoesAluno: "Tenho muito interesse no intercâmbio acadêmico.",
      },
      studentClient
    );

    test("8.2 Aluno manifesta interesse na oportunidade", resInteresse.success && !!resInteresse.data, resInteresse.error);
    if (resInteresse.data) idsParaLimpar.interesseId = resInteresse.data.id;

    // 9. Gamificação: Modelo de Conquista e Concessão Manual
    console.log("\n--- 9. GAMIFICAÇÃO: MODELO E CONCESSÃO DE CONQUISTA ---");
    const resModelo = await gamificacaoSupabaseRepository.salvarModelo(
      {
        id: idsParaLimpar.modeloId,
        nome: "Fluência MTD — Marco Inicial",
        descricao: "Conquistou o marco inicial de dedicação na plataforma",
        categoria: "dedicacao",
        tipoCriterio: "horas_aulas_presenca",
        tipoPremio: "placa_fisica",
        pontosRecompensa: 300,
        elegivelPlacaFisica: true,
        icone: "Award",
        cor: "emerald",
        status: "ativo",
      },
      adminClient
    );

    test("9.1 Admin cria modelo de conquista elegível a placa física", resModelo.success && !!resModelo.data, resModelo.error);

    const resConcessao = await gamificacaoSupabaseRepository.concederConquistaManual(
      {
        alunoId,
        alunoNome,
        modeloId: idsParaLimpar.modeloId,
        professorNome: "Professor Homologador MTD",
        justificativaDocente: "Demonstrou excelente engajamento nas aulas ao vivo.",
      },
      adminClient
    );

    test("9.2 Admin concede conquista manualmente com atribuição de pontos", resConcessao.success && !!resConcessao.data, resConcessao.error);
    if (resConcessao.data) idsParaLimpar.conquistaId = resConcessao.data.id;

    // 10. Pontos: Consulta pelo Aluno
    console.log("\n--- 10. GAMIFICAÇÃO: PONTOS E HISTÓRICO ---");
    const pontosAluno = await gamificacaoSupabaseRepository.obterPontosAluno(alunoId, studentClient);
    test("10.1 Aluno consulta saldo e histórico de pontos no Supabase", pontosAluno.pontosTotais >= 300 && pontosAluno.historicoEventos.length > 0);

    // 11. Solicitação de Placa Física pelo Aluno
    console.log("\n--- 11. GAMIFICAÇÃO: SOLICITAÇÃO DE PLACA FÍSICA ---");
    const resPlaca = await gamificacaoSupabaseRepository.registrarInteressePlacaFisica(
      {
        alunoId,
        alunoNome,
        conquistaId: idsParaLimpar.modeloId,
        conquistaNome: "Fluência MTD — Marco Inicial",
        nivelMarco: "B1",
      },
      studentClient
    );

    test("11.1 Aluno solicita placa física de reconhecimento", resPlaca.success && !!resPlaca.data, resPlaca.error);
    if (resPlaca.data) idsParaLimpar.solicitacaoPlacaId = resPlaca.data.id;

    // 12. Admin: Atualização de Status da Placa
    console.log("\n--- 12. ADMIN: PRODUÇÃO E RASTREIO DA PLACA FÍSICA ---");
    if (idsParaLimpar.solicitacaoPlacaId) {
      const resUpdatePlaca = await gamificacaoSupabaseRepository.atualizarStatusPlacaFisica(
        idsParaLimpar.solicitacaoPlacaId,
        "em_producao",
        "Equipe de Logística MTD",
        "Placa enviada para gravação a laser personalizada",
        "BR123456789MTD",
        "Observação interna sigilosa",
        adminClient
      );

      test("12.1 Admin atualiza status da placa física para 'em_producao'", resUpdatePlaca.success && resUpdatePlaca.data?.status === "em_producao", resUpdatePlaca.error);
    }

    // 13. Notificações Internas: Leitura e Marcação
    console.log("\n--- 13. NOTIFICAÇÕES DO SISTEMA ---");
    const notificacoes = await gamificacaoSupabaseRepository.listarNotificacoes(alunoId, studentClient);
    test("13.1 Aluno lista notificações geradas pelo sistema", notificacoes.length > 0);

    if (notificacoes.length > 0) {
      const firstNotif = notificacoes[0];
      idsParaLimpar.notificacaoId = firstNotif.id;
      const resLida = await gamificacaoSupabaseRepository.marcarNotificacaoComoLida(firstNotif.id, studentClient);
      test("13.2 Aluno marca notificação como lida", resLida.success && resLida.data === true, resLida.error);
    }

    // 14. Métricas Administrativas Unificadas
    console.log("\n--- 14. MÉTRICAS ADMINISTRATIVAS CONSOLIDADAS ---");
    const metricasComunidade = await comunidadeSupabaseRepository.obterMetricasAdmin(adminClient);
    test("14.1 Admin obtém métricas da Comunidade (espaços, publicações, comentários)", metricasComunidade.totalPublicacoes > 0 && metricasComunidade.totalEspacosAtivos > 0);

    const metricasGamificacao = await gamificacaoSupabaseRepository.obterMetricasAdmin(adminClient);
    test("14.2 Admin obtém métricas de Gamificação (conquistas, placas, pontos)", metricasGamificacao.totalConquistasDesbloqueadas > 0 && metricasGamificacao.totalPontosDistribuidos > 0);

  } finally {
    // 15. Limpeza Higiênica dos Registros de Teste
    console.log("\n--- 15. LIMPEZA HIGIÊNICA ---");
    if (idsParaLimpar.comentarioId) {
      await adminClient.from("comentarios_comunidade").delete().eq("id", idsParaLimpar.comentarioId);
    }
    if (idsParaLimpar.publicacaoId) {
      await adminClient.from("publicacoes_comunidade").delete().eq("id", idsParaLimpar.publicacaoId);
    }
    if (idsParaLimpar.denunciaId) {
      await adminClient.from("denuncias_comunidade").delete().eq("id", idsParaLimpar.denunciaId);
    }
    if (idsParaLimpar.espacoId) {
      await adminClient.from("espacos_comunidade").delete().eq("id", idsParaLimpar.espacoId);
    }
    if (idsParaLimpar.interesseId) {
      await adminClient.from("interesses_oportunidades").delete().eq("id", idsParaLimpar.interesseId);
    }
    if (idsParaLimpar.oportunidadeId) {
      await adminClient.from("oportunidades_comunidade").delete().eq("id", idsParaLimpar.oportunidadeId);
    }
    if (idsParaLimpar.solicitacaoPlacaId) {
      await adminClient.from("solicitacoes_placas").delete().eq("id", idsParaLimpar.solicitacaoPlacaId);
    }
    if (idsParaLimpar.conquistaId) {
      await adminClient.from("conquistas_concedidas").delete().eq("id", idsParaLimpar.conquistaId);
    }
    if (idsParaLimpar.modeloId) {
      await adminClient.from("modelos_conquistas").delete().eq("id", idsParaLimpar.modeloId);
    }
    // Remove eventos de pontos gerados no teste
    await adminClient.from("eventos_pontos").delete().eq("aluno_id", alunoId).like("descricao", "%Fluência MTD%");
    // Remove notificações de teste
    await adminClient.from("notificacoes_sistema").delete().eq("usuario_id", alunoId).like("titulo", "%Placa%");
    await adminClient.from("notificacoes_sistema").delete().eq("usuario_id", alunoId).like("titulo", "%conquista%");

    console.log("   Limpeza concluída com sucesso.");
  }

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES EXECUTADOS: ${total}`);
  console.log(`PASSARAM: ${passed}`);
  console.log(`FALHARAM: ${total - passed}`);
  console.log("==================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runDirectE2ETests().catch((err) => {
  console.error("Erro fatal nos testes diretos 10.4E:", err);
  process.exit(1);
});
