// scripts/test-exclusao-entidades.mjs
import WebSocket from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

console.log("==================================================================");
console.log("TESTE DE EXCLUSÃO ADMINISTRATIVA DE ENTIDADES (SUPABASE API)");
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

  // 1. Criar Professor Teste
  console.log("\n1. Criando Professor efêmero...");
  const { data: prof, error: profErr } = await supabase
    .from("professores")
    .insert({
      nome_completo: "Professor Teste Exclusao Automatizada",
      email: `teste.prof.${Date.now()}@mtd.com`,
      status: "ativo",
      idiomas_falados: ["Inglês", "Português"],
    })
    .select()
    .single();

  if (profErr) throw new Error("Erro ao criar professor: " + profErr.message);
  console.log("✔ Professor criado:", prof.id, prof.email);

  // 2. Criar Aluno Teste
  console.log("\n2. Criando Aluno efêmero...");
  const { data: aluno, error: alunoErr } = await supabase
    .from("alunos")
    .insert({
      nome_completo: "Aluno Teste Exclusao Automatizada",
      email: `teste.aluno.${Date.now()}@mtd.com`,
      status: "ativo",
      nivel_operacional: "A1",
    })
    .select()
    .single();

  if (alunoErr) throw new Error("Erro ao criar aluno: " + alunoErr.message);
  console.log("✔ Aluno criado:", aluno.id, aluno.email);

  // 3. Criar Turma Teste
  console.log("\n3. Criando Turma efêmera com co-docência...");
  const { data: turma, error: turmaErr } = await supabase
    .from("turmas")
    .insert({
      nome: `Turma Teste Exclusao ${Date.now()}`,
      professor_id: prof.id,
      professores_ids: [prof.id],
      modalidade: "grupo",
      nivel: "A1",
      status: "ativa",
      capacidade: 8,
    })
    .select()
    .single();

  if (turmaErr) throw new Error("Erro ao criar turma: " + turmaErr.message);
  console.log("✔ Turma criada:", turma.id, turma.nome);

  // 4. Matricular Aluno na Turma
  console.log("\n4. Vinculando matrícula do aluno na turma...");
  const { data: matricula, error: matErr } = await supabase
    .from("matriculas_turmas")
    .insert({
      turma_id: turma.id,
      aluno_id: aluno.id,
      status: "ativa",
    })
    .select()
    .single();

  if (matErr) throw new Error("Erro ao matricular aluno: " + matErr.message);
  console.log("✔ Matrícula efetuada:", matricula.id);

  // 5. Criar Aula Teste na Turma
  console.log("\n5. Criando Aula agendada na turma...");
  const now = new Date();
  const later = new Date(now.getTime() + 50 * 60 * 1000);
  const { data: aula, error: aulaErr } = await supabase
    .from("aulas")
    .insert({
      turma_id: turma.id,
      professor_id: prof.id,
      titulo: "Aula Efêmera de Teste",
      inicio_em: now.toISOString(),
      fim_em: later.toISOString(),
      status: "agendada",
    })
    .select()
    .single();

  if (aulaErr) throw new Error("Erro ao criar aula: " + aulaErr.message);
  console.log("✔ Aula criada:", aula.id, aula.titulo);

  // 6. Registrar Presença na Aula
  console.log("\n6. Registrando presença na aula...");
  const { data: presenca, error: presErr } = await supabase
    .from("presencas_aulas")
    .insert({
      aula_id: aula.id,
      aluno_id: aluno.id,
      status: "presente",
    })
    .select()
    .single();

  if (presErr) throw new Error("Erro ao registrar presença: " + presErr.message);
  console.log("✔ Presença inserida:", presenca.id);

  // 7. Testar Exclusão de Aula via RPC
  console.log("\n7. Executando RPC excluir_aula_admin...");
  const { data: rpcAula, error: rpcAulaErr } = await supabase.rpc("excluir_aula_admin", {
    p_aula_id: aula.id,
  });

  if (rpcAulaErr) throw new Error("Erro na RPC excluir_aula_admin: " + rpcAulaErr.message);
  console.log("✔ RPC excluir_aula_admin retornou:", rpcAula);

  // Verificar se a aula e a presença sumiram
  const { data: checkAula } = await supabase.from("aulas").select("id").eq("id", aula.id).maybeSingle();
  const { data: checkPresenca } = await supabase.from("presencas_aulas").select("id").eq("id", presenca.id).maybeSingle();

  if (checkAula || checkPresenca) {
    throw new Error("Falha: aula ou presenças ainda existem no banco após exclusão!");
  }
  console.log("✔ Validação confirmada: Aula e presenças excluídas do banco com sucesso!");

  // 8. Testar Exclusão de Turma via RPC
  console.log("\n8. Recriando aula na turma e testando RPC excluir_turma_admin...");
  const now2 = new Date(Date.now() + 86400000);
  const later2 = new Date(now2.getTime() + 50 * 60 * 1000);
  const { data: aula2, error: aula2Err } = await supabase
    .from("aulas")
    .insert({
      turma_id: turma.id,
      professor_id: prof.id,
      titulo: "Aula Para Cascade de Turma",
      inicio_em: now2.toISOString(),
      fim_em: later2.toISOString(),
      status: "agendada",
    })
    .select()
    .single();

  if (aula2Err) throw new Error("Erro ao criar aula 2: " + aula2Err.message);

  const { data: rpcTurma, error: rpcTurmaErr } = await supabase.rpc("excluir_turma_admin", {
    p_turma_id: turma.id,
  });

  if (rpcTurmaErr) throw new Error("Erro na RPC excluir_turma_admin: " + rpcTurmaErr.message);
  console.log("✔ RPC excluir_turma_admin retornou:", rpcTurma);

  const { data: checkTurma } = await supabase.from("turmas").select("id").eq("id", turma.id).maybeSingle();
  const { data: checkAula2 } = await supabase.from("aulas").select("id").eq("id", aula2.id).maybeSingle();
  const { data: checkMat } = await supabase.from("matriculas_turmas").select("id").eq("id", matricula.id).maybeSingle();

  if (checkTurma || checkAula2 || checkMat) {
    throw new Error("Falha: turma, aulas ou matrículas ainda existem após exclusão de turma!");
  }
  console.log("✔ Validação confirmada: Turma, suas aulas e suas matrículas foram cascateadas e excluídas com sucesso!");

  // 9. Testar Exclusão de Aluno via RPC
  console.log("\n9. Testando RPC excluir_aluno_admin...");
  const { data: rpcAluno, error: rpcAlunoErr } = await supabase.rpc("excluir_aluno_admin", {
    p_aluno_id: aluno.id,
  });

  if (rpcAlunoErr) throw new Error("Erro na RPC excluir_aluno_admin: " + rpcAlunoErr.message);
  console.log("✔ RPC excluir_aluno_admin retornou:", rpcAluno);

  const { data: checkAluno } = await supabase.from("alunos").select("id").eq("id", aluno.id).maybeSingle();
  if (checkAluno) {
    throw new Error("Falha: aluno ainda existe após excluir_aluno_admin!");
  }
  console.log("✔ Validação confirmada: Aluno excluído com sucesso!");

  // 10. Testar Exclusão de Professor via RPC
  console.log("\n10. Testando RPC excluir_professor_admin...");
  const { data: rpcProf, error: rpcProfErr } = await supabase.rpc("excluir_professor_admin", {
    p_professor_id: prof.id,
  });

  if (rpcProfErr) throw new Error("Erro na RPC excluir_professor_admin: " + rpcProfErr.message);
  console.log("✔ RPC excluir_professor_admin retornou:", rpcProf);

  const { data: checkProf } = await supabase.from("professores").select("id").eq("id", prof.id).maybeSingle();
  if (checkProf) {
    throw new Error("Falha: professor ainda existe após excluir_professor_admin!");
  }
  console.log("✔ Validação confirmada: Professor excluído com sucesso!");

  console.log("\n==================================================================");
  console.log("TODAS AS ROTINAS DE EXCLUSÃO FORAM VERIFICADAS E APROVADAS!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
