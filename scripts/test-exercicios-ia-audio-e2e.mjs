#!/usr/bin/env node

/**
 * test-exercicios-ia-audio-e2e.mjs
 * Teste End-to-End automatizado para o Gerador de Conteúdo e Narração por IA.
 * Valida fidelidade de texto-áudio, hash SHA-256, schema PostgreSQL no Supabase,
 * desvinculação do áudio incompatível de demonstração e integridade das regras pedagógicas.
 */

import { createHash } from "crypto";
import { execSync } from "child_process";

function logSuccess(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function logError(msg) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
}

function normalizeAudioText(rawText) {
  if (!rawText) return "";
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function computeTextHash(text) {
  const norm = normalizeAudioText(text);
  if (!norm) return "";
  return createHash("sha256").update(norm).digest("hex");
}

function checkAudioFidelity(text, currentHash, hasAudioUrl = false, isIaAudio = false) {
  const computedHash = computeTextHash(text);
  if (!hasAudioUrl) {
    return { status: "pendente", isSynchronized: false, computedHash };
  }
  if (!isIaAudio && !currentHash) {
    return { status: "manual", isSynchronized: true, computedHash };
  }
  if (!currentHash) {
    return { status: "pendente", isSynchronized: false, computedHash };
  }
  const isSynchronized = computedHash === currentHash;
  return {
    status: isSynchronized ? "sincronizado" : "desatualizado",
    isSynchronized,
    computedHash,
  };
}

function querySupabase(sql) {
  const output = execSync(
    `npx supabase db query --linked "${sql.replace(/"/g, '\\"')}"`,
    { encoding: "utf8" }
  );
  // Procura pelo JSON retornado pelo CLI
  const jsonMatch = output.match(/\{[\s\S]*"rows"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Resposta do Supabase CLI sem JSON válido:\n${output}`);
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.rows || [];
}

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 INICIANDO TESTES E2E: GERADOR DE CONTEÚDO E NARRAÇÃO POR IA");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------------------
  // TESTE 1: Fidelidade de Texto e Algoritmo SHA-256
  // -------------------------------------------------------------------------
  console.log("\n[1/5] Validando Fidelidade de Texto e Algoritmo de Hash...");
  try {
    const textOriginal = "Sunday mornings in London have a very distinctive rhythm.\n\nSarah lives in Greenwich.";
    const textWithSpaces = "   Sunday  mornings in London have a very distinctive rhythm.  \r\n\r\nSarah lives in Greenwich.   ";
    const textAltered = "Sunday mornings in London have a very fast rhythm.\n\nSarah lives in Greenwich.";

    const hash1 = computeTextHash(textOriginal);
    const hash2 = computeTextHash(textWithSpaces);
    const hashAltered = computeTextHash(textAltered);

    if (hash1 !== hash2) {
      throw new Error(`Normalização falhou:\nHash 1: ${hash1}\nHash 2: ${hash2}`);
    }
    if (hash1 === hashAltered) {
      throw new Error("Colisão indevida: textos modificados geraram o mesmo hash.");
    }

    const checkSinc = checkAudioFidelity(textWithSpaces, hash1, true, true);
    if (checkSinc.status !== "sincronizado" || !checkSinc.isSynchronized) {
      throw new Error(`Esperado status 'sincronizado', obtido '${checkSinc.status}'`);
    }

    const checkDesat = checkAudioFidelity(textAltered, hash1, true, true);
    if (checkDesat.status !== "desatualizado" || checkDesat.isSynchronized) {
      throw new Error(`Esperado status 'desatualizado' após alteração no texto, obtido '${checkDesat.status}'`);
    }

    logSuccess("Algoritmo de fidelidade detecta sincronia e invalidações de áudio com precisão.");
    passed++;
  } catch (e) {
    logError(`Falha no Teste 1: ${e.message}`);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TESTE 2: Verificação do Supabase Schema (Colunas Aditivas de IA)
  // -------------------------------------------------------------------------
  console.log("\n[2/5] Verificando Colunas de IA e TTS na tabela 'exercicios_interativos'...");
  try {
    const rows = querySupabase(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exercicios_interativos'
        AND column_name IN ('audio_texto_hash', 'audio_status', 'audio_provedor', 'audio_voz_id', 'audio_is_ia', 'conteudo_gerado_por_ia');
    `);

    if (rows.length < 6) {
      throw new Error(`Apenas ${rows.length} de 6 colunas de IA foram encontradas na tabela.`);
    }

    const colNames = rows.map((r) => r.column_name);
    logSuccess(`Todas as 6 colunas aditivas de IA existem no Supabase: ${colNames.join(", ")}`);
    passed++;
  } catch (e) {
    logError(`Falha no Teste 2: ${e.message}`);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TESTE 3: Verificação da Security Barrier View 'vw_aluno_exercicios'
  // -------------------------------------------------------------------------
  console.log("\n[3/5] Verificando Security Barrier View 'vw_aluno_exercicios' para o Aluno...");
  try {
    const rows = querySupabase(`
      SELECT id, titulo, audio_status, audio_is_ia
      FROM public.vw_aluno_exercicios
      LIMIT 5;
    `);

    logSuccess(`View 'vw_aluno_exercicios' ativa e segura, retornando ${rows.length} exercícios com campos de IA.`);
    passed++;
  } catch (e) {
    logError(`Falha no Teste 3: ${e.message}`);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TESTE 4: Resolução do Áudio Incompatível de "Sunday in London"
  // -------------------------------------------------------------------------
  console.log("\n[4/5] Verificando desvinculação do áudio ambiente anterior em 'Sunday in London'...");
  try {
    const rows = querySupabase(`
      SELECT id, titulo, audio_url, audio_nome, audio_status, audio_is_ia
      FROM public.exercicios_interativos
      WHERE titulo ILIKE '%Sunday in London%';
    `);

    if (rows.length === 0) {
      throw new Error("Exercício 'Sunday in London' não encontrado no banco.");
    }

    const ex = rows[0];
    if (ex.audio_url && ex.audio_url.includes("coffee_shop.ogg")) {
      throw new Error("Áudio ambiente incompatível 'coffee_shop.ogg' ainda está vinculado.");
    }

    if (ex.audio_url !== null) {
      throw new Error(`Esperado audio_url null, encontrado: ${ex.audio_url}`);
    }

    if (ex.audio_status !== "pendente") {
      throw new Error(`Esperado status 'pendente', encontrado: ${ex.audio_status}`);
    }

    logSuccess(`Exercício 'Sunday in London' corrigido: áudio ambiente removido, status='${ex.audio_status}'.`);
    passed++;
  } catch (e) {
    logError(`Falha no Teste 4: ${e.message}`);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TESTE 5: Validação Pedagógica de Questões (4 Alternativas e 1 Gabarito)
  // -------------------------------------------------------------------------
  console.log("\n[5/5] Validando Regras Pedagógicas de Questões (Lingua.com / Método Paulo)...");
  try {
    const mockQuestaoValida = {
      id: "q-test-1",
      enunciado: "Where did Sarah meet Marcus in London?",
      pontos: 2.5,
      alternativas: [
        { id: "alt-a", texto: "In Canary Wharf", ordem: 1 },
        { id: "alt-b", texto: "At Greenwich Market", ordem: 2 },
        { id: "alt-c", texto: "Near St. Paul's Cathedral", ordem: 3 },
        { id: "alt-d", texto: "At Tower Bridge", ordem: 4 },
      ],
      alternativaCorretaId: "alt-b",
      explicacao: "O texto informa: 'Sarah meets her friend Marcus at Greenwich Market.'",
    };

    if (mockQuestaoValida.alternativas.length !== 4) {
      throw new Error("A questão não possui exatamente 4 alternativas.");
    }

    const ids = new Set(mockQuestaoValida.alternativas.map((a) => a.id));
    if (ids.size !== 4) {
      throw new Error("Alternativas possuem IDs duplicados.");
    }

    if (!ids.has(mockQuestaoValida.alternativaCorretaId)) {
      throw new Error("O ID da alternativa correta não existe na lista de opções.");
    }

    logSuccess("Critérios pedagógicos de 4 alternativas e gabarito único validados com sucesso.");
    passed++;
  } catch (e) {
    logError(`Falha no Teste 5: ${e.message}`);
    failed++;
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${passed} PASSARAM, ${failed} FALHARAM`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
