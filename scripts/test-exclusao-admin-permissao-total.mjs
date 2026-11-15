// scripts/test-exclusao-admin-permissao-total.mjs
import WebSocket from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================================");
console.log("TESTE DE PERMISSÃO TOTAL DE EXCLUSÃO PARA ADMIN (SESSÃO REAL JWT)");
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
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey || !publishableKey) {
  console.error("Variáveis de ambiente incompletas em .env.local");
  process.exit(1);
}

const adminServiceClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminUserClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Conectado ao Supabase:", supabaseUrl);

  const timestamp = Date.now();
  let profId = null;
  let alunoId = null;
  let turmaId = null;
  let aulaId = null;

  try {
    // 1. Fazer login como Administrador real via Supabase Auth
    console.log("\n1. Autenticando como Administrador (r71020142@gmail.com)...");
    const { data: authData, error: loginErr } = await adminUserClient.auth.signInWithPassword({
      email: "r71020142@gmail.com",
      password: "admin",
    });

    if (loginErr) {
      throw new Error("Falha no login do admin: " + loginErr.message);
    }
    console.log("-> Admin autenticado com sucesso! UID:", authData.user.id);
    console.log("-> Papel JWT:", authData.session.user.role);

    // 2. Criar Professor e Aluno para associar
    console.log("\n2. Criando dados efêmeros de teste (Professor e Aluno)...");
    const { data: prof, error: profErr } = await adminServiceClient
      .from("professores")
      .insert({
        nome_completo: `Prof Del Test ${timestamp}`,
        email: `prof_del_${timestamp}@teste.com`,
        status: "ativo",
      })
      .select()
      .single();
    if (profErr) throw profErr;
    profId = prof.id;

    const { data: aluno, error: alErr } = await adminServiceClient
      .from("alunos")
      .insert({
        nome_completo: `Aluno Del Test ${timestamp}`,
        email: `aluno_del_${timestamp}@teste.com`,
        nivel_operacional: "B1",
        status: "ativo",
      })
      .select()
      .single();
    if (alErr) throw alErr;
    alunoId = aluno.id;

    // 3. Criar Turma
    console.log("\n3. Criando Turma efêmera...");
    const { data: turma, error: tErr } = await adminServiceClient
      .from("turmas")
      .insert({
        nome: `Turma Exclusão Test ${timestamp}`,
        modalidade: "grupo",
        capacidade: 5,
        professor_id: profId,
        professores_ids: [profId],
        nivel: "B1",
        objetivo_principal: "Teste de exclusão irrestrita",
        status: "ativa",
      })
      .select()
      .single();
    if (tErr) throw tErr;
    turmaId = turma.id;

    // 4. Matricular Aluno na Turma
    console.log("\n4. Matriculando Aluno na Turma...");
    const { error: matErr } = await adminServiceClient.rpc("matricular_aluno_turma", {
      p_turma_id: turmaId,
      p_aluno_id: alunoId,
      p_motivo: "Teste de exclusão",
    });
    if (matErr) throw matErr;

    // 5. Criar Aula Agendada e Presença
    console.log("\n5. Criando Aula Agendada e Registrando Presença...");
    const dataAula = new Date(Date.now() + 86400000).toISOString();
    const dataFim = new Date(Date.now() + 86400000 + 3600000).toISOString();

    const { data: aula, error: aulaErr } = await adminServiceClient
      .from("aulas")
      .insert({
        turma_id: turmaId,
        professor_id: profId,
        titulo: `Aula Teste Exclusao ${timestamp}`,
        inicio_em: dataAula,
        fim_em: dataFim,
        status: "agendada",
      })
      .select()
      .single();
    if (aulaErr) throw aulaErr;
    aulaId = aula.id;

    // Buscar ID da matrícula
    const { data: matriculaRow } = await adminServiceClient
      .from("matriculas_turmas")
      .select("id")
      .eq("turma_id", turmaId)
      .eq("aluno_id", alunoId)
      .single();

    const { data: presenca, error: presErr } = await adminServiceClient
      .from("presencas_aulas")
      .insert({
        aula_id: aulaId,
        aluno_id: alunoId,
        matricula_id: matriculaRow.id,
        status: "presente",
      })
      .select()
      .single();
    if (presErr) throw presErr;
    console.log("-> Aula e Presença criadas com sucesso. Presença ID:", presenca.id);

    // 6. Testar exclusão de Aula via RPC com o CLIENT DO USUÁRIO ADMIN (Sessão real JWT)
    console.log("\n6. Executando excluir_aula_admin COM A SESSÃO DO ADMINISTRADOR...");
    const { data: resDelAula, error: errDelAula } = await adminUserClient.rpc("excluir_aula_admin", {
      p_aula_id: aulaId,
    });

    if (errDelAula) {
      throw new Error("FALHA AO EXCLUIR AULA COMO ADMIN: " + errDelAula.message);
    }
    console.log("-> Exclusão da aula retornou com sucesso:", resDelAula);
    assert.strictEqual(resDelAula.success, true);

    // Verificar que a presença e a aula não existem mais
    const { data: presCheck } = await adminServiceClient
      .from("presencas_aulas")
      .select("id")
      .eq("aula_id", aulaId);
    assert.strictEqual(presCheck.length, 0, "Presenças deveriam ter sido excluídas");

    const { data: aulaCheck } = await adminServiceClient
      .from("aulas")
      .select("id")
      .eq("id", aulaId);
    assert.strictEqual(aulaCheck.length, 0, "Aula deveria ter sido excluída");
    console.log("-> Verificado no banco: Aula e suas presenças foram excluídas fisicamente com sucesso!");

    // 7. Criar nova Aula com Presença na Turma e testar exclusão da TURMA inteira
    console.log("\n7. Criando nova aula e presença para testar excluir_turma_admin com sessão de admin...");
    const { data: aula2, error: a2Err } = await adminServiceClient
      .from("aulas")
      .insert({
        turma_id: turmaId,
        professor_id: profId,
        titulo: `Aula 2 Teste Exclusao ${timestamp}`,
        inicio_em: new Date(Date.now() + 172800000).toISOString(),
        fim_em: new Date(Date.now() + 172800000 + 3600000).toISOString(),
        status: "agendada",
      })
      .select()
      .single();
    if (a2Err) throw a2Err;

    await adminServiceClient
      .from("presencas_aulas")
      .insert({
        aula_id: aula2.id,
        aluno_id: alunoId,
        matricula_id: matriculaRow.id,
        status: "presente",
      });

    // 8. Executar excluir_turma_admin com a sessão do usuário admin
    console.log("\n8. Executando excluir_turma_admin COM A SESSÃO DO ADMINISTRADOR...");
    const { data: resDelTurma, error: errDelTurma } = await adminUserClient.rpc("excluir_turma_admin", {
      p_turma_id: turmaId,
    });

    if (errDelTurma) {
      throw new Error("FALHA AO EXCLUIR TURMA COMO ADMIN: " + errDelTurma.message);
    }
    console.log("-> Exclusão da turma retornou com sucesso:", resDelTurma);
    assert.strictEqual(resDelTurma.success, true);

    // Verificar que a turma, suas matrículas, aulas e presenças sumiram do banco
    const { data: turmaCheck } = await adminServiceClient
      .from("turmas")
      .select("id")
      .eq("id", turmaId);
    assert.strictEqual(turmaCheck.length, 0, "Turma deveria ter sido excluída");

    const { data: matCheck } = await adminServiceClient
      .from("matriculas_turmas")
      .select("id")
      .eq("turma_id", turmaId);
    assert.strictEqual(matCheck.length, 0, "Matrículas deveriam ter sido excluídas");

    const { data: aulasTurmaCheck } = await adminServiceClient
      .from("aulas")
      .select("id")
      .eq("turma_id", turmaId);
    assert.strictEqual(aulasTurmaCheck.length, 0, "Aulas da turma deveriam ter sido excluídas");

    console.log("-> Verificado no banco: Turma, matrículas, aulas e presenças excluídas 100%!");

    console.log("\n==================================================================");
    console.log("SUCESSO TOTAL! O ADMINISTRADOR TEM PERMISSÃO COMPLETA DE EXCLUSÃO!");
    console.log("==================================================================");
  } finally {
    // Limpeza
    console.log("\n9. Limpando registros remanescentes...");
    if (turmaId) {
      await adminServiceClient.from("matriculas_turmas").delete().eq("turma_id", turmaId);
      await adminServiceClient.from("aulas").delete().eq("turma_id", turmaId);
      await adminServiceClient.from("turmas").delete().eq("id", turmaId);
    }
    if (alunoId) {
      await adminServiceClient.from("alunos").delete().eq("id", alunoId);
    }
    if (profId) {
      await adminServiceClient.from("professores").delete().eq("id", profId);
    }
    console.log("-> Limpeza concluída.");
  }
}

run().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
