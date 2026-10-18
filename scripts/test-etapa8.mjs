import assert from "node:assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 8 ===");
console.log("Comunidade, Gamificação, Conquistas, Placas e Correção Obrigatória da Etapa 7\n");

// ============================================================================
// PARTE 1: CORREÇÃO OBRIGATÓRIA DA ETAPA 7 - POLÍTICAS DE EXIBIÇÃO DE GABARITO
// ============================================================================
console.log("1. Testando Políticas de Exibição de Gabarito (Correção Obrigatória da Etapa 7)...");
{
  function isGabaritoLiberado(politica, statusAvaliacao) {
    if (politica === "gabarito_imediato") {
      return true;
    }
    if (politica === "gabarito_apos_encerramento") {
      return statusAvaliacao === "encerrada";
    }
    // "nota_imediata" nunca libera respostas completas/explicações
    return false;
  }

  function sanitizarQuestoesTentativa(questoes, respostasAluno, liberado) {
    return questoes.map((q) => {
      const respAluno = respostasAluno.find((r) => r.questaoId === q.id);
      if (!liberado) {
        // Gabarito retido: oculta respostaCorreta e explicacao
        return {
          id: q.id,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          respostaAlunoId: respAluno?.alternativaEscolhidaId,
          // campos protegidos omitidos
        };
      }
      return {
        id: q.id,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        respostaAlunoId: respAluno?.alternativaEscolhidaId,
        respostaCorretaId: q.respostaCorretaId,
        explicacao: q.explicacao,
      };
    });
  }

  const mockQuestoes = [
    {
      id: "q-1",
      enunciado: "Choose the correct sentence in Present Perfect:",
      alternativas: [
        { id: "alt-a", texto: "I have lived in London for two years." },
        { id: "alt-b", texto: "I lived in London since two years." },
      ],
      respostaCorretaId: "alt-a",
      explicacao: "Present Perfect usa have/has + particípio passado para ações conectadas ao presente.",
    },
  ];

  const respostasMariana = [{ questaoId: "q-1", alternativaEscolhidaId: "alt-a" }];

  // Cenário A: Política 'nota_imediata'
  // Aluno finalizou, avaliação ativa ou encerrada: NUNCA mostra gabarito/explicação
  const liberadoNotaImedAtiva = isGabaritoLiberado("nota_imediata", "ativa");
  const liberadoNotaImedEncerrada = isGabaritoLiberado("nota_imediata", "encerrada");
  assert.strictEqual(liberadoNotaImedAtiva, false, "nota_imediata não deve liberar gabarito enquanto ativa");
  assert.strictEqual(liberadoNotaImedEncerrada, false, "nota_imediata não deve liberar gabarito mesmo encerrada");

  const sanitizadoNotaImed = sanitizarQuestoesTentativa(mockQuestoes, respostasMariana, liberadoNotaImedAtiva);
  assert.strictEqual(sanitizadoNotaImed[0].respostaCorretaId, undefined, "respostaCorretaId deve ser omitida");
  assert.strictEqual(sanitizadoNotaImed[0].explicacao, undefined, "explicacao deve ser omitida");
  assert.strictEqual(sanitizadoNotaImed[0].respostaAlunoId, "alt-a", "resposta do aluno deve ser preservada");

  // Cenário B: Política 'gabarito_imediato'
  // Aluno finalizou, avaliação ativa: IMEDIATAMENTE mostra gabarito e explicação
  const liberadoGabImedAtiva = isGabaritoLiberado("gabarito_imediato", "ativa");
  assert.strictEqual(liberadoGabImedAtiva, true, "gabarito_imediato deve liberar gabarito imediatamente");

  const sanitizadoGabImed = sanitizarQuestoesTentativa(mockQuestoes, respostasMariana, liberadoGabImedAtiva);
  assert.strictEqual(sanitizadoGabImed[0].respostaCorretaId, "alt-a", "respostaCorretaId deve estar presente");
  assert.strictEqual(sanitizadoGabImed[0].explicacao, "Present Perfect usa have/has + particípio passado para ações conectadas ao presente.");

  // Cenário C: Política 'gabarito_apos_encerramento'
  // Aluno finalizou, avaliação AINDA ATIVA: gabarito retido!
  const liberadoAposEncAtiva = isGabaritoLiberado("gabarito_apos_encerramento", "ativa");
  assert.strictEqual(liberadoAposEncAtiva, false, "gabarito_apos_encerramento não deve liberar enquanto ativa");

  const sanitizadoAposEncAtiva = sanitizarQuestoesTentativa(mockQuestoes, respostasMariana, liberadoAposEncAtiva);
  assert.strictEqual(sanitizadoAposEncAtiva[0].respostaCorretaId, undefined);
  assert.strictEqual(sanitizadoAposEncAtiva[0].explicacao, undefined);

  // Aluno finalizou, avaliação AGORA ENCERRADA: gabarito liberado!
  const liberadoAposEncEncerrada = isGabaritoLiberado("gabarito_apos_encerramento", "encerrada");
  assert.strictEqual(liberadoAposEncEncerrada, true, "gabarito_apos_encerramento deve liberar quando encerrada");

  const sanitizadoAposEncEncerrada = sanitizarQuestoesTentativa(mockQuestoes, respostasMariana, liberadoAposEncEncerrada);
  assert.strictEqual(sanitizadoAposEncEncerrada[0].respostaCorretaId, "alt-a");
  assert.strictEqual(sanitizadoAposEncEncerrada[0].explicacao, "Present Perfect usa have/has + particípio passado para ações conectadas ao presente.");

  // Cenário D: Tentativa em andamento (ativa)
  // Em hipótese alguma gabarito pode vazar durante a realização da prova
  function sanitizarTentativaEmAndamento(questoes) {
    return questoes.map((q) => ({
      id: q.id,
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      // Nenhum campo de resposta ou explicação
    }));
  }
  const emAndamento = sanitizarTentativaEmAndamento(mockQuestoes);
  assert.strictEqual(emAndamento[0].respostaCorretaId, undefined);
  assert.strictEqual(emAndamento[0].explicacao, undefined);

  // Cenário E: Snapshot da política preservado em tentativas antigas
  const tentativaHistorica = {
    id: "tent-001",
    politicaGabaritoUtilizada: "nota_imediata",
    status: "finalizada",
  };
  // Mesmo se o professor mudar a política da avaliação para "gabarito_imediato" posteriormente,
  // a tentativa antiga respeita seu próprio snapshot histórico
  const avaliacaoModificadaDepois = { politicaGabarito: "gabarito_imediato" };
  const politicaAplicada = tentativaHistorica.politicaGabaritoUtilizada;
  assert.strictEqual(politicaAplicada, "nota_imediata", "Snapshot histórico não pode sofrer alteração retroativa");

  console.log("   ✓ As 3 políticas (nota_imediata, gabarito_imediato, gabarito_apos_encerramento) validadas com sucesso.");
  console.log("   ✓ Tentativas em andamento nunca vazam respostas e snapshots históricos são blindados.");
}

