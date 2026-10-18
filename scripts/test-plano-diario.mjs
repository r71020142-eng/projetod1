/**
 * test-plano-diario.mjs
 * Validação automatizada do motor determinístico do plano diário.
 */

import assert from "node:assert";
import { calcularPlanoDiario } from "../src/data/planoDiarioMotor.ts";

console.log("▶ Iniciando testes unitários do planoDiarioMotor...");

const agora = new Date("2026-10-18T10:00:00.000Z");

// Teste 1: Estado Vazio
{
  const resultado = calcularPlanoDiario({ alunoId: "alu-001", agora });
  assert.strictEqual(resultado.length, 0, "Deve retornar lista vazia quando não há pendências");
  console.log("✔ Teste 1 passou: Estado vazio tratado corretamente");
}

// Teste 2: Prioridade 1 (Item atrasado) deve vir antes de todos os outros
{
  const contexto = {
    alunoId: "alu-001",
    agora,
    atividades: [
      {
        id: "atv-atrasada",
        titulo: "Redação de Negócios",
        prazoEntrega: "2026-10-15T23:59:00.000Z", // Passado
        concluida: false,
      },
    ],
    proximaAula: {
      id: "aula-hoje",
      titulo: "Aula de Conversação",
      data: "2026-10-18",
      horario: "19:30",
      meetingUrl: "https://zoom.us/j/123",
    },
    flashcards: { revisoesHoje: 15, sequenciaDias: 5 },
    praticaDiaria: { id: "pratica-1", titulo: "Speaking Pill", concluida: false },
  };

  const resultado = calcularPlanoDiario(contexto);
  assert.strictEqual(resultado.length, 3, "Deve retornar no máximo 3 itens");
  assert.strictEqual(resultado[0].tipo, "item_atrasado", "Item atrasado deve ser prioridade 1");
  assert.strictEqual(resultado[1].tipo, "aula_proxima", "Aula nas próximas 24h deve ser prioridade 2");
  assert.strictEqual(resultado[2].tipo, "flashcards", "Flashcards vencidos devem ser prioridade 4");
  console.log("✔ Teste 2 passou: Prioridade estrita (Atrasado > Aula > Flashcards)");
}

// Teste 3: Limite máximo de 3 itens
{
  const contexto = {
    alunoId: "alu-001",
    agora,
    atividades: [
      { id: "atv-1", titulo: "Atv 1", prazoEntrega: "2026-10-10", concluida: false },
      { id: "atv-2", titulo: "Atv 2", prazoEntrega: "2026-10-11", concluida: false },
      { id: "atv-3", titulo: "Atv 3", prazoEntrega: "2026-10-12", concluida: false },
      { id: "atv-4", titulo: "Atv 4", prazoEntrega: "2026-10-13", concluida: false },
    ],
    proximaAula: { id: "a-1", titulo: "Aula", data: "2026-10-18", horario: "19:30" },
  };

  const resultado = calcularPlanoDiario(contexto);
  assert.strictEqual(resultado.length, 3, "Deve respeitar rigorosamente o limite de 3 itens");
  console.log("✔ Teste 3 passou: Limite de 3 itens respeitado");
}

// Teste 4: Prazo próximo (3-5 dias) e ausência de duplicatas
{
  const contexto = {
    alunoId: "alu-001",
    agora,
    atividades: [
      {
        id: "atv-proxima",
        titulo: "Pitch Executivo",
        prazoEntrega: "2026-10-20T23:59:00.000Z", // daqui a 2 dias
        concluida: false,
      },
    ],
    avaliacoesPendentes: [
      {
        id: "aval-1",
        titulo: "Checkpoint B1",
        prazo: "2026-10-21T23:59:00.000Z", // daqui a 3 dias
        tipo: "pratica",
      },
    ],
    flashcards: { revisoesHoje: 8, sequenciaDias: 3 },
  };

  const resultado = calcularPlanoDiario(contexto);
  assert.strictEqual(resultado.length, 3);
  assert.strictEqual(resultado[0].tipo, "prazo_proximo");
  assert.strictEqual(resultado[1].tipo, "prazo_proximo");
  assert.strictEqual(resultado[2].tipo, "flashcards");
  console.log("✔ Teste 4 passou: Prazos próximos agrupados e ordenados");
}

// Teste 5: Reenvio solicitado tem prioridade máxima
{
  const contexto = {
    alunoId: "alu-001",
    agora,
    atividades: [
      {
        id: "atv-reenvio",
        titulo: "Áudio de Pronúncia",
        reenvioSolicitado: true,
        concluida: false,
      },
    ],
    flashcards: { revisoesHoje: 5, sequenciaDias: 1 },
  };

  const resultado = calcularPlanoDiario(contexto);
  assert.strictEqual(resultado[0].tipo, "item_atrasado");
  assert.strictEqual(resultado[0].botaoTexto, "Reenviar");
  console.log("✔ Teste 5 passou: Reenvio solicitado tratado com urgência crítica");
}

console.log("🎉 Todos os testes unitários do planoDiarioMotor passaram com 100% de sucesso!");
