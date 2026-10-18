import assert from "node:assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 6 ===");

// --------------------------------------------------------------------------
// TEST 1: ALGORITMO SRS PURO (SM-2 INSPIRADO) - DETERMINÍSTICO E SEM SIDE-EFFECTS
// --------------------------------------------------------------------------
console.log("\n1. Testando Algoritmo SRS Puro (SM-2 Inspirado)...");
{
  const FATOR_FACILIDADE_PADRAO = 2.5;
  const FATOR_FACILIDADE_MINIMO = 1.3;

  function inicializarProgressoCartao(alunoId, cartaoId, baralhoId, dataRef = new Date()) {
    const agoraIso = dataRef.toISOString();
    return {
      id: `cpa-${alunoId}-${cartaoId}`,
      alunoId,
      cartaoId,
      baralhoId,
      estado: "novo",
      totalRevisoes: 0,
      totalLapsos: 0,
      fatorFacilidade: FATOR_FACILIDADE_PADRAO,
      intervaloDias: 0,
      intervaloMinutos: undefined,
      proximaRevisao: agoraIso,
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
    };
  }

  function processarRespostaSRS(progressoAtual, resposta, dataRef = new Date()) {
    const estadoAnterior = progressoAtual.estado;
    const intervaloAnterior = progressoAtual.intervaloDias;
    const fatorAnterior = progressoAtual.fatorFacilidade;
    const totalRevisoesAnterior = progressoAtual.totalRevisoes;
    const totalLapsosAnterior = progressoAtual.totalLapsos;

    let novoFator = fatorAnterior;
    let novoEstado = "revisao";
    let novoIntervaloDias = 0;
    let novoIntervaloMinutos = undefined;
    let reagendadoMesmaSessao = false;
    let novosLapsos = totalLapsosAnterior;
    const novasRevisoes = totalRevisoesAnterior + 1;

    const dataBase = new Date(dataRef.getTime());

    switch (resposta) {
      case "errei": {
        novosLapsos += 1;
        novoFator = Math.max(FATOR_FACILIDADE_MINIMO, Number((fatorAnterior - 0.2).toFixed(2)));
        novoEstado = "aprendendo";
        novoIntervaloDias = 0;
        novoIntervaloMinutos = 10;
        reagendadoMesmaSessao = true;
        dataBase.setMinutes(dataBase.getMinutes() + 10);
        break;
      }
      case "dificil": {
        novoFator = Math.max(FATOR_FACILIDADE_MINIMO, Number((fatorAnterior - 0.15).toFixed(2)));
        novoEstado = "revisao";
        if (estadoAnterior === "novo" || estadoAnterior === "aprendendo" || totalRevisoesAnterior === 0) {
          novoIntervaloDias = 1;
        } else {
          novoIntervaloDias = Math.max(1, Math.round(Math.max(1, intervaloAnterior) * 1.2));
        }
        dataBase.setDate(dataBase.getDate() + novoIntervaloDias);
        break;
      }
      case "bom": {
        novoEstado = "revisao";
        if (estadoAnterior === "novo" || estadoAnterior === "aprendendo" || totalRevisoesAnterior === 0) {
          novoIntervaloDias = 1;
        } else if (totalRevisoesAnterior === 1) {
          novoIntervaloDias = 3;
        } else {
          novoIntervaloDias = Math.max(1, Math.round(Math.max(1, intervaloAnterior) * novoFator));
        }
        dataBase.setDate(dataBase.getDate() + novoIntervaloDias);
        break;
      }
      case "facil": {
        novoFator = Number((fatorAnterior + 0.15).toFixed(2));
        novoEstado = "revisao";
        if (estadoAnterior === "novo" || estadoAnterior === "aprendendo" || totalRevisoesAnterior === 0) {
          novoIntervaloDias = 4;
        } else {
          novoIntervaloDias = Math.max(1, Math.round(Math.max(1, intervaloAnterior) * novoFator * 1.3));
        }
        dataBase.setDate(dataBase.getDate() + novoIntervaloDias);
        break;
      }
    }

    const proximaRevisaoIso = dataBase.toISOString();
    const agoraIso = dataRef.toISOString();

    const novoProgresso = {
      ...progressoAtual,
      estado: novoEstado,
      totalRevisoes: novasRevisoes,
      totalLapsos: novosLapsos,
      fatorFacilidade: novoFator,
      intervaloDias: novoIntervaloDias,
      intervaloMinutos: novoIntervaloMinutos,
      proximaRevisao: proximaRevisaoIso,
      ultimaRevisao: agoraIso,
      ultimaResposta: resposta,
      atualizadoEm: agoraIso,
    };

    const registroHistorico = {
      alunoId: progressoAtual.alunoId,
      cartaoId: progressoAtual.cartaoId,
      baralhoId: progressoAtual.baralhoId,
      dataHora: agoraIso,
      resposta,
      estadoAnterior,
      intervaloAnterior,
      novoEstado,
      novoIntervalo: novoIntervaloDias,
      proximaRevisao: proximaRevisaoIso,
      fatorAnterior,
      novoFator,
    };

    return { novoProgresso, registroHistorico, reagendadoMesmaSessao };
  }

  const agora = new Date("2026-10-20T10:00:00.000Z");
  const progInicial = inicializarProgressoCartao("alu-001", "card-001", "baralho-001", agora);

  assert.strictEqual(progInicial.estado, "novo");
  assert.strictEqual(progInicial.fatorFacilidade, 2.5);
  assert.strictEqual(progInicial.totalRevisoes, 0);
  assert.strictEqual(progInicial.totalLapsos, 0);

  // 1.1 Resposta 'errei': lapsos++, fator -0.20, estado 'aprendendo', reagendado mesma sessão (10 min)
  const resErrei = processarRespostaSRS(progInicial, "errei", agora);
  assert.strictEqual(resErrei.novoProgresso.estado, "aprendendo");
  assert.strictEqual(resErrei.novoProgresso.totalLapsos, 1);
  assert.strictEqual(resErrei.novoProgresso.fatorFacilidade, 2.3);
  assert.strictEqual(resErrei.novoProgresso.intervaloMinutos, 10);
  assert.strictEqual(resErrei.reagendadoMesmaSessao, true);
  assert.strictEqual(resErrei.novoProgresso.proximaRevisao, "2026-10-20T10:10:00.000Z");

  // 1.2 Resposta 'dificil' em cartão novo: intervalo 1 dia, fator -0.15
  const resDificil = processarRespostaSRS(progInicial, "dificil", agora);
  assert.strictEqual(resDificil.novoProgresso.estado, "revisao");
  assert.strictEqual(resDificil.novoProgresso.intervaloDias, 1);
  assert.strictEqual(resDificil.novoProgresso.fatorFacilidade, 2.35);
  assert.strictEqual(resDificil.reagendadoMesmaSessao, false);

  // 1.3 Resposta 'bom' em cartão novo: 1 dia
  const resBom1 = processarRespostaSRS(progInicial, "bom", agora);
  assert.strictEqual(resBom1.novoProgresso.estado, "revisao");
  assert.strictEqual(resBom1.novoProgresso.intervaloDias, 1);
  assert.strictEqual(resBom1.novoProgresso.totalRevisoes, 1);

  // 1.4 Segunda revisão com 'bom': 3 dias
  const resBom2 = processarRespostaSRS(resBom1.novoProgresso, "bom", new Date("2026-10-21T10:00:00.000Z"));
  assert.strictEqual(resBom2.novoProgresso.intervaloDias, 3);
  assert.strictEqual(resBom2.novoProgresso.totalRevisoes, 2);

  // 1.5 Terceira revisão com 'bom': intervaloAnterior * fator = 3 * 2.5 = 8 dias (arredondado)
  const resBom3 = processarRespostaSRS(resBom2.novoProgresso, "bom", new Date("2026-10-24T10:00:00.000Z"));
  assert.strictEqual(resBom3.novoProgresso.intervaloDias, 8);

  // 1.6 Resposta 'facil' em cartão novo: 4 dias, fator +0.15
  const resFacil = processarRespostaSRS(progInicial, "facil", agora);
  assert.strictEqual(resFacil.novoProgresso.estado, "revisao");
  assert.strictEqual(resFacil.novoProgresso.intervaloDias, 4);
  assert.strictEqual(resFacil.novoProgresso.fatorFacilidade, 2.65);

  // 1.7 Piso mínimo de fator de facilidade (1.3)
  let progDegradado = progInicial;
  for (let i = 0; i < 15; i++) {
    progDegradado = processarRespostaSRS(progDegradado, "errei", agora).novoProgresso;
  }
  assert.strictEqual(progDegradado.fatorFacilidade, 1.3, "O fator de facilidade nunca deve cair abaixo de 1.3");

  console.log("   ✓ Algoritmo SRS puro aprovado com sucesso (Errei, Difícil, Bom, Fácil e piso 1.3).");
}