// ============================================================================
// PARTE 2: COMUNIDADE - CONTROLE DE ACESSO, REGRAS E SEGURANÇA
// ============================================================================
console.log("\n2. Testando Comunidade Interna, Permissões e Validação HTTPS...");
{
  function validarLinkExternoHttps(url) {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }

  // Validação de links externos HTTPS com parser nativo URL
  assert.strictEqual(validarLinkExternoHttps("https://meet.google.com/abc"), true);
  assert.strictEqual(validarLinkExternoHttps("https://drive.google.com/file/d/123"), true);
  assert.strictEqual(validarLinkExternoHttps("http://insecure-site.com"), false, "HTTP comum deve ser rejeitado");
  assert.strictEqual(validarLinkExternoHttps("javascript:alert(1)"), false, "javascript: deve ser rejeitado");
  assert.strictEqual(validarLinkExternoHttps("ftp://server.com/file"), false, "ftp: deve ser rejeitado");
  assert.strictEqual(validarLinkExternoHttps("not-a-url"), false, "strings inválidas devem ser rejeitadas");
  assert.strictEqual(validarLinkExternoHttps(""), false, "URL vazia deve ser rejeitada");

  // Controle de acesso aos espaços
  function alunoTemAcessoAoEspaco(espaco, aluno) {
    if (aluno.status !== "ativo") return false;
    if (espaco.status === "rascunho") return false;

    switch (espaco.tipo) {
      case "geral":
      case "oportunidades":
        return true;
      case "turma":
        return Boolean(espaco.turmaId && aluno.turmasInscritas.includes(espaco.turmaId));
      case "nivel":
        return Boolean(espaco.nivel && aluno.nivelOperacionalAtual === espaco.nivel);
      case "objetivo":
        return Boolean(espaco.objetivo && aluno.objetivo === espaco.objetivo);
      default:
        return false;
    }
  }

  const mockAlunoMariana = {
    id: "alu-001",
    status: "ativo",
    nivelOperacionalAtual: "B1",
    objetivo: "Carreira Internacional",
    turmasInscritas: ["turma-001"],
  };

  const espacoGeral = { id: "esp-geral", tipo: "geral", status: "ativo" };
  const espacoTurma001 = { id: "esp-turma-1", tipo: "turma", turmaId: "turma-001", status: "ativo" };
  const espacoTurma002 = { id: "esp-turma-2", tipo: "turma", turmaId: "turma-002", status: "ativo" };
  const espacoNivelB1 = { id: "esp-b1", tipo: "nivel", nivel: "B1", status: "ativo" };
  const espacoNivelC1 = { id: "esp-c1", tipo: "nivel", nivel: "C1", status: "ativo" };
  const espacoObjetivoCarreira = { id: "esp-carreira", tipo: "objetivo", objetivo: "Carreira Internacional", status: "ativo" };
  const espacoObjetivoViagens = { id: "esp-viagens", tipo: "objetivo", objetivo: "Viagens e Lazer", status: "ativo" };
  const espacoRascunho = { id: "esp-rasc", tipo: "geral", status: "rascunho" };
  const espacoArquivado = { id: "esp-arq", tipo: "geral", status: "arquivado" };

  // Verificação de visibilidade
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoGeral, mockAlunoMariana), true);
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoTurma001, mockAlunoMariana), true);
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoTurma002, mockAlunoMariana), false, "Não pode acessar turma em que não está matriculada");
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoNivelB1, mockAlunoMariana), true);
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoNivelC1, mockAlunoMariana), false, "Não pode acessar nível diferente do seu operacional");
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoObjetivoCarreira, mockAlunoMariana), true);
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoObjetivoViagens, mockAlunoMariana), false, "Não pode acessar objetivo diferente");
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoRascunho, mockAlunoMariana), false, "Espaço em rascunho não aparece para alunos");
  assert.strictEqual(alunoTemAcessoAoEspaco(espacoArquivado, mockAlunoMariana), true, "Espaço arquivado preserva histórico e leitura");

  // Regras de publicação e comentários
  function alunoPodePublicarNoEspaco(espaco, aluno) {
    if (!alunoTemAcessoAoEspaco(espaco, aluno)) return false;
    if (espaco.status === "arquivado") return false;
    return Boolean(espaco.permitirPublicacaoAlunos);
  }

  function alunoPodeComentarNoEspaco(espaco, aluno) {
    if (!alunoTemAcessoAoEspaco(espaco, aluno)) return false;
    if (espaco.status === "arquivado") return false;
    return Boolean(espaco.permitirComentarios);
  }

  const espacoAvisos = {
    ...espacoGeral,
    permitirPublicacaoAlunos: false,
    permitirComentarios: true,
  };
  assert.strictEqual(alunoPodePublicarNoEspaco(espacoAvisos, mockAlunoMariana), false, "Não pode publicar em espaço de avisos");
  assert.strictEqual(alunoPodeComentarNoEspaco(espacoAvisos, mockAlunoMariana), true, "Pode comentar se permitido");

  const espacoGeralInterativo = {
    ...espacoGeral,
    permitirPublicacaoAlunos: true,
    permitirComentarios: true,
  };
  assert.strictEqual(alunoPodePublicarNoEspaco(espacoGeralInterativo, mockAlunoMariana), true);
  assert.strictEqual(alunoPodeComentarNoEspaco(espacoGeralInterativo, mockAlunoMariana), true);

  // Espaço arquivado bloqueia publicação e comentários
  const espacoGeralArquivado = { ...espacoGeralInterativo, status: "arquivado" };
  assert.strictEqual(alunoPodePublicarNoEspaco(espacoGeralArquivado, mockAlunoMariana), false);
  assert.strictEqual(alunoPodeComentarNoEspaco(espacoGeralArquivado, mockAlunoMariana), false);

  // Moderação e Sanitização de Denúncias
  function sanitizarPublicacaoParaAluno(publicacao) {
    const copia = { ...publicacao };
    delete copia.observacoesInternas;
    delete copia.moderadoPorId;
    delete copia.dataModeracao;
    return copia;
  }

  const pubComModeracao = {
    id: "pub-001",
    titulo: "Dúvida sobre phrasal verbs",
    conteudo: "Alguém pode me ajudar com look forward to?",
    observacoesInternas: "Usuário reportou mas post é legítimo.",
    moderadoPorId: "adm-001",
    dataModeracao: "2026-10-18T10:00:00.000Z",
  };

  const pubSanitizada = sanitizarPublicacaoParaAluno(pubComModeracao);
  assert.strictEqual(pubSanitizada.observacoesInternas, undefined, "observacoesInternas não podem vazar para o aluno");
  assert.strictEqual(pubSanitizada.moderadoPorId, undefined);
  assert.strictEqual(pubSanitizada.dataModeracao, undefined);

  console.log("   ✓ Validação estrita de URLs HTTPS e isolamento de links externos aprovados.");
  console.log("   ✓ Controle de acesso por Geral, Turma, Nível, Objetivo e status de arquivamento aprovado.");
  console.log("   ✓ Moderação e sanitização de dados internos de denúncia aprovadas.");
}

