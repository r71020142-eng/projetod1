// scripts/test-aluno-background-e2e.mjs
import WebSocket from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================================");
console.log("TESTE E2E: PERSISTÊNCIA E VALIDAÇÃO DO BACKGROUND DO ALUNO");
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

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const testSuffix = Date.now();
  const testEmail = `teste.background.${testSuffix}@escolapaulo.com.br`;
  const testNome = `Aluno Teste Background ${testSuffix}`;
  let alunoId = null;
  let authUserId = null;

  try {
    console.log("\n[Passo 1] Criando conta de autenticação e aluno com os 8 campos de background...");

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: "SenhaForteTeste123!",
      email_confirm: true,
      user_metadata: { nome_completo: testNome, role: "aluno" },
    });

    if (authErr) {
      throw new Error(`Falha ao criar usuário auth: ${authErr.message}`);
    }
    authUserId = authData.user.id;
    console.log("✓ Usuário Auth criado com sucesso:", authUserId);

    alunoId = crypto.randomUUID();
    const dadosBackground = {
      id: alunoId,
      perfil_id: authUserId,
      nome_completo: testNome,
      email: testEmail,
      telefone: "+55 (11) 98765-4321",
      objetivo: "Fluência para conferências internacionais e liderança global",
      nivel_operacional: "B2",
      status: "ativo",
      idade: 31,
      data_nascimento: "1995-05-18",
      nivel_escolar: "Pós-graduação em Inteligência Artificial",
      profissao: "Engenheiro de Dados Sênior",
      nacionalidade: "Brasileiro",
      sobre_aluno: "Profissional com mais de 8 anos de experiência em engenharia de software e pipelines analíticos.",
      interesses: "Machine learning, computação em nuvem, viagens internacionais e culinária",
      biografia: "Nascido em Belo Horizonte, reside em São Paulo, buscando fluência em inglês para liderar times globais.",
    };

    const { data: novoAluno, error: insertErr } = await admin
      .from("alunos")
      .insert(dadosBackground)
      .select()
      .single();

    if (insertErr) {
      throw new Error(`Falha ao inserir aluno com background: ${insertErr.message}`);
    }
    console.log("✓ Aluno inserido no banco public.alunos:", novoAluno.id);

    console.log("\n[Passo 2] Validando que todas as 8 colunas de background foram persistidas corretamente...");
    assert.strictEqual(novoAluno.idade, 31, "idade incorreta");
    assert.strictEqual(novoAluno.data_nascimento, "1995-05-18", "data_nascimento incorreta");
    assert.strictEqual(novoAluno.nivel_escolar, "Pós-graduação em Inteligência Artificial", "nivel_escolar incorreto");
    assert.strictEqual(novoAluno.profissao, "Engenheiro de Dados Sênior", "profissao incorreta");
    assert.strictEqual(novoAluno.nacionalidade, "Brasileiro", "nacionalidade incorreta");
    assert.strictEqual(novoAluno.sobre_aluno, dadosBackground.sobre_aluno, "sobre_aluno incorreto");
    assert.strictEqual(novoAluno.interesses, dadosBackground.interesses, "interesses incorreto");
    assert.strictEqual(novoAluno.biografia, dadosBackground.biografia, "biografia incorreta");
    console.log("✓ Todas as 8 colunas persistidas com exatidão no banco de dados!");

    console.log("\n[Passo 3] Testando atualização parcial e enriquecimento do background...");
    const atualizacoes = {
      idade: 32,
      profissao: "Head de Engenharia de Dados",
      interesses: "Inteligência Artificial Generativa, Liderança Técnica, Triathlon",
    };

    const { data: alunoAtualizado, error: updateErr } = await admin
      .from("alunos")
      .update(atualizacoes)
      .eq("id", alunoId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Falha ao atualizar background do aluno: ${updateErr.message}`);
    }

    assert.strictEqual(alunoAtualizado.idade, 32, "idade atualizada incorreta");
    assert.strictEqual(alunoAtualizado.profissao, "Head de Engenharia de Dados", "profissao atualizada incorreta");
    assert.strictEqual(alunoAtualizado.interesses, atualizacoes.interesses, "interesses atualizados incorretos");
    // Garante que campos não alterados continuam intactos
    assert.strictEqual(alunoAtualizado.data_nascimento, "1995-05-18", "data_nascimento deve permanecer");
    assert.strictEqual(alunoAtualizado.nacionalidade, "Brasileiro", "nacionalidade deve permanecer");
    assert.strictEqual(alunoAtualizado.nivel_escolar, "Pós-graduação em Inteligência Artificial", "nivel_escolar deve permanecer");
    console.log("✓ Atualização do background validada com sucesso!");

    console.log("\n[Passo 4] Validando leitura via query SQL estruturada...");
    const { data: rows, error: selectErr } = await admin
      .from("alunos")
      .select("id, nome_completo, idade, data_nascimento, nivel_escolar, profissao, nacionalidade, sobre_aluno, interesses, biografia")
      .eq("id", alunoId)
      .single();

    if (selectErr) {
      throw new Error(`Falha ao consultar aluno: ${selectErr.message}`);
    }

    console.log("Dados retornados pelo banco:");
    console.log({
      id: rows.id,
      nome_completo: rows.nome_completo,
      idade: rows.idade,
      data_nascimento: rows.data_nascimento,
      nivel_escolar: rows.nivel_escolar,
      profissao: rows.profissao,
      nacionalidade: rows.nacionalidade,
      sobre_aluno: rows.sobre_aluno.slice(0, 40) + "...",
      interesses: rows.interesses,
      biografia: rows.biografia.slice(0, 40) + "...",
    });
    console.log("✓ Consulta estruturada confirmada com sucesso!");

  } finally {
    console.log("\n[Passo 5] Limpeza de dados de teste...");
    if (alunoId) {
      await admin.from("alunos").delete().eq("id", alunoId);
      console.log("✓ Aluno efêmero de teste removido.");
    }
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId);
      console.log("✓ Usuário Auth efêmero de teste removido.");
    }
  }

  console.log("\n==================================================================");
  console.log("TODOS OS TESTES E2E DE BACKGROUND DO ALUNO PASSARAM COM SUCESSO!");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("ERRO NO TESTE E2E:", err);
  process.exit(1);
});
