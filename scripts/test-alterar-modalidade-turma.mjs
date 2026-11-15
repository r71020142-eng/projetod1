// scripts/test-alterar-modalidade-turma.mjs
import WebSocket from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================================");
console.log("TESTE DE TRANSIÇÃO DE MODALIDADE DE TURMA (INDIVIDUAL <-> GRUPO)");
console.log("==================================================================");

// Carregar variáveis de .env.local
const envContent = fs.readFileSync(path.resolve(".env.local"), "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY não encontradas em .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Conectado ao Supabase:", supabaseUrl);

  const timestamp = Date.now();
  let profId = null;
  let aluno1Id = null;
  let aluno2Id = null;
  let turmaId = null;

  try {
    // 1. Criar Professor de Teste
    console.log("\n1. Criando Professor efêmero...");
    const { data: prof, error: profErr } = await supabase
      .from("professores")
      .insert({
        nome_completo: `Prof Teste Mod ${timestamp}`,
        email: `proftest_${timestamp}@teste.com`,
        telefone: "+55 (11) 98888-7777",
        status: "ativo",
      })
      .select()
      .single();

    if (profErr) throw new Error("Erro ao criar professor: " + profErr.message);
    profId = prof.id;
    console.log("-> Professor criado com sucesso:", profId);

    // 2. Criar Alunos de Teste
    console.log("\n2. Criando Alunos efêmeros...");
    const { data: aluno1, error: al1Err } = await supabase
      .from("alunos")
      .insert({
        nome_completo: `Aluno 1 Mod ${timestamp}`,
        email: `aluno1_${timestamp}@teste.com`,
        telefone: "+1 (555) 234-5678",
        nivel_operacional: "A1",
        status: "ativo",
      })
      .select()
      .single();
    if (al1Err) throw new Error("Erro ao criar aluno 1: " + al1Err.message);
    aluno1Id = aluno1.id;

    const { data: aluno2, error: al2Err } = await supabase
      .from("alunos")
      .insert({
        nome_completo: `Aluno 2 Mod ${timestamp}`,
        email: `aluno2_${timestamp}@teste.com`,
        telefone: "+44 20 7946 0958",
        nivel_operacional: "A2",
        status: "ativo",
      })
      .select()
      .single();
    if (al2Err) throw new Error("Erro ao criar aluno 2: " + al2Err.message);
    aluno2Id = aluno2.id;
    console.log("-> Alunos criados com sucesso:", aluno1Id, aluno2Id);

    // 3. Criar Turma INDIVIDUAL com capacidade 1
    console.log("\n3. Criando Turma INDIVIDUAL (capacidade 1)...");
    const { data: turma, error: turmaErr } = await supabase
      .from("turmas")
      .insert({
        nome: `Turma VIP Test ${timestamp}`,
        modalidade: "individual",
        capacidade: 1,
        professor_id: profId,
        professores_ids: [profId],
        nivel: "A1",
        objetivo_principal: "Inglês para Negócios VIP",
        status: "formacao",
      })
      .select()
      .single();

    if (turmaErr) throw new Error("Erro ao criar turma: " + turmaErr.message);
    turmaId = turma.id;
    console.log("-> Turma individual criada:", turmaId, {
      modalidade: turma.modalidade,
      capacidade: turma.capacidade,
    });
    assert.strictEqual(turma.modalidade, "individual");
    assert.strictEqual(turma.capacidade, 1);

    // 4. Testar alteração de individual -> grupo (capacidade 6) via RPC
    console.log("\n4. Alterando turma de individual para grupo (capacidade 6) via RPC alterar_capacidade_turma...");
    const { data: rpcRes1, error: rpcErr1 } = await supabase.rpc("alterar_capacidade_turma", {
      p_turma_id: turmaId,
      p_nova_capacidade: 6,
      p_nova_modalidade: "grupo",
    });

    if (rpcErr1) throw new Error("Falha na RPC ao mudar para grupo: " + rpcErr1.message);
    console.log("-> RPC executada com sucesso:", rpcRes1);
    assert.strictEqual(rpcRes1.nova_modalidade, "grupo");
    assert.strictEqual(rpcRes1.nova_capacidade, 6);

    // Verificar se a tabela turmas foi atualizada
    const { data: turmaVerif1, error: verifErr1 } = await supabase
      .from("turmas")
      .select("modalidade, capacidade")
      .eq("id", turmaId)
      .single();
    if (verifErr1) throw verifErr1;
    console.log("-> Turma no banco após alteração:", turmaVerif1);
    assert.strictEqual(turmaVerif1.modalidade, "grupo");
    assert.strictEqual(turmaVerif1.capacidade, 6);

    // 5. Matricular 1 aluno na turma
    console.log("\n5. Matriculando Aluno 1 na turma...");
    const { error: mat1Err } = await supabase.rpc("matricular_aluno_turma", {
      p_turma_id: turmaId,
      p_aluno_id: aluno1Id,
      p_motivo: "Teste automatizado",
    });
    if (mat1Err) throw new Error("Erro ao matricular aluno 1: " + mat1Err.message);
    console.log("-> Aluno 1 matriculado com sucesso.");

    // 6. Testar alteração de volta para individual (capacidade 1) com 1 aluno ativo
    console.log("\n6. Alterando de grupo de volta para individual (capacidade 1) com 1 aluno ativo...");
    const { data: rpcRes2, error: rpcErr2 } = await supabase.rpc("alterar_capacidade_turma", {
      p_turma_id: turmaId,
      p_nova_capacidade: 1,
      p_nova_modalidade: "individual",
    });
    if (rpcErr2) throw new Error("Falha na RPC ao voltar para individual: " + rpcErr2.message);
    console.log("-> RPC executada com sucesso:", rpcRes2);
    assert.strictEqual(rpcRes2.nova_modalidade, "individual");
    assert.strictEqual(rpcRes2.nova_capacidade, 1);

    // 7. Mudar novamente para grupo e matricular 2º aluno
    console.log("\n7. Mudando novamente para grupo (capacidade 5) e matriculando 2º aluno...");
    const { error: rpcErr3 } = await supabase.rpc("alterar_capacidade_turma", {
      p_turma_id: turmaId,
      p_nova_capacidade: 5,
      p_nova_modalidade: "grupo",
    });
    if (rpcErr3) throw new Error("Erro ao mudar para grupo: " + rpcErr3.message);

    const { error: mat2Err } = await supabase.rpc("matricular_aluno_turma", {
      p_turma_id: turmaId,
      p_aluno_id: aluno2Id,
      p_motivo: "Segundo aluno matriculado",
    });
    if (mat2Err) throw new Error("Erro ao matricular aluno 2: " + mat2Err.message);
    console.log("-> 2 alunos matriculados com sucesso na turma em grupo.");

    // 8. Tentar mudar para individual tendo 2 alunos matriculados (DEVE FALHAR com erro seguro)
    console.log("\n8. Tentando mudar para individual tendo 2 alunos matriculados (deve falhar)...");
    const { data: rpcRes4, error: rpcErr4 } = await supabase.rpc("alterar_capacidade_turma", {
      p_turma_id: turmaId,
      p_nova_capacidade: 1,
      p_nova_modalidade: "individual",
    });

    if (!rpcErr4) {
      throw new Error("ERRO: A transição para individual deveria ter sido bloqueada pois há 2 alunos matriculados!");
    }
    console.log("-> Bloqueio funcionou conforme esperado! Mensagem de erro:", rpcErr4.message);
    assert(rpcErr4.message.includes("Não é permitido alterar para modalidade individual"));

    console.log("\n==================================================================");
    console.log("TODOS OS TESTES DE TRANSIÇÃO DE MODALIDADE FORAM APROVADOS!");
    console.log("==================================================================");
  } finally {
    // 9. Limpeza de dados efêmeros
    console.log("\n9. Limpando dados efêmeros de teste...");
    if (turmaId) {
      await supabase.from("matriculas_turmas").delete().eq("turma_id", turmaId);
      await supabase.from("turmas").delete().eq("id", turmaId);
    }
    if (aluno1Id) {
      await supabase.from("alunos").delete().eq("id", aluno1Id);
    }
    if (aluno2Id) {
      await supabase.from("alunos").delete().eq("id", aluno2Id);
    }
    if (profId) {
      await supabase.from("professores").delete().eq("id", profId);
    }
    console.log("-> Limpeza concluída com sucesso.");
  }
}

run().catch((err) => {
  console.error("FALHA NO TESTE:", err);
  process.exit(1);
});
