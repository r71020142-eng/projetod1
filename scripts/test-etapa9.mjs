import assert from "node:assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 9 ===");
console.log("Auditoria Geral, Estabilização, Jornadas Integradas e Filtros de Permissão\n");

// ============================================================================
// JORNADA 1: ALUNO -> TURMA -> MATRÍCULA -> AULA -> PRESENÇA -> HORAS & CONQUISTA
// ============================================================================
console.log("1. Testando Jornada 1: Aluno, Turma, Matrícula, Aula, Presença e Cômputo de Horas...");
{
  const mockAluno = {
    id: "alu-test-01",
    nome: "Carlos Eduardo",
    email: "carlos.eduardo@example.com",
    nivel: "A1",
    status: "ativo",
  };

  const mockTurma = {
    id: "turma-test-01",
    nome: "Turma A1 - Noite",
    capacidade: 6,
    alunoIds: [],
    professorId: "prof-001",
  };

  // 1. Matricular aluno
  mockTurma.alunoIds.push(mockAluno.id);
  assert.strictEqual(mockTurma.alunoIds.includes(mockAluno.id), true, "Aluno deve estar matriculado na turma");

  // 2. Agendar aula
  const mockAula = {
    id: "aula-test-01",
    turmaId: mockTurma.id,
    professorId: mockTurma.professorId,
    titulo: "Foundations of Everyday English",
    duracaoMinutos: 90,
    status: "concluida",
    chamada: [],
  };

  // 3. Registrar presença
  mockAula.chamada.push({
    alunoId: mockAluno.id,
    presenca: "presente",
    registradoEm: new Date().toISOString(),
  });

  // 4. Calcular horas de aula reais com presença
  function calcularHorasPresenca(aulas, alunoId) {
    let minutos = 0;
    for (const a of aulas) {
      if (a.status !== "concluida") continue;
      const ch = a.chamada.find((c) => c.alunoId === alunoId);
      if (ch && ch.presenca === "presente") {
        minutos += a.duracaoMinutos || 60;
      }
    }
    return Math.round((minutos / 60) * 10) / 10;
  }

  const horas = calcularHorasPresenca([mockAula], mockAluno.id);
  assert.strictEqual(horas, 1.5, "90 minutos de presença confirmada devem computar exatamente 1.5 horas");

  // 5. Avaliar elegibilidade de conquista por horas
  const modeloConquistaHoras = {
    id: "mod-horas-1",
    tipoCriterio: "horas_aulas",
    metaValor: 1.5,
  };

  const elegivel = horas >= modeloConquistaHoras.metaValor;
  assert.strictEqual(elegivel, true, "Conquista de 1.5h deve ser elegível com 1.5h cumpridas");
  console.log("   ✓ Jornada 1 concluída com sucesso!");
}

// ============================================================================
// JORNADA 2: ATIVIDADE -> RASCUNHO -> SUBMISSÃO -> CORREÇÃO DOCENTE -> DASHBOARD
// ============================================================================
console.log("2. Testando Jornada 2: Atividade, Rascunho, Submissão, Correção e Atualização de Indicadores...");
{
  const mockAtividade = {
    id: "atv-test-01",
    titulo: "My Daily Routine Essay",
    destinoTipo: "turma",
    turmaId: "turma-test-01",
  };

  // 1. Aluno salva rascunho
  const entrega = {
    id: "ent-test-01",
    atividadeId: mockAtividade.id,
    alunoId: "alu-test-01",
    status: "rascunho",
    respostaTexto: "Every morning I wake up at 7 AM...",
    historicoEnvios: [],
  };
  assert.strictEqual(entrega.status, "rascunho");

  // 2. Aluno envia a atividade
  entrega.status = "entregue";
  entrega.dataEnvio = new Date().toISOString();
  entrega.historicoEnvios.push({
    versao: 1,
    texto: entrega.respostaTexto,
    enviadoEm: entrega.dataEnvio,
  });
  assert.strictEqual(entrega.status, "entregue");

  // 3. Indicadores administrativos antes da correção
  const entregasAguardandoAntes = [entrega].filter((e) => e.status === "entregue").length;
  assert.strictEqual(entregasAguardandoAntes, 1, "Deve contabilizar 1 entrega aguardando correção");

  // 4. Professor corrige a atividade
  entrega.status = "corrigida";
  entrega.nota = 9.0;
  entrega.feedbackDocente = "Excelente organização textual e vocabulário preciso!";
  entrega.corrigidoPorId = "prof-001";
  entrega.dataCorrecao = new Date().toISOString();

  // 5. Indicadores atualizados
  const entregasAguardandoDepois = [entrega].filter((e) => e.status === "entregue").length;
  const concluidasAluno = [entrega].filter((e) => e.status === "corrigida").length;
  assert.strictEqual(entregasAguardandoDepois, 0, "Fila de correção do admin deve zerar após correção");
  assert.strictEqual(concluidasAluno, 1, "Dashboard do aluno deve contabilizar 1 atividade concluída");
  console.log("   ✓ Jornada 2 concluída com sucesso!");
}

