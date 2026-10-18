import {
  QuestaoObjetiva,
  RespostaQuestaoObjetiva,
  CriterioRubricaPratica,
  CorrecaoItemRubrica,
  Modulo,
  IndicadoresModuloCalculados,
} from "../types";

/**
 * Corrige uma única questão de múltipla escolha comparando a alternativa selecionada
 * com a alternativa correta cadastrada.
 * Função pura, determinística e sem efeitos colaterais.
 */
export function corrigirQuestaoObjetiva(
  questao: QuestaoObjetiva,
  alternativaEscolhidaId?: string,
  dataHoraReferencia: Date = new Date()
): RespostaQuestaoObjetiva {
  const correta = Boolean(
    alternativaEscolhidaId && alternativaEscolhidaId === questao.alternativaCorretaId
  );
  const pontosObtidos = correta ? questao.pontos : 0;

  return {
    questaoId: questao.id,
    alternativaEscolhidaId,
    correta,
    pontosObtidos,
    respondidaEm: dataHoraReferencia.toISOString(),
  };
}

/**
 * Calcula a nota final de uma avaliação objetiva a partir de suas questões e respostas.
 *
 * Fórmula da Nota:
 * notaFinal = (somaPontosObtidos / somaPontosTotais) * notaMaxima
 *
 * Arredondamento explícito para 2 casas decimais, sem truncamento silencioso.
 */
export function calcularNotaAvaliacaoObjetiva(
  questoes: QuestaoObjetiva[],
  respostas: RespostaQuestaoObjetiva[],
  notaMaxima: number
): {
  notaFinal: number;
  somaPontosObtidos: number;
  somaPontosTotais: number;
  formulaExplicativa: string;
} {
  const somaPontosTotais = questoes.reduce((acc, q) => acc + (q.pontos || 0), 0);

  const mapaRespostas = new Map<string, RespostaQuestaoObjetiva>();
  for (const r of respostas) {
    mapaRespostas.set(r.questaoId, r);
  }

  let somaPontosObtidos = 0;
  for (const q of questoes) {
    const r = mapaRespostas.get(q.id);
    if (r) {
      somaPontosObtidos += r.pontosObtidos || 0;
    }
  }

  if (somaPontosTotais <= 0) {
    return {
      notaFinal: 0,
      somaPontosObtidos: 0,
      somaPontosTotais: 0,
      formulaExplicativa: "Soma de pontos totais zerada; nota definida como 0.00.",
    };
  }

  const proporcao = somaPontosObtidos / somaPontosTotais;
  const notaFinal = Number((proporcao * notaMaxima).toFixed(2));

  const formulaExplicativa = `(${somaPontosObtidos} pontos obtidos / ${somaPontosTotais} pontos totais) * ${notaMaxima} nota máxima = ${notaFinal.toFixed(
    2
  )}`;

  return {
    notaFinal,
    somaPontosObtidos,
    somaPontosTotais,
    formulaExplicativa,
  };
}

/**
 * Calcula a nota final de uma avaliação prática corrigida via rubrica analítica.
 *
 * Fórmula da Nota:
 * notaFinal = (somaPontosAtribuidos / somaPontosMaximosRubrica) * notaMaxima
 */
export function calcularNotaAvaliacaoPratica(
  rubrica: CriterioRubricaPratica[],
  correcaoItens: CorrecaoItemRubrica[],
  notaMaxima: number
): {
  notaFinal: number;
  somaPontosAtribuidos: number;
  somaPontosTotais: number;
  formulaExplicativa: string;
} {
  const somaPontosTotais = rubrica.reduce((acc, c) => acc + (c.pontuacaoMaxima || 0), 0);

  const mapaItens = new Map<string, number>();
  for (const item of correcaoItens) {
    mapaItens.set(item.criterioId, item.pontosAtribuidos || 0);
  }

  let somaPontosAtribuidos = 0;
  for (const c of rubrica) {
    const atribuido = mapaItens.get(c.id) ?? 0;
    // Garante que não ultrapasse a pontuação máxima do critério
    somaPontosAtribuidos += Math.min(Math.max(0, atribuido), c.pontuacaoMaxima);
  }

  if (somaPontosTotais <= 0) {
    return {
      notaFinal: 0,
      somaPontosAtribuidos: 0,
      somaPontosTotais: 0,
      formulaExplicativa: "Pontuação máxima da rubrica zerada; nota definida como 0.00.",
    };
  }

  const proporcao = somaPontosAtribuidos / somaPontosTotais;
  const notaFinal = Number((proporcao * notaMaxima).toFixed(2));

  const formulaExplicativa = `(${somaPontosAtribuidos} pontos atribuídos / ${somaPontosTotais} pontos da rubrica) * ${notaMaxima} nota máxima = ${notaFinal.toFixed(
    2
  )}`;

  return {
    notaFinal,
    somaPontosAtribuidos,
    somaPontosTotais,
    formulaExplicativa,
  };
}