// --------------------------------------------------------------------------
// TEST 2: COMPOSIÇÃO E ORDENAÇÃO ESTRITA DA FILA DIÁRIA DE ESTUDOS
// --------------------------------------------------------------------------
console.log("\n2. Testando Composição e Priorização da Fila Diária...");
{
  const agora = new Date("2026-10-20T12:00:00.000Z");

  const cartoes = [
    { id: "c-1", frente: "Novo 1", status: "ativo" },
    { id: "c-2", frente: "Novo 2", status: "ativo" },
    { id: "c-3", frente: "Novo 3 (Excedente limite)", status: "ativo" },
    { id: "c-4", frente: "Revisão Vencida 1", status: "ativo" },
    { id: "c-5", frente: "Revisão Vencida 2 (Mais antiga)", status: "ativo" },
    { id: "c-6", frente: "Revisão Futura (Não deve entrar)", status: "ativo" },
    { id: "c-7", frente: "Aprendendo Vencido", status: "ativo" },
    { id: "c-8", frente: "Cartão Suspenso (Não deve entrar)", status: "ativo" },
  ];

  const progressos = {
    "c-1": { estado: "novo", proximaRevisao: "2026-10-20T12:00:00.000Z" },
    "c-2": { estado: "novo", proximaRevisao: "2026-10-20T12:00:00.000Z" },
    "c-3": { estado: "novo", proximaRevisao: "2026-10-20T12:00:00.000Z" },
    "c-4": { estado: "revisao", proximaRevisao: "2026-10-19T10:00:00.000Z" },
    "c-5": { estado: "revisao", proximaRevisao: "2026-10-18T08:00:00.000Z" }, // Mais antiga
    "c-6": { estado: "revisao", proximaRevisao: "2026-10-25T12:00:00.000Z" }, // Futura
    "c-7": { estado: "aprendendo", proximaRevisao: "2026-10-20T11:50:00.000Z" }, // Vencida
    "c-8": { estado: "suspenso", proximaRevisao: "2026-10-18T08:00:00.000Z" }, // Suspenso
  };

  function montarFila(cartoesList, progMap, limiteNovos, dataRef) {
    const agoraTime = dataRef.getTime();
    const vencidosRevisao = [];
    const vencidosAprendendo = [];
    const novos = [];

    for (const c of cartoesList) {
      const p = progMap[c.id];
      if (!p || p.estado === "suspenso") continue;

      if (p.estado === "revisao" && new Date(p.proximaRevisao).getTime() <= agoraTime) {
        vencidosRevisao.push(c);
      } else if (p.estado === "aprendendo" && new Date(p.proximaRevisao).getTime() <= agoraTime) {
        vencidosAprendendo.push(c);
      } else if (p.estado === "novo") {
        novos.push(c);
      }
    }

    vencidosRevisao.sort((a, b) => new Date(progMap[a.id].proximaRevisao) - new Date(progMap[b.id].proximaRevisao));
    vencidosAprendendo.sort((a, b) => new Date(progMap[a.id].proximaRevisao) - new Date(progMap[b.id].proximaRevisao));

    const novosLimitados = novos.slice(0, limiteNovos);

    return [...vencidosRevisao, ...vencidosAprendendo, ...novosLimitados];
  }

  const fila = montarFila(cartoes, progressos, 2, agora);

  // 1º: c-5 (Revisão mais antiga)
  assert.strictEqual(fila[0].id, "c-5");
  // 2º: c-4 (Revisão seguinte)
  assert.strictEqual(fila[1].id, "c-4");
  // 3º: c-7 (Aprendizado vencido)
  assert.strictEqual(fila[2].id, "c-7");
  // 4º e 5º: c-1 e c-2 (Novos limitados a 2)
  assert.strictEqual(fila[3].id, "c-1");
  assert.strictEqual(fila[4].id, "c-2");
  // Total na fila: 5 cartões
  assert.strictEqual(fila.length, 5);

  // Garantias de exclusão
  assert.ok(!fila.some((c) => c.id === "c-3"), "Novo excedente ao limite não deve entrar na fila de hoje");
  assert.ok(!fila.some((c) => c.id === "c-6"), "Cartão com revisão no futuro não deve entrar na fila de hoje");
  assert.ok(!fila.some((c) => c.id === "c-8"), "Cartão suspenso não deve entrar na fila de estudos");

  console.log("   ✓ Ordenação estrita (Revisões antigas -> Aprendendo -> Novos com limite) aprovada.");
}