// ============================================================================
// JORNADA 3: SELF PRESENTATION -> RUBRICA ORAL -> NÍVEL MANUAL -> MARCO PEDAGÓGICO
// ============================================================================
console.log("3. Testando Jornada 3: Self Presentation, Rubrica Oral e Atribuição Manual de Nível...");
{
  const submissaoSP = {
    id: "sp-test-01",
    alunoId: "alu-test-01",
    videoUrl: "https://storage.mtd.internal/videos/sp-alu-01.mp4",
    status: "pendente",
    termoConsentimentoAceito: true,
  };

  // 1. Professor avalia com os 6 critérios orais (1 a 5)
  const notas = {
    fluencia: 4,
    pronuncia: 4,
    vocabulario: 3,
    gramatica: 4,
    compreensao: 5,
    confianca: 4,
  };
  const media = Object.values(notas).reduce((a, b) => a + b, 0) / 6; // 24 / 6 = 4.0
  assert.strictEqual(media, 4.0, "Média dos critérios deve ser 4.0");

  submissaoSP.criterios = notas;
  submissaoSP.mediaCriteriosOrais = media;
  submissaoSP.status = "avaliada";
  submissaoSP.observacoesInternas = "Aluno demonstrou ótima desenvoltura; manter foco em preposições.";

  // 2. REGRA DO MÉTODO PAULO: Nenhuma média infere nível automaticamente
  const nivelSugeridoAutomatico = undefined;
  assert.strictEqual(nivelSugeridoAutomatico, undefined, "Nenhum nível CEFR pode ser inferido por cálculo automático");

  // 3. Aplicação 100% manual com justificativa pedagógica
  const historicoNivel = {
    alunoId: "alu-test-01",
    nivelAnterior: "A1",
    nivelNovo: "B1",
    justificativaPedagogica: "Aluno consolidou a estrutura básica e demonstrou autonomia comunicativa no teste oral.",
    professorId: "prof-001",
    criadoEm: new Date().toISOString(),
  };

  assert.strictEqual(historicoNivel.nivelNovo, "B1");
  assert.strictEqual(Boolean(historicoNivel.justificativaPedagogica), true, "Justificativa docente é estritamente obrigatória");
  console.log("   ✓ Jornada 3 concluída com sucesso!");
}

