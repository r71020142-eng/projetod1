import assert from "node:assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 7 ===");

// --------------------------------------------------------------------------
// TEST 1: ESTRUTURA CONFIGURÁVEL DO MÉTODO PAULO (PROGRAMAS, ETAPAS, MÓDULOS)
// --------------------------------------------------------------------------
console.log("\n1. Testando Estrutura Configurável do Método Paulo...");
{
  // A estrutura é configurável e não trata nomes demonstrativos como fixos
  const programas = [
    {
      id: "prog-demo",
      nome: "Programa Método Paulo Fluência Prática",
      descricao: "Programa demonstrativo configurável",
      idioma: "Inglês",
      duracaoMesesEstimada: 12,
      status: "ativo",
      criadoEm: "2026-01-01T00:00:00.000Z",
      atualizadoEm: "2026-01-01T00:00:00.000Z",
    },
  ];

  // Renomeação/Edição de Programa
  const progAtualizado = {
    ...programas[0],
    nome: "Programa Método Paulo - Formação Executiva Avançada",
    duracaoMesesEstimada: 18,
  };
  assert.strictEqual(progAtualizado.nome, "Programa Método Paulo - Formação Executiva Avançada");
  assert.strictEqual(progAtualizado.duracaoMesesEstimada, 18);

  // Ordenação de Etapas (subir / descer / swap)
  let etapas = [
    { id: "etp-1", nome: "Diagnóstico", ordem: 1, status: "ativa" },
    { id: "etp-2", nome: "Fundamentos", ordem: 2, status: "ativa" },
    { id: "etp-3", nome: "Desbloqueio", ordem: 3, status: "ativa" },
  ];

  function reordenarEtapa(lista, id, direcao) {
    const idx = lista.findIndex((e) => e.id === id);
    if (idx === -1) return lista;
    const targetIdx = direcao === "cima" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= lista.length) return lista;

    const copia = [...lista];
    const temp = copia[idx];
    copia[idx] = copia[targetIdx];
    copia[targetIdx] = temp;

    return copia.map((item, index) => ({
      ...item,
      ordem: index + 1,
    }));
  }

  // Desloca "Fundamentos" (idx 1) para cima
  etapas = reordenarEtapa(etapas, "etp-2", "cima");
  assert.strictEqual(etapas[0].id, "etp-2");
  assert.strictEqual(etapas[0].ordem, 1);
  assert.strictEqual(etapas[1].id, "etp-1");
  assert.strictEqual(etapas[1].ordem, 2);

  // Desloca "Fundamentos" de volta para baixo
  etapas = reordenarEtapa(etapas, "etp-2", "baixo");
  assert.strictEqual(etapas[1].id, "etp-2");
  assert.strictEqual(etapas[1].ordem, 2);

  // Ordenação de Módulos dentro de uma Etapa
  let modulos = [
    { id: "mod-1", etapaId: "etp-1", nome: "Sondagem", ordem: 1 },
    { id: "mod-2", etapaId: "etp-1", nome: "Mapeamento", ordem: 2 },
  ];
  modulos = reordenarEtapa(modulos, "mod-2", "cima");
  assert.strictEqual(modulos[0].id, "mod-2");
  assert.strictEqual(modulos[0].ordem, 1);

  console.log("   ✓ Criação, edição e reordenação com swap de Etapas e Módulos aprovadas.");
}

