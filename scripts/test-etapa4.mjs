/**
 * Automated Test Suite for ETAPA 4: Materiais, Atividades, Entregas e Feedback
 * & Correção Obrigatória da Etapa 3 (Presença com 4 estados)
 * Platform: DEMOSTRATIVO MTD
 */

import assert from "node:assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 4 ===\n");

// --------------------------------------------------------------------------
// TEST 1: CORREÇÃO OBRIGATÓRIA DA ETAPA 3 - STATUS DE PRESENÇA COM 4 ESTADOS
// --------------------------------------------------------------------------
console.log("1. Testando Correção Obrigatória da Presença (4 Estados)...");
{
  const estadosValidos = ["nao_registrado", "presente", "ausente", "justificado"];

  // Formula with 4 states
  function calcularFrequencia(registros) {
    let naoRegistrados = 0;
    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;

    for (const r of registros) {
      if (!estadosValidos.includes(r.status)) {
        throw new Error(`Estado de presença inválido: ${r.status}`);
      }
      if (r.status === "nao_registrado") naoRegistrados++;
      else if (r.status === "presente") presentes++;
      else if (r.status === "ausente") ausentes++;
      else if (r.status === "justificado") justificados++;
    }

    const baseCalculo = presentes + ausentes;
    const porcentagem = baseCalculo === 0 ? null : Math.round((presentes / baseCalculo) * 100);

    return {
      porcentagem,
      naoRegistrados,
      presentes,
      ausentes,
      justificados,
      baseCalculo,
      temPendencias: naoRegistrados > 0,
    };
  }

  // Initial roll-call must start with nao_registrado
  const novaChamada = [
    { alunoId: "alu-001", status: "nao_registrado" },
    { alunoId: "alu-002", status: "nao_registrado" },
    { alunoId: "alu-003", status: "nao_registrado" },
  ];
  const resInicio = calcularFrequencia(novaChamada);
  assert.strictEqual(resInicio.naoRegistrados, 3, "Toda nova chamada deve iniciar com 'nao_registrado'");
  assert.strictEqual(resInicio.porcentagem, null, "'Não registrado' não entra no cálculo da frequência");
  assert.strictEqual(resInicio.temPendencias, true, "Deve acusar registros pendentes");

  // Call with partial answers: 2 presentes, 1 ausente, 1 justificado, 1 nao_registrado
  const chamadaMista = [
    { alunoId: "alu-001", status: "presente" },
    { alunoId: "alu-002", status: "presente" },
    { alunoId: "alu-003", status: "ausente" },
    { alunoId: "alu-004", status: "justificado" },
    { alunoId: "alu-005", status: "nao_registrado" },
  ];
  const resMisto = calcularFrequencia(chamadaMista);
  // Base = 2 presentes + 1 ausente = 3
  // Porcentagem = 2 / 3 = 66.67% -> 67%
  assert.strictEqual(resMisto.baseCalculo, 3, "Base deve conter somente presentes + ausentes");
  assert.strictEqual(resMisto.porcentagem, 67, "Porcentagem calculada corretamente");
  assert.strictEqual(resMisto.justificados, 1, "Justificados separados");
  assert.strictEqual(resMisto.naoRegistrados, 1, "Não registrados isolados sem penalização");
  assert.strictEqual(resMisto.temPendencias, true, "Deve exigir confirmação se concluir com pendências");

  // Rule: Do NOT transform "nao_registrado" into "ausente"
  function concluirAula(registros, confirmarComPendencias) {
    const pendentes = registros.filter((r) => r.status === "nao_registrado");
    if (pendentes.length > 0 && !confirmarComPendencias) {
      throw new Error("Conclusão requer confirmação explícita de registros pendentes");
    }
    // Preserves status without altering to ausente
    return registros.map((r) => ({ ...r }));
  }

  assert.throws(
    () => concluirAula(chamadaMista, false),
    /confirmação explícita/,
    "Deve lançar erro ao concluir sem confirmação de pendências"
  );

  const concluidos = concluirAula(chamadaMista, true);
  const aindaNaoRegistrado = concluidos.find((r) => r.alunoId === "alu-005");
  assert.strictEqual(
    aindaNaoRegistrado.status,
    "nao_registrado",
    "Status 'nao_registrado' NUNCA deve ser convertido automaticamente para 'ausente'"
  );

  console.log("   ✓ 4 estados validados: nao_registrado, presente, ausente, justificado.");
  console.log("   ✓ 'Não registrado' isolado do cálculo.");
  console.log("   ✓ 'Justificado' não penaliza o percentual.");
  console.log("   ✓ Exigência de confirmação e preservação dos registros pendentes confirmadas!");
}

