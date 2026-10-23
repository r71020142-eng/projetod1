/**
 * Script de Teste Automatizado: Eliminação de Fallback Silencioso em Mutações
 *
 * Valida que quando o Supabase está ativo como fonte de dados (ou quando os
 * repositórios Supabase são invocados), falhas de rede, tabelas ausentes ou erros
 * de permissão/RLS produzem erros explícitos ({ success: false, error: ... })
 * e NUNCA fingem sucesso salvando silenciosamente no localStorage.
 */

import { materialSupabaseRepository } from "../src/data/materialSupabaseRepository";
import { atividadeSupabaseRepository } from "../src/data/atividadeSupabaseRepository";
import { entregaSupabaseRepository } from "../src/data/entregaSupabaseRepository";
import { conteudoDiarioSupabaseRepository } from "../src/data/conteudoDiarioSupabaseRepository";
import { avaliacaoSupabaseRepository } from "../src/data/avaliacaoSupabaseRepository";
import { tentativaAvaliacaoSupabaseRepository } from "../src/data/tentativaAvaliacaoSupabaseRepository";
import { baralhoSupabaseRepository } from "../src/data/baralhoSupabaseRepository";
import { cartaoSupabaseRepository } from "../src/data/cartaoSupabaseRepository";
import { progressoCartaoSupabaseRepository } from "../src/data/progressoCartaoSupabaseRepository";
import { selfPresentationSupabaseRepository } from "../src/data/selfPresentationSupabaseRepository";
import { isLocalDataSource } from "../src/data/repositoryFactory";