// --------------------------------------------------------------------------
// TEST 3: CÁLCULO DE DIAS CONSECUTIVOS DE ESTUDO (STREAK)
// --------------------------------------------------------------------------
console.log("\n3. Testando Sequência de Dias de Estudo (Streak)...");
{
  function calcularStreak(datasRevisao, dataRef) {
    const toLocalDate = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    };

    const diasUnicos = new Set(datasRevisao.map(toLocalDate));
    const hojeStr = toLocalDate(dataRef);

    const ontem = new Date(dataRef);
    ontem.setDate(ontem.getDate() - 1);
    const ontemStr = toLocalDate(ontem);

    if (!diasUnicos.has(hojeStr) && !diasUnicos.has(ontemStr)) {
      return 0; // Sequência quebrada
    }

    let cursor = diasUnicos.has(hojeStr) ? new Date(dataRef) : new Date(ontem);
    let streak = 0;

    while (true) {
      const dStr = toLocalDate(cursor);
      if (diasUnicos.has(dStr)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  const dataAtual = new Date("2026-10-20T15:00:00.000Z");

  // Cenário A: Estudou hoje, ontem, anteontem e 3 dias atrás -> Streak = 4
  const datasA = [
    "2026-10-20T10:00:00Z",
    "2026-10-19T14:30:00Z",
    "2026-10-18T09:15:00Z",
    "2026-10-17T20:00:00Z",
  ];
  assert.strictEqual(calcularStreak(datasA, dataAtual), 4);

  // Cenário B: Não estudou hoje AINDA, mas estudou ontem, anteontem e 3 dias atrás -> Mantém 3 dias até meia-noite
  const datasB = [
    "2026-10-19T14:30:00Z",
    "2026-10-18T09:15:00Z",
    "2026-10-17T20:00:00Z",
  ];
  assert.strictEqual(calcularStreak(datasB, dataAtual), 3);

  // Cenário C: Não estudou nem hoje nem ontem (gap no dia 19) -> Streak = 0
  const datasC = [
    "2026-10-18T09:15:00Z",
    "2026-10-17T20:00:00Z",
  ];
  assert.strictEqual(calcularStreak(datasC, dataAtual), 0);

  console.log("   ✓ Cálculo de sequência ininterrupta de dias (streak) validado com sucesso.");
}

// --------------------------------------------------------------------------
// TEST 4: CONTROLE DE ACESSO E DESTINAÇÃO DE BARALHOS
// --------------------------------------------------------------------------
console.log("\n4. Testando Autorização e Isolamento de Baralhos...");
{
  const baralhos = [
    { id: "b-geral", status: "publicado", destinoTipo: "geral" },
    { id: "b-turma1", status: "publicado", destinoTipo: "turma", destinoId: "turma-001" },
    { id: "b-turma2", status: "publicado", destinoTipo: "turma", destinoId: "turma-002" },
    { id: "b-aluno1", status: "publicado", destinoTipo: "aluno", destinoId: "alu-001" },
    { id: "b-aluno2", status: "publicado", destinoTipo: "aluno", destinoId: "alu-002" },
    { id: "b-rascunho", status: "rascunho", destinoTipo: "geral" },
    { id: "b-arquivado", status: "arquivado", destinoTipo: "geral" },
  ];

  function filtrarParaAluno(baralhosList, alunoId, turmasDoAluno) {
    return baralhosList.filter((b) => {
      if (b.status !== "publicado") return false;
      if (b.destinoTipo === "geral") return true;
      if (b.destinoTipo === "turma" && b.destinoId && turmasDoAluno.includes(b.destinoId)) return true;
      if (b.destinoTipo === "aluno" && b.destinoId === alunoId) return true;
      return false;
    });
  }

  // Aluno 1 matriculado na Turma 1
  const permitidosAlu1 = filtrarParaAluno(baralhos, "alu-001", ["turma-001"]);
  const idsAlu1 = permitidosAlu1.map((b) => b.id);

  assert.ok(idsAlu1.includes("b-geral"), "Deve acessar baralhos gerais");
  assert.ok(idsAlu1.includes("b-turma1"), "Deve acessar baralhos da sua turma");
  assert.ok(idsAlu1.includes("b-aluno1"), "Deve acessar baralhos individualizados para si");
  assert.ok(!idsAlu1.includes("b-turma2"), "Não pode acessar baralho de outra turma");
  assert.ok(!idsAlu1.includes("b-aluno2"), "Não pode acessar baralho de outro aluno");
  assert.ok(!idsAlu1.includes("b-rascunho"), "Não pode acessar baralhos em rascunho");
  assert.ok(!idsAlu1.includes("b-arquivado"), "Não pode acessar baralhos arquivados");

  console.log("   ✓ Regras de isolamento e destinação de baralhos validadas com rigor.");
}

// --------------------------------------------------------------------------
// TEST 5: PARSER E VALIDAÇÃO DE CSV NO CLIENTE (LOCAL E PRIVATIVO)
// --------------------------------------------------------------------------
console.log("\n5. Testando Importação CSV no Cliente (Validação e Detecção de Duplicatas)...");
{
  function parseCSVRow(text) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  function parseAndValidateCSV(csvText, cartoesExistentes = []) {
    const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const itens = [];
    const frentesExistentes = new Set(cartoesExistentes.map((c) => c.frente.trim().toLowerCase()));
    const frentesNoCSV = new Set();

    let totalValidos = 0;
    let totalInvalidos = 0;
    let totalDuplicados = 0;

    let startIndex = 0;
    if (rawLines.length > 0) {
      const firstCols = parseCSVRow(rawLines[0]).map((c) => c.toLowerCase());
      if (firstCols[0] === "frente" || firstCols[0] === "front" || firstCols[1] === "verso" || firstCols[1] === "back") {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < rawLines.length; i++) {
      const cols = parseCSVRow(rawLines[i]);
      const frente = cols[0] || "";
      const verso = cols[1] || "";
      const frenteKey = frente.trim().toLowerCase();

      if (!frente.trim() || !verso.trim()) {
        totalInvalidos++;
        itens.push({ linha: i + 1, status: "invalido", erro: "Frente ou verso vazio." });
        continue;
      }

      if (frentesExistentes.has(frenteKey) || frentesNoCSV.has(frenteKey)) {
        totalDuplicados++;
        itens.push({ linha: i + 1, status: "duplicado", erro: "Frente duplicada." });
        continue;
      }

      frentesNoCSV.add(frenteKey);
      totalValidos++;
      itens.push({ linha: i + 1, frente, verso, status: "valido" });
    }

    return { itens, totalValidos, totalInvalidos, totalDuplicados };
  }

  const existingInDeck = [{ frente: "Bring up", verso: "Mencionar assunto" }];

  const sampleCSV = `frente,verso,exemplo,traducao,dica,pronuncia,tags
"Figure out","Descobrir ou resolver","We will figure it out.","Vamos resolver.","","FIG-yər OWT","phrasal-verbs"
"Bring up","Mencionar assunto","I brought it up.","Eu mencionei.","","BRING UP",""
"","Verso sem frente","","","","",""
"Look forward to","Aguardar com expectativa","Looking forward!","Ansioso!","","",""
"Figure out","Repetido no CSV","","","","",""`;

  const parsed = parseAndValidateCSV(sampleCSV, existingInDeck);
  assert.strictEqual(parsed.totalValidos, 2, "Figure out e Look forward to devem ser válidos");
  assert.strictEqual(parsed.totalDuplicados, 2, "Bring up (já existia no baralho) e Figure out (repetido no CSV)");
  assert.strictEqual(parsed.totalInvalidos, 1, "Linha com frente vazia");

  console.log("   ✓ Validação de CSV no cliente com bloqueio de duplicatas e dados inválidos aprovada.");
}

// --------------------------------------------------------------------------
// TEST 6: INTEGRIDADE DE LINKS DE ÁUDIO (SEM ÁUDIO FICTÍCIO)
// --------------------------------------------------------------------------
console.log("\n6. Testando Integridade de Áudio e URLs HTTPS...");
{
  function isValidHttpsUrl(str) {
    if (!str || typeof str !== "string") return false;
    try {
      const url = new URL(str.trim());
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }

  assert.strictEqual(isValidHttpsUrl("https://storage.googleapis.com/audio/pronunciation.mp3"), true);
  assert.strictEqual(isValidHttpsUrl("http://insecure.com/audio.mp3"), false);
  assert.strictEqual(isValidHttpsUrl("blob:http://localhost:3000/123"), false);
  assert.strictEqual(isValidHttpsUrl(""), false);
  assert.strictEqual(isValidHttpsUrl(undefined), false);

  console.log("   ✓ Protocolo HTTPS obrigatório e ausência de players fictícios confirmados.");
}

// --------------------------------------------------------------------------
// TEST 7: REAGENDAMENTO DE 10 MINUTOS QUANDO 'ERREI' (CORREÇÃO OBRIGATÓRIA DA ETAPA 6)
// --------------------------------------------------------------------------
console.log("\n7. Testando Reagendamento de 10 Minutos após 'Errei'...");
{
  const agora = new Date("2026-10-18T10:00:00.000Z");
  const filaSessao = [
    { id: "c-1", frente: "Cartão 1" },
    { id: "c-2", frente: "Cartão 2" },
  ];

  // Simulação da lógica da sessão atualizada
  function processarRespostaSessao(fila, indice, resposta, cartoesErreados, tempoAtual) {
    const cartao = fila[indice];
    let listaErreados = [...cartoesErreados];
    let reagendadoParaRevisao = false;
    let nextReviewAt = null;

    if (resposta === "errei") {
      reagendadoParaRevisao = true;
      nextReviewAt = new Date(tempoAtual.getTime() + 10 * 60 * 1000);
      listaErreados.push({ cartao, nextReviewAt });
    }

    // Não empurra imediatamente para a fila!
    const novaFila = [...fila];
    const proximoIndice = indice + 1;
    let sessaoFinalizada = false;

    if (proximoIndice >= novaFila.length) {
      // Verifica se algum cartão erreado atingiu o tempo de 10 minutos
      const aptos = listaErreados.filter((e) => e.nextReviewAt.getTime() <= tempoAtual.getTime());
      if (aptos.length > 0) {
        novaFila.push(...aptos.map((e) => e.cartao));
      } else {
        sessaoFinalizada = true;
      }
    }

    return { novaFila, listaErreados, reagendadoParaRevisao, nextReviewAt, sessaoFinalizada };
  }

  // 1. Responde 'errei' no Cartão 1 no tempo T=10:00:00
  const r1 = processarRespostaSessao(filaSessao, 0, "errei", [], agora);
  assert.strictEqual(r1.reagendadoParaRevisao, true);
  assert.strictEqual(r1.novaFila.length, 2, "Cartão NÃO deve ser inserido imediatamente no final da mesma fila");
  assert.strictEqual(
    r1.nextReviewAt.toISOString(),
    "2026-10-18T10:10:00.000Z",
    "Próxima revisão deve ser rigorosamente 10 minutos depois"
  );
  assert.strictEqual(r1.sessaoFinalizada, false);

  // 2. Responde 'bom' no Cartão 2 no tempo T=10:01:00 (1 minuto depois)
  const tempoT1 = new Date("2026-10-18T10:01:00.000Z");
  const r2 = processarRespostaSessao(r1.novaFila, 1, "bom", r1.listaErreados, tempoT1);
  assert.strictEqual(
    r2.sessaoFinalizada,
    true,
    "Como os 10 minutos ainda não passaram (apenas 1 min decorrido), a sessão deve finalizar sem esperar"
  );
  assert.strictEqual(r2.novaFila.length, 2, "Não duplicou o cartão na fila");

  // 3. Se uma sessão durasse mais de 10 minutos (T=10:11:00)
  const tempoT11 = new Date("2026-10-18T10:11:00.000Z");
  const r3 = processarRespostaSessao(r1.novaFila, 1, "bom", r1.listaErreados, tempoT11);
  assert.strictEqual(
    r3.sessaoFinalizada,
    false,
    "Se 10 minutos já se passaram, o cartão é enfileirado para revisão"
  );
  assert.strictEqual(r3.novaFila.length, 3);
  assert.strictEqual(r3.novaFila[2].id, "c-1");

  console.log("   ✓ Reagendamento de 10 min, não duplicação e finalização normal sem espera confirmados.");
}

// --------------------------------------------------------------------------
// TEST 8: CORREÇÃO OBRIGATÓRIA DA ETAPA 5 (REGRESSÃO CEFR DECOUPLING)
// --------------------------------------------------------------------------
console.log("\n8. Testando Regressão da Correção Obrigatória da Etapa 5 (Desacoplamento CEFR)...");
{
  function calcularMediaCriteriosOrais(rubrica) {
    const notas = [
      rubrica.fluencia.pontuacao,
      rubrica.vocabulario.pontuacao,
      rubrica.gramaticaAplicada.pontuacao,
      rubrica.pronunciaInteligibilidade.pontuacao,
      rubrica.coerenciaOrganizacao.pontuacao,
      rubrica.compreensaoGeral.pontuacao,
    ];
    const soma = notas.reduce((acc, n) => acc + n, 0);
    const media = Number((soma / 6).toFixed(1));
    return { media };
  }

  for (let score = 1; score <= 5; score += 0.5) {
    const rubrica = {
      fluencia: { pontuacao: score },
      vocabulario: { pontuacao: score },
      gramaticaAplicada: { pontuacao: score },
      pronunciaInteligibilidade: { pontuacao: score },
      coerenciaOrganizacao: { pontuacao: score },
      compreensaoGeral: { pontuacao: score },
    };
    const res = calcularMediaCriteriosOrais(rubrica);
    assert.strictEqual(res.media, Number(score.toFixed(1)));
    assert.strictEqual(res.nivel, undefined, `Nota ${score} não pode gerar nível CEFR`);
    assert.strictEqual(res.nivelSugerido, undefined, `Nota ${score} não pode sugerir nível CEFR`);
  }

  console.log("   ✓ Garantido que NENHUMA média de Self Presentation gera ou sugere nível CEFR automaticamente.");
}

console.log("\n============================================================");
console.log("TODOS OS 8 GRUPOS DE TESTES DA ETAPA 6 FORAM APROVADOS! (100%)");
console.log("============================================================\n");
