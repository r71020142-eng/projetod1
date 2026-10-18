/**
 * test-admin-pendencias.mjs
 * Validação automatizada do motor determinístico de pendências do admin.
 */

import assert from "node:assert";
import { calcularPendenciasAdmin } from "../src/data/adminPendenciasMotor.ts";

console.log("▶ Iniciando testes unitários do adminPendenciasMotor...");

const agora = new Date("2026-10-18T10:00:00.000Z");

// Teste 1: Estado Vazio
{
  const resultado = calcularPendenciasAdmin({ agora });
  assert.strictEqual(resultado.length, 0, "Deve retornar lista vazia quando não há pendências na escola");
  console.log("✔ Teste 1 passou: Estado vazio tratado corretamente");
}

// Teste 2: Prioridade 1 (Denúncia na Comunidade) deve vir antes de tudo
{
  const contexto = {
    agora,
    denunciasPendentesCount: 2,
    selfPresentationsAguardandoCount: 3,
    aulasProximasSemZoom: [
      { id: "aula-1", titulo: "Speaking B1", data: "2026-10-18", horario: "19:30" },
    ],
    modulosAguardandoValidacaoCount: 1,
    avaliacoesAguardandoCorrecaoCount: 4,
    entregasAguardandoCorrecaoCount: 5,
    placasAguardandoAnaliseCount: 1,
  };

  const resultado = calcularPendenciasAdmin(contexto);
  assert.strictEqual(resultado.length, 4, "Deve retornar no máximo 4 itens prioritários");
  assert.strictEqual(resultado[0].tipo, "denuncia_comunidade", "Denúncia deve ser prioridade 1");
  assert.strictEqual(resultado[1].tipo, "self_presentation_pendente", "Self Presentation deve ser prioridade 2");
  assert.strictEqual(resultado[2].tipo, "aula_sem_zoom", "Aula sem zoom deve ser prioridade 3");
  assert.strictEqual(resultado[3].tipo, "modulo_aguardando_validacao", "Validação de módulo deve ser prioridade 4");
  console.log("✔ Teste 2 passou: Prioridade estrita (Denúncia > Self Presentation > Zoom > Módulo)");
}

// Teste 3: Limite máximo de 4 itens
{
  const contexto = {
    agora,
    selfPresentationsAguardandoCount: 2,
    modulosAguardandoValidacaoCount: 3,
    avaliacoesAguardandoCorrecaoCount: 1,
    entregasAguardandoCorrecaoCount: 4,
    placasAguardandoAnaliseCount: 2,
  };

  const resultado = calcularPendenciasAdmin(contexto);
  assert.strictEqual(resultado.length, 4, "Deve respeitar o limite máximo de 4 itens");
  console.log("✔ Teste 3 passou: Limite de 4 itens respeitado");
}

console.log("🎉 Todos os testes unitários do adminPendenciasMotor passaram com 100% de sucesso!");