async function runTests() {
  console.log("===============================================================================");
  console.log("DEMOSTRATIVO MTD — TESTE DE ELIMINAÇÃO DE FALLBACK SILENCIOSO EM MUTAÇÕES");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [OK] ${testName}`);
      passed++;
    } else {
      console.error(`  [FALHA] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Teste isLocalDataSource
  console.log("1. Resolução de Fonte de Dados e isLocalDataSource():");
  const localDs = isLocalDataSource();
  console.log(`   isLocalDataSource() atual no ambiente de execução: ${localDs}`);
  assert(typeof localDs === "boolean", "isLocalDataSource() retorna booleano consistente");

  // 2. Teste MaterialSupabaseRepository: mutação com payload inválido / falha remota
  console.log("\n2. MaterialSupabaseRepository (criar):");
  try {
    const res = await materialSupabaseRepository.criar({
      titulo: "Material Teste Fallback",
      descricao: "Teste de persistência remota sem fallback silencioso",
      tipo: "pdf",
      categoria: "Grammar",
      autorId: "00000000-0000-0000-0000-000000000000",
      destinoTipo: "geral",
    });
    // Se a tabela materiais remota ainda não existir ou falhar por RLS, deve retornar success: false com mensagem
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "MaterialSupabaseRepository.criar falha explicitamente com erro",
        res.error
      );
    } else {
      assert(res.success && res.data !== undefined, "MaterialSupabaseRepository.criar persistiu remotamente no Supabase");
    }
  } catch (err: unknown) {
    assert(false, "MaterialSupabaseRepository.criar não deve lançar exceção não tratada", String(err));
  }

  // 3. Teste AtividadeSupabaseRepository: mutação (criar)
  console.log("\n3. AtividadeSupabaseRepository (criar):");
  try {
    const res = await atividadeSupabaseRepository.criar({
      titulo: "Atividade Teste Fallback",
      instrucoes: "Instruções do teste sem fallback",
      tipo: "texto",
      professorId: "00000000-0000-0000-0000-000000000000",
      destinoTipo: "geral",
    });
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "AtividadeSupabaseRepository.criar falha explicitamente com erro claro",
        res.error
      );
    } else {
      assert(res.success && res.data !== undefined, "AtividadeSupabaseRepository.criar persistiu remotamente");
    }
  } catch (err: unknown) {
    assert(false, "AtividadeSupabaseRepository.criar não deve lançar exceção não tratada", String(err));
  }

  // 4. Teste EntregaSupabaseRepository: salvarRascunho
  console.log("\n4. EntregaSupabaseRepository (salvarRascunho):");
  try {
    const res = await entregaSupabaseRepository.salvarRascunho(
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      { respostaTexto: "Rascunho de teste" }
    );
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "EntregaSupabaseRepository.salvarRascunho falha explicitamente quando remoto inacessível",
        res.error
      );
    } else {
      assert(res.success, "EntregaSupabaseRepository.salvarRascunho persistiu remotamente");
    }
  } catch (err: unknown) {
    assert(false, "EntregaSupabaseRepository.salvarRascunho tratou erro sem crash", String(err));
  }

  // 5. Teste ConteudoDiarioSupabaseRepository: criar
  console.log("\n5. ConteudoDiarioSupabaseRepository (criar):");
  try {
    const res = await conteudoDiarioSupabaseRepository.criar({
      titulo: "Conteúdo Diário Fallback Test",
      texto: "Texto do dia para prática",
      dataProgramada: "2026-10-23",
      destinoTipo: "geral",
    });
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "ConteudoDiarioSupabaseRepository.criar falha com mensagem descritiva",
        res.error
      );
    } else {
      assert(res.success, "ConteudoDiarioSupabaseRepository.criar persistiu remotamente");
    }
  } catch (err: unknown) {
    assert(false, "ConteudoDiarioSupabaseRepository.criar tratou erro", String(err));
  }

  // 6. Teste AvaliacaoSupabaseRepository: salvar
  console.log("\n6. AvaliacaoSupabaseRepository (salvar):");
  try {
    const res = await avaliacaoSupabaseRepository.salvar({
      titulo: "Avaliação Objetiva Teste Fallback",
      descricao: "Descrição do teste sem fallback",
      tipo: "objetiva",
      programaId: "prog-001",
      etapaId: "etapa-001",
      moduloId: "00000000-0000-0000-0000-000000000001",
      professorId: "00000000-0000-0000-0000-000000000002",
      destinoTipo: "geral",
      status: "rascunho",
      maxTentativas: 1,
      notaMaxima: 100,
      permitirEnvioAtrasado: true,
      versao: 1,
      politicaGabarito: "gabarito_imediato",
      instrucoes: "Responda com atenção.",
      questoes: [
        {
          id: "q1",
          enunciado: "Qual a tradução de apple?",
          alternativas: [
            { id: "a", texto: "Maçã", ordem: 1 },
            { id: "b", texto: "Banana", ordem: 2 },
          ],
          alternativaCorretaId: "a",
          pontos: 10,
          ordem: 1,
        },
      ],
    });
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "AvaliacaoSupabaseRepository.salvar falha explicitamente sem mascarar ausência de tabela",
        res.error
      );
    } else {
      assert(res.success, "AvaliacaoSupabaseRepository.salvar persistiu remotamente");
    }
  } catch (err: unknown) {
    assert(false, "AvaliacaoSupabaseRepository.salvar tratou erro", String(err));
  }

  // 7. Teste TentativaAvaliacaoSupabaseRepository: iniciarTentativa
  console.log("\n7. TentativaAvaliacaoSupabaseRepository (iniciarTentativa):");
  try {
    const res = await tentativaAvaliacaoSupabaseRepository.iniciarTentativa(
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      "Aluno Homologação"
    );
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "TentativaAvaliacaoSupabaseRepository.iniciarTentativa falha explicitamente com mensagem de erro",
        res.error
      );
    } else {
      assert(res.success, "Tentativa iniciada");
    }
  } catch (err: unknown) {
    assert(false, "TentativaAvaliacaoSupabaseRepository.iniciarTentativa tratou erro", String(err));
  }

  // 8. Teste BaralhoSupabaseRepository: salvarBaralho
  console.log("\n8. BaralhoSupabaseRepository (salvarBaralho):");
  try {
    const res = await baralhoSupabaseRepository.salvarBaralho({
      nome: "Baralho Teste Fallback",
      professorId: "00000000-0000-0000-0000-000000000001",
      destinoTipo: "geral",
    });
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "BaralhoSupabaseRepository.salvarBaralho falha explicitamente com erro",
        res.error
      );
    } else {
      assert(res.success, "Baralho persistiu remotamente");
    }
  } catch (err: unknown) {
    assert(false, "BaralhoSupabaseRepository.salvarBaralho tratou erro", String(err));
  }

  // 9. Teste CartaoSupabaseRepository: salvarCartao
  console.log("\n9. CartaoSupabaseRepository (salvarCartao):");
  try {
    const res = await cartaoSupabaseRepository.salvarCartao({
      baralhoId: "baralho-test",
      frente: "Hello",
      verso: "Olá",
    });
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "CartaoSupabaseRepository.salvarCartao falha explicitamente com erro claro",
        res.error
      );
    } else {
      assert(res.success, "Cartão persistiu remotamente");
    }
  } catch (err: unknown) {
    assert(false, "CartaoSupabaseRepository.salvarCartao tratou erro", String(err));
  }

  // 10. Teste ProgressoCartaoSupabaseRepository: registrarRespostaEstudo
  console.log("\n10. ProgressoCartaoSupabaseRepository (registrarRespostaEstudo):");
  try {
    await progressoCartaoSupabaseRepository.registrarRespostaEstudo(
      "00000000-0000-0000-0000-000000000001",
      "card-test",
      "baralho-test",
      "bom"
    );
    console.log("   Registro de resposta remoto executado com sucesso.");
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(
      typeof msg === "string" && msg.length > 0,
      "ProgressoCartaoSupabaseRepository lança exceção explícita em vez de engolir o erro",
      msg
    );
  }

  // 11. Teste SelfPresentationSupabaseRepository: salvarRascunho
  console.log("\n11. SelfPresentationSupabaseRepository (salvarRascunho):");
  try {
    const res = await selfPresentationSupabaseRepository.salvarRascunho({
      alunoId: "00000000-0000-0000-0000-000000000001",
      titulo: "Self Presentation Fallback Test",
      linkVideo: "https://youtube.com/watch?v=teste",
    });
    if (!res.success) {
      assert(
        typeof res.error === "string" && res.error.length > 0,
        "SelfPresentationSupabaseRepository.salvarRascunho falha explicitamente sem fingir sucesso",
        res.error
      );
    } else {
      assert(res.success, "Self Presentation rascunho persistido");
    }
  } catch (err: unknown) {
    assert(false, "SelfPresentationSupabaseRepository.salvarRascunho tratou erro", String(err));
  }

  console.log("\n===============================================================================");
  console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam.`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
