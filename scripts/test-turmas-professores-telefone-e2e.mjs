import { createClient } from "@supabase/supabase-js";
import assert from "node:assert";
import fs from "node:fs";

if (typeof globalThis.WebSocket === "undefined") {
  try {
    globalThis.WebSocket = (await import("ws")).default;
  } catch {
    globalThis.WebSocket = class DummyWebSocket {};
  }
}

// Carrega .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey || !publishableKey) {
  console.error("ERRO: Variáveis de ambiente do Supabase não encontradas.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runE2ETest() {
  console.log("================================================================================");
  console.log("  TESTE E2E: MULTIPLOS PROFESSORES POR TURMA & TELEFONES INTERNACIONAIS         ");
  console.log("================================================================================");

  const timestamp = Date.now();
  const prof1Id = crypto.randomUUID();
  const prof2Id = crypto.randomUUID();
  const prof3Id = crypto.randomUUID();
  const alunoId = crypto.randomUUID();
  const turmaId = crypto.randomUUID();

  try {
    // --------------------------------------------------------------------------
    // ETAPA 1: Validação de Telefone Internacional para Alunos e Professores
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 1] Testando cadastro com telefones internacionais (+1, +44, +351, +55)...");

    const telefonesTeste = [
      { pais: "EUA/Canadá", ddi: "+1", numero: "+1 (202) 555-0143" },
      { pais: "Reino Unido", ddi: "+44", numero: "+44 7911 123456" },
      { pais: "Portugal", ddi: "+351", numero: "+351 912 345 678" },
      { pais: "Brasil", ddi: "+55", numero: "+55 (11) 98765-4321" },
    ];

    for (const t of telefonesTeste) {
      const tel = t.numero.trim();
      const digitsOnly = tel.replace(/\D/g, "");
      const isValid = /^(\+)?[0-9\s().-]{7,25}$/.test(tel) && digitsOnly.length >= 7;
      assert(isValid, `Telefone ${t.numero} (${t.pais}) deveria ser válido pela regex`);
      console.log(`  ✅ Regex de validação aceitou código ${t.ddi} (${t.pais}): ${t.numero}`);
    }

    // --------------------------------------------------------------------------
    // ETAPA 2: Criação de Aluno com Telefone Internacional (+1) no Supabase
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 2] Inserindo aluno com telefone internacional dos EUA (+1)...");
    const { data: novoAluno, error: errAluno } = await adminClient
      .from("alunos")
      .insert({
        id: alunoId,
        nome_completo: `Aluno Internacional E2E ${timestamp}`,
        email: `aluno.internacional.${timestamp}@mtd.com`,
        telefone: "+1 (202) 555-0143",
        nivel_operacional: "B1",
        status: "ativo",
        objetivo: "Comunicação profissional internacional",
      })
      .select()
      .single();

    assert(!errAluno, `Erro ao criar aluno com telefone internacional: ${errAluno?.message}`);
    assert.strictEqual(novoAluno.telefone, "+1 (202) 555-0143", "Telefone internacional persistido incorretamente");
    console.log(`  ✅ Aluno criado com sucesso com telefone internacional: ${novoAluno.telefone}`);

    // --------------------------------------------------------------------------
    // ETAPA 3: Criação de 3 Professores Ativos com Telefones Internacionais
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 3] Inserindo 3 professores com telefones de diferentes países (+44, +351, +55)...");
    const profsParaCriar = [
      {
        id: prof1Id,
        nome_completo: `Prof. Titular E2E ${timestamp}`,
        email: `prof.titular.${timestamp}@mtd.com`,
        telefone: "+44 7911 123456",
        biografia_pedagogica: "Docente sênior especialista em Business English.",
        idiomas_falados: ["Inglês (Nativo)", "Português"],
        status: "ativo",
      },
      {
        id: prof2Id,
        nome_completo: `Prof. Co-docente A E2E ${timestamp}`,
        email: `prof.co1.${timestamp}@mtd.com`,
        telefone: "+351 912 345 678",
        biografia_pedagogica: "Docente com foco em conversação e pronúncia fluida.",
        idiomas_falados: ["Inglês", "Português (Nativo)"],
        status: "ativo",
      },
      {
        id: prof3Id,
        nome_completo: `Prof. Co-docente B E2E ${timestamp}`,
        email: `prof.co2.${timestamp}@mtd.com`,
        telefone: "+55 (11) 98111-2233",
        biografia_pedagogica: "Docente especialista em gramática estrutural aplicada.",
        idiomas_falados: ["Inglês", "Português (Nativo)"],
        status: "ativo",
      },
    ];

    const { error: errProfs } = await adminClient.from("professores").insert(profsParaCriar);
    assert(!errProfs, `Erro ao inserir professores: ${errProfs?.message}`);
    console.log("  ✅ 3 professores criados com telefones internacionais (+44, +351, +55).");

    // --------------------------------------------------------------------------
    // ETAPA 4: Criação de Turma com 2 Professores (Co-docência)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 4] Criando turma vinculando 2 professores na mesma turma...");
    const { data: novaTurma, error: errTurma } = await adminClient
      .from("turmas")
      .insert({
        id: turmaId,
        nome: `Turma Co-docência E2E ${timestamp}`,
        modalidade: "grupo",
        nivel: "B1",
        objetivo_principal: "Destravar conversação com múltiplos professores",
        professor_id: prof1Id, // Titular
        professores_ids: [prof1Id, prof2Id], // Múltiplos professores (2)
        capacidade: 10,
        status: "ativa",
        data_inicio: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    assert(!errTurma, `Erro ao criar turma com 2 professores: ${errTurma?.message}`);
    assert(novaTurma.professores_ids, "Coluna professores_ids não retornada");
    assert.strictEqual(novaTurma.professores_ids.length, 2, "Turma deveria ter 2 professores");
    assert(novaTurma.professores_ids.includes(prof1Id), "Deveria conter prof1");
    assert(novaTurma.professores_ids.includes(prof2Id), "Deveria conter prof2");
    console.log(`  ✅ Turma criada com sucesso com ${novaTurma.professores_ids.length} professores vinculados!`);
    console.log(`     - Titular (professor_id): ${novaTurma.professor_id}`);
    console.log(`     - Array completo (professores_ids): [${novaTurma.professores_ids.join(", ")}]`);

    // --------------------------------------------------------------------------
    // ETAPA 5: Consulta e Filtro por Professor (Verifica Co-docência)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 5] Verificando se ambos os professores têm a turma associada...");

    // Busca turmas do professor 1 (Titular)
    const { data: turmasProf1, error: errProf1 } = await adminClient
      .from("turmas")
      .select("id, nome, professor_id, professores_ids")
      .or(`professor_id.eq.${prof1Id},professores_ids.cs.{${prof1Id}}`);

    assert(!errProf1, `Erro na consulta do prof1: ${errProf1?.message}`);
    assert(turmasProf1.some((t) => t.id === turmaId), "Turma não encontrada para o Prof 1 (Titular)");
    console.log(`  ✅ Professor 1 (Titular) localizou a turma: ${turmasProf1.length} turma(s) encontrada(s)`);

    // Busca turmas do professor 2 (Co-docente)
    const { data: turmasProf2, error: errProf2 } = await adminClient
      .from("turmas")
      .select("id, nome, professor_id, professores_ids")
      .or(`professor_id.eq.${prof2Id},professores_ids.cs.{${prof2Id}}`);

    assert(!errProf2, `Erro na consulta do prof2: ${errProf2?.message}`);
    assert(turmasProf2.some((t) => t.id === turmaId), "Turma não encontrada para o Prof 2 (Co-docente)");
    console.log(`  ✅ Professor 2 (Co-docente) localizou a turma: ${turmasProf2.length} turma(s) encontrada(s)`);

    // --------------------------------------------------------------------------
    // ETAPA 6: Atualização da Turma para 3 Professores e Troca de Titular
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 6] Atualizando turma para 3 professores e alternando titular...");
    const { data: turmaAtualizada, error: errUpdate } = await adminClient
      .from("turmas")
      .update({
        professor_id: prof2Id, // Novo titular
        professores_ids: [prof2Id, prof1Id, prof3Id], // 3 professores agora
        updated_at: new Date().toISOString(),
      })
      .eq("id", turmaId)
      .select()
      .single();

    assert(!errUpdate, `Erro ao atualizar turma: ${errUpdate?.message}`);
    assert.strictEqual(turmaAtualizada.professores_ids.length, 3, "Turma deveria ter 3 professores");
    assert.strictEqual(turmaAtualizada.professor_id, prof2Id, "Titular deveria ter sido alterado para prof2");
    console.log(`  ✅ Turma atualizada para 3 professores com sucesso!`);
    console.log(`     - Novo Titular: ${turmaAtualizada.professor_id}`);
    console.log(`     - Corpo docente completo: [${turmaAtualizada.professores_ids.join(", ")}]`);

    // --------------------------------------------------------------------------
    // ETAPA 7: Consulta pelo 3º Professor Adicionado
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 7] Verificando acesso à turma pelo 3º professor recém-adicionado...");
    const { data: turmasProf3, error: errProf3 } = await adminClient
      .from("turmas")
      .select("id, nome, professor_id, professores_ids")
      .or(`professor_id.eq.${prof3Id},professores_ids.cs.{${prof3Id}}`);

    assert(!errProf3, `Erro na consulta do prof3: ${errProf3?.message}`);
    assert(turmasProf3.some((t) => t.id === turmaId), "Turma não encontrada para o Prof 3");
    console.log(`  ✅ Professor 3 localizou a turma perfeitamente!`);

    console.log("\n================================================================================");
    console.log("  TODAS AS VALIDAÇÕES DE MULTI-PROFESSORES E TELEFONES PASSARAM COM SUCESSO!     ");
    console.log("================================================================================");
  } finally {
    // --------------------------------------------------------------------------
    // Limpeza de Dados de Teste
    // --------------------------------------------------------------------------
    console.log("\n[LIMPEZA] Removendo dados de teste efêmeros...");
    await adminClient.from("matriculas_turmas").delete().eq("turma_id", turmaId);
    await adminClient.from("turmas").delete().eq("id", turmaId);
    await adminClient.from("alunos").delete().eq("id", alunoId);
    await adminClient.from("professores").delete().in("id", [prof1Id, prof2Id, prof3Id]);
    console.log("  ✅ Dados de teste removidos com sucesso.");
  }
}

runE2ETest().catch((err) => {
  console.error("\n❌ FALHA NO TESTE E2E:", err);
  process.exit(1);
});