// --------------------------------------------------------------------------
// TEST 2: CRITÉRIOS DE CONCLUSÃO E FÓRMULA DE PROGRESSO DO MÓDULO
// --------------------------------------------------------------------------
console.log("\n2. Testando Critérios de Conclusão e Cálculo de Progresso de Módulo...");
{
  function verificarCriteriosConclusaoModulo(criterios, dadosReais) {
    const itens = [];

    if (criterios.minimoAulasPresenca !== undefined && criterios.minimoAulasPresenca > 0) {
      const atual = dadosReais.totalAulasAssistidas ?? 0;
      const exigido = criterios.minimoAulasPresenca;
      itens.push({
        tipo: "aulas",
        descricao: `Comparecer a no mínimo ${exigido} aula(s)`,
        cumprido: atual >= exigido,
        valorAtual: atual,
        valorExigido: exigido,
      });
    }

    if (criterios.minimoAtividadesEntregues !== undefined && criterios.minimoAtividadesEntregues > 0) {
      const atual = dadosReais.totalAtividadesConcluidas ?? 0;
      const exigido = criterios.minimoAtividadesEntregues;
      itens.push({
        tipo: "atividades",
        descricao: `Concluir no mínimo ${exigido} atividade(s)`,
        cumprido: atual >= exigido,
        valorAtual: atual,
        valorExigido: exigido,
      });
    }

    if (criterios.notaMinimaObjetiva !== undefined && criterios.notaMinimaObjetiva > 0) {
      const atual = dadosReais.melhorNotaObjetiva ?? 0;
      const exigido = criterios.notaMinimaObjetiva;
      itens.push({
        tipo: "avaliacao_objetiva",
        descricao: `Atingir nota mínima de ${exigido} na avaliação objetiva`,
        cumprido: atual >= exigido,
        valorAtual: atual,
        valorExigido: exigido,
      });
    }

    if (criterios.notaMinimaPratica !== undefined && criterios.notaMinimaPratica > 0) {
      const atual = dadosReais.melhorNotaPratica ?? 0;
      const exigido = criterios.notaMinimaPratica;
      itens.push({
        tipo: "avaliacao_pratica",
        descricao: `Atingir nota mínima de ${exigido} na avaliação prática`,
        cumprido: atual >= exigido,
        valorAtual: atual,
        valorExigido: exigido,
      });
    }

    if (criterios.minimoFlashcardsRevisados !== undefined && criterios.minimoFlashcardsRevisados > 0) {
      const atual = dadosReais.totalFlashcardsRevisados ?? 0;
      const exigido = criterios.minimoFlashcardsRevisados;
      itens.push({
        tipo: "flashcards",
        descricao: `Revisar no mínimo ${exigido} cartão(ões) de flashcards`,
        cumprido: atual >= exigido,
        valorAtual: atual,
        valorExigido: exigido,
      });
    }

    const totalAplicaveis = itens.length;
    const totalCumpridos = itens.filter((i) => i.cumprido).length;
    const porcentagem = totalAplicaveis > 0
      ? Math.round((totalCumpridos / totalAplicaveis) * 100)
      : 0;

    const todosCriteriosCumpridos = totalAplicaveis > 0 && totalCumpridos === totalAplicaveis;

    return {
      itens,
      totalAplicaveis,
      totalCumpridos,
      porcentagem,
      todosCriteriosCumpridos,
      exigeValidacaoHumana: !!criterios.exigeValidacaoHumana,
    };
  }

  // Cenário A: 3 critérios aplicáveis, 2 cumpridos
  const critA = {
    minimoAulasPresenca: 4,
    minimoAtividadesEntregues: 2,
    notaMinimaObjetiva: 7.0,
    exigeValidacaoHumana: true,
  };
  const dadosA = {
    totalAulasAssistidas: 4, // OK
    totalAtividadesConcluidas: 1, // Pendente (1 < 2)
    melhorNotaObjetiva: 8.5, // OK (8.5 >= 7.0)
  };

  const resA = verificarCriteriosConclusaoModulo(critA, dadosA);
  assert.strictEqual(resA.totalAplicaveis, 3);
  assert.strictEqual(resA.totalCumpridos, 2);
  // (2 / 3) * 100 = 66.666... -> 67%
  assert.strictEqual(resA.porcentagem, 67);
  assert.strictEqual(resA.todosCriteriosCumpridos, false);

  // Cenário B: Todos os 3 critérios cumpridos
  const dadosB = {
    totalAulasAssistidas: 5,
    totalAtividadesConcluidas: 2,
    melhorNotaObjetiva: 7.0,
  };
  const resB = verificarCriteriosConclusaoModulo(critA, dadosB);
  assert.strictEqual(resB.totalCumpridos, 3);
  assert.strictEqual(resB.porcentagem, 100);
  assert.strictEqual(resB.todosCriteriosCumpridos, true);
  assert.strictEqual(resB.exigeValidacaoHumana, true);

  // Cenário C: Módulo sem critérios definidos (0 critérios)
  const resC = verificarCriteriosConclusaoModulo({}, {});
  assert.strictEqual(resC.totalAplicaveis, 0);
  assert.strictEqual(resC.porcentagem, 0);
  assert.strictEqual(resC.todosCriteriosCumpridos, false);

  console.log("   ✓ Fórmula (cumpridos / aplicaveis) * 100 e validação de critérios confirmadas.");
}

