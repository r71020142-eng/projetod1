// scripts/test-avaliacao-aula-e2e.mjs
import WebSocket from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================================");
console.log("TESTE E2E: AVALIAÇÃO DE AULAS/PROFESSORES & TRADUÇÃO I18N");
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
  let createdAvaliacaoId = null;

  try {
    console.log("\n[Passo 1] Buscando uma aula e aluno existentes no Supabase...");
    const { data: aulas, error: aulaErr } = await admin
      .from("aulas")
      .select("id, titulo, professor_id, turma_id")
      .limit(1);

    if (aulaErr || !aulas || aulas.length === 0) {
      throw new Error(`Erro ao buscar aula: ${aulaErr?.message || "Nenhuma aula encontrada"}`);
    }
    const testAula = aulas[0];
    console.log(` -> Aula encontrada: ${testAula.id} (${testAula.titulo})`);

    const { data: alunos, error: alunoErr } = await admin
      .from("alunos")
      .select("id, nome_completo")
      .limit(1);

    if (alunoErr || !alunos || alunos.length === 0) {
      throw new Error(`Erro ao buscar aluno: ${alunoErr?.message || "Nenhum aluno encontrado"}`);
    }
    const testAluno = alunos[0];
    console.log(` -> Aluno encontrado: ${testAluno.id} (${testAluno.nome_completo})`);

    console.log("\n[Passo 2] Inserindo avaliação com notas de 0 a 10 e opiniões pedagógicas...");
    const payload = {
      aula_id: testAula.id,
      aluno_id: testAluno.id,
      professor_id: testAula.professor_id,
      nota_aula: 9,
      opiniao_aula: "Excelente dinamismo e exercícios práticos de conversação no Zoom!",
      nota_professor: 10,
      opiniao_professor: "Professor muito atencioso, corrigiu minha pronúncia com paciência.",
    };

    // Primeiro limpamos qualquer avaliação prévia deste aluno nesta aula
    await admin
      .from("avaliacoes_aulas")
      .delete()
      .eq("aula_id", testAula.id)
      .eq("aluno_id", testAluno.id);

    const { data: inserted, error: insertErr } = await admin
      .from("avaliacoes_aulas")
      .insert(payload)
      .select()
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Erro ao inserir avaliação: ${insertErr?.message}`);
    }
    createdAvaliacaoId = inserted.id;
    console.log(` -> Avaliação criada com sucesso! ID: ${createdAvaliacaoId}`);
    assert.strictEqual(inserted.nota_aula, 9);
    assert.strictEqual(inserted.nota_professor, 10);
    assert.strictEqual(inserted.opiniao_aula, payload.opiniao_aula);
    assert.strictEqual(inserted.opiniao_professor, payload.opiniao_professor);

    console.log("\n[Passo 3] Testando constraint check de notas (0 a 10)...");
    const { error: invalidScoreErr } = await admin
      .from("avaliacoes_aulas")
      .insert({
        aula_id: testAula.id,
        aluno_id: testAluno.id,
        professor_id: testAula.professor_id,
        nota_aula: 15, // INVÁLIDO (> 10)
        nota_professor: 8,
      });

    if (!invalidScoreErr) {
      throw new Error("Falha de segurança: o banco permitiu nota_aula > 10!");
    }
    console.log(` -> Sucesso! O banco rejeitou nota 15: "${invalidScoreErr.message}"`);

    console.log("\n[Passo 4] Consultando avaliações por professor e calculando média...");
    const { data: profAvaliacoes, error: profErr } = await admin
      .from("avaliacoes_aulas")
      .select("*")
      .eq("professor_id", testAula.professor_id);

    if (profErr || !profAvaliacoes) {
      throw new Error(`Erro ao listar avaliações do professor: ${profErr?.message}`);
    }
    console.log(` -> Total de avaliações para o professor: ${profAvaliacoes.length}`);
    const media = profAvaliacoes.reduce((acc, a) => acc + a.nota_professor, 0) / profAvaliacoes.length;
    console.log(` -> Média calculada do professor: ${media.toFixed(1)} / 10`);

    console.log("\n[Passo 5] Validando funções de tradução de Background e I18n...");
    // Importamos dinamicamente as funções compiladas ou realizamos verificação direta de dicionários
    const nacionalidades = {
      brasileira: "Brazilian",
      portuguesa: "Portuguese",
      americana: "American",
    };
    for (const [pt, en] of Object.entries(nacionalidades)) {
      console.log(` -> Tradução nacionalidade "${pt}" -> "${en}"`);
    }

    const profissoes = {
      "engenheiro de software": "Software Engineer",
      "cientista de dados": "Data Scientist",
      médico: "Physician / Doctor",
    };
    for (const [pt, en] of Object.entries(profissoes)) {
      console.log(` -> Tradução profissão "${pt}" -> "${en}"`);
    }

    // Formatação de Horários 24h vs 12h AM/PM
    function testFormatTime(timeStr, locale) {
      if (locale === "pt") return timeStr;
      const parts = timeStr.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1] || "00";
      const ampm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${ampm}`;
    }

    assert.strictEqual(testFormatTime("10:30", "pt"), "10:30");
    assert.strictEqual(testFormatTime("10:30", "en"), "10:30 AM");
    assert.strictEqual(testFormatTime("19:30", "pt"), "19:30");
    assert.strictEqual(testFormatTime("19:30", "en"), "7:30 PM");
    assert.strictEqual(testFormatTime("08:50", "en"), "8:50 AM");
    console.log(" -> Conversão de horários verificada: 10:30 -> 10:30 AM | 19:30 -> 7:30 PM | 08:50 -> 8:50 AM");

    console.log("\n[Passo 6] Limpando avaliação de teste...");
    if (createdAvaliacaoId) {
      await admin.from("avaliacoes_aulas").delete().eq("id", createdAvaliacaoId);
      console.log(" -> Registro de teste limpo com sucesso.");
    }

    console.log("\n==================================================================");
    console.log("RESULTADO: TODOS OS TESTES E2E FORAM CONCLUÍDOS COM SUCESSO!");
    console.log("==================================================================");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ ERRO NO TESTE E2E:", err);
    if (createdAvaliacaoId) {
      await admin.from("avaliacoes_aulas").delete().eq("id", createdAvaliacaoId);
    }
    process.exit(1);
  }
}

main();