// --------------------------------------------------------------------------
// TEST 2: BIBLIOTECA DE MATERIAIS & REGRAS DE VISIBILIDADE / PRIVACIDADE
// --------------------------------------------------------------------------
console.log("\n2. Testando Regras de Visibilidade e Isolamento de Materiais...");
{
  const hoje = "2026-10-18";

  const materiaisMock = [
    {
      id: "mat-001",
      titulo: "Material Rascunho",
      status: "rascunho",
      destinoTipo: "geral",
      observacoesInternas: "Segredo de teste",
    },
    {
      id: "mat-002",
      titulo: "Material Agendado Futuro",
      status: "agendado",
      dataPublicacao: "2026-10-25",
      destinoTipo: "geral",
      observacoesInternas: "Segredo futuro",
    },
    {
      id: "mat-003",
      titulo: "Material Agendado Presente",
      status: "agendado",
      dataPublicacao: "2026-10-15",
      destinoTipo: "geral",
      observacoesInternas: "Nota interna",
    },
    {
      id: "mat-004",
      titulo: "Material Publicado Turma A",
      status: "publicado",
      destinoTipo: "turma",
      destinoId: "turma-A",
      observacoesInternas: "Nota da turma",
    },
    {
      id: "mat-005",
      titulo: "Material Publicado Turma B",
      status: "publicado",
      destinoTipo: "turma",
      destinoId: "turma-B",
    },
    {
      id: "mat-006",
      titulo: "Material Exclusivo Aluno 1",
      status: "publicado",
      destinoTipo: "aluno",
      destinoId: "alu-001",
    },
    {
      id: "mat-007",
      titulo: "Material Arquivado",
      status: "arquivado",
      destinoTipo: "geral",
    },
  ];

  function filtrarParaAluno(materiais, alunoId, turmasDoAluno, dataReferencia) {
    return materiais
      .filter((m) => {
        if (m.status === "rascunho" || m.status === "arquivado") return false;
        if (m.status === "agendado") {
          if (!m.dataPublicacao || m.dataPublicacao > dataReferencia) return false;
        }
        if (m.destinoTipo === "geral") return true;
        if (m.destinoTipo === "turma" && m.destinoId && turmasDoAluno.includes(m.destinoId)) {
          return true;
        }
        if (m.destinoTipo === "aluno" && m.destinoId === alunoId) {
          return true;
        }
        return false;
      })
      .map((m) => {
        // Privacy sanitize
        const copy = { ...m };
        delete copy.observacoesInternas;
        return copy;
      });
  }

  // Aluno 1 belongs to Turma A
  const visiveisAluno1 = filtrarParaAluno(materiaisMock, "alu-001", ["turma-A"], hoje);
  const idsVisiveis = visiveisAluno1.map((m) => m.id);

  assert.ok(!idsVisiveis.includes("mat-001"), "Rascunho não pode ser visível ao aluno");
  assert.ok(!idsVisiveis.includes("mat-002"), "Agendado futuro não pode ser visível ao aluno");
  assert.ok(idsVisiveis.includes("mat-003"), "Agendado no passado/hoje deve ser visível");
  assert.ok(idsVisiveis.includes("mat-004"), "Turma A deve ser visível para aluno matriculado");
  assert.ok(!idsVisiveis.includes("mat-005"), "Turma B NÃO deve ser visível para aluno da Turma A");
  assert.ok(idsVisiveis.includes("mat-006"), "Material direcionado ao aluno 1 deve ser visível");
  assert.ok(!idsVisiveis.includes("mat-007"), "Arquivado não pode ser visível ao aluno");

  // Sanitization check
  for (const item of visiveisAluno1) {
    assert.strictEqual(
      item.observacoesInternas,
      undefined,
      "Observações internas pedagógicas devem ser estritamente omitidas para o aluno"
    );
  }

  console.log("   ✓ Rascunhos e futuros agendados estritamente ocultos.");
  console.log("   ✓ Isolamento por turma e por aluno individual validado com sucesso.");
  console.log("   ✓ Higienização e privacidade de observações internas confirmadas!");
}

