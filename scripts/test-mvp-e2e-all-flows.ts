/**
 * TESTE E2E FUNCIONAL COMPLETO DOS FLUXOS DO MVP — ETAPA 10.3C
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Valida:
 * 1. Fluxos integrados no Supabase (Alunos, Professores, Turmas, Matrículas, Agenda, Aulas, Presenças, Frequência).
 * 2. Fluxo de Conteúdo (Materiais e Atividades: publicação pelo admin, visualização e submissão pelo aluno, esteira de correção).
 * 3. Fluxo de Flashcards SRS (Gestão de baralhos/cartões, fila diária, repetição espaçada SM-2 e gravação de sessão).
 * 4. Fluxo de Avaliações (Método Paulo, auto-correção objetiva, rubrica prática e pontuação proporcional).
 * 5. Fluxo de Self Presentation (Roteiro dos 6 passos, submissão, fila de atendimento e parecer pedagógico).
 */

// Polyfills para execução em ambiente Node.js / CLI
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

const memoryStorage = new Map<string, string>();
const dummyLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) || null,
  setItem: (key: string, val: string) => { memoryStorage.set(key, String(val)); },
  removeItem: (key: string) => { memoryStorage.delete(key); },
  clear: () => { memoryStorage.clear(); },
};

(globalThis as any).localStorage = dummyLocalStorage;
(globalThis as any).window = {
  localStorage: dummyLocalStorage,
  dispatchEvent: () => true,
  CustomEvent: class {},
};

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
import { materialRepository } from "../src/data/materialRepository";
import { atividadeRepository } from "../src/data/atividadeRepository";
import { entregaRepository } from "../src/data/entregaRepository";
import * as baralhoRepo from "../src/data/baralhoRepository";
import * as cartaoRepo from "../src/data/cartaoRepository";
import * as progressoCartaoRepo from "../src/data/progressoCartaoRepository";
import * as sessaoEstudoRepo from "../src/data/sessaoEstudoRepository";
import { avaliacaoRepository } from "../src/data/avaliacaoRepository";
import { tentativaAvaliacaoRepository } from "../src/data/tentativaAvaliacaoRepository";
import { selfPresentationRepository } from "../src/data/selfPresentationRepository";
import assert from "assert";

let passed = 0;
let total = 0;

async function test(name: string, fn: () => Promise<void>) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`      Motivo: ${err.message}`);
  }
}

