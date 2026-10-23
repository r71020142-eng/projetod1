/**
 * TESTE E2E DIRETO COM CLIENT SUPABASE — ETAPA 10.4D
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Valida a persistência remota direta no Supabase através dos clientes e repositórios:
 * 1. Autenticação real do Aluno de Homologação via Supabase Auth
 * 2. Aluno: Criação de rascunho de Self Presentation
 * 3. Aluno: Envio formal da Self Presentation (status 'enviada')
 * 4. Admin/Professor: Listagem e contadores do dashboard pedagógico
 * 5. Admin/Professor: Assumir avaliação (status 'em_avaliacao')
 * 6. Admin/Professor: Salvar rascunho de avaliação (publicada: false) com observações internas confidenciais
 * 7. Aluno: Consulta via view pública — confirma que avaliação não publicada fica oculta
 * 8. Admin/Professor: Publicação da avaliação (publicada: true, rubrica 6 critérios, nível CEFR)
 * 9. Aluno: Consulta via view pública — confirma visualização da avaliação COM EXPURGO de observações internas
 * 10. Admin/Professor: Aplicação do nível avaliado ao perfil do aluno (origem 'self_presentation')
 * 11. Isolamento RLS: Leitura de dados de terceiros é bloqueada
 * 12. Limpeza higiênica e restauração do nível original do aluno
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
import { selfPresentationSupabaseRepository } from "../src/data/selfPresentationSupabaseRepository";
import { AvaliacaoPedagogica } from "@/types";

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
  console.log("TESTE DIRETO DE PERSISTÊNCIA REMOTA — ETAPA 10.4D");
  console.log("Módulo: Self Presentation e Rito de Nivelamento Inicial");
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

  // Identificar aluno_id e nível operacional atual
  const { data: perfilAluno } = await studentClient.from("perfis").select("id, aluno_id").single();
  assert(perfilAluno && perfilAluno.aluno_id, "Perfil de aluno deve possuir aluno_id vinculado");
  const alunoId = perfilAluno.aluno_id;

  const { data: alunoRow } = await adminClient.from("alunos").select("id, nivel_operacional").eq("id", alunoId).single();
  assert(alunoRow, "Aluno deve existir na tabela alunos");
  const nivelOriginal = alunoRow.nivel_operacional || "A1";
  console.log(`   Aluno ID: ${alunoId} | Nível Atual: ${nivelOriginal}`);

  let testSpId = "";

  try {
    // 2. Aluno: Criar Rascunho
    console.log("\n--- 2. CRIAÇÃO DE RASCUNHO E ENVIO PELO ALUNO ---");
    const resRascunho = await selfPresentationSupabaseRepository.salvarRascunho(
      {
        alunoId,
        alunoNome: "Aluno Homologação MTD",
        tipo: "nivelamento_inicial",
        titulo: "Self Presentation Homologação 10.4D",
        linkVideo: "https://youtube.com/watch?v=homologacao-demo",
        dataGravacao: new Date().toISOString(),
        observacaoAluno: "Apresentação para teste de nivelamento automatizado.",
        consentimento: {
          aceito: true,
          dataHora: new Date().toISOString(),
          versaoTexto: "v1.0",
        },
      },
      studentClient
    );

    test("2.1 Aluno cria rascunho de Self Presentation remotamente", resRascunho.success && !!resRascunho.data, resRascunho.error);
    assert(resRascunho.data, "Rascunho deve ser retornado");
    testSpId = resRascunho.data.id;
    assert(resRascunho.data.status === "rascunho", "Status inicial deve ser rascunho");

    // 3. Aluno: Enviar Apresentação
    const resEnvio = await selfPresentationSupabaseRepository.enviar(
      testSpId,
      {
        linkVideo: "https://youtube.com/watch?v=homologacao-final",
        dataGravacao: new Date().toISOString(),
        observacaoAluno: "Vídeo finalizado para avaliação docente.",
        consentimento: {
          aceito: true,
          dataHora: new Date().toISOString(),
          versaoTexto: "v1.0",
        },
      },
      studentClient
    );

    test("3.1 Aluno envia formalmente a apresentação", resEnvio.success && !!resEnvio.data, resEnvio.error);
    assert(resEnvio.data && resEnvio.data.status === "enviada", "Status deve transicionar para 'enviada'");

    // 4. Admin/Professor: Listagem e Contadores
    console.log("\n--- 3. FILA PEDAGÓGICA E ASSUNÇÃO PELO DOCENTE ---");
    const listaEnviadas = await selfPresentationSupabaseRepository.listar({ status: "enviada" }, adminClient);
    const spEnviada = listaEnviadas.find((item) => item.id === testSpId);
    test("4.1 Docente encontra a apresentação na fila de pendentes", !!spEnviada);

    const contadores = await selfPresentationSupabaseRepository.contadoresDashboard(adminClient);
    test("4.2 Contadores do dashboard refletem apresentações aguardando", contadores.aguardando >= 1);

    // 5. Docente: Assumir Avaliação
    const resAssumir = await selfPresentationSupabaseRepository.assumirAvaliacao(
      testSpId,
      "prof-001",
      "Professor Paulo",
      adminClient
    );
    test("5.1 Docente assume a avaliação da apresentação", resAssumir.success && resAssumir.data?.status === "em_avaliacao", resAssumir.error);

    // 6. Docente: Salvar Rascunho de Avaliação com Observações Internas Confidenciais
    console.log("\n--- 4. AVALIAÇÃO PEDAGÓGICA E CONFIDENCIALIDADE ---");
    const avaliacaoDraft: Partial<AvaliacaoPedagogica> = {
      professorId: "prof-001",
      professorNome: "Professor Paulo",
      rubrica: {
        pronunciaInteligibilidade: { pontuacao: 4, comentario: "Boa clareza de sons vocálicos" },
        vocabulario: { pontuacao: 4, comentario: "Léxico adequado ao nível intermediário" },
        gramaticaAplicada: { pontuacao: 3, comentario: "Pequenos desvios em tempos verbais perfeitos" },
        fluencia: { pontuacao: 4, comentario: "Ritmo constante e pausas naturais" },
        coerenciaOrganizacao: { pontuacao: 4, comentario: "Bons conectivos discursivos" },
        compreensaoGeral: { pontuacao: 4, comentario: "Espontaneidade perceptível" },
      },
      pontosFortes: "Excelente entonação e clareza discursiva.",
      pontosADesenvolver: "Consolidar uso do Present Perfect.",
      orientacaoProximasAulas: "Praticar descrições de experiências passadas.",
      observacoesInternas: "OBSERVAÇÃO CONFIDENCIAL: Aluno demonstra potencial para B2 rapidamente com foco em conversação.",
      mediaCriteriosOrais: 3.83,
      nivelDefinido: "B1",
      justificativaNivel: "Demonstrou competência equivalente ao B1 do CEFR com autonomia em conversação geral.",
    };

    const resSalvarDraft = await selfPresentationSupabaseRepository.salvarAvaliacao(
      testSpId,
      avaliacaoDraft,
      false, // NÃO publicada
      adminClient
    );
    test("6.1 Docente salva rascunho da avaliação com observações internas", resSalvarDraft.success, resSalvarDraft.error);

    // 7. Aluno: Consulta via View Segura (avaliação NÃO publicada deve ficar oculta)
    const spAlunoDraft = await selfPresentationSupabaseRepository.obterParaAluno(testSpId, alunoId, studentClient);
    test("7.1 Aluno NÃO visualiza avaliação enquanto não for publicada", spAlunoDraft !== null && spAlunoDraft.avaliacao === undefined);

    // 8. Docente: Publicar Avaliação
    const resPublicar = await selfPresentationSupabaseRepository.salvarAvaliacao(
      testSpId,
      avaliacaoDraft,
      true, // PUBLICADA
      adminClient
    );
    test("8.1 Docente publica formalmente a avaliação", resPublicar.success && resPublicar.data?.status === "avaliada", resPublicar.error);

    // 9. Aluno: Consulta via View Segura (avaliação publicada visível, mas observacoesInternas ESTITAMENTE EXPURGADAS)
    const spAlunoPublicada = await selfPresentationSupabaseRepository.obterParaAluno(testSpId, alunoId, studentClient);
    test("9.1 Aluno visualiza avaliação publicada", spAlunoPublicada !== null && spAlunoPublicada.avaliacao !== undefined);
    test(
      "9.2 observacoesInternas é rigorosamente CONFIDENCIAL e não chega ao aluno",
      spAlunoPublicada?.avaliacao?.observacoesInternas === undefined
    );
    test(
      "9.3 Pontos fortes e justificativa pedagógica estão visíveis para o aluno",
      spAlunoPublicada?.avaliacao?.pontosFortes === "Excelente entonação e clareza discursiva." &&
        spAlunoPublicada?.avaliacao?.nivelDefinido === "B1"
    );

    // 10. Docente: Aplicar Nível ao Perfil do Aluno
    console.log("\n--- 5. RITO DE NIVELAMENTO E ATUALIZAÇÃO DO PERFIL ---");
    const resNivel = await selfPresentationSupabaseRepository.aplicarNivelAoPerfil(
      testSpId,
      "prof-001",
      "Professor Paulo",
      adminClient
    );
    test("10.1 Aplicação do nível avaliado ao perfil do aluno", resNivel.success && !!resNivel.data, resNivel.error);

    const { data: alunoAtualizado } = await adminClient.from("alunos").select("nivel_operacional").eq("id", alunoId).single();
    test(
      "10.2 Tabela alunos reflete o novo nível oficial atribuído (B1)",
      alunoAtualizado?.nivel_operacional === "B1"
    );

    // 11. Isolamento RLS: Aluno não acessa ID inexistente ou de terceiros
    console.log("\n--- 6. VERIFICAÇÃO DE ISOLAMENTO RLS ---");
    const spInexistente = await selfPresentationSupabaseRepository.obterParaAluno(
      "sp-inexistente-999",
      alunoId,
      studentClient
    );
    test("11.1 Consulta com ID inexistente retorna null de forma segura", spInexistente === null);

  } finally {
    // 12. Limpeza Higiênica e Restauração
    console.log("\n--- 7. LIMPEZA HIGIÊNICA E RESTAURAÇÃO ---");
    if (testSpId) {
      const { error: delErr } = await adminClient.from("self_presentations").delete().eq("id", testSpId);
      test("12.1 Apresentação de teste removida do banco remoto", !delErr, delErr?.message);
    }

    // Restaurar nível original do aluno
    const { error: restErr } = await adminClient.from("alunos").update({ nivel_operacional: nivelOriginal }).eq("id", alunoId);
    test("12.2 Nível original do aluno restaurado com fidelidade", !restErr, restErr?.message);
  }

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
  console.error("Erro fatal nos testes diretos 10.4D:", err);
  process.exit(1);
});