// --------------------------------------------------------------------------
// TEST 3: ENTREGAS DE ATIVIDADES, PRAZOS E REGRAS DE ATRASO
// --------------------------------------------------------------------------
console.log("\n3. Testando Ciclo de Entrega de Atividades e Prazos...");
{
  const atividadeComAtraso = {
    id: "atv-001",
    titulo: "Atividade Flexível",
    prazoEntrega: "2026-10-10T23:59:00Z", // Past date
    permitirAtraso: true,
  };

  const atividadeSemAtraso = {
    id: "atv-002",
    titulo: "Atividade Rígida",
    prazoEntrega: "2026-10-10T23:59:00Z", // Past date
    permitirAtraso: false,
  };

  function submeterEntrega(atividade, payload, dataAtual = new Date()) {
    const prazo = atividade.prazoEntrega ? new Date(atividade.prazoEntrega) : null;
    const isAtrasada = prazo ? dataAtual.getTime() > prazo.getTime() : false;

    if (isAtrasada && !atividade.permitirAtraso) {
      throw new Error("O prazo para esta atividade encerrou e ela não permite envios após a data limite.");
    }

    if (!payload.respostaTexto?.trim() && !payload.respostaLink?.trim()) {
      throw new Error("É necessário fornecer uma resposta textual ou um link para submissão.");
    }

    return {
      id: "ent-test",
      atividadeId: atividade.id,
      alunoId: payload.alunoId,
      respostaTexto: payload.respostaTexto?.trim() || null,
      respostaLink: payload.respostaLink?.trim() || null,
      status: isAtrasada ? "atrasada" : "entregue",
      dataEnvio: dataAtual.toISOString(),
    };
  }

  // 1. Submit after deadline on flexible activity -> status 'atrasada'
  const resFlex = submeterEntrega(
    atividadeComAtraso,
    { alunoId: "alu-001", respostaTexto: "Minha resposta atrasada" },
    new Date("2026-10-18T10:00:00Z")
  );
  assert.strictEqual(resFlex.status, "atrasada", "Entrega após prazo com atraso permitido deve ter status 'atrasada'");

  // 2. Submit after deadline on strict activity -> throws error
  assert.throws(
    () =>
      submeterEntrega(
        atividadeSemAtraso,
        { alunoId: "alu-001", respostaTexto: "Tentativa atrasada" },
        new Date("2026-10-18T10:00:00Z")
      ),
    /não permite envios após a data limite/,
    "Atividade rígida deve bloquear envio após o prazo"
  );

  // 3. Submit on time -> status 'entregue'
  const resNoPrazo = submeterEntrega(
    atividadeSemAtraso,
    { alunoId: "alu-001", respostaTexto: "Entregue no prazo correto" },
    new Date("2026-10-05T10:00:00Z")
  );
  assert.strictEqual(resNoPrazo.status, "entregue", "Entrega dentro do prazo deve ter status 'entregue'");

  console.log("   ✓ Entrega no prazo gera status 'entregue'.");
  console.log("   ✓ Entrega tardia permitida gera status 'atrasada'.");
  console.log("   ✓ Entrega tardia bloqueada impede submissão com erro claro!");
}

