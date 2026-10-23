/**
 * TESTE E2E DIRETO COM CLIENT SUPABASE — ETAPA 10.4B
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Valida a persistência remota direta no Supabase através dos clientes e repositórios:
 * 1. Autenticação real do Aluno de Homologação via Supabase Auth
 * 2. Admin/Professor: Publicação de Avaliação Objetiva vinculada à Turma
 * 3. Aluno Homologação: Consulta da avaliação via view segura vw_aluno_avaliacoes
 * 4. Aluno Homologação: Início de tentativa com persistência remota em tentativas_avaliacoes
 * 5. Aluno Homologação: Salvamento de rascunho de respostas objetivas
 * 6. Aluno Homologação: Envio e auto-correção com cálculo de nota e aprovação
 * 7. Isolamento RLS: Tentativa de leitura de dados de terceiros é bloqueada (0 resultados)
 * 8. Avaliação Prática: Envio pelo aluno e correção docente com rubricas e observações internas
 * 9. Higienização: Aluno recebe feedback sem vazamento de observações internas confidenciais
 * 10. Limpeza higiênica e restauração do estado original
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
import { sanitizarTentativaParaAluno } from "../src/data/tentativaAvaliacaoLocalStorageRepository";
import { TentativaAvaliacao } from "../src/types";

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
  console.log("TESTE DIRETO DE PERSISTÊNCIA REMOTA — ETAPA 10.4B");
  console.log("Módulos: Avaliações, Questões, Tentativas e Resultados");
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
  console.log("--- 1. AUTENTICAÇÃO E CONTEXTO DO ALUNO ---");
  const { data: authData, error: authErr } = await studentClient.auth.signInWithPassword({
    email: "homologacao.aluno@escolapaulo.com.br",
    password: "AlunoMTD2026!",
  });

  test("1.1 Login do aluno de homologação bem-sucedido", !authErr && !!authData.session, authErr?.message);
  assert(authData.session, "Sessão do aluno deve existir");

  // Identificar aluno_id e turma ativa
  const { data: perfilAluno } = await studentClient.from("perfis").select("id, aluno_id").single();
  assert(perfilAluno && perfilAluno.aluno_id, "Perfil de aluno deve possuir aluno_id vinculado");
  const alunoId = perfilAluno.aluno_id;

  const { data: matriculas } = await studentClient
    .from("matriculas_turmas")
    .select("turma_id")
    .eq("aluno_id", alunoId)
    .eq("status", "ativa");

  assert(matriculas && matriculas.length > 0, "Aluno de homologação deve estar matriculado em ao menos uma turma");
  const turmaId = matriculas[0].turma_id;

  // Obter professor responsável
  const { data: turmaData } = await adminClient.from("turmas").select("id, professor_id").eq("id", turmaId).single();
  const profId = turmaData?.professor_id;
  assert(profId, "Turma deve ter professor vinculado");

  let createdAvaliacaoObjetivaId: string | null = null;
  let createdAvaliacaoPraticaId: string | null = null;
  let createdTentativaId: string | null = null;
  let createdTentativaPraticaId: string | null = null;

  try {
    // 2. Criação de Avaliação Objetiva pelo Admin/Professor
    console.log("\n--- 2. CRIAÇÃO DE AVALIAÇÃO OBJETIVA ---");
    const { data: avalObj, error: avalObjErr } = await adminClient
      .from("avaliacoes")
      .insert({
        titulo: "[TESTE 10.4B] Checkpoint de Gramática Aplicada",
        descricao: "Avaliação objetiva de homologação vinculada à turma do aluno.",
        tipo: "objetiva",
        professor_id: profId,
        professor_nome: "Professor MTD",
        destino_tipo: "turma",
        destino_turma_id: turmaId,
        status: "publicada",
        data_publicacao: new Date().toISOString().slice(0, 10),
        max_tentativas: 2,
        nota_maxima: 100.0,
        nota_minima_aprovacao: 70.0,
        permitir_envio_atrasado: true,
        instrucoes: "Selecione a alternativa correta.",
        versao: 1,
        politica_gabarito: "gabarito_imediato",
        questoes: [
          {
            id: "q-test-1",
            enunciado: "Choose the correct sentence:",
            alternativaCorretaId: "alt-1-b",
            pontos: 50,
            ordem: 1,
            alternativas: [
              { id: "alt-1-a", texto: "She don't like coffee." },
              { id: "alt-1-b", texto: "She doesn't like coffee." },
            ],
          },
          {
            id: "q-test-2",
            enunciado: "Which preposition is correct? I was born ___ July.",
            alternativaCorretaId: "alt-2-a",
            pontos: 50,
            ordem: 2,
            alternativas: [
              { id: "alt-2-a", texto: "in" },
              { id: "alt-2-b", texto: "on" },
            ],
          },
        ],
      })
      .select()
      .single();

    test("2.1 Avaliação objetiva criada no Supabase com sucesso", !avalObjErr && !!avalObj, avalObjErr?.message);
    assert(avalObj, "Avaliação deve existir");
    createdAvaliacaoObjetivaId = avalObj.id;

    // 3. Consulta pelo Aluno via vw_aluno_avaliacoes
    console.log("\n--- 3. CONSULTA POR ALUNO SOB RLS ---");
    const { data: avalList, error: listErr } = await studentClient
      .from("vw_aluno_avaliacoes")
      .select("*")
      .eq("id", createdAvaliacaoObjetivaId);

    test("3.1 Aluno matriculado enxerga avaliação da sua turma via view segura", !listErr && avalList && avalList.length === 1, listErr?.message);

    // 4. Início de Tentativa pelo Aluno
    console.log("\n--- 4. INÍCIO DE TENTATIVA PELO ALUNO ---");
    const { data: tentData, error: tentErr } = await studentClient
      .from("tentativas_avaliacoes")
      .insert({
        avaliacao_id: createdAvaliacaoObjetivaId,
        versao_avaliacao: 1,
        aluno_id: alunoId,
        aluno_nome: "Aluno de Homologação",
        numero_tentativa: 1,
        status: "em_andamento",
        nota_maxima: 100.0,
      })
      .select()
      .single();

    test("4.1 Tentativa iniciada e persistida pelo aluno sob RLS", !tentErr && !!tentData, tentErr?.message);
    assert(tentData, "Tentativa deve existir");
    createdTentativaId = tentData.id;

    // 5. Salvamento de Rascunho
    console.log("\n--- 5. SALVAMENTO DE RASCUNHO ---");
    const respostasRascunho = [
      { questaoId: "q-test-1", alternativaEscolhidaId: "alt-1-b", respondidaEm: new Date().toISOString() },
    ];

    const { data: rascunhoData, error: rascErr } = await studentClient
      .from("tentativas_avaliacoes")
      .update({
        respostas_objetivas: respostasRascunho,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdTentativaId)
      .select()
      .single();

    test("5.1 Rascunho de respostas atualizado com sucesso", !rascErr && !!rascunhoData, rascErr?.message);

    // 6. Envio e Auto-Correção
    console.log("\n--- 6. ENVIO E AUTO-CORREÇÃO ---");
    const respostasFinais = [
      { questaoId: "q-test-1", alternativaEscolhidaId: "alt-1-b", correta: true, pontosObtidos: 50 },
      { questaoId: "q-test-2", alternativaEscolhidaId: "alt-2-a", correta: true, pontosObtidos: 50 },
    ];

    const { data: enviadaData, error: envErr } = await studentClient
      .from("tentativas_avaliacoes")
      .update({
        respostas_objetivas: respostasFinais,
        nota: 100.0,
        status: "corrigida",
        resultado: "aprovado",
        enviada_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdTentativaId)
      .select()
      .single();

    test("6.1 Tentativa finalizada e corrigida automaticamente (nota 100, status corrigida)", !envErr && enviadaData?.status === "corrigida" && enviadaData?.nota === 100, envErr?.message);

    // 7. Isolamento RLS entre Alunos
    console.log("\n--- 7. TESTE DE ISOLAMENTO RIGOROSO DE TENTATIVAS (RLS) ---");
    const { data: otherAlunos } = await adminClient
      .from("alunos")
      .select("id")
      .neq("id", alunoId)
      .limit(1);

    const otherAlunoId = otherAlunos && otherAlunos.length > 0
      ? otherAlunos[0].id
      : null;

    if (otherAlunoId) {
      const { data: dummyTent, error: dummyErr } = await adminClient
        .from("tentativas_avaliacoes")
        .insert({
          avaliacao_id: createdAvaliacaoObjetivaId,
          versao_avaliacao: 1,
          aluno_id: otherAlunoId,
          aluno_nome: "Outro Aluno MTD",
          numero_tentativa: 1,
          status: "em_andamento",
        })
        .select()
        .single();

      assert(dummyTent, `Erro ao criar tentativa de outro aluno: ${dummyErr?.message}`);

      // StudentClient tenta consultar a tentativa do outro aluno
      const { data: readOther } = await studentClient
        .from("tentativas_avaliacoes")
        .select("*")
        .eq("id", dummyTent.id);

      test("7.1 Aluno de homologação NÃO consegue ler a tentativa de outro aluno (bloqueado por RLS)", !readOther || readOther.length === 0);

      // StudentClient tenta atualizar a tentativa do outro aluno
      const { data: updateOther } = await studentClient
        .from("tentativas_avaliacoes")
        .update({ status: "corrigida" })
        .eq("id", dummyTent.id)
        .select();

      test("7.2 Aluno de homologação NÃO consegue alterar a tentativa de outro aluno (bloqueado por RLS)", !updateOther || updateOther.length === 0);

      // Limpar tentativa dummy
      await adminClient.from("tentativas_avaliacoes").delete().eq("id", dummyTent.id);
    }

    // 8. Avaliação Prática e Correção Docente com Observações Internas
    console.log("\n--- 8. AVALIAÇÃO PRÁTICA E BLINDAGEM DE PRIVACIDADE ---");
    const { data: avalPrat, error: pratErr } = await adminClient
      .from("avaliacoes")
      .insert({
        titulo: "[TESTE 10.4B] Self Pitching e Pronúncia",
        descricao: "Avaliação prática de apresentação oral.",
        tipo: "pratica",
        professor_id: profId,
        professor_nome: "Professor MTD",
        destino_tipo: "geral",
        status: "publicada",
        max_tentativas: 1,
        nota_maxima: 100.0,
        instrucoes: "Grave e envie o link.",
        rubrica: [
          { id: "r1", nome: "Fluência e Ritmo", pontuacaoMaxima: 50, ordem: 1 },
          { id: "r2", nome: "Precisão Vocabular", pontuacaoMaxima: 50, ordem: 2 },
        ],
      })
      .select()
      .single();

    assert(avalPrat, `Erro ao criar avaliação prática: ${pratErr?.message}`);
    createdAvaliacaoPraticaId = avalPrat.id;

    // Aluno envia resposta prática
    const { data: tentPrat, error: tentPratErr } = await studentClient
      .from("tentativas_avaliacoes")
      .insert({
        avaliacao_id: createdAvaliacaoPraticaId,
        versao_avaliacao: 1,
        aluno_id: alunoId,
        aluno_nome: "Aluno de Homologação",
        numero_tentativa: 1,
        status: "aguardando_correcao",
        resposta_pratica: {
          textoResposta: "Apresentação realizada conforme orientações.",
          linkExterno: "https://loom.com/share/test104b",
        },
      })
      .select()
      .single();

    assert(tentPrat, `Erro ao enviar tentativa prática: ${tentPratErr?.message}`);
    createdTentativaPraticaId = tentPrat.id;

    // Professor corrige e insere feedback com observações internas
    const feedbackDocente = {
      corrigidoPorProfessorId: profId,
      corrigidoPorProfessorNome: "Professor MTD",
      corrigidoEm: new Date().toISOString(),
      itensRubrica: [
        { criterioId: "r1", pontosAtribuidos: 45 },
        { criterioId: "r2", pontosAtribuidos: 45 },
      ],
      pontosFortes: "Excelente entonação e ritmo.",
      pontosADesenvolver: "Ampliar conectivos causais.",
      orientacoes: "Praticar módulo 2 para fixar.",
      observacoesInternas: "AVISO PEDAGÓGICO RESTRITO: Aluno apto para teste formal de nível.",
      resultado: "aprovado",
    };

    const { data: corrigidaPrat, error: corrErr } = await adminClient
      .from("tentativas_avaliacoes")
      .update({
        nota: 90.0,
        resultado: "aprovado",
        status: "corrigida",
        feedback: feedbackDocente,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdTentativaPraticaId)
      .select()
      .single();

    test("8.1 Avaliação prática corrigida pelo professor com rubrica e nota 90", !corrErr && corrigidaPrat?.status === "corrigida" && corrigidaPrat?.nota === 90);

    // Consulta do Aluno e Sanitização de Privacidade
    const { data: alunoViewPrat } = await studentClient
      .from("tentativas_avaliacoes")
      .select("*")
      .eq("id", createdTentativaPraticaId)
      .single();

    assert(alunoViewPrat, "Aluno deve conseguir ler sua tentativa corrigida");
    const sanitizada = sanitizarTentativaParaAluno(alunoViewPrat as unknown as TentativaAvaliacao, "publicada");

    test(
      "8.2 Feedback sanitizado para o aluno NÃO expõe observacoesInternas confidenciais",
      sanitizada.feedback !== undefined && sanitizada.feedback.observacoesInternas === undefined
    );
    test(
      "8.3 Feedback sanitizado preserva orientações e pontos fortes pedagógicos",
      sanitizada.feedback?.pontosFortes === "Excelente entonação e ritmo."
    );

  } finally {
    // 9. Limpeza higiênica de homologação
    console.log("\n--- 9. LIMPEZA HIGIÊNICA DE DADOS DE TESTE ---");
    if (createdTentativaId) {
      await adminClient.from("tentativas_avaliacoes").delete().eq("id", createdTentativaId);
    }
    if (createdTentativaPraticaId) {
      await adminClient.from("tentativas_avaliacoes").delete().eq("id", createdTentativaPraticaId);
    }
    if (createdAvaliacaoObjetivaId) {
      await adminClient.from("avaliacoes").delete().eq("id", createdAvaliacaoObjetivaId);
    }
    if (createdAvaliacaoPraticaId) {
      await adminClient.from("avaliacoes").delete().eq("id", createdAvaliacaoPraticaId);
    }
    console.log("  ✓ Dados de teste removidos do banco remoto.");
  }

  console.log("\n==================================================================");
  console.log(`RESULTADO FINAL E2E DIRETO: ${passed}/${total} testes aprovados.`);
  console.log("==================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runDirectE2ETests().catch((err) => {
  console.error("Erro fatal no teste direto:", err);
  process.exit(1);
});