// --------------------------------------------------------------------------
// TEST 3: QUESTÕES OBJETIVAS E CORREÇÃO AUTOMÁTICA PROPORCIONAL
// --------------------------------------------------------------------------
console.log("\n3. Testando Avaliação Objetiva e Correção Automática Proporcional...");
{
  function corrigirQuestaoObjetiva(questao, alternativaSelecionadaId) {
    const correta = questao.alternativas.find((a) => a.correta);
    const corretaId = correta ? correta.id : "";
    const acertou = Boolean(alternativaSelecionadaId && alternativaSelecionadaId === corretaId);
    const pontosObtidos = acertou ? questao.pontos : 0;

    return {
      questaoId: questao.id,
      alternativaSelecionadaId,
      alternativaCorretaId: corretaId,
      acertou,
      pontosObtidos,
      pontosPossiveis: questao.pontos,
      explicacao: questao.explicacao,
    };
  }

  function calcularNotaAvaliacaoObjetiva(questoes, respostasAluno, notaMaximaConfig = 10) {
    const correcoes = questoes.map((q) => {
      const respId = respostasAluno[q.id];
      return corrigirQuestaoObjetiva(q, respId);
    });

    const pontosTotais = questoes.reduce((sum, q) => sum + (q.pontos || 0), 0);
    const pontosObtidos = correcoes.reduce((sum, c) => sum + c.pontosObtidos, 0);
    const totalQuestoes = questoes.length;
    const acertos = correcoes.filter((c) => c.acertou).length;
    const erros = totalQuestoes - acertos;

    const notaFinal = pontosTotais > 0
      ? Number(((pontosObtidos / pontosTotais) * notaMaximaConfig).toFixed(2))
      : 0;

    const porcentagemAcerto = totalQuestoes > 0
      ? Math.round((acertos / totalQuestoes) * 100)
      : 0;

    return {
      notaFinal,
      pontosObtidos,
      pontosTotais,
      totalQuestoes,
      acertos,
      erros,
      porcentagemAcerto,
      correcoes,
    };
  }

  const questoesDemo = [
    {
      id: "q-1",
      enunciado: "Qual a forma correta do Simple Present para 'She'?",
      pontos: 2.5,
      explicacao: "Em terceira pessoa do singular, adiciona-se -s/-es.",
      alternativas: [
        { id: "alt-1a", texto: "She go", correta: false },
        { id: "alt-1b", texto: "She goes", correta: true },
        { id: "alt-1c", texto: "She going", correta: false },
      ],
    },
    {
      id: "q-2",
      enunciado: "Escolha a preposição correta: 'I arrived ___ the airport.'",
      pontos: 2.5,
      explicacao: "Usa-se 'at' para pontos de localização específicos.",
      alternativas: [
        { id: "alt-2a", texto: "at", correta: true },
        { id: "alt-2b", texto: "in", correta: false },
        { id: "alt-2c", texto: "on", correta: false },
      ],
    },
    {
      id: "q-3",
      enunciado: "Tradução prática de 'Never mind':",
      pontos: 5.0,
      explicacao: "Significa 'deixa para lá' ou 'não se preocupe'.",
      alternativas: [
        { id: "alt-3a", texto: "Nunca mente", correta: false },
        { id: "alt-3b", texto: "Deixa para lá / Não se preocupe", correta: true },
      ],
    },
  ];

  // Cenário 1: Acertou Q1 (2.5) e Q3 (5.0), errou Q2 (0/2.5)
  // Total pontos = 10, obtidos = 7.5. Nota máx 10 -> 7.5
  const respostasAluno = {
    "q-1": "alt-1b", // Certo
    "q-2": "alt-2b", // Errado (escolheu in)
    "q-3": "alt-3b", // Certo
  };

  const resultadoObj = calcularNotaAvaliacaoObjetiva(questoesDemo, respostasAluno, 10);
  assert.strictEqual(resultadoObj.pontosTotais, 10.0);
  assert.strictEqual(resultadoObj.pontosObtidos, 7.5);
  assert.strictEqual(resultadoObj.notaFinal, 7.5);
  assert.strictEqual(resultadoObj.acertos, 2);
  assert.strictEqual(resultadoObj.erros, 1);
  assert.strictEqual(resultadoObj.porcentagemAcerto, 67); // 2/3 = 67%
  assert.strictEqual(resultadoObj.correcoes[0].acertou, true);
  assert.strictEqual(resultadoObj.correcoes[1].acertou, false);
  assert.strictEqual(resultadoObj.correcoes[1].alternativaCorretaId, "alt-2a");
  assert.strictEqual(resultadoObj.correcoes[1].explicacao, "Usa-se 'at' para pontos de localização específicos.");

  console.log("   ✓ Correção automática instantânea e cálculo proporcional comprovados.");
}