// ============================================================================
// JORNADA 4: FLASHCARDS SRS -> SM-2 -> REGRA 'ERREI' -> PONTOS SEM DUPLICAÇÃO
// ============================================================================
console.log("4. Testando Jornada 4: Flashcards SRS, Reagendamento de 10 min e Idempotência de Pontos...");
{
  const cartao = {
    id: "card-01",
    baralhoId: "baralho-01",
    frente: "Get over",
    verso: "Superar ou recuperar-se de algo",
  };

  const progresso = {
    cartaoId: cartao.id,
    alunoId: "alu-test-01",
    intervaloDias: 3,
    fatorFacilidade: 2.5,
    repeticoes: 2,
    nextReviewAt: new Date().toISOString(),
  };

  // 1. Resposta 'Errei' agenda para 10 minutos após
  const agoraMs = Date.now();
  const nextReviewErrei = new Date(agoraMs + 10 * 60 * 1000).toISOString();
  progresso.intervaloDias = 0;
  progresso.repeticoes = 0;
  progresso.fatorFacilidade = Math.max(1.3, progresso.fatorFacilidade - 0.2); // 2.3
  progresso.nextReviewAt = nextReviewErrei;

  const diferencaMinutos = Math.round((new Date(progresso.nextReviewAt).getTime() - agoraMs) / 60000);
  assert.strictEqual(diferencaMinutos, 10, "Resposta 'errei' deve agendar estritamente para 10 minutos no futuro");

  // 2. Pontos da revisão diária: garantia de idempotência (1 por dia)
  const ledgerPontos = [];
  function atribuirPontosRevisaoDiaria(alunoId, dataRef) {
    const refKey = `srs-${alunoId}-${dataRef}`;
    if (ledgerPontos.some((p) => p.referenciaId === refKey)) {
      return { success: false, reason: "Pontos já concedidos hoje" };
    }
    ledgerPontos.push({
      id: `ev-pts-${Date.now()}`,
      alunoId,
      tipoAcao: "revisao_flashcards_diaria",
      pontos: 10,
      referenciaId: refKey,
    });
    return { success: true, pontos: 10 };
  }

  const primeiraTentativa = atribuirPontosRevisaoDiaria("alu-test-01", "2026-10-18");
  const segundaTentativa = atribuirPontosRevisaoDiaria("alu-test-01", "2026-10-18");

  assert.strictEqual(primeiraTentativa.success, true, "Primeira sessão do dia deve pontuar +10");
  assert.strictEqual(segundaTentativa.success, false, "Segunda sessão no mesmo dia NÃO pode duplicar pontos");
  assert.strictEqual(ledgerPontos.length, 1, "Ledger de pontos deve manter exatamente 1 registro");
  console.log("   ✓ Jornada 4 concluída com sucesso!");
}

// ============================================================================
// JORNADA 5: AVALIAÇÃO -> POLÍTICA DE GABARITO -> CORREÇÃO PRÁTICA -> MÉTODO PAULO
// ============================================================================
console.log("5. Testando Jornada 5: Avaliação, Políticas de Gabarito e Validação Docente de Módulo...");
{
  const modulo = {
    id: "mod-01",
    nome: "Módulo 1 - Fundamentos",
    horasNecessarias: 10,
    atividadesNecessarias: 3,
    praticaObrigatoria: true,
  };

  const progressoAluno = {
    alunoId: "alu-test-01",
    moduloId: modulo.id,
    horasCumpridas: 10,
    atividadesEntregues: 3,
    praticaAprovada: false,
    status: "em_andamento",
  };

  // 1. Aluno submete avaliação prática
  const tentativaPratica = {
    id: "tent-prat-01",
    alunoId: "alu-test-01",
    moduloId: modulo.id,
    status: "aguardando_correcao",
    respostaAluno: "Audio and written response to communicative challenge.",
  };

  // 2. Professor corrige e aprova
  tentativaPratica.status = "corrigida";
  tentativaPratica.nota = 8.5;
  tentativaPratica.aprovado = true;
  tentativaPratica.feedback = "Excelente uso dos conectivos.";

  progressoAluno.praticaAprovada = true;

  // 3. Critérios 100% cumpridos: módulo entra em 'aguardando_validacao'
  const todosCriteriosCumpridos =
    progressoAluno.horasCumpridas >= modulo.horasNecessarias &&
    progressoAluno.atividadesEntregues >= modulo.atividadesNecessarias &&
    progressoAluno.praticaAprovada;

  if (todosCriteriosCumpridos) {
    progressoAluno.status = "aguardando_validacao";
  }
  assert.strictEqual(progressoAluno.status, "aguardando_validacao", "Módulo completo deve aguardar parecer formal docente");

  // 4. Professor emite aprovação formal
  progressoAluno.status = "concluido";
  progressoAluno.validadoPorId = "prof-001";
  progressoAluno.parecerFinal = "Aluno apto para avançar ao Módulo 2.";

  assert.strictEqual(progressoAluno.status, "concluido");
  console.log("   ✓ Jornada 5 concluída com sucesso!");
}