export interface DadosVerificacaoModulo {
  frequenciaPercentual?: number | null;
  totalAtividadesConcluidas?: number;
  mediaObjetivas?: number | null;
  avaliacaoPraticaConcluida?: boolean;
  avaliacaoPraticaAprovada?: boolean;
  validacaoProfessorConcluida?: boolean;
}

/**
 * Verifica os critérios de conclusão de um módulo para um determinado discente
 * e computa a taxa de progresso visual.
 *
 * Fórmula do Progresso Visual:
 * percentualConclusao = (criteriosCumpridos / totalCriteriosAplicaveis) * 100
 *
 * Se totalCriteriosAplicaveis for 0, o progresso é 0% (indicando "Critérios ainda não configurados").
 */
export function verificarCriteriosConclusaoModulo(
  modulo: Modulo,
  dados: DadosVerificacaoModulo
): IndicadoresModuloCalculados {
  const cfg = modulo.criteriosConclusao;
  let totalCriteriosAplicaveis = 0;
  let criteriosCumpridos = 0;

  // 1. Presença Mínima
  let presencaCumprida: boolean | undefined = undefined;
  if (cfg.presencaMinimaPercentual !== undefined && cfg.presencaMinimaPercentual > 0) {
    totalCriteriosAplicaveis++;
    if (
      dados.frequenciaPercentual !== null &&
      dados.frequenciaPercentual !== undefined &&
      dados.frequenciaPercentual >= cfg.presencaMinimaPercentual
    ) {
      presencaCumprida = true;
      criteriosCumpridos++;
    } else {
      presencaCumprida = false;
    }
  }

  // 2. Atividades Mínimas Concluídas
  let atividadesCumpridas: boolean | undefined = undefined;
  if (cfg.atividadesMinimasConcluidas !== undefined && cfg.atividadesMinimasConcluidas > 0) {
    totalCriteriosAplicaveis++;
    const concluidas = dados.totalAtividadesConcluidas || 0;
    if (concluidas >= cfg.atividadesMinimasConcluidas) {
      atividadesCumpridas = true;
      criteriosCumpridos++;
    } else {
      atividadesCumpridas = false;
    }
  }

  // 3. Nota Mínima em Avaliações Objetivas
  let objetivasCumpridas: boolean | undefined = undefined;
  if (cfg.notaMinimaObjetivas !== undefined && cfg.notaMinimaObjetivas > 0) {
    totalCriteriosAplicaveis++;
    if (
      dados.mediaObjetivas !== null &&
      dados.mediaObjetivas !== undefined &&
      dados.mediaObjetivas >= cfg.notaMinimaObjetivas
    ) {
      objetivasCumpridas = true;
      criteriosCumpridos++;
    } else {
      objetivasCumpridas = false;
    }
  }

  // 4. Avaliação Prática Obrigatória
  let praticaCumprida: boolean | undefined = undefined;
  if (cfg.avaliacaoPraticaObrigatoria) {
    totalCriteriosAplicaveis++;
    if (dados.avaliacaoPraticaAprovada) {
      praticaCumprida = true;
      criteriosCumpridos++;
    } else {
      praticaCumprida = false;
    }
  }

  // 5. Validação Humana do Professor
  let validacaoHumanaConcluida: boolean | undefined = undefined;
  if (cfg.exigeValidacaoHumana) {
    totalCriteriosAplicaveis++;
    if (dados.validacaoProfessorConcluida) {
      validacaoHumanaConcluida = true;
      criteriosCumpridos++;
    } else {
      validacaoHumanaConcluida = false;
    }
  }

  const percentualConclusao =
    totalCriteriosAplicaveis > 0
      ? Number(((criteriosCumpridos / totalCriteriosAplicaveis) * 100).toFixed(1))
      : 0;

  const todosCriteriosCumpridos =
    totalCriteriosAplicaveis > 0 && criteriosCumpridos === totalCriteriosAplicaveis;

  return {
    presencaPercentual: dados.frequenciaPercentual ?? null,
    presencaCumprida,
    atividadesConcluidas: dados.totalAtividadesConcluidas || 0,
    atividadesCumpridas,
    mediaAvaliacoesObjetivas: dados.mediaObjetivas ?? null,
    objetivasCumpridas,
    avaliacaoPraticaConcluida: dados.avaliacaoPraticaConcluida ?? false,
    avaliacaoPraticaAprovada: dados.avaliacaoPraticaAprovada ?? false,
    praticaCumprida,
    validacaoHumanaConcluida,
    criteriosCumpridos,
    totalCriteriosAplicaveis,
    percentualConclusao,
    todosCriteriosCumpridos,
  };
}