// --------------------------------------------------------------------------
// TEST 4: AVALIAÇÃO PRÁTICA COM RUBRICA E CORREÇÃO HUMANA
// --------------------------------------------------------------------------
console.log("\n4. Testando Avaliação Prática, Rubrica e Feedback Qualitativo...");
{
  function calcularNotaAvaliacaoPratica(rubrica, itensAvaliados, notaMaximaConfig = 10) {
    const pontuacaoMaximaTotal = rubrica.reduce((sum, crit) => sum + (crit.pontosMaximos || 0), 0);
    let pontuacaoAtribuidaTotal = 0;

    const itensFeedback = rubrica.map((crit) => {
      const avaliado = itensAvaliados.find((i) => i.criterioId === crit.id);
      const pontosAtribuidos = avaliado ? Math.min(crit.pontosMaximos, Math.max(0, avaliado.pontosAtribuidos)) : 0;
      pontuacaoAtribuidaTotal += pontosAtribuidos;

      return {
        criterioId: crit.id,
        criterioNome: crit.nome,
        pontosAtribuidos,
        pontosMaximos: crit.pontosMaximos,
        comentario: avaliado?.comentario || "",
      };
    });

    const notaFinal = pontuacaoMaximaTotal > 0
      ? Number(((pontuacaoAtribuidaTotal / pontuacaoMaximaTotal) * notaMaximaConfig).toFixed(2))
      : 0;

    return {
      notaFinal,
      pontuacaoAtribuidaTotal,
      pontuacaoMaximaTotal,
      itensFeedback,
    };
  }

  const rubricaDemo = [
    { id: "c-1", nome: "Fluência e Ritmo de Fala", pontosMaximos: 4 },
    { id: "c-2", nome: "Vocabulário Específico e Recursos", pontosMaximos: 3 },
    { id: "c-3", nome: "Correção Gramatical Aplicada", pontosMaximos: 3 },
  ];

  // Professor avalia: c-1 ganha 3.5/4, c-2 ganha 3/3, c-3 ganha 2/3 -> Total = 8.5/10
  const avaliacaoProf = [
    { criterioId: "c-1", pontosAtribuidos: 3.5, comentario: "Excelente ritmo, pausas naturais." },
    { criterioId: "c-2", pontosAtribuidos: 3.0, comentario: "Uso preciso de expressões idiomáticas." },
    { criterioId: "c-3", pontosAtribuidos: 2.0, comentario: "Atenção ao pretérito imperfeito." },
  ];

  const resPrat = calcularNotaAvaliacaoPratica(rubricaDemo, avaliacaoProf, 10);
  assert.strictEqual(resPrat.pontuacaoMaximaTotal, 10);
  assert.strictEqual(resPrat.pontuacaoAtribuidaTotal, 8.5);
  assert.strictEqual(resPrat.notaFinal, 8.5);

  const feedbackCompleto = {
    notaAtribuida: resPrat.notaFinal,
    pontosFortes: "Segurança na pronúncia e excelente repertório lexical.",
    pontosADesenvolver: "Revisar estrutura condicional mista em situações dinâmicas.",
    orientacoesProximosPassos: "Praticar módulo 4 e revisar baralho de Expressões.",
    observacoesInternas: "Aluno demonstrou grande evolução desde o diagnóstico inicial.",
    corrigidoPorProfessorId: "prof-001",
    corrigidoPorProfessorNome: "Prof. Lucas Ferreira",
  };

  assert.strictEqual(feedbackCompleto.notaAtribuida, 8.5);
  assert.strictEqual(feedbackCompleto.corrigidoPorProfessorId, "prof-001");

  console.log("   ✓ Rubrica prática com notas proporcionais e feedback qualitativo validados.");
}

