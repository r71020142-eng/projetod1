import {
  Aula,
  HistoricoRevisaoCartao,
  EventoPontos,
  TipoAcaoPontos,
  ModeloConquista,
} from "../types";

/**
 * Tabela oficial de pontuação pedagógica do Método Paulo (Etapa 8).
 */
export const TABELA_PONTOS_PADRAO: Record<TipoAcaoPontos, { pontos: number; descricao: string }> = {
  presenca_aula: {
    pontos: 50,
    descricao: "Presença em aula confirmada pelo professor",
  },
  aula_presenca: {
    pontos: 50,
    descricao: "Presença em aula confirmada pelo professor",
  },
  revisao_flashcards_diaria: {
    pontos: 10,
    descricao: "Sessão diária de revisão de flashcards concluída",
  },
  flashcard_revisao_diaria: {
    pontos: 10,
    descricao: "Sessão diária de revisão de flashcards concluída",
  },
  manutencao_streak: {
    pontos: 20,
    descricao: "Manutenção de sequência de estudos diária",
  },
  conclusao_modulo: {
    pontos: 100,
    descricao: "Conclusão e validação pedagógica de módulo",
  },
  modulo_concluido: {
    pontos: 100,
    descricao: "Conclusão e validação pedagógica de módulo",
  },
  avaliacao_pratica_aprovada: {
    pontos: 150,
    descricao: "Aprovação em avaliação prática com rubrica docente",
  },
  atividade_entregue: {
    pontos: 30,
    descricao: "Atividade pedagógica entregue",
  },
  marco_nivel_operacional: {
    pontos: 300,
    descricao: "Marco de nível operacional oficializado pela coordenação",
  },
  conquista_especial: {
    pontos: 200,
    descricao: "Reconhecimento pedagógico ou conquista especial",
  },
};

/**
 * Regra rigorosa de cálculo de Horas de Aulas Cumpridas:
 * - Considera apenas aulas com status "concluida".
 * - O aluno DEVE estar registrado na chamada com presenca = "presente".
 * - Aulas canceladas, faltas ("ausente"), faltas justificadas ("justificado")
 *   e presenças não registradas geram rigorosamente ZERO minutos.
 * - Deduplicação obrigatória: cada ID de aula é contabilizado apenas uma vez.
 * - Retorna total de minutos (inteiro) e total de horas decimais arredondadas para 1 casa.
 */
export function calcularHorasAulasPresenca(
  aulas: Aula[],
  alunoId: string
): {
  totalMinutos: number;
  totalHoras: number;
  aulasPresentesCount: number;
  aulasAvaliadas: number;
} {
  const aulasProcessadas = new Set<string>();
  let totalMinutos = 0;
  let aulasPresentesCount = 0;
  let aulasAvaliadas = 0;

  for (const aula of aulas) {
    if (!aula || !aula.id) continue;
    // Evita duplicações
    if (aulasProcessadas.has(aula.id)) continue;
    aulasProcessadas.add(aula.id);
    aulasAvaliadas++;

    // Verifica se a aula foi concluída
    if (aula.status !== "concluida") continue;

    // Procura o registro de chamada do aluno nesta aula
    const regChamada = (aula.chamada || []).find((c) => c.alunoId === alunoId);
    if (!regChamada) continue;

    // Apenas 'presente' gera cômputo de horas
    if (regChamada.presenca === "presente") {
      const duracao = Number(aula.duracaoMinutos) || 60;
      totalMinutos += duracao;
      aulasPresentesCount++;
    }
    // Faltas (ausente/justificado/nao_registrado) geram 0 minutos por regra de negócio
  }

  const totalHoras = Math.round((totalMinutos / 60) * 10) / 10;

  return {
    totalMinutos,
    totalHoras,
    aulasPresentesCount,
    aulasAvaliadas,
  };
}

/**
 * Calcula a sequência (streak) de dias consecutivos de estudo nos flashcards.
 */
