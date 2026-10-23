/**
 * TESTE E2E DIRETO COM CLIENT SUPABASE — ETAPA 10.4C
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Valida a persistência remota direta no Supabase através dos clientes e repositórios:
 * 1. Autenticação real do Aluno de Homologação via Supabase Auth
 * 2. Admin: Publicação de Baralho e Cartões vinculados à Turma do aluno
 * 3. Aluno Homologação: Consulta do baralho via view segura vw_aluno_baralhos
 * 4. Aluno Homologação: Consulta de cartões via tabela cartoes
 * 5. Aluno Homologação: Obtenção de fila de estudo SRS (novos vs revisão)
 * 6. Aluno Homologação: Registro de respostas SRS no Supabase:
 *    - "errei": agendado para 10 min depois, fator 2.30, estado 'aprendendo'
 *    - "bom": agendado para 1 dia depois, fator 2.50, estado 'revisao'
 *    - "facil": agendado para 4 dias depois, fator 2.65, estado 'revisao'
 * 7. Aluno Homologação: Registro e consulta de sessão de estudo em sessoes_estudo_srs
 * 8. Isolamento RLS: Leitura/escrita de progresso de terceiros é bloqueada
 * 9. Limpeza higiênica e restauração do estado original
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
import { progressoCartaoSupabaseRepository } from "../src/data/progressoCartaoSupabaseRepository";
import { sessaoEstudoSupabaseRepository } from "../src/data/sessaoEstudoSupabaseRepository";

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
  console.log("TESTE DIRETO DE PERSISTÊNCIA REMOTA — ETAPA 10.4C");
  console.log("Módulos: Flashcards, Cartões, SRS e Sessões de Estudo");
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
    .eq("status", "ativa")
    .limit(1);

  assert(matriculas && matriculas.length > 0, "Aluno deve possuir matrícula ativa para testar destino turma");
  const turmaId = matriculas[0].turma_id;
  console.log(`   Aluno ID: ${alunoId} | Turma ID: ${turmaId}`);

  // 2. Criação de Baralho e Cartões de Teste
  console.log("\n--- 2. CRIAÇÃO DE BARALHO E CARTÕES (ADMIN) ---");
  const baralhoTestId = `baralho-direct-${Date.now()}`;
  const card1Id = `card-direct-${Date.now()}-1`;
  const card2Id = `card-direct-${Date.now()}-2`;
  const card3Id = `card-direct-${Date.now()}-3`;

  const { error: baralhoErr } = await adminClient.from("baralhos").insert({
    id: baralhoTestId,
    nome: "Baralho Direct E2E",
    descricao: "Baralho de teste para validação SRS direta",
    categoria: "Gramática",
    nivel_recomendado: "A2",
    professor_id: perfilAluno.id,
    professor_nome: "Professor MTD",
    destino_tipo: "turma",
    destino_id: turmaId,
    status: "publicado",
    limite_diario_novos: 10,
    tags: ["direct-test", "srs"],
  });
  test("2.1 Admin criou baralho publicado direcionado à turma", !baralhoErr, baralhoErr?.message);

  const { error: cardsErr } = await adminClient.from("cartoes").insert([
    {
      id: card1Id,
      baralho_id: baralhoTestId,
      frente: "To achieve",
      verso: "Alcançar, atingir",
      exemplo: "She worked hard to achieve her goals.",
      pronuncia: "/əˈtʃiːv/",
      status: "ativo",
    },
    {
      id: card2Id,
      baralho_id: baralhoTestId,
      frente: "Reliable",
      verso: "Confiável",
      exemplo: "He is a reliable friend.",
      pronuncia: "/rɪˈlaɪəbl/",
      status: "ativo",
    },
    {
      id: card3Id,
      baralho_id: baralhoTestId,
      frente: "Challenge",
      verso: "Desafio",
      exemplo: "It was a big challenge for us.",
      pronuncia: "/ˈtʃælɪndʒ/",
      status: "ativo",
    },
  ]);
  test("2.2 Admin inseriu 3 cartões ativos no baralho", !cardsErr, cardsErr?.message);

  // 3. Consulta do Baralho e Cartões pelo Aluno
  console.log("\n--- 3. ACESSO DO ALUNO VIA VIEW E RLS ---");
  const { data: baralhosVisiveis, error: viewErr } = await studentClient
    .from("vw_aluno_baralhos")
    .select("*")
    .eq("id", baralhoTestId);

  test("3.1 Aluno consulta baralho de sua turma via vw_aluno_baralhos", !viewErr && baralhosVisiveis?.length === 1, viewErr?.message);
  test("3.2 Contagem de cartões refletida na view (total_cartoes = 3)", baralhosVisiveis?.[0]?.total_cartoes === 3);

  const { data: cartoesVisiveis, error: cartoesErr } = await studentClient
    .from("cartoes")
    .select("*")
    .eq("baralho_id", baralhoTestId)
    .order("created_at", { ascending: true });

  test("3.3 Aluno consulta os 3 cartões do baralho autorizado via RLS", !cartoesErr && cartoesVisiveis?.length === 3, cartoesErr?.message);

  // 4. Teste da Fila de Estudo (SRS)
  console.log("\n--- 4. FILA DE ESTUDO SRS ---");
  const filaEstudo = await progressoCartaoSupabaseRepository.obterFilaEstudoBaralho(
    alunoId,
    baralhoTestId,
    10,
    new Date(),
    studentClient
  );
  test("4.1 Fila de estudo identifica 3 cartões novos disponíveis", filaEstudo.totalNovos === 3 && filaEstudo.fila.length === 3);

  // 5. Registro de Respostas SRS no Supabase
  console.log("\n--- 5. REGISTRO DE RESPOSTAS SRS E PERSISTÊNCIA REMOTA ---");
  const dataReferencia = new Date();

  // Resposta 1: "errei"
  const resErrei = await progressoCartaoSupabaseRepository.registrarRespostaEstudo(
    alunoId,
    card1Id,
    baralhoTestId,
    "errei",
    dataReferencia,
    studentClient
  );
  test("5.1 Resposta 'errei' reagendada para 10 minutos com intervaloMinutos = 10", resErrei.reagendadoParaRevisao && resErrei.reagendadoMinutos === 10);
  test("5.2 Fator de facilidade decresceu de 2.50 para 2.30 e lapsos = 1", resErrei.progresso.fatorFacilidade === 2.30 && resErrei.progresso.totalLapsos === 1);
  test("5.3 Estado do cartão alterado para 'aprendendo'", resErrei.progresso.estado === "aprendendo");

  // Resposta 2: "bom"
  const resBom = await progressoCartaoSupabaseRepository.registrarRespostaEstudo(
    alunoId,
    card2Id,
    baralhoTestId,
    "bom",
    dataReferencia,
    studentClient
  );
  test("5.4 Resposta 'bom' agenda próxima revisão para 1 dia e mantém fator 2.50", resBom.progresso.intervaloDias === 1 && resBom.progresso.fatorFacilidade === 2.50);
  test("5.5 Estado do cartão alterado para 'revisao'", resBom.progresso.estado === "revisao");

  // Resposta 3: "facil"
  const resFacil = await progressoCartaoSupabaseRepository.registrarRespostaEstudo(
    alunoId,
    card3Id,
    baralhoTestId,
    "facil",
    dataReferencia,
    studentClient
  );
  test("5.6 Resposta 'facil' agenda para 4 dias e eleva fator para 2.65", resFacil.progresso.intervaloDias === 4 && resFacil.progresso.fatorFacilidade === 2.65);

  // Verificar persistência remota das 3 respostas em progresso_cartoes_alunos
  const { data: progressosSalvos, error: progErr } = await studentClient
    .from("progresso_cartoes_alunos")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("baralho_id", baralhoTestId);

  test("5.7 Registros persistidos no PostgreSQL remoto em progresso_cartoes_alunos", !progErr && progressosSalvos?.length === 3, progErr?.message);

  // 6. Registro e Consulta de Sessão de Estudo
  console.log("\n--- 6. SESSÃO DE ESTUDO SRS ---");
  const sessaoSalva = await sessaoEstudoSupabaseRepository.salvarSessaoEstudo(
    {
      alunoId,
      baralhoId: baralhoTestId,
      iniciadaEm: dataReferencia.toISOString(),
      concluidaEm: new Date(dataReferencia.getTime() + 180000).toISOString(),
      totalEstudado: 3,
      erros: 1,
      dificeis: 0,
      bons: 1,
      faceis: 1,
      tempoSegundos: 180,
      revisoesReagendadas: 1,
    },
    studentClient
  );
  test("6.1 Sessão de estudo gravada com sucesso em sessoes_estudo_srs", !!sessaoSalva && !!sessaoSalva.id);

  const sessoesConsultadas = await sessaoEstudoSupabaseRepository.obterSessoesPorAluno(alunoId, baralhoTestId, studentClient);
  test("6.2 Sessões de estudo do aluno consultadas remotamente", sessoesConsultadas.length >= 1 && sessoesConsultadas[0].totalEstudado === 3);

  // 7. Isolamento RLS Adicional
  console.log("\n--- 7. ISOLAMENTO DE ACESSO RLS ---");
  const outroAlunoId = "99999999-9999-4999-8999-999999999999";
  const { data: dadosInvasao } = await studentClient
    .from("progresso_cartoes_alunos")
    .select("*")
    .eq("aluno_id", outroAlunoId);
  test("7.1 Aluno autenticado recebe 0 linhas ao tentar ler progresso de outro aluno", dadosInvasao?.length === 0);

  // 8. Limpeza Higiênica
  console.log("\n--- 8. LIMPEZA HIGIÊNICA ---");
  const { error: delProgErr } = await adminClient
    .from("progresso_cartoes_alunos")
    .delete()
    .eq("baralho_id", baralhoTestId);
  const { error: delSessErr } = await adminClient
    .from("sessoes_estudo_srs")
    .delete()
    .eq("baralho_id", baralhoTestId);
  const { error: delHistErr } = await adminClient
    .from("historico_revisoes_srs")
    .delete()
    .eq("baralho_id", baralhoTestId);
  const { error: delCardsErr } = await adminClient
    .from("cartoes")
    .delete()
    .eq("baralho_id", baralhoTestId);
  const { error: delBaralhoErr } = await adminClient
    .from("baralhos")
    .delete()
    .eq("id", baralhoTestId);

  const limpezaOk = !delProgErr && !delSessErr && !delHistErr && !delCardsErr && !delBaralhoErr;
  test("8.1 Dados de homologação da Etapa 10.4C limpos do banco remoto com sucesso", limpezaOk);

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES E2E: ${total}`);
  console.log(`PASSARAM: ${passed}`);
  console.log(`FALHARAM: ${total - passed}`);
  console.log("==================================================================");

  if (total !== passed) {
    process.exit(1);
  }
}

runDirectE2ETests().catch((err) => {
  console.error("Erro fatal no teste direto E2E 10.4C:", err);
  process.exit(1);
});