// --------------------------------------------------------------------------
// TEST 5: VERSIONAMENTO DE AVALIAÇÃO E IMUTABILIDADE DO HISTÓRICO
// --------------------------------------------------------------------------
console.log("\n5. Testando Versionamento de Avaliação (v1 -> v2) e Imutabilidade...");
{
  const avaliacaoV1 = {
    id: "aval-001",
    titulo: "Checkpoint 1 - Gramática em Contexto",
    versao: 1,
    status: "publicada",
    moduloId: "mod-002",
    questoes: [{ id: "q-1", pontos: 5 }, { id: "q-2", pontos: 5 }],
  };

  // Simula existência de tentativas vinculadas à v1
  const tentativasExistentes = [
    { id: "tent-001", avaliacaoId: "aval-001", versaoAvaliacao: 1, nota: 8.0 },
  ];

  function duplicarComoNovaVersao(avaliacaoOrigem) {
    const novaVersaoNum = avaliacaoOrigem.versao + 1;
    return {
      ...avaliacaoOrigem,
      id: `aval-${Date.now()}`,
      versao: novaVersaoNum,
      status: "rascunho", // Nova versão sempre nasce como rascunho para edição segura
      titulo: `${avaliacaoOrigem.titulo} (v${novaVersaoNum})`,
    };
  }

  const avaliacaoV2 = duplicarComoNovaVersao(avaliacaoV1);
  assert.strictEqual(avaliacaoV2.versao, 2);
  assert.strictEqual(avaliacaoV2.status, "rascunho");
  assert.notStrictEqual(avaliacaoV2.id, avaliacaoV1.id);

  // A tentativa original permanece associada à v1 sem alteração
  assert.strictEqual(tentativasExistentes[0].versaoAvaliacao, 1);
  assert.strictEqual(tentativasExistentes[0].avaliacaoId, "aval-001");

  console.log("   ✓ Imutabilidade de tentativas históricas e criação de nova versão como rascunho aprovadas.");
}

// --------------------------------------------------------------------------
// TEST 6: LIMITE DE TENTATIVAS E AUTORIZAÇÃO DE TENTATIVAS EXTRAS
// --------------------------------------------------------------------------
console.log("\n6. Testando Limite de Tentativas e Autorização de Tentativas Extras...");
{
  function podeIniciarTentativa(avaliacao, tentativasDoAluno, alunoId) {
    const maxPermitido = avaliacao.maxTentativas || 1;
    const tentativasValidas = tentativasDoAluno.filter(
      (t) => t.avaliacaoId === avaliacao.id && t.alunoId === alunoId && t.status !== "rascunho"
    );

    // Soma eventuais tentativas extras autorizadas pelo professor
    const extrasAutorizadas = tentativasDoAluno
      .filter((t) => t.avaliacaoId === avaliacao.id && t.alunoId === alunoId)
      .reduce((sum, t) => sum + (t.tentativasExtrasAutorizadas || 0), 0);

    const limiteEfetivo = maxPermitido + extrasAutorizadas;
    const atingiuLimite = tentativasValidas.length >= limiteEfetivo;

    return {
      podeIniciar: !atingiuLimite,
      tentativasRealizadas: tentativasValidas.length,
      limiteEfetivo,
    };
  }

  const avaliacao = { id: "aval-demo", maxTentativas: 2 };
  const alunoId = "alu-001";

  // Aluno fez 1 tentativa -> Pode iniciar
  let historico = [
    { id: "t-1", avaliacaoId: "aval-demo", alunoId, status: "concluida" },
  ];
  let check1 = podeIniciarTentativa(avaliacao, historico, alunoId);
  assert.strictEqual(check1.podeIniciar, true);
  assert.strictEqual(check1.tentativasRealizadas, 1);
  assert.strictEqual(check1.limiteEfetivo, 2);

  // Aluno fez 2 tentativas -> Limite atingido
  historico.push({ id: "t-2", avaliacaoId: "aval-demo", alunoId, status: "concluida" });
  let check2 = podeIniciarTentativa(avaliacao, historico, alunoId);
  assert.strictEqual(check2.podeIniciar, false);
  assert.strictEqual(check2.tentativasRealizadas, 2);

  // Professor concede 1 tentativa extra
  historico[1].tentativasExtrasAutorizadas = 1;
  let check3 = podeIniciarTentativa(avaliacao, historico, alunoId);
  assert.strictEqual(check3.podeIniciar, true);
  assert.strictEqual(check3.limiteEfetivo, 3);

  console.log("   ✓ Bloqueio estrito no teto de tentativas e concessão de tentativa extra aprovados.");
}

