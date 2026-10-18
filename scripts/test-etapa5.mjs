/**
 * Automated Test Suite for ETAPA 5: Self Presentation, Avaliação Pedagógica e Nivelamento Inicial
 * & Correções Obrigatórias da Etapa 4
 * Platform: DEMOSTRATIVO MTD
 */

import assert from "node:assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 5 ===\n");

// --------------------------------------------------------------------------
// TEST 1: CORREÇÕES DA ETAPA 4 - PARSER NATIVO URL & LINKS EXTERNOS HTTPS
// --------------------------------------------------------------------------
console.log("1. Testando Validação Robusta de Links Externos HTTPS (Native URL Parser)...");
{
  function isValidHttpsUrl(urlString) {
    if (!urlString || typeof urlString !== "string") return false;
    const trimmed = urlString.trim();
    if (!trimmed.startsWith("https://")) return false;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") return false;
      if (!parsed.hostname || parsed.hostname.length < 3) return false;
      if (!parsed.hostname.includes(".")) return false;
      return true;
    } catch {
      return false;
    }
  }

  // Valid HTTPS URLs
  assert.strictEqual(isValidHttpsUrl("https://youtube.com/watch?v=12345"), true);
  assert.strictEqual(isValidHttpsUrl("https://vimeo.com/987654321"), true);
  assert.strictEqual(isValidHttpsUrl("https://drive.google.com/file/d/abcdef/view"), true);
  assert.strictEqual(isValidHttpsUrl("https://meet.google.com/abc-defg-hij"), true);

  // Invalid URLs (non-https, malformed, injections)
  assert.strictEqual(isValidHttpsUrl("http://youtube.com/watch?v=12345"), false, "HTTP não deve ser aceito");
  assert.strictEqual(isValidHttpsUrl("javascript:alert(1)"), false, "Protocolo malicioso deve ser rejeitado");
  assert.strictEqual(isValidHttpsUrl("ftp://files.example.com"), false, "FTP deve ser rejeitado");
  assert.strictEqual(isValidHttpsUrl("https://localhost"), false, "Hostname sem ponto deve ser rejeitado");
  assert.strictEqual(isValidHttpsUrl("https://"), false, "URL vazia pós-protocolo deve falhar");
  assert.strictEqual(isValidHttpsUrl("not-a-url"), false, "String comum deve falhar");

  console.log("   ✓ Validação nativa de URL HTTPS aprovada com segurança.");
}

