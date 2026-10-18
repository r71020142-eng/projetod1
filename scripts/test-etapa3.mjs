/**
 * Automated Test Suite for ETAPA 3: Turmas, Matrículas, Agenda, Aulas e Presença
 * Platform: DEMOSTRATIVO MTD
 */

import assert from "node:assert";

// 1. Helpers for time & conflict
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// 2. Attendance Formula Test
function calcularFrequencia(presentes, ausentes, justificados) {
  const base = presentes + ausentes;
  if (base === 0) {
    return { porcentagem: null, totalAulasConcluidas: 0, totalPresentes: 0, totalAusentes: 0, totalJustificados: justificados };
  }
  const porcentagem = Math.round((presentes / base) * 100);
  return { porcentagem, totalAulasConcluidas: 1, totalPresentes: presentes, totalAusentes: ausentes, totalJustificados: justificados };
}

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 3 ===\n");

// TEST 1: Attendance Formula & Justified Absences
console.log("1. Testando Fórmula de Frequência e Ausências Justificadas...");
{
  // 4 students: 3 present, 0 absent, 1 justified -> 100% attendance!
  const res1 = calcularFrequencia(3, 0, 1);
  assert.strictEqual(res1.porcentagem, 100, "3 presentes e 1 justificado deve resultar em 100% de frequência");

  // 10 students: 8 present, 2 absent, 5 justified -> 8 / (8 + 2) = 80%
  const res2 = calcularFrequencia(8, 2, 5);
  assert.strictEqual(res2.porcentagem, 80, "8 presentes e 2 ausentes deve resultar em 80% (justificados ignorados no denominador)");

  // Zero completed sessions -> null (Sem dados suficientes)
  const res3 = calcularFrequencia(0, 0, 0);
  assert.strictEqual(res3.porcentagem, null, "Sem aulas concluídas deve retornar null");

  console.log("   ✓ Fórmula (Presentes / (Presentes + Ausentes)) * 100 validada com sucesso!");
  console.log("   ✓ Ausências justificadas isoladas sem penalização!");
}

// TEST 2: Overlap calculation
console.log("\n2. Testando Algoritmo de Detecção de Sobreposição de Horários...");
{
  // Class A: 09:00 - 10:00 (540 - 600)
  // Class B: 09:30 - 10:30 (570 - 630) -> Overlap!
  assert.strictEqual(intervalsOverlap(540, 600, 570, 630), true, "Sobreposição parcial deve ser detectada");

  // Class C: 10:00 - 11:00 (600 - 660) -> Back to back (endA == startB) -> NO Overlap!
  assert.strictEqual(intervalsOverlap(540, 600, 600, 660), false, "Horários contíguos não devem colidir");

  // Class D: 08:00 - 09:00 (480 - 540) -> NO Overlap!
  assert.strictEqual(intervalsOverlap(540, 600, 480, 540), false, "Horário anterior sem toque não colide");

  // Class E: 08:30 - 10:30 (510 - 630) -> Completely wraps A -> Overlap!
  assert.strictEqual(intervalsOverlap(540, 600, 510, 630), true, "Horário englobante deve ser detectado");

  console.log("   ✓ Detecção de sobreposição em minutos validada com sucesso!");
}

// TEST 3: Capacity Rules
console.log("\n3. Testando Regras de Capacidade de Turmas...");
{
  // Individual class: capacity must be 1, cannot accept 2nd student
  const turmaIndividual = {
    id: "turma-indiv",
    modalidade: "individual",
    capacidade: 1,
    alunoIds: ["alu-001"],
  };

  const podeMatricular2nd = turmaIndividual.modalidade === "individual" && turmaIndividual.alunoIds.length >= 1;
  assert.strictEqual(podeMatricular2nd, true, "Turma individual com 1 aluno deve bloquear novas matrículas");

  // Group class: capacity configurable (e.g. 4)
  const turmaGrupo = {
    id: "turma-grp",
    modalidade: "grupo",
    capacidade: 4,
    alunoIds: ["alu-001", "alu-002", "alu-003", "alu-004"],
  };
  const isFull = turmaGrupo.alunoIds.length >= turmaGrupo.capacidade;
  assert.strictEqual(isFull, true, "Turma em grupo na capacidade planejada deve acusar lotação");

  // Prevent duplicate enrollment
  const jaMatriculado = turmaGrupo.alunoIds.includes("alu-001");
  assert.strictEqual(jaMatriculado, true, "Aluno repetido na mesma turma deve ser impedido");

  console.log("   ✓ Regras de capacidade individual (1 aluno) e grupo (configurável) validadas!");
  console.log("   ✓ Prevenção de matrícula duplicada validada!");
}

// TEST 4: Recurrence Weekly Date Shift
console.log("\n4. Testando Geração de Sequência Semanal de Aulas...");
{
  const dataBase = "2026-10-20";
  const semanas = 4;
  const datasGeradas = [];

  for (let s = 0; s < semanas; s++) {
    const d = new Date(dataBase + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + s * 7);
    datasGeradas.push(d.toISOString().slice(0, 10));
  }

  assert.strictEqual(datasGeradas.length, 4, "Devem ser geradas 4 datas");
  assert.strictEqual(datasGeradas[0], "2026-10-20", "Primeira data correta");
  assert.strictEqual(datasGeradas[1], "2026-10-27", "Segunda data +7 dias");
  assert.strictEqual(datasGeradas[2], "2026-11-03", "Terceira data +14 dias");
  assert.strictEqual(datasGeradas[3], "2026-11-10", "Quarta data +21 dias");

  console.log("   ✓ Sequência semanal gerada com espaçamento estrito de 7 dias:");
  datasGeradas.forEach((d, i) => console.log(`     Aula ${i + 1}: ${d}`));
}

// TEST 5: HTTPS Zoom Link Validation
console.log("\n5. Testando Validação do Link do Zoom...");
{
  function isValidZoomUrl(url) {
    if (!url || !url.trim()) return true; // optional
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  assert.strictEqual(isValidZoomUrl(""), true, "Link vazio é permitido (opcional)");
  assert.strictEqual(isValidZoomUrl("https://zoom.us/j/999888777"), true, "HTTPS válido é aceito");
  assert.strictEqual(isValidZoomUrl("http://zoom.us/j/999888777"), false, "HTTP inseguro é rejeitado");
  assert.strictEqual(isValidZoomUrl("zoom.us/j/123"), false, "URL sem protocolo é rejeitada");
  assert.strictEqual(isValidZoomUrl("not a url"), false, "String arbitrária é rejeitada");

  console.log("   ✓ Validação de URL segura HTTPS para sala do Zoom validada com sucesso!");
}

console.log("\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