async function runAllTests() {
  console.log("==============================================================================");
  console.log("VALIDAÇÃO FUNCIONAL DE PONTA A PONTA DO MVP (ADMIN E ALUNO)");
  console.log("==============================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  const adminClient = createClient(supabaseUrl, secretKey);
  const studentClient = createClient(supabaseUrl, publishableKey);

  // 1. SUPABASE: Autenticação do Aluno
  console.log("--- 1. SUPABASE: Autenticação e Dados do Aluno ---");
  let studentUser: any = null;
  await test("1.1 Login com credenciais do aluno de homologação", async () => {
    const { data, error } = await studentClient.auth.signInWithPassword({
      email: "homologacao.aluno@escolapaulo.com.br",
      password: "AlunoMTD2026!",
    });
    assert(!error, `Erro no login: ${error?.message}`);
    assert(data.session, "Sessão não gerada");
    studentUser = data.user;
  });

  await test("1.2 Perfil do aluno está ativo e com papel 'aluno'", async () => {
    const { data: perfil, error } = await studentClient.from("perfis").select("*").single();
    assert(!error, `Erro ao carregar perfil: ${error?.message}`);
    assert.strictEqual(perfil.role, "aluno");
    assert.strictEqual(perfil.status, "ativo");
    assert.strictEqual(perfil.nome_completo, "Aluno Homologação MTD");
  });

  await test("1.3 Aluno enxerga suas próprias aulas via vw_aluno_aulas com RLS", async () => {
    const { data: aulas, error } = await studentClient.from("vw_aluno_aulas").select("*");
    assert(!error, `Erro ao listar vw_aluno_aulas: ${error?.message}`);
    assert.strictEqual(aulas.length, 2, `Esperava 2 aulas, obteve ${aulas.length}`);
    const concluidas = aulas.filter((a) => a.status === "concluida");
    const agendadas = aulas.filter((a) => a.status === "agendada");
    assert.strictEqual(concluidas.length, 1, "Esperava 1 aula concluída");
    assert.strictEqual(agendadas.length, 1, "Esperava 1 aula agendada");
  });

  await test("1.4 Aluno enxerga suas presenças e frequência calculada em 100%", async () => {
    const { data: presencas, error: presErr } = await studentClient.from("vw_aluno_presencas").select("*");
    assert(!presErr, `Erro ao listar vw_aluno_presencas: ${presErr?.message}`);
    assert.strictEqual(presencas.length, 2, `Esperava 2 registros de presença, obteve ${presencas.length}`);

    const { data: freq, error: freqErr } = await studentClient.rpc("calcular_frequencia_aluno", {
      p_aluno_id: "240dfc89-154c-47c4-99fe-9af9afd45331",
    });
    assert(!freqErr, `Erro na RPC de frequência: ${freqErr?.message}`);
    assert.strictEqual(freq.porcentagem, 100, `Frequência esperada 100%, obteve ${freq.porcentagem}%`);
    assert.strictEqual(freq.totalPresentes, 1, "Esperava 1 presença");
    assert.strictEqual(freq.totalAusentes, 0, "Esperava 0 ausências");
  });

  // 2. SUPABASE: Visão do Administrador
  console.log("\n--- 2. SUPABASE: Visão Administrativa e Cadastros ---");
  await test("2.1 Admin consulta alunos cadastrados no PostgreSQL", async () => {
    const { data: alunos, error } = await adminClient.from("alunos").select("*");
    assert(!error, `Erro ao consultar alunos: ${error?.message}`);
    assert(alunos.length >= 2, `Esperava pelo menos 2 alunos, obteve ${alunos.length}`);
  });

  await test("2.2 Admin consulta professores cadastrados no PostgreSQL", async () => {
    const { data: profs, error } = await adminClient.from("professores").select("*");
    assert(!error, `Erro ao consultar professores: ${error?.message}`);
    assert(profs.length >= 1, `Esperava pelo menos 1 professor, obteve ${profs.length}`);
    assert(profs.some((p) => p.nome_completo === "Teste Eder"), "Professor Eder não encontrado");
  });

  await test("2.3 Admin consulta turmas e matrículas no PostgreSQL", async () => {
    const { data: turmas, error } = await adminClient.from("turmas").select("*, matriculas_turmas(*)");
    assert(!error, `Erro ao consultar turmas: ${error?.message}`);
    assert(turmas.length >= 1, `Esperava pelo menos 1 turma, obteve ${turmas.length}`);
    const tHomolog = turmas.find((t) => t.id === "a15e1ab9-49da-497f-82bd-b44a27e5b09d");
    assert(tHomolog, "Turma de Homologação A1 não encontrada");
    assert.strictEqual(tHomolog.matriculas_turmas.length, 1, "Esperava 1 matrícula na turma");
  });

  // 3. FLUXO DE CONTEÚDO: Materiais Didáticos e Atividades
  console.log("\n--- 3. CONTEÚDO: Materiais, Atividades e Entregas ---");
  let novoMaterialId = "";
  let novaAtividadeId = "";
  const alunoIdReal = "240dfc89-154c-47c4-99fe-9af9afd45331";
  const turmaIdReal = "a15e1ab9-49da-497f-82bd-b44a27e5b09d";

  await test("3.1 Administrador publica novo material didático direcionado à turma", async () => {
    const res = await materialRepository.criar({
      titulo: "Guia Essencial de Apresentação Pessoal A1",
      descricao: "Vocabulário, saudações formais e estrutura de introdução para iniciantes.",
      tipo: "pdf",
      categoria: "Vocabulário",
      nivelRecomendado: "A1",
      autorId: "efeb8576-aa79-483d-8c19-79d0ff6a9c8a",
      autorNome: "Carlos Mendes",
      status: "publicado",
      destinoTipo: "turma",
      destinoId: turmaIdReal,
      linkExterno: "https://materiais.escolapaulo.com.br/guia-a1.pdf",
    });
    assert(res.success, `Falha ao criar material: ${res.error}`);
    assert(res.data, "Dados do material ausentes");
    novoMaterialId = res.data.id;
  });

  await test("3.2 Administrador publica atividade prática associada ao material", async () => {
    const res = await atividadeRepository.criar({
      titulo: "Exercício Prático 1 • Gravando sua Primeira Frase",
      instrucoes: "Grave uma frase em áudio com sua apresentação pessoal e submeta o link para avaliação.",
      tipo: "link",
      professorId: "efeb8576-aa79-483d-8c19-79d0ff6a9c8a",
      dataPublicacao: "2026-10-23",
      status: "publicada",
      destinoTipo: "turma",
      destinoId: turmaIdReal,
      materialRelacionadoId: novoMaterialId,
      permitirAtraso: true,
      prazoEntrega: "2026-10-30T23:59:00Z",
    });
    assert(res.success, `Falha ao criar atividade: ${res.error}`);
    assert(res.data, "Dados da atividade ausentes");
    novaAtividadeId = res.data.id;
  });

  await test("3.3 Aluno visualiza o material e a atividade da sua turma", async () => {
    const materiaisAluno = await materialRepository.listarParaAluno(alunoIdReal, [turmaIdReal]);
    assert(materiaisAluno.some((m) => m.id === novoMaterialId), "Material da turma não listado para o aluno");

    const atividadesAluno = await atividadeRepository.listarParaAluno(alunoIdReal, [turmaIdReal]);
    assert(atividadesAluno.some((a) => a.id === novaAtividadeId), "Atividade da turma não listada para o aluno");
  });

  let entregaId = "";
  await test("3.4 Aluno submete entrega da atividade prática", async () => {
    const res = await entregaRepository.enviarEntrega(
      novaAtividadeId,
      alunoIdReal,
      { respostaLink: "https://drive.google.com/file/d/minha-gravacao-a1/view" }
    );
    assert(res.success, `Falha ao enviar entrega: ${res.error}`);
    assert(res.data, "Dados da entrega ausentes");
    assert.strictEqual(res.data.status, "entregue");
    entregaId = res.data.id;
  });

  await test("3.5 Professor/Admin corrige a entrega e atribui feedback pedagógico", async () => {
    const res = await entregaRepository.corrigir(
      entregaId,
      "efeb8576-aa79-483d-8c19-79d0ff6a9c8a",
      {
        feedback: "Excelente pronúncia inicial! Parabéns pelo empenho e dedicação.",
        pontuacao: 95,
      }
    );
    assert(res.success, `Falha ao corrigir entrega: ${res.error}`);
    assert.strictEqual(res.data?.status, "corrigida");
    assert.strictEqual(res.data?.pontuacao, 95);
  });

  // 4. FLUXO DE FLASHCARDS SRS
  console.log("\n--- 4. FLASHCARDS: Baralhos, Algoritmo SM-2 e Prática ---");
  let baralhoId = "";
  let cartaoId = "";

  await test("4.1 Admin cria baralho direcionado à turma do aluno", async () => {
    const res = await baralhoRepo.salvarBaralho({
      nome: "Vocabulário de Homologação A1",
      descricao: "Expressões essenciais de cumprimento e rotina",
      nivelRecomendado: "A1",
      categoria: "Vocabulário",
      professorId: "efeb8576-aa79-483d-8c19-79d0ff6a9c8a",
      destinoTipo: "turma",
      destinoId: turmaIdReal,
      limiteDiarioNovos: 15,
      status: "publicado",
    });
    assert(res.success, `Falha ao criar baralho: ${res.error}`);
    baralhoId = res.data!.id;
  });

  await test("4.2 Admin adiciona cartões com dica de pronúncia ao baralho", async () => {
    const res = await cartaoRepo.salvarCartao({
      baralhoId,
      frente: "How are you doing today?",
      verso: "Como você está hoje?",
      exemplo: "Hello Ray, how are you doing today?",
      traducao: "Olá Ray, como você está hoje?",
      dica: "Expressão amigável e cotidiana",
      pronuncia: "/haʊ ɑːr juː ˈduːɪŋ təˈdeɪ/",
      status: "ativo",
    });
    assert(res.success, `Falha ao criar cartão: ${res.error}`);
    cartaoId = res.data!.id;
  });

  await test("4.3 Aluno acessa baralho e obtém fila de estudo diária", async () => {
    const baralhos = await baralhoRepo.getBaralhosAluno(alunoIdReal, [turmaIdReal]);
    assert(baralhos.some((b) => b.id === baralhoId), "Baralho da turma não acessível ao aluno");

    const fila = await progressoCartaoRepo.obterFilaEstudoBaralho(alunoIdReal, baralhoId);
    assert(fila.fila.length > 0, "Fila de estudo vazia");
    assert(fila.fila.some((c) => c.id === cartaoId), "Cartão criado não encontrado na fila");
  });

  await test("4.4 Aluno responde ao cartão com avaliação SRS 'bom' e avança intervalo", async () => {
    const res = await progressoCartaoRepo.registrarRespostaEstudo(alunoIdReal, cartaoId, baralhoId, "bom");
    assert(res.progresso, "Progresso do cartão não retornado");
    assert.strictEqual(res.progresso.totalRevisoes, 1, "Total de revisões incorreto");
    assert.strictEqual(res.progresso.intervaloDias, 1, "Intervalo de primeiro acerto 'bom' deve ser 1 dia");
    assert.strictEqual(res.progresso.estado, "revisao");
  });

  await test("4.5 Aluno conclui sessão de estudo e resumo é persistido", async () => {
    const sessao = await sessaoEstudoRepo.salvarSessaoEstudo({
      alunoId: alunoIdReal,
      baralhoId,
      iniciadaEm: new Date(Date.now() - 120000).toISOString(),
      concluidaEm: new Date().toISOString(),
      totalEstudado: 1,
      erros: 0,
      dificeis: 0,
      bons: 1,
      faceis: 0,
      tempoSegundos: 120,
      revisoesReagendadas: 0,
    });
    assert(sessao.id, "Sessão não gerou ID");
    const sessoesSalvas = await sessaoEstudoRepo.obterSessoesPorAluno(alunoIdReal, baralhoId);
    assert(sessoesSalvas.some((s) => s.id === sessao.id), "Sessão não persistida no histórico");
  });

  // 5. FLUXO DE AVALIAÇÕES E MÉTODO PAULO
  console.log("\n--- 5. AVALIAÇÕES: Auto-correção Objetiva e Rubrica Prática ---");
  let avalObjetivaId = "";
  await test("5.1 Aluno consulta avaliações disponíveis para seu nível e turma", async () => {
    const avals = await avaliacaoRepository.listarParaAluno(alunoIdReal, [turmaIdReal]);
    assert(Array.isArray(avals), "Retorno de avaliações inválido");
    const obj = avals.find((a) => a.tipo === "objetiva" && a.status === "publicada");
    if (obj) {
      avalObjetivaId = obj.id;
    }
  });

  if (avalObjetivaId) {
    let tentativaId = "";
    await test("5.2 Aluno inicia e submete avaliação objetiva com auto-correção", async () => {
      const tentResult = await tentativaAvaliacaoRepository.iniciarTentativa(
        avalObjetivaId,
        alunoIdReal,
        "Aluno Homologação MTD"
      );
      assert(tentResult.success, `Falha ao iniciar tentativa: ${tentResult.error}`);
      assert(tentResult.data?.id, "ID da tentativa ausente");
      tentativaId = tentResult.data.id;

      // Responde com gabarito correto
      const aval = await avaliacaoRepository.obterPorId(avalObjetivaId);
      const respostas: Record<string, string> = {};
      if (aval?.questoes) {
        for (const q of aval.questoes) {
          respostas[q.id] = q.alternativaCorretaId;
        }
      }

      const res = await tentativaAvaliacaoRepository.enviarTentativa(tentativaId, alunoIdReal, {
        respostasObjetivasMap: respostas,
      });
      assert(res.success, `Falha ao concluir tentativa: ${res.error}`);
      assert.strictEqual(res.data?.status, "corrigida");
      assert.strictEqual(res.data?.resultado, "aprovado");
      assert(res.data?.nota !== undefined && res.data?.nota > 0, "Nota proporcional não atribuída");
    });
  }

  // 6. FLUXO DE SELF PRESENTATION
  console.log("\n--- 6. SELF PRESENTATION: Rito de Fluência e Nivelamento ---");
  let spId = "";
  await test("6.1 Aluno cria e submete vídeo de Self Presentation com consentimento", async () => {
    const rascunhoResult = await selfPresentationRepository.salvarRascunho({
      alunoId: alunoIdReal,
      alunoNome: "Aluno Homologação MTD",
      tipo: "nivelamento_inicial",
      titulo: "Minha Apresentação Oral de Nivelamento Inicial",
      linkVideo: "https://youtube.com/watch?v=apresentacao-mtd-demo",
      dataGravacao: "2026-10-23",
      observacaoAluno: "Apresentação focando nos pontos 1 a 6 do roteiro pedagógico.",
      consentimento: {
        aceito: true,
        dataHora: new Date().toISOString(),
        versaoTexto: "v1.0",
      },
    });
    assert(rascunhoResult.success, `Falha ao salvar rascunho de Self Presentation: ${rascunhoResult.error}`);
    spId = rascunhoResult.data!.id;

    const envioResult = await selfPresentationRepository.enviar(spId, {
      linkVideo: "https://youtube.com/watch?v=apresentacao-mtd-demo",
      dataGravacao: "2026-10-23",
      observacaoAluno: "Apresentação focando nos pontos 1 a 6 do roteiro pedagógico.",
      consentimento: {
        aceito: true,
        dataHora: new Date().toISOString(),
        versaoTexto: "v1.0",
      },
    });
    assert(envioResult.success, `Falha ao enviar Self Presentation: ${envioResult.error}`);
    assert.strictEqual(envioResult.data?.status, "enviada");
  });

  await test("6.2 Professor avalia a Self Presentation pela rubrica de 6 critérios", async () => {
    await selfPresentationRepository.assumirAvaliacao(
      spId,
      "efeb8576-aa79-483d-8c19-79d0ff6a9c8a",
      "Carlos Mendes"
    );

    const res = await selfPresentationRepository.salvarAvaliacao(
      spId,
      {
        professorId: "efeb8576-aa79-483d-8c19-79d0ff6a9c8a",
        professorNome: "Carlos Mendes",
        rubrica: {
          fluencia: { pontuacao: 4, comentario: "Bom ritmo e pausas naturais" },
          vocabulario: { pontuacao: 4, comentario: "Vocabulário adequado ao nível A1" },
          gramaticaAplicada: { pontuacao: 3, comentario: "Estruturas básicas corretas" },
          pronunciaInteligibilidade: { pontuacao: 4, comentario: "Boa clareza e dicção" },
          coerenciaOrganizacao: { pontuacao: 4, comentario: "Raciocínio lógico estruturado" },
          compreensaoGeral: { pontuacao: 4, comentario: "Mensagem facilmente compreensível" },
        },
        pontosFortes: "Boa pronúncia dos fonemas iniciais e ritmo contínuo.",
        pontosADesenvolver: "Expandir o repertório de conectivos conversacionais.",
        orientacaoProximasAulas: "Focar em expressões de transição e escuta ativa.",
        nivelDefinido: "A1",
        justificativaNivel: "Demonstrou competência oral sólida condizente com a faixa A1.",
        observacoesInternas: "Nota pedagógica confidencial da coordenação.",
      },
      true // publicar avaliação
    );
    assert(res.success, `Falha ao avaliar Self Presentation: ${res.error}`);
    assert.strictEqual(res.data?.status, "avaliada");
    assert(res.data?.avaliacao?.mediaCriteriosOrais !== undefined, "Média dos critérios orais calculada");
  });

  await test("6.3 Sanitização de privacidade: observações internas não vazam para o aluno", async () => {
    const visualizacaoAluno = await selfPresentationRepository.obterParaAluno(spId, alunoIdReal);
    assert(visualizacaoAluno, "Apresentação não encontrada para o aluno");
    assert(visualizacaoAluno.avaliacao, "Avaliação não encontrada");
    assert.strictEqual(
      visualizacaoAluno.avaliacao.observacoesInternas,
      undefined,
      "observacoesInternas vazou na consulta do aluno!"
    );
  });

  console.log("\n==============================================================================");
  console.log(`TOTAL DE TESTES EXECUTADOS: ${total}`);
  console.log(`TOTAL DE APROVAÇÕES: ${passed}`);
  console.log(`TOTAL DE FALHAS: ${total - passed}`);
  console.log("==============================================================================");

  if (passed === total) {
    console.log("\n✅ SUCESSO: Todos os fluxos do MVP foram testados e aprovados!");
  } else {
    console.error("\n❌ ATENÇÃO: Houve falhas em testes funcionais!");
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("Erro fatal na execução dos testes:", e);
  process.exit(1);
});