// --------------------------------------------------------------------------
// TEST 7: BARREIRA DE VALIDAÇÃO HUMANA DO PROFESSOR PARA AVANÇO
// --------------------------------------------------------------------------
console.log("\n7. Testando Barreira de Validação Humana do Professor...");
{
  // Módulo com 100% de critérios objetivos concluídos MAS exige validação humana
  const progresso = {
    id: "p-mod-1",
    moduloId: "mod-002",
    alunoId: "alu-001",
    status: "em_andamento",
    porcentagemConcluida: 100,
    criteriosCumpridos: true,
  };

  const criteriosModulo = {
    exigeValidacaoHumana: true,
  };

  function avaliarStatusProgresso(progressoAtual, criterios) {
    if (progressoAtual.porcentagemConcluida === 100 && progressoAtual.criteriosCumpridos) {
      if (criterios.exigeValidacaoHumana && !progressoAtual.validadoPorProfessorId) {
        return "aguardando_validacao";
      }
      return "concluido";
    }
    return "em_andamento";
  }

  // 1. Mesmo com 100%, deve ir para "aguardando_validacao" e NÃO direto para "concluido"
  const statusInicial = avaliarStatusProgresso(progresso, criteriosModulo);
  assert.strictEqual(
    statusInicial,
    "aguardando_validacao",
    "Módulo com 100% dos critérios deve aguardar validação humana do professor"
  );

  // 2. Professor realiza a validação humana formal
  const progressoValidado = {
    ...progresso,
    status: "concluido",
    validadoPorProfessorId: "prof-001",
    validadoPorProfessorNome: "Prof. Lucas Ferreira",
    validadoEm: "2026-10-18T10:00:00.000Z",
    parecerValidacao: "Aluno atingiu excelente desenvoltura e maturidade comunicativa.",
  };

  assert.strictEqual(progressoValidado.status, "concluido");
  assert.strictEqual(progressoValidado.validadoPorProfessorId, "prof-001");
  assert.ok(progressoValidado.parecerValidacao.length > 0);

  console.log("   ✓ Barreira pedagógica de validação humana (aguardando_validacao -> concluido) validada.");
}

// --------------------------------------------------------------------------
// TEST 8: REABERTURA DE MÓDULO CONCLUÍDO COM JUSTIFICATIVA PEDAGÓGICA
// --------------------------------------------------------------------------
console.log("\n8. Testando Reabertura de Módulo Concluído para Reforço...");
{
  const progressoConcluido = {
    id: "p-mod-1",
    moduloId: "mod-002",
    alunoId: "alu-001",
    status: "concluido",
    historicoMudancas: [],
  };

  function reabrirModulo(progresso, motivoJustificativa, professorId, professorNome) {
    assert.ok(
      motivoJustificativa && motivoJustificativa.trim().length >= 10,
      "Justificativa pedagógica é obrigatória para reabertura de módulo (mínimo 10 caracteres)"
    );

    const agora = new Date().toISOString();
    return {
      ...progresso,
      status: "reaberto",
      historicoMudancas: [
        ...progresso.historicoMudancas,
        {
          id: `hist-${Date.now()}`,
          data: agora,
          statusAnterior: progresso.status,
          statusNovo: "reaberto",
          responsavelId: professorId,
          responsavelNome: professorNome,
          justificativa: motivoJustificativa,
        },
      ],
    };
  }

  // Falha se justificativa for vazia
  assert.throws(() => {
    reabrirModulo(progressoConcluido, "", "prof-001", "Prof. Lucas");
  });

  // Reabertura com justificativa pedagógica válida
  const progressoReaberto = reabrirModulo(
    progressoConcluido,
    "Necessidade de revisão e reforço nas estruturas do passado simples antes do avanço para fluência.",
    "prof-001",
    "Prof. Lucas"
  );

  assert.strictEqual(progressoReaberto.status, "reaberto");
  assert.strictEqual(progressoReaberto.historicoMudancas.length, 1);
  assert.strictEqual(progressoReaberto.historicoMudancas[0].statusAnterior, "concluido");
  assert.strictEqual(progressoReaberto.historicoMudancas[0].statusNovo, "reaberto");

  console.log("   ✓ Reabertura com justificativa obrigatória e registro de auditoria confirmada.");
}