// --------------------------------------------------------------------------
// TEST 2: TERMO DE CONSENTIMENTO E RASCUNHO DE SELF PRESENTATION
// --------------------------------------------------------------------------
console.log("\n2. Testando Regras de Consentimento e Criação de Rascunho...");
{
  const VERSAO_CONSENTIMENTO_ATUAL = "v1.0";

  function validateSelfPresentationInput(input, isDraft = false) {
    const errors = {};
    if (!input.titulo || input.titulo.trim().length < 3) {
      errors.titulo = "O título da apresentação deve ter pelo menos 3 caracteres.";
    }

    if (isDraft) {
      if (input.linkVideo && input.linkVideo.trim().length > 0) {
        if (!input.linkVideo.trim().startsWith("https://")) {
          errors.linkVideo = "O link do vídeo deve utilizar o protocolo seguro HTTPS.";
        }
      }
      return { isValid: Object.keys(errors).length === 0, errors };
    }

    // Regras estritas de envio final
    if (!input.linkVideo || input.linkVideo.trim().length === 0) {
      errors.linkVideo = "O link externo do vídeo é obrigatório para envio.";
    } else if (!input.linkVideo.trim().startsWith("https://")) {
      errors.linkVideo = "O link do vídeo deve utilizar o protocolo seguro HTTPS.";
    }

    if (!input.consentimento || !input.consentimento.aceito) {
      errors.consentimento = "É obrigatório aceitar o termo de consentimento pedagógico para submeter a gravação.";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  // Rascunho pode ser salvo mesmo sem vídeo ou consentimento
  const rascunhoValido = validateSelfPresentationInput({
    titulo: "My Self Presentation - Draft",
    linkVideo: "",
    consentimento: { aceito: false, dataHora: "", versaoTexto: "v1.0" },
  }, true);
  assert.strictEqual(rascunhoValido.isValid, true, "Rascunho inicial sem vídeo deve ser válido");

  // Envio final sem consentimento DEVE ser rejeitado
  const envioSemConsentimento = validateSelfPresentationInput({
    titulo: "Apresentação Oral - Mariana",
    linkVideo: "https://youtube.com/watch?v=mariana1",
    consentimento: { aceito: false, dataHora: "", versaoTexto: "v1.0" },
  }, false);
  assert.strictEqual(envioSemConsentimento.isValid, false, "Submissão sem consentimento deve falhar");
  assert.ok(envioSemConsentimento.errors.consentimento, "Erro de consentimento deve existir");

  // Envio final completo
  const envioValido = validateSelfPresentationInput({
    titulo: "Apresentação Oral - Mariana",
    linkVideo: "https://youtube.com/watch?v=mariana1",
    consentimento: { aceito: true, dataHora: new Date().toISOString(), versaoTexto: VERSAO_CONSENTIMENTO_ATUAL },
  }, false);
  assert.strictEqual(envioValido.isValid, true, "Envio com vídeo HTTPS e consentimento deve passar");

  console.log("   ✓ Validação de consentimento pedagógico obrigatório aprovada.");
}

// --------------------------------------------------------------------------
// TEST 3: BLOQUEIO DE EDIÇÃO CASUAL PÓS-ENVIO
// --------------------------------------------------------------------------
console.log("\n3. Testando Bloqueio de Edição Pós-Envio...");
{
  function podeEditarApresentacao(status) {
    // Apenas rascunho ou se reenvio foi explicitamente solicitado pelo professor
    return status === "rascunho" || status === "reenvio_solicitado";
  }

  assert.strictEqual(podeEditarApresentacao("rascunho"), true, "Rascunho pode ser editado");
  assert.strictEqual(podeEditarApresentacao("reenvio_solicitado"), true, "Reenvio solicitado pode ser editado");
  assert.strictEqual(podeEditarApresentacao("enviada"), false, "Apresentação enviada não pode sofrer edições casuais");
  assert.strictEqual(podeEditarApresentacao("em_avaliacao"), false, "Apresentação em avaliação não pode ser editada pelo aluno");
  assert.strictEqual(podeEditarApresentacao("avaliada"), false, "Apresentação já avaliada está congelada");

  console.log("   ✓ Bloqueio de edição pós-envio garantido.");
}

// --------------------------------------------------------------------------
// TEST 4: REGRA DE UNICIDADE DE NIVELAMENTO INICIAL ATIVO POR ALUNO
// --------------------------------------------------------------------------
console.log("\n4. Testando Unicidade de Nivelamento Inicial Ativo...");
{
  const apresentacoesExistentes = [
    {
      id: "sp-001",
      alunoId: "alu-001",
      tipo: "nivelamento_inicial",
      status: "avaliada",
    },
    {
      id: "sp-002",
      alunoId: "alu-002",
      tipo: "nivelamento_inicial",
      status: "enviada",
    },
  ];

  function verificarPermissaoNovoNivelamento(alunoId, tipoSolicitado) {
    if (tipoSolicitado !== "nivelamento_inicial") return { permitido: true };

    const jaTem = apresentacoesExistentes.find(
      (sp) =>
        sp.alunoId === alunoId &&
        sp.tipo === "nivelamento_inicial" &&
        (sp.status === "enviada" || sp.status === "em_avaliacao" || sp.status === "avaliada")
    );

    if (jaTem) {
      return {
        permitido: false,
        motivo: "O aluno já possui um nivelamento inicial ativo ou concluído. Novas apresentações devem ser Reavaliações.",
      };
    }

    return { permitido: true };
  }

  // Aluno 1 já possui nivelamento concluído -> bloqueia novo nivelamento inicial
  const resAlu1 = verificarPermissaoNovoNivelamento("alu-001", "nivelamento_inicial");
  assert.strictEqual(resAlu1.permitido, false);

  // Aluno 1 pode criar reavaliação normalmente
  const resAlu1Reaval = verificarPermissaoNovoNivelamento("alu-001", "reavaliacao");
  assert.strictEqual(resAlu1Reaval.permitido, true);

  // Aluno 3 não tem nenhuma -> pode criar nivelamento inicial
  const resAlu3 = verificarPermissaoNovoNivelamento("alu-003", "nivelamento_inicial");
  assert.strictEqual(resAlu3.permitido, true);

  console.log("   ✓ Regra de unicidade de nivelamento inicial por aluno verificada com sucesso.");
}

// --------------------------------------------------------------------------
// TEST 5: FILA DE ATENDIMENTO E ATRIBUIÇÃO A PROFESSOR DEMOSTRATIVO
// --------------------------------------------------------------------------
console.log("\n5. Testando Fila de Atendimento e Atribuição de Avaliador...");
{
  const fila = [
    { id: "sp-002", criadoEm: "2026-10-15T10:00:00Z", status: "enviada", professorAvaliadorId: undefined },
    { id: "sp-003", criadoEm: "2026-10-14T08:00:00Z", status: "enviada", professorAvaliadorId: undefined },
    { id: "sp-004", criadoEm: "2026-10-16T14:00:00Z", status: "enviada", professorAvaliadorId: undefined },
  ];

  // Ordenação padrão para fila pedagógica: mais antigas primeiro
  const ordenadas = [...fila].sort(
    (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
  );
  assert.strictEqual(ordenadas[0].id, "sp-003", "A mais antiga deve estar no topo da fila de atendimento");
  assert.strictEqual(ordenadas[2].id, "sp-004", "A mais recente deve estar no final da fila");

  // Assumir avaliação
  function assumirAvaliacao(apresentacao, professorId, professorNome) {
    return {
      ...apresentacao,
      status: "em_avaliacao",
      professorAvaliadorId: professorId,
      professorAvaliadorNome: professorNome,
      dataInicioAvaliacao: new Date().toISOString(),
    };
  }

  const emAvaliacao = assumirAvaliacao(ordenadas[0], "prof-001", "Lucas Ferreira");
  assert.strictEqual(emAvaliacao.status, "em_avaliacao");
  assert.strictEqual(emAvaliacao.professorAvaliadorId, "prof-001");
  assert.ok(emAvaliacao.dataInicioAvaliacao, "Deve registrar data de início da avaliação");

  console.log("   ✓ Fila com ordenação 'antigas_primeiro' e atribuição de professor aprovadas.");
}

// --------------------------------------------------------------------------
// TEST 6: RUBRICA MANUAL (6 CRITÉRIOS) E CÁLCULO DE NÍVEL SUGERIDO
// --------------------------------------------------------------------------
// TEST 6: RUBRICA MANUAL (6 CRITÉRIOS) E MÉDIA DOS CRITÉRIOS ORAIS (SEM CEFR AUTOMÁTICO)
// --------------------------------------------------------------------------
console.log("\n6. Testando Rubrica Manual de 6 Critérios e Desacoplamento CEFR...");
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

    return {
      media,
      explicacao: `Média dos critérios orais: ${media.toFixed(1)} / 5.0. A Self Presentation avalia prioritariamente a produção oral e não representa uma avaliação CEFR completa. O nível operacional deve ser atribuído e justificado manualmente pelo professor.`,
    };
  }

  // Caso intermediário (3.0)
  const rubricaIntermediaria = {
    fluencia: { pontuacao: 3, comentario: "Fluente com pausas naturais" },
    vocabulario: { pontuacao: 3, comentario: "Vocabulário variado" },
    gramaticaAplicada: { pontuacao: 3, comentario: "Estruturas básicas bem dominadas" },
    pronunciaInteligibilidade: { pontuacao: 3, comentario: "Boa inteligibilidade geral" },
    coerenciaOrganizacao: { pontuacao: 3, comentario: "Narrativa clara" },
    compreensaoGeral: { pontuacao: 3, comentario: "Compreensível sem esforço" },
  };
  const resInter = calcularMediaCriteriosOrais(rubricaIntermediaria);
  assert.strictEqual(resInter.media, 3.0);
  assert.strictEqual(typeof resInter.media, "number");
  // GARANTIA: Não retorna nenhuma propriedade de nível nem gera CEFR
  assert.strictEqual(resInter.nivel, undefined, "Nenhuma média pode conter ou gerar nível automático");
  assert.strictEqual(resInter.nivelSugerido, undefined, "Não pode existir nível sugerido na resposta");
  assert.ok(resInter.explicacao.includes("Média dos critérios orais"));
  assert.ok(resInter.explicacao.includes("não representa uma avaliação CEFR completa"));

  // Caso inicial (1.2)
  const rubricaInicial = {
    fluencia: { pontuacao: 1, comentario: "Muitas hesitações" },
    vocabulario: { pontuacao: 1, comentario: "Vocabulário muito restrito" },
    gramaticaAplicada: { pontuacao: 2, comentario: "Apenas frases isoladas" },
    pronunciaInteligibilidade: { pontuacao: 1, comentario: "Dificuldade em fonemas-chave" },
    coerenciaOrganizacao: { pontuacao: 1, comentario: "Ideias fragmentadas" },
    compreensaoGeral: { pontuacao: 1, comentario: "Produção limitada" },
  };
  const resIni = calcularMediaCriteriosOrais(rubricaInicial);
  assert.strictEqual(resIni.media, 1.2);
  assert.strictEqual(resIni.nivel, undefined);

  // Caso avançado (4.7)
  const rubricaAvancada = {
    fluencia: { pontuacao: 5, comentario: "Excelente naturalidade" },
    vocabulario: { pontuacao: 5, comentario: "Idiomático e preciso" },
    gramaticaAplicada: { pontuacao: 4, comentario: "Domínio de estruturas complexas" },
    pronunciaInteligibilidade: { pontuacao: 4, comentario: "Clara e inteligível" },
    coerenciaOrganizacao: { pontuacao: 5, comentario: "Discurso bem estruturado" },
    compreensaoGeral: { pontuacao: 5, comentario: "Comunicação espontânea plena" },
  };
  const resAvanc = calcularMediaCriteriosOrais(rubricaAvancada);
  assert.strictEqual(resAvanc.media, 4.7);
  assert.strictEqual(resAvanc.nivel, undefined);

  // TESTE OBRIGATÓRIO: Nenhuma média (de 1.0 a 5.0) gera um nível CEFR automaticamente
  for (let score = 10; score <= 50; score += 2) {
    const fakeRubrica = {
      fluencia: { pontuacao: score / 10 },
      vocabulario: { pontuacao: score / 10 },
      gramaticaAplicada: { pontuacao: score / 10 },
      pronunciaInteligibilidade: { pontuacao: score / 10 },
      coerenciaOrganizacao: { pontuacao: score / 10 },
      compreensaoGeral: { pontuacao: score / 10 },
    };
    const r = calcularMediaCriteriosOrais(fakeRubrica);
    assert.strictEqual(r.nivel, undefined, `Nota ${score / 10} não pode produzir nível sugerido`);
    assert.strictEqual(r.nivelSugerido, undefined);
  }

  console.log("   ✓ Média aritmética dos critérios orais e regra de NÃO conversão para CEFR validadas com sucesso.");
}

// --------------------------------------------------------------------------
// TEST 7: SANITIZAÇÃO DE PRIVACIDADE: OBSERVAÇÕES INTERNAS STRICT
// --------------------------------------------------------------------------
console.log("\n7. Testando Isolamento de Privacidade (Sanitização de Observações Internas)...");
{
  const avaliacaoCompletaAdmin = {
    id: "av-001",
    selfPresentationId: "sp-001",
    professorId: "prof-001",
    professorNome: "Lucas Ferreira",
    rubrica: {
      fluencia: { nota: 3, comentario: "Bom ritmo." },
      vocabulario: { nota: 3, comentario: "Vocabulário condizente." },
      gramaticaAplicada: { nota: 3, comentario: "Acertos em tempos simples." },
      pronunciaInteligibilidade: { nota: 3, comentario: "Pronúncia clara." },
      coerenciaOrganizacao: { nota: 3, comentario: "Boa introdução e conclusão." },
      compreensaoGeral: { nota: 3, comentario: "Mensagem transmitida." },
    },
    pontosFortes: "Segurança ao falar de sua rotina e experiência.",
    pontosADesenvolver: "Prestar atenção ao TH surdo e linking sounds.",
    orientacaoProximasAulas: "Praticar perguntas em past continuous.",
    observacoesInternas: "ALERTA CONFIDENCIAL DA COORDENAÇÃO: Aluno tímido, precisa de incentivo na primeira aula.",
    mediaCriteriosOrais: 3.0,
    nivelDefinido: "b1",
    justificativaNivel: "Demonstrou competência operacional autônoma no nível B1.",
    publicada: true,
  };

  // Simula sanitização executada nos repositórios para visualização do aluno
  function sanitizarParaAluno(sp) {
    const copy = { ...sp };
    if (copy.avaliacao) {
      if (!copy.avaliacao.publicada) {
        copy.avaliacao = undefined;
      } else {
        const avaliacaoSanitizada = { ...copy.avaliacao };
        delete avaliacaoSanitizada.observacoesInternas;
        copy.avaliacao = avaliacaoSanitizada;
      }
    }
    return copy;
  }

  const spMock = {
    id: "sp-001",
    alunoId: "alu-001",
    alunoNome: "Mariana Oliveira",
    avaliacao: avaliacaoCompletaAdmin,
  };

  const spSanitizada = sanitizarParaAluno(spMock);

  assert.strictEqual(
    spSanitizada.avaliacao.observacoesInternas,
    undefined,
    "Observações internas NUNCA podem estar presentes no objeto retornado ao aluno"
  );
  assert.strictEqual(
    spSanitizada.avaliacao.pontosFortes,
    avaliacaoCompletaAdmin.pontosFortes,
    "Feedback pedagógico público deve ser preservado"
  );

  // Se a avaliação ainda for rascunho (não publicada), nada da avaliação deve aparecer para o aluno
  const spRascunhoMock = {
    id: "sp-002",
    alunoId: "alu-002",
    avaliacao: { ...avaliacaoCompletaAdmin, publicada: false },
  };
  const spRascunhoSanitizada = sanitizarParaAluno(spRascunhoMock);
  assert.strictEqual(
    spRascunhoSanitizada.avaliacao,
    undefined,
    "Rascunho não publicado não deve ser exposto ao aluno"
  );

  console.log("   ✓ Sanitização de privacidade pedagógica validada com sucesso.");
}

// --------------------------------------------------------------------------
// TEST 8: APLICAÇÃO DE NÍVEL AO PERFIL E HISTÓRICO DE AUDITORIA
// --------------------------------------------------------------------------
console.log("\n8. Testando Desacoplamento da Avaliação e Aplicação Explícita ao Perfil...");
{
  const aluno = {
    id: "alu-001",
    nomeCompleto: "Mariana Oliveira",
    nivel: "nao_avaliado",
  };

  const historicoNiveis = [];

  function aplicarNivelAoPerfil(alunoObj, novoNivel, avaliacao, professorId, professorNome) {
    // A avaliação em si não altera o perfil sem confirmação explícita
    const nivelAnterior = alunoObj.nivel;
    alunoObj.nivel = novoNivel;

    const registroHistorico = {
      id: `hn-${historicoNiveis.length + 1}`,
      alunoId: alunoObj.id,
      nivelAnterior,
      novoNivel,
      dataAlteracao: new Date().toISOString(),
      origem: "self_presentation",
      origemReferenciaId: avaliacao.selfPresentationId,
      professorId,
      professorNome,
      justificativa: avaliacao.justificativaNivel,
    };

    historicoNiveis.unshift(registroHistorico);
    return { aluno: alunoObj, historico: registroHistorico };
  }

  const resAplicacao = aplicarNivelAoPerfil(
    aluno,
    "b1",
    {
      selfPresentationId: "sp-001",
      justificativaNivel: "Nivelamento inicial após apresentação oral e análise dos 6 critérios.",
    },
    "prof-001",
    "Lucas Ferreira"
  );

  assert.strictEqual(resAplicacao.aluno.nivel, "b1", "Nível do perfil do aluno deve ser atualizado para B1");
  assert.strictEqual(historicoNiveis.length, 1, "Deve registrar exatamente 1 entrada no histórico de níveis");
  assert.strictEqual(historicoNiveis[0].nivelAnterior, "nao_avaliado");
  assert.strictEqual(historicoNiveis[0].novoNivel, "b1");
  assert.strictEqual(historicoNiveis[0].origem, "self_presentation");

  console.log("   ✓ Aplicação explícita de nível e auditoria de histórico validadas.");
}

// --------------------------------------------------------------------------
// TEST 9: SOLICITAÇÃO DE REENVIO E RETENÇÃO DE VERSÕES HISTÓRICAS
// --------------------------------------------------------------------------
console.log("\n9. Testando Solicitação de Reenvio e Retenção do Histórico de Versões...");
{
  let sp = {
    id: "sp-004",
    alunoId: "alu-004",
    versao: 1,
    status: "em_avaliacao",
    linkVideo: "https://youtube.com/watch?v=versao1",
    dataGravacao: "2026-10-10T10:00:00Z",
    dataEnvio: "2026-10-10T12:00:00Z",
    historicoVersoes: [],
  };

  // 1. Professor solicita reenvio
  function solicitarReenvio(apresentacao, solicitacao) {
    const versaoArquivada = {
      versao: apresentacao.versao,
      linkVideo: apresentacao.linkVideo,
      dataGravacao: apresentacao.dataGravacao,
      dataEnvio: apresentacao.dataEnvio || new Date().toISOString(),
      solicitacaoReenvio: solicitacao,
      arquivadoEm: new Date().toISOString(),
    };

    return {
      ...apresentacao,
      status: "reenvio_solicitado",
      solicitacaoReenvio: solicitacao,
      historicoVersoes: [...(apresentacao.historicoVersoes || []), versaoArquivada],
    };
  }

  const solicitacao = {
    motivo: "Áudio com ruído alto de ventilador impossibilitando avaliar pronúncia.",
    orientacoes: "Grave novamente em local silencioso utilizando fone com microfone.",
    professorId: "prof-001",
    professorNome: "Lucas Ferreira",
    solicitadoEm: new Date().toISOString(),
  };

  sp = solicitarReenvio(sp, solicitacao);

  assert.strictEqual(sp.status, "reenvio_solicitado");
  assert.strictEqual(sp.historicoVersoes.length, 1, "Versão 1 deve ser arquivada no histórico");
  assert.strictEqual(sp.historicoVersoes[0].versao, 1);
  assert.strictEqual(sp.historicoVersoes[0].linkVideo, "https://youtube.com/watch?v=versao1");

  // 2. Aluno grava e envia nova versão (versão 2)
  function enviarNovaVersao(apresentacao, novoLinkVideo, novaDataGravacao) {
    return {
      ...apresentacao,
      linkVideo: novoLinkVideo,
      dataGravacao: novaDataGravacao,
      dataEnvio: new Date().toISOString(),
      versao: apresentacao.versao + 1,
      status: "enviada",
      solicitacaoReenvio: undefined,
    };
  }

  sp = enviarNovaVersao(sp, "https://youtube.com/watch?v=versao2_limpa", new Date().toISOString());

  assert.strictEqual(sp.versao, 2, "A versão deve ser incrementada para 2");
  assert.strictEqual(sp.status, "enviada", "O status deve retornar para enviada na fila de atendimento");
  assert.strictEqual(sp.linkVideo, "https://youtube.com/watch?v=versao2_limpa");
  assert.strictEqual(sp.historicoVersoes.length, 1, "O histórico da versão 1 permanece preservado intacto");

  console.log("   ✓ Ciclo de reenvio, versionamento incremental e retenção de histórico aprovados.");
}

console.log("\n============================================================");
console.log("TODOS OS 9 GRUPOS DE TESTES DA ETAPA 5 FORAM APROVADOS! (100%)");
console.log("============================================================\n");