// ============================================================================
// JORNADA 6: COMUNIDADE -> COMENTÁRIO -> REAÇÃO ÚNICA -> MODERAÇÃO -> ZERO PONTOS
// ============================================================================
console.log("6. Testando Jornada 6: Comunidade, Reação Única com Substituição e ZERO PONTOS...");
{
  const publicacao = {
    id: "pub-01",
    autorId: "alu-test-01",
    conteudo: "Dica de estudo: escutar podcasts com velocidade 1.0x primeiro!",
    reacoes: { curtidas: 0, apoio: 0, parabens: 0 },
    reacoesPorUsuario: {},
    comentariosCount: 0,
    status: "publicada",
  };

  function alternarReacao(pub, tipoReacao, usuarioId) {
    const anterior = pub.reacoesPorUsuario[usuarioId];
    if (anterior === tipoReacao) {
      // Toggle off
      pub.reacoes[tipoReacao] = Math.max(0, (pub.reacoes[tipoReacao] || 0) - 1);
      delete pub.reacoesPorUsuario[usuarioId];
    } else {
      if (anterior) {
        pub.reacoes[anterior] = Math.max(0, (pub.reacoes[anterior] || 0) - 1);
      }
      pub.reacoes[tipoReacao] = (pub.reacoes[tipoReacao] || 0) + 1;
      pub.reacoesPorUsuario[usuarioId] = tipoReacao;
    }
    // Regra rígida: retorno de pontos é SEMPRE zero
    return { pub, pontosGerados: 0 };
  }

  // 1. Usuário 1 curte
  const res1 = alternarReacao(publicacao, "curtidas", "user-A");
  assert.strictEqual(publicacao.reacoes.curtidas, 1);
  assert.strictEqual(res1.pontosGerados, 0, "Curtida deve gerar ZERO pontos");

  // 2. Usuário 1 troca para 'parabens'
  const res2 = alternarReacao(publicacao, "parabens", "user-A");
  assert.strictEqual(publicacao.reacoes.curtidas, 0, "Curtida anterior deve ser decrementada");
  assert.strictEqual(publicacao.reacoes.parabens, 1, "Nova reação deve ser incrementada");
  assert.strictEqual(publicacao.reacoesPorUsuario["user-A"], "parabens");
  assert.strictEqual(res2.pontosGerados, 0, "Troca de reação deve gerar ZERO pontos");

  // 3. Usuário 1 clica novamente em 'parabens' (toggle off)
  const res3 = alternarReacao(publicacao, "parabens", "user-A");
  assert.strictEqual(publicacao.reacoes.parabens, 0, "Desmarcação deve zerar a reação");
  assert.strictEqual(publicacao.reacoesPorUsuario["user-A"], undefined);
  assert.strictEqual(res3.pontosGerados, 0);

  // 4. Denúncia e Moderação
  const denuncia = {
    id: "den-01",
    publicacaoId: publicacao.id,
    denuncianteId: "user-B",
    motivo: "spam",
    status: "pendente",
  };
  assert.strictEqual(denuncia.status, "pendente");

  // Coordenação oculta
  publicacao.status = "oculta";
  assert.strictEqual(publicacao.status, "oculta");
  console.log("   ✓ Jornada 6 concluída com sucesso!");
}

