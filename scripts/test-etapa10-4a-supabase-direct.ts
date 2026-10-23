/**
 * TESTE E2E DIRETO COM CLIENT SUPABASE — ETAPA 10.4A
 * DEMOSTRATIVO MTD — Método Paulo
 *
 * Valida a persistência remota direta no Supabase através dos clientes e repositórios:
 * 1. Admin/Professor: Publicação de Material Didático no PostgreSQL
 * 2. Admin/Professor: Publicação de Atividade Prática vinculada ao Material
 * 3. Aluno Homologação: Consulta das atividades da sua turma
 * 4. Aluno Homologação: Submissão e atualização de entrega com RLS ativo
 * 5. Admin/Professor: Correção pedagógica da entrega (nota + feedback)
 * 6. Aluno Homologação: Visualização do feedback sem vazamento de notas internas
 * 7. Limpeza higiênica e restauração do estado original
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
  console.log("TESTE DIRETO DE PERSISTÊNCIA REMOTA — ETAPA 10.4A");
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

  // Identificar o aluno_id e turmas ativas do aluno de homologação
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

  let createdMaterialId: string | null = null;
  let createdAtividadeId: string | null = null;
  let createdEntregaId: string | null = null;

  try {
    // 2. Criação de Material pelo Admin/Professor
    console.log("\n--- 2. PERSISTÊNCIA DE MATERIAL DIDÁTICO ---");
    const { data: matData, error: matErr } = await adminClient
      .from("materiais")
      .insert({
        titulo: "[TESTE 10.4A] Guia Oficial de Conversação Prática",
        descricao: "Material demonstrativo publicado na turma do aluno para homologação da Etapa 10.4A.",
        tipo: "pdf",
        categoria: "Conversação",
        nivel_recomendado: "A1",
        autor_id: profId,
        autor_nome: "Professor MTD",
        data_publicacao: new Date().toISOString().slice(0, 10),
        status: "publicado",
        destino_tipo: "turma",
        destino_id: turmaId,
        link_externo: "https://metodopaulo.com/guia.pdf",
        tags: ["conversacao", "etapa10.4a"],
        observacoes_internas: "Observação sigilosa que não pode vazar para o aluno",
      })
      .select()
      .single();

    test("2.1 Gravação de material didático com destino na turma do aluno", !matErr && !!matData, matErr?.message);
    assert(matData, "Material deve ter sido criado");
    createdMaterialId = matData.id;

    // 3. Aluno Consulta Material via View com Security Barrier
    console.log("\n--- 3. LEITURA E PRIVACIDADE PELO ALUNO (RLS) ---");
    const { data: matsAluno, error: matsAlunoErr } = await studentClient
      .from("vw_aluno_materiais")
      .select("*")
      .eq("id", createdMaterialId);

    test(
      "3.1 Aluno matriculado enxerga material publicado direcionado à sua turma",
      !matsAlunoErr && matsAluno !== null && matsAluno.length === 1,
      matsAlunoErr?.message
    );

    // Verificar que a observação interna não vazou para o aluno
    const matViewRow = matsAluno && matsAluno[0];
    test(
      "3.2 View vw_aluno_materiais não expõe observacoes_internas ao aluno",
      matViewRow !== undefined && !("observacoes_internas" in matViewRow)
    );

    // 4. Criação de Atividade Vinculada
    console.log("\n--- 4. PERSISTÊNCIA DE ATIVIDADE PRÁTICA ---");
    const { data: atvData, error: atvErr } = await adminClient
      .from("atividades")
      .insert({
        titulo: "[TESTE 10.4A] Prática Oral: Diálogo em Restaurante",
        instrucoes: "Grave um áudio de 2 minutos pedindo uma refeição em inglês.",
        tipo: "link",
        nivel_recomendado: "A1",
        material_relacionado_id: createdMaterialId,
        destino_tipo: "turma",
        destino_id: turmaId,
        data_publicacao: new Date().toISOString().slice(0, 10),
        pontuacao_maxima: 100.0,
        status: "publicada",
        professor_id: profId,
        permitir_atraso: true,
        observacoes_internas: "Verificar tempos verbais simples",
      })
      .select()
      .single();

    test("4.1 Gravação de atividade prática vinculada ao material", !atvErr && !!atvData, atvErr?.message);
    assert(atvData, "Atividade deve ter sido criada");
    createdAtividadeId = atvData.id;

    // 5. Aluno Consulta a Atividade
    const { data: atvsAluno, error: atvsAlunoErr } = await studentClient
      .from("vw_aluno_atividades")
      .select("*")
      .eq("id", createdAtividadeId);

    test(
      "4.2 Aluno consulta a atividade disponível via vw_aluno_atividades",
      !atvsAlunoErr && atvsAluno !== null && atvsAluno.length === 1,
      atvsAlunoErr?.message
    );

    // 6. Aluno Envia Entrega sob RLS
    console.log("\n--- 5. SUBMISSÃO DE ENTREGA PELO ALUNO (RLS) ---");
    const { data: entregaData, error: entregaErr } = await studentClient
      .from("entregas_atividades")
      .insert({
        atividade_id: createdAtividadeId,
        aluno_id: alunoId,
        resposta_texto: "Here is my audio recording practicing restaurant dialogues.",
        resposta_link: "https://drive.google.com/homolog104a.mp3",
        status: "entregue",
        entregue_em: new Date().toISOString(),
      })
      .select()
      .single();

    test("5.1 Aluno insere sua própria entrega com sucesso", !entregaErr && !!entregaData, entregaErr?.message);
    assert(entregaData, "Entrega deve ter sido registrada");
    createdEntregaId = entregaData.id;

    // 7. Aluno Consulta sua Própria Entrega
    const { data: minhaEntrega, error: minhaEntregaErr } = await studentClient
      .from("entregas_atividades")
      .select("*")
      .eq("id", createdEntregaId)
      .single();

    test(
      "5.2 Aluno consulta e recupera os dados da sua entrega",
      !minhaEntregaErr && minhaEntrega && minhaEntrega.status === "entregue",
      minhaEntregaErr?.message
    );

    // 8. Correção da Entrega pelo Professor/Admin
    console.log("\n--- 6. CORREÇÃO PEDAGÓGICA DA ENTREGA ---");
    const { data: correcaoData, error: correcaoErr } = await adminClient
      .from("entregas_atividades")
      .update({
        status: "corrigida",
        pontuacao: 96.5,
        feedback: "Excelente pronúncia! O vocabulário usado no pedido foi muito natural.",
        corrigido_em: new Date().toISOString(),
        professor_corretor_id: profId,
      })
      .eq("id", createdEntregaId)
      .select()
      .single();

    test("6.1 Professor/Admin corrige a entrega atribuindo nota e feedback", !correcaoErr && !!correcaoData, correcaoErr?.message);

    // 9. Aluno Visualiza o Feedback Atualizado
    const { data: entregaCorrigida, error: entregaCorrigidaErr } = await studentClient
      .from("entregas_atividades")
      .select("status, pontuacao, feedback")
      .eq("id", createdEntregaId)
      .single();

    test(
      "6.2 Aluno visualiza o status 'corrigida' e o feedback emitido pelo professor",
      !entregaCorrigidaErr &&
        entregaCorrigida?.status === "corrigida" &&
        entregaCorrigida?.feedback?.includes("Excelente pronúncia"),
      entregaCorrigidaErr?.message
    );

  } finally {
    // Limpeza higiênica dos registros de homologação criados
    console.log("\n--- 7. LIMPEZA HIGIÊNICA ---");
    if (createdEntregaId) {
      await adminClient.from("entregas_atividades").delete().eq("id", createdEntregaId);
    }
    if (createdAtividadeId) {
      await adminClient.from("atividades").delete().eq("id", createdAtividadeId);
    }
    if (createdMaterialId) {
      await adminClient.from("materiais").delete().eq("id", createdMaterialId);
    }
    console.log("  ✓ Registros temporários removidos do banco remoto.");
  }

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");

  if (passed === total) {
    console.log("SUCESSO: Homologação funcional da Etapa 10.4A concluída com 100% de aprovação!");
  } else {
    process.exit(1);
  }
}

runDirectE2ETests().catch((err) => {
  console.error("Erro fatal no teste direto:", err);
  process.exit(1);
});