// --------------------------------------------------------------------------
// TEST 4: CORREÇÃO, NOTAS E HISTÓRICO DE REENVIOS (HISTORICOENVIOS)
// --------------------------------------------------------------------------
console.log("\n4. Testando Correção, Feedback e Histórico de Reenvios...");
{
  let entrega = {
    id: "ent-001",
    atividadeId: "atv-001",
    alunoId: "alu-001",
    respostaTexto: "Primeira versão do Pitch pessoal.",
    respostaLink: "https://drive.google.com/pitch-v1",
    status: "entregue",
    dataEnvio: "2026-10-15T14:00:00Z",
    historicoEnvios: [],
  };

  // Teacher asks for resubmission with guidance
  function solicitarReenvio(ent, motivo, professorNome) {
    if (!motivo || motivo.trim().length === 0) {
      throw new Error("Motivo da solicitação de reenvio é obrigatório.");
    }

    const versaoAnterior = {
      versao: (ent.historicoEnvios?.length || 0) + 1,
      respostaTexto: ent.respostaTexto,
      respostaLink: ent.respostaLink,
      dataEnvio: ent.dataEnvio || new Date().toISOString(),
      feedback: ent.feedback || null,
      motivoReenvio: motivo,
    };

    return {
      ...ent,
      status: "reenviar",
      motivoReenvio: motivo,
      corrigidoPor: professorNome,
      historicoEnvios: [...(ent.historicoEnvios || []), versaoAnterior],
    };
  }

  const entregaComReenvio = solicitarReenvio(
    entrega,
    "Favor incluir 3 linked sounds no segundo parágrafo conforme o Método Paulo.",
    "Lucas Ferreira"
  );

  assert.strictEqual(entregaComReenvio.status, "reenviar");
  assert.strictEqual(entregaComReenvio.historicoEnvios.length, 1, "Histórico deve preservar 1 versão anterior");
  assert.strictEqual(
    entregaComReenvio.historicoEnvios[0].respostaTexto,
    "Primeira versão do Pitch pessoal."
  );
  assert.strictEqual(
    entregaComReenvio.historicoEnvios[0].motivoReenvio,
    "Favor incluir 3 linked sounds no segundo parágrafo conforme o Método Paulo."
  );

  // Student resubmits
  function reenviar(ent, novaResposta) {
    return {
      ...ent,
      respostaTexto: novaResposta.texto,
      respostaLink: novaResposta.link || null,
      status: "entregue",
      dataEnvio: new Date().toISOString(),
    };
  }

  const entregaAtualizada = reenviar(entregaComReenvio, {
    texto: "Segunda versão do Pitch pessoal com 3 linked sounds revisados.",
    link: "https://drive.google.com/pitch-v2",
  });

  assert.strictEqual(entregaAtualizada.status, "entregue");
  assert.strictEqual(entregaAtualizada.historicoEnvios.length, 1, "Histórico deve ser preservado após novo envio");

  // Teacher gives final grade
  function corrigir(ent, nota, feedback, professorNome) {
    if (nota < 0 || nota > 100) throw new Error("Nota deve ser entre 0 e 100");
    if (!feedback || feedback.trim().length === 0) throw new Error("Feedback pedagógico é obrigatório");

    return {
      ...ent,
      status: "corrigida",
      nota,
      feedback,
      corrigidoPor: professorNome,
      dataCorrecao: new Date().toISOString(),
    };
  }

  const entregaCorrigida = corrigir(
    entregaAtualizada,
    95,
    "Excelente correção! A articulação dos connected speech ficou perfeita.",
    "Lucas Ferreira"
  );

  assert.strictEqual(entregaCorrigida.status, "corrigida");
  assert.strictEqual(entregaCorrigida.nota, 95);
  assert.strictEqual(entregaCorrigida.historicoEnvios.length, 1);

  console.log("   ✓ Solicitação de reenvio altera status para 'reenviar'.");
  console.log("   ✓ Histórico de versões anteriores rigorosamente retido em historicoEnvios.");
  console.log("   ✓ Atribuição de nota (0-100) e feedback pedagógico validados!");
}

// --------------------------------------------------------------------------
// TEST 5: VALIDAÇÕES DE SEGURANÇA E PROTOCOLO HTTPS
// --------------------------------------------------------------------------
console.log("\n5. Testando Validações de Links Seguros (HTTPS)...");
{
  const HTTPS_REGEX = /^https:\/\/[^\s$.?#].[^\s]*$/i;

  assert.ok(HTTPS_REGEX.test("https://zoom.us/j/123456789"));
  assert.ok(HTTPS_REGEX.test("https://docs.google.com/document/d/xyz"));
  assert.ok(!HTTPS_REGEX.test("http://zoom.us/insecure"), "HTTP simples deve ser rejeitado");
  assert.ok(!HTTPS_REGEX.test("zoom.us/no-protocol"), "Link sem protocolo deve ser rejeitado");
  assert.ok(!HTTPS_REGEX.test("ftp://arquivo.com"), "FTP deve ser rejeitado");

  console.log("   ✓ Requisito de protocolo seguro HTTPS estritamente validado!");
}

console.log("\n============================================================");
console.log("✓ TODOS OS TESTES DA ETAPA 4 FORAM CONCLUÍDOS COM 100% DE SUCESSO!");
console.log("============================================================\n");