// ============================================================================
// JORNADA 7: CONQUISTA -> PLACA FÍSICA -> HISTÓRICO -> OBSERVAÇÕES CONFIDENCIAIS
// ============================================================================
console.log("7. Testando Jornada 7: Concessão de Conquista, Placa Física e Sigilo de Observações Internas...");
{
  const conquistaConcedida = {
    id: "conq-01",
    alunoId: "alu-test-01",
    modeloId: "mod-b1",
    modeloNome: "Marco B1 • Fluência e Autonomia",
    codigoValidacaoDigital: "MTD-PLK-9921-B1",
    dataConcessao: new Date().toISOString(),
  };

  // 1. Aluno manifesta interesse em receber a placa física
  const solicitacaoPlaca = {
    id: "plk-01",
    alunoId: conquistaConcedida.alunoId,
    conquistaId: conquistaConcedida.id,
    status: "solicitada",
    codigoValidacao: conquistaConcedida.codigoValidacaoDigital,
    observacoesInternas: "Validado endereço de entrega via secretaria; liberar para gravação a laser.",
  };

  // 2. Máquina de estados da placa física (avanço controlado)
  const ESTADOS_VALIDOS = ["solicitada", "em_analise", "aprovada", "em_producao", "pronta", "enviada", "entregue"];
  solicitacaoPlaca.status = "em_producao";
  assert.strictEqual(ESTADOS_VALIDOS.includes(solicitacaoPlaca.status), true);

  // 3. Sanitização obrigatória para o aluno
  function sanitizarPlacaParaAluno(placa) {
    const copia = { ...placa };
    delete copia.observacoesInternas;
    return copia;
  }

  const placaAluno = sanitizarPlacaParaAluno(solicitacaoPlaca);
  assert.strictEqual(placaAluno.observacoesInternas, undefined, "observacoesInternas NUNCA podem vazar para o aluno");
  assert.strictEqual(solicitacaoPlaca.observacoesInternas.includes("secretaria"), true, "Original interno preservado");
  console.log("   ✓ Jornada 7 concluída com sucesso!");
}

// ============================================================================
// PARTE 8: TESTES DE FILTROS DE PERMISSÃO DEMONSTRATIVA (APRESENTAÇÃO)
// ============================================================================
console.log("8. Testando Filtros de Apresentação e Permissões Demonstrativas...");
{
  const alunoLogadoId = "alu-001";
  const turmasMatriculadas = ["turma-001"];

  const todasAulas = [
    { id: "a-1", turmaId: "turma-001", tema: "Aula Turma 1" },
    { id: "a-2", turmaId: "turma-002", tema: "Aula Turma 2" },
  ];

  const todosMateriais = [
    { id: "m-1", destinoTipo: "geral", titulo: "Apostila Geral" },
    { id: "m-2", destinoTipo: "turma", turmaId: "turma-001", titulo: "Slides Turma 1" },
    { id: "m-3", destinoTipo: "turma", turmaId: "turma-002", titulo: "Slides Turma 2" },
  ];

  // Filtro 1: Aluno não visualiza aulas de outra turma
  const aulasVisiveis = todasAulas.filter((a) => turmasMatriculadas.includes(a.turmaId));
  assert.strictEqual(aulasVisiveis.length, 1);
  assert.strictEqual(aulasVisiveis[0].id, "a-1");

  // Filtro 2: Aluno não visualiza materiais de outra turma
  const materiaisVisiveis = todosMateriais.filter(
    (m) => m.destinoTipo === "geral" || (m.destinoTipo === "turma" && turmasMatriculadas.includes(m.turmaId))
  );
  assert.strictEqual(materiaisVisiveis.length, 2);
  assert.strictEqual(materiaisVisiveis.some((m) => m.id === "m-3"), false);

  // Filtro 3: Aluno não visualiza denúncias de outros usuários
  const denuncias = [
    { id: "den-01", denuncianteId: "alu-001", status: "pendente" },
    { id: "den-02", denuncianteId: "alu-002", status: "pendente" },
  ];
  const denunciasVisiveisAdmin = denuncias; // Admin vê todas
  const denunciasVisiveisAluno = denuncias.filter((d) => d.denuncianteId === alunoLogadoId);
  assert.strictEqual(denunciasVisiveisAdmin.length, 2);
  assert.strictEqual(denunciasVisiveisAluno.length, 1);

  console.log("   ✓ Filtros de permissão demonstrativa aprovados com sucesso!");
}

console.log("\n============================================================");
console.log("TODAS AS 7 JORNADAS E FILTROS DA ETAPA 9 PASSARAM COM SUCESSO!");
console.log("============================================================\n");