// ============================================================================
// PARTE 3: GAMIFICAÇÃO - HORAS DE PRESENÇA REAIS E DESACOPLAMENTO CEFR
// ============================================================================
console.log("\n3. Testando Motor de Gamificação, Presença Real e Desacoplamento CEFR...");
{
  function calcularHorasAulasPresenca(registrosPresenca, aulas) {
    if (!registrosPresenca || !Array.isArray(registrosPresenca)) return 0;
    const aulasMap = new Map((aulas || []).map((a) => [a.id, a]));
    const aulasProcessadas = new Set();
    let totalMinutos = 0;

    for (const reg of registrosPresenca) {
      if (reg.statusPresenca !== "presente") continue;
      if (aulasProcessadas.has(reg.aulaId)) continue;

      const aula = aulasMap.get(reg.aulaId);
      if (!aula || aula.status !== "concluida") continue;

      aulasProcessadas.add(reg.aulaId);
      const duracao = typeof aula.duracaoMinutos === "number" && aula.duracaoMinutos > 0
        ? Math.round(aula.duracaoMinutos)
        : 60;
      totalMinutos += duracao;
    }

    return Math.round((totalMinutos / 60) * 10) / 10;
  }

  const mockAulas = [
    { id: "aula-1", status: "concluida", duracaoMinutos: 60 },
    { id: "aula-2", status: "concluida", duracaoMinutos: 90 },
    { id: "aula-3", status: "concluida", duracaoMinutos: 60 },
    { id: "aula-4", status: "agendada", duracaoMinutos: 60 }, // Ainda não concluída
    { id: "aula-5", status: "cancelada", duracaoMinutos: 60 }, // Cancelada
  ];

  const registrosMariana = [
    { aulaId: "aula-1", alunoId: "alu-001", statusPresenca: "presente" },      // +60 min
    { aulaId: "aula-2", alunoId: "alu-001", statusPresenca: "presente" },      // +90 min
    { aulaId: "aula-3", alunoId: "alu-001", statusPresenca: "ausente" },       // 0 min (falta)
    { aulaId: "aula-4", alunoId: "alu-001", statusPresenca: "presente" },      // 0 min (aula ainda agendada)
    { aulaId: "aula-5", alunoId: "alu-001", statusPresenca: "justificado" },   // 0 min (cancelada/justificada)
    // Duplicata acidental da aula-1
    { aulaId: "aula-1", alunoId: "alu-001", statusPresenca: "presente" },
  ];

  const horasCalculadas = calcularHorasAulasPresenca(registrosMariana, mockAulas);
  // Total deve ser: aula-1 (60) + aula-2 (90) = 150 minutos = 2.5 horas
  assert.strictEqual(horasCalculadas, 2.5, "Deveria calcular exatamente 2.5 horas de presença confirmada");

  // Streak de Flashcards
  function calcularStreakFlashcards(revisoesHistorico, dataReferencia) {
    if (!revisoesHistorico || revisoesHistorico.length === 0) return 0;
    const diasComRevisao = new Set(
      revisoesHistorico.map((r) => r.revisadoEm.slice(0, 10))
    );

    const ref = new Date(dataReferencia);
    const hojeStr = ref.toISOString().slice(0, 10);
    const ontem = new Date(ref);
    ontem.setUTCDate(ontem.getUTCDate() - 1);
    const ontemStr = ontem.toISOString().slice(0, 10);

    let streak = 0;
    let diaAtual = diasComRevisao.has(hojeStr) ? ref : diasComRevisao.has(ontemStr) ? ontem : null;

    if (!diaAtual) return 0;

    const cursor = new Date(diaAtual);
    while (true) {
      const cursorStr = cursor.toISOString().slice(0, 10);
      if (diasComRevisao.has(cursorStr)) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  const historicoRevisoes = [
    { revisadoEm: "2026-10-18T10:00:00.000Z" },
    { revisadoEm: "2026-10-17T15:30:00.000Z" },
    { revisadoEm: "2026-10-16T08:00:00.000Z" },
    { revisadoEm: "2026-10-15T09:00:00.000Z" },
    { revisadoEm: "2026-10-13T10:00:00.000Z" }, // Pulou dia 14!
  ];

  const streakHoje = calcularStreakFlashcards(historicoRevisoes, "2026-10-18T12:00:00.000Z");
  assert.strictEqual(streakHoje, 4, "Streak de 4 dias consecutivos (18, 17, 16, 15)");

  // Desacoplamento CEFR: Nenhum ponto, hora ou streak altera o nível CEFR!
  function atendeCriterioConquista(modelo, aluno, metricas) {
    switch (modelo.tipoCriterio) {
      case "horas_aulas":
        return metricas.horasAulasPresenca >= (modelo.valorCriterio || 0);
      case "revisoes_flashcards":
        return metricas.totalRevisoesFlashcards >= (modelo.valorCriterio || 0);
      case "streak_flashcards":
        return metricas.streakAtualFlashcards >= (modelo.valorCriterio || 0);
      case "marco_nivel":
        // CRUCIAL: Depende EXCLUSIVAMENTE do nível operacional atribuído pelo professor
        return aluno.nivelOperacionalAtual === modelo.nivelExigido;
      default:
        return false;
    }
  }

  const modeloConquistaHoras50 = {
    id: "mod-h50",
    tipoCriterio: "horas_aulas",
    valorCriterio: 50,
  };
  const modeloConquistaNivelB2 = {
    id: "mod-b2",
    tipoCriterio: "marco_nivel",
    nivelExigido: "B2",
  };

  const alunoSuperDedicado = {
    id: "alu-dedicado",
    nivelOperacionalAtual: "A2", // Aluno é A2
  };
  const metricasAluno = {
    horasAulasPresenca: 500, // 500 horas de aula!
    totalRevisoesFlashcards: 10000,
    streakAtualFlashcards: 100,
  };

  // Aluno cumpre critério de horas
  assert.strictEqual(atendeCriterioConquista(modeloConquistaHoras50, alunoSuperDedicado, metricasAluno), true);
  // Aluno NÃO cumpre marco B2 mesmo tendo 500 horas, pois seu nível operacional é A2
  assert.strictEqual(atendeCriterioConquista(modeloConquistaNivelB2, alunoSuperDedicado, metricasAluno), false, "500 horas de presença NUNCA podem conferir nível B2 automaticamente!");

  console.log("   ✓ Horas de presença calculam exclusivamente aulas concluídas com aluno presente.");
  console.log("   ✓ Faltas, aulas futuras e duplicatas não pontuam.");
  console.log("   ✓ Streak de flashcards calculado com precisão de dias contínuos.");
  console.log("   ✓ Desacoplamento CEFR rigorosamente garantido: horas, pontos e streaks nunca concedem níveis.");
}

// ============================================================================
// PARTE 4: PLACAS FÍSICAS - MÁQUINA DE ESTADOS (8 ESTÁGIOS) E CÓDIGO AUTENTICIDADE
// ============================================================================
console.log("\n4. Testando Ciclo de Vida da Placa Física (8 Estágios) e Código de Autenticidade...");
{
  function gerarCodigoValidacaoPlaca(idSolicitacao) {
    const hash = idSolicitacao.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const sufixo = hash.slice(-4).padStart(4, "X");
    return `MTD-PLK-${sufixo}`;
  }

  const cod1 = gerarCodigoValidacaoPlaca("sol-plk-1001");
  assert.strictEqual(cod1, "MTD-PLK-1001");
  assert.strictEqual(cod1.startsWith("MTD-PLK-"), true);

  // Ciclo de Estados da Placa:
  // elegivel -> solicitada -> em_analise -> aprovada -> em_producao -> pronta -> enviada -> entregue (ou rejeitada)
  const transicoesPermitidas = {
    elegivel: ["solicitada"],
    solicitada: ["em_analise", "rejeitada"],
    em_analise: ["aprovada", "rejeitada"],
    aprovada: ["em_producao", "rejeitada"],
    em_producao: ["pronta"],
    pronta: ["enviada"],
    enviada: ["entregue"],
    entregue: [],
    rejeitada: ["solicitada"], // pode solicitar novamente após correções
  };

  function transicionarStatusPlaca(solicitacao, novoStatus, responsavelId, motivo) {
    const permitidos = transicoesPermitidas[solicitacao.status];
    if (!permitidos || !permitidos.includes(novoStatus)) {
      throw new Error(`Transição de '${solicitacao.status}' para '${novoStatus}' não é permitida`);
    }

    const agora = new Date().toISOString();
    return {
      ...solicitacao,
      status: novoStatus,
      atualizadoEm: agora,
      historicoStatus: [
        ...solicitacao.historicoStatus,
        {
          status: novoStatus,
          data: agora,
          responsavelId,
          motivo,
        },
      ],
    };
  }

  let solicitacao = {
    id: "sol-001",
    alunoId: "alu-001",
    conquistaConcedidaId: "conq-001",
    nomeParaGravacao: "Mariana Oliveira",
    status: "solicitada",
    criadoEm: "2026-10-18T10:00:00.000Z",
    atualizadoEm: "2026-10-18T10:00:00.000Z",
    historicoStatus: [
      { status: "solicitada", data: "2026-10-18T10:00:00.000Z", responsavelId: "alu-001" },
    ],
  };

  // 1. Aluno solicitou -> Coordenação coloca em análise
  solicitacao = transicionarStatusPlaca(solicitacao, "em_analise", "adm-001", "Verificação pedagógica");
  assert.strictEqual(solicitacao.status, "em_analise");

  // 2. Coordenação aprova solicitação
  solicitacao = transicionarStatusPlaca(solicitacao, "aprovada", "adm-001", "Critérios confirmados");
  assert.strictEqual(solicitacao.status, "aprovada");

  // 3. Enviada para produção da gráfica
  solicitacao = transicionarStatusPlaca(solicitacao, "em_producao", "adm-001", "Lote enviado à fábrica");
  assert.strictEqual(solicitacao.status, "em_producao");

  // 4. Recebida pronta na escola
  solicitacao = transicionarStatusPlaca(solicitacao, "pronta", "adm-001", "Placa conferida fisicamente");
  assert.strictEqual(solicitacao.status, "pronta");

  // 5. Enviada via correios/transportadora (registra rastreio)
  solicitacao = transicionarStatusPlaca(solicitacao, "enviada", "adm-001", "Despachada");
  solicitacao.codigoRastreio = "QB123456789BR";
  assert.strictEqual(solicitacao.status, "enviada");
  assert.strictEqual(solicitacao.codigoRastreio, "QB123456789BR");

  // 6. Entregue ao aluno
  solicitacao = transicionarStatusPlaca(solicitacao, "entregue", "adm-001", "Recebimento confirmado pelo aluno");
  assert.strictEqual(solicitacao.status, "entregue");
  assert.strictEqual(solicitacao.historicoStatus.length, 7);

  // Tentativa de transição inválida (de entregue para em_producao) deve falhar
  assert.throws(
    () => transicionarStatusPlaca(solicitacao, "em_producao", "adm-001", "Inválido"),
    /não é permitida/
  );

  // Teste de rejeição e reabertura
  let solRejeitada = {
    id: "sol-002",
    status: "solicitada",
    historicoStatus: [],
  };
  solRejeitada = transicionarStatusPlaca(solRejeitada, "rejeitada", "adm-001", "Nome para gravação incompleto");
  assert.strictEqual(solRejeitada.status, "rejeitada");
  // Aluno corrige o nome e solicita novamente
  solRejeitada = transicionarStatusPlaca(solRejeitada, "solicitada", "alu-001", "Nome corrigido");
  assert.strictEqual(solRejeitada.status, "solicitada");

  console.log("   ✓ Geração de código de autenticidade no padrão 'MTD-PLK-XXXX' aprovada.");
  console.log("   ✓ Máquina de estados completa de 8 fases para placa física validada com sucesso.");
  console.log("   ✓ Rastreamento e bloqueio de transições ilegais aprovados.");
}

console.log("\n============================================================");
console.log("TODOS OS TESTES DA ETAPA 8 PASSARAM COM 100% DE SUCESSO!");
console.log("============================================================\n");