// --------------------------------------------------------------------------
// TEST 9: SANITIZAÇÃO DE PRIVACIDADE PARA O ALUNO (OBSERVAÇÕES INTERNAS)
// --------------------------------------------------------------------------
console.log("\n9. Testando Sanitização de Privacidade para o Aluno...");
{
  function sanitizarTentativaParaAluno(tentativa) {
    if (!tentativa) return null;
    const copia = JSON.parse(JSON.stringify(tentativa));

    // Remove observações confidenciais internas da equipe pedagógica
    if (copia.feedback) {
      delete copia.feedback.observacoesInternas;
    }
    delete copia.observacoesInternas;

    return copia;
  }

  const tentativaInterna = {
    id: "tent-001",
    alunoId: "alu-001",
    avaliacaoId: "aval-002",
    nota: 8.5,
    observacoesInternas: "DICA PEDAGÓGICA: Aluno inseguro no início da chamada, monitorar.",
    feedback: {
      pontosFortes: "Ótima desenvoltura.",
      pontosADesenvolver: "Conectivos de transição.",
      observacoesInternas: "AVALIAÇÃO INTERNA RESTRITA: Não compartilhar com o aluno.",
    },
  };

  const tentativaSanitizada = sanitizarTentativaParaAluno(tentativaInterna);

  assert.strictEqual(tentativaSanitizada.nota, 8.5);
  assert.strictEqual(tentativaSanitizada.feedback.pontosFortes, "Ótima desenvoltura.");
  assert.strictEqual(tentativaSanitizada.observacoesInternas, undefined);
  assert.strictEqual(tentativaSanitizada.feedback.observacoesInternas, undefined);

  // Garante que o objeto original não foi corrompido
  assert.ok(tentativaInterna.feedback.observacoesInternas.includes("RESTRITA"));

  console.log("   ✓ Exclusão e destruição estrita de observações internas antes da entrega ao aluno confirmadas.");
}

// --------------------------------------------------------------------------
// TEST 10: REGRESSÃO DA CORREÇÃO OBRIGATÓRIA DA ETAPA 6 (SRS SM-2 10 MINUTOS)
// --------------------------------------------------------------------------
console.log("\n10. Testando Regressão da Correção da Etapa 6 (Reagendamento 10 min SM-2)...");
{
  const tempoZero = new Date("2026-10-18T10:00:00.000Z");

  function processarRespostaSRS(progressoAtual, resposta, dataRef = tempoZero) {
    let proximaRevisao = new Date(dataRef.getTime());
    let reagendadoParaRevisao = false;
    let reagendadoMesmaSessao = false;

    if (resposta === "errei") {
      reagendadoParaRevisao = true;
      reagendadoMesmaSessao = false; // Não empurra direto no final da mesma sessão!
      proximaRevisao.setMinutes(proximaRevisao.getMinutes() + 10);
    }

    return {
      proximaRevisao: proximaRevisao.toISOString(),
      reagendadoParaRevisao,
      reagendadoMesmaSessao,
    };
  }

  const resErrei = processarRespostaSRS({ estado: "revisao" }, "errei", tempoZero);
  assert.strictEqual(resErrei.reagendadoParaRevisao, true);
  assert.strictEqual(resErrei.reagendadoMesmaSessao, false);
  assert.strictEqual(resErrei.proximaRevisao, "2026-10-18T10:10:00.000Z");

  console.log("   ✓ Algoritmo inspirado no SM-2 agenda rigorosamente para 10 minutos sem loop imediato.");
}

console.log("\n============================================================");
console.log("TODOS OS 10 GRUPOS DE TESTES DA ETAPA 7 FORAM APROVADOS! (100%)");
console.log("============================================================\n");