/**
 * Validação estrita de questões objetivas.
 * Regras:
 * - Enunciado preenchido com mínimo de 5 caracteres.
 * - De 2 a 6 alternativas.
 * - Nenhuma alternativa vazia ou com espaços em branco apenas.
 * - Nenhuma alternativa com texto duplicado na mesma questão.
 * - Uma única alternativa correta vinculada a uma alternativa existente.
 * - Pontuação positiva maior que zero.
 */
export function validarQuestaoObjetiva(
  questao: Partial<QuestaoObjetiva>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!questao.enunciado || questao.enunciado.trim().length < 5) {
    errors.push("O enunciado da questão deve possuir no mínimo 5 caracteres.");
  }

  const alts = questao.alternativas || [];
  if (alts.length < 2 || alts.length > 6) {
    errors.push(`A questão deve possuir entre 2 e 6 alternativas (atual: ${alts.length}).`);
  }

  const textosVistos = new Set<string>();
  const idsVistos = new Set<string>();

  for (let i = 0; i < alts.length; i++) {
    const a = alts[i];
    const textoLimpo = (a.texto || "").trim().toLowerCase();

    if (!textoLimpo) {
      errors.push(`A alternativa ${i + 1} não pode estar vazia.`);
    } else if (textosVistos.has(textoLimpo)) {
      errors.push(`A alternativa "${a.texto}" está duplicada na mesma questão.`);
    }
    textosVistos.add(textoLimpo);
    idsVistos.add(a.id);
  }

  if (!questao.alternativaCorretaId) {
    errors.push("Uma alternativa correta deve ser obrigatoriamente selecionada.");
  } else if (!idsVistos.has(questao.alternativaCorretaId)) {
    errors.push("A alternativa correta selecionada não existe entre as opções cadastradas.");
  }

  if (questao.pontos === undefined || questao.pontos <= 0) {
    errors.push("A pontuação da questão deve ser um valor numérico positivo maior que zero.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validação estrita de critérios de rubrica para avaliação prática.
 */
export function validarRubricaPratica(
  rubrica: CriterioRubricaPratica[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rubrica || rubrica.length === 0) {
    errors.push("A avaliação prática exige ao menos um critério na rubrica de avaliação.");
    return { isValid: false, errors };
  }

  for (let i = 0; i < rubrica.length; i++) {
    const c = rubrica[i];
    if (!c.nome || c.nome.trim().length < 2) {
      errors.push(`O critério ${i + 1} da rubrica deve possuir um nome válido.`);
    }
    if (c.pontuacaoMaxima === undefined || c.pontuacaoMaxima <= 0) {
      errors.push(`O critério "${c.nome || i + 1}" deve possuir pontuação máxima maior que zero.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