export function calcularStreakFlashcards(
  revisoes: HistoricoRevisaoCartao[],
  dataReferencia: Date = new Date()
): {
  streakAtualDias: number;
  diasComRevisao: string[];
  estudouHoje: boolean;
} {
  if (!revisoes || revisoes.length === 0) {
    return { streakAtualDias: 0, diasComRevisao: [], estudouHoje: false };
  }

  // Agrupa dias únicos em formato YYYY-MM-DD
  const diasSet = new Set<string>();
  for (const rev of revisoes) {
    if (rev.dataRevisao) {
      const d = rev.dataRevisao.split("T")[0];
      if (d) diasSet.add(d);
    }
  }

  const diasOrdenados = Array.from(diasSet).sort().reverse();
  if (diasOrdenados.length === 0) {
    return { streakAtualDias: 0, diasComRevisao: [], estudouHoje: false };
  }

  const hojeStr = dataReferencia.toISOString().split("T")[0];
  const ontem = new Date(dataReferencia);
  ontem.setDate(ontem.getDate() - 1);
  const ontemStr = ontem.toISOString().split("T")[0];

  const estudouHoje = diasSet.has(hojeStr);
  const estudouOntem = diasSet.has(ontemStr);

  // Se não estudou hoje nem ontem, o streak atual é zero
  if (!estudouHoje && !estudouOntem) {
    return { streakAtualDias: 0, diasComRevisao: diasOrdenados, estudouHoje: false };
  }

  // Contagem regressiva contínua
  let streak = 0;
  const cursor = new Date(estudouHoje ? hojeStr : ontemStr);

  while (true) {
    const cursorStr = cursor.toISOString().split("T")[0];
    if (diasSet.has(cursorStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    streakAtualDias: streak,
    diasComRevisao: diasOrdenados,
    estudouHoje,
  };
}

/**
 * Soma total de pontos acumulados por um aluno a partir do seu histórico de eventos de pontos.
 */
export function calcularPontosTotaisAluno(
  eventos: EventoPontos[],
  alunoId: string
): number {
  return eventos
    .filter((e) => e.alunoId === alunoId)
    .reduce((acc, e) => acc + (e.pontos || 0), 0);
}

/**
 * Gera código demonstrativo único e elegante para validação de placas digitais e físicas.
 */
export function gerarCodigoValidacaoPlaca(
  alunoId: string,
  marcoNome: string
): string {
  const hash = Math.abs(
    alunoId.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7) % 9000 + 1000
  );
  const sigla = marcoNome
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `MTD-PLK-${hash}-${sigla || "ACHV"}`;
}

/**
 * Contexto de progresso do aluno para avaliação de elegibilidade de conquistas.
 */
export interface ContextoAvaliacaoConquistas {
  alunoId: string;
  totalHorasAulas: number;
  totalAulasPresente: number;
  streakFlashcards: number;
  totalFlashcardsRevisados: number;
  modulosConcluidosCount: number;
  avaliacoesPraticasAprovadasCount: number;
  nivelOperacionalAtual: string;
  publicacoesComunidadeCount: number;
  comentariosComunidadeCount: number;
}

/**
 * Avalia se o aluno cumpre o critério de um modelo de conquista.
 * NOTA CRÍTICA DE NEGÓCIO:
 * Conquistas de nível ('marco_nivel') dependem EXCLUSIVAMENTE de 'nivelOperacionalAtual'.
 * Horas, pontos e streaks NUNCA promovem nem alteram nível CEFR.
 */
export function atendeCriterioConquista(
  modelo: ModeloConquista,
  ctx: ContextoAvaliacaoConquistas
): { elegivel: boolean; progressoAtual: number; progressoMeta: number } {
  const meta = modelo.metaValor || 1;

  switch (modelo.tipoCriterio) {
    case "horas_aulas":
      return {
        elegivel: ctx.totalHorasAulas >= meta,
        progressoAtual: ctx.totalHorasAulas,
        progressoMeta: meta,
      };

    case "streak_dias":
      return {
        elegivel: ctx.streakFlashcards >= meta,
        progressoAtual: ctx.streakFlashcards,
        progressoMeta: meta,
      };

    case "flashcards_revisados":
      return {
        elegivel: ctx.totalFlashcardsRevisados >= meta,
        progressoAtual: ctx.totalFlashcardsRevisados,
        progressoMeta: meta,
      };

    case "modulos_concluidos":
      return {
        elegivel: ctx.modulosConcluidosCount >= meta,
        progressoAtual: ctx.modulosConcluidosCount,
        progressoMeta: meta,
      };

    case "avaliacoes_aprovadas":
      return {
        elegivel: ctx.avaliacoesPraticasAprovadasCount >= meta,
        progressoAtual: ctx.avaliacoesPraticasAprovadasCount,
        progressoMeta: meta,
      };

    case "nivel_alcancado":
      // Critério por nível operacional fixado manualmente pela coordenação
      const ordemNiveis: Record<string, number> = {
        nao_avaliado: 0,
        A1: 1,
        A2: 2,
        B1: 3,
        B2: 4,
        C1: 5,
        C2: 6,
      };
      const nivelRequerido = modelo.nivelRequerido || "B1";
      const pesoAluno = ordemNiveis[ctx.nivelOperacionalAtual] || 0;
      const pesoRequerido = ordemNiveis[nivelRequerido] || 0;
      return {
        elegivel: pesoAluno >= pesoRequerido && pesoRequerido > 0,
        progressoAtual: pesoAluno,
        progressoMeta: pesoRequerido,
      };

    case "participacao_comunidade":
      const totalPart = ctx.publicacoesComunidadeCount + ctx.comentariosComunidadeCount;
      return {
        elegivel: totalPart >= meta,
        progressoAtual: totalPart,
        progressoMeta: meta,
      };

    case "manual":
    default:
      // Conquistas manuais não são automáticas
      return {
        elegivel: false,
        progressoAtual: 0,
        progressoMeta: meta,
      };
  }
}

/**
 * Calcula o total de revisões realizadas pelo histórico do aluno.
 */
export function calcularTotalRevisoesFlashcards(
  revisoes: HistoricoRevisaoCartao[]
): number {
  return revisoes ? revisoes.length : 0;
}
