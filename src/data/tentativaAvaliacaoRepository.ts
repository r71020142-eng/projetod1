import {
  TentativaAvaliacao,
  ResultadoAvaliacao,
  OperationResult,
  TentativaFilters,
  RespostaQuestaoObjetiva,
  RespostaAvaliacaoPratica,
  FeedbackAvaliacao,
} from "../types";
import { SEED_TENTATIVAS } from "./mockData";
import { avaliacaoRepository } from "./avaliacaoRepository";
import {
  corrigirQuestaoObjetiva,
  calcularNotaAvaliacaoObjetiva,
  calcularNotaAvaliacaoPratica,
} from "./pedagogicoCalculos";

const STORAGE_KEY = "mtd_demonstrativo_tentativas_v1";

function loadTentativasFromStorage(): TentativaAvaliacao[] {
  if (typeof window === "undefined") {
    return SEED_TENTATIVAS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TENTATIVAS));
      return SEED_TENTATIVAS;
    }
    return JSON.parse(raw) as TentativaAvaliacao[];
  } catch (err) {
    console.error("Erro ao carregar tentativas do storage:", err);
    return SEED_TENTATIVAS;
  }
}

function saveTentativasToStorage(list: TentativaAvaliacao[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "tentativas" } })
    );
  } catch (err) {
    console.error("Erro ao salvar tentativas no storage:", err);
  }
}

import {
  PoliticaExibicaoGabarito,
  StatusAvaliacao,
} from "../types";

/**
 * Determina se o gabarito (respostas corretas e explicações) pode ser exibido ao discente
 * respeitando as 3 políticas pedagógicas (Etapa 7 correção / Etapa 8).
 */
export function isGabaritoLiberado(
  politica: PoliticaExibicaoGabarito = "gabarito_imediato",
  statusTentativa: string,
  statusAvaliacao?: StatusAvaliacao
): boolean {
  // Regra inviolável: nunca mostrar gabarito durante tentativa ativa
  if (statusTentativa === "em_andamento") return false;

  switch (politica) {
    case "nota_imediata":
      // Mostra apenas nota e resultado; gabarito e explicações nunca são liberados
      return false;
    case "gabarito_apos_encerramento":
      // Mostra a nota imediatamente, mas gabarito só com avaliação encerrada ou arquivada
      return statusAvaliacao === "encerrada" || statusAvaliacao === "arquivada";
    case "gabarito_imediato":
    default:
      // Mostra gabarito logo após envio/conclusão
      return true;
  }
}

/**
 * Remove dados sigilosos (observações pedagógicas internas) e mascara dados do gabarito
 * quando a política da avaliação não autorizar a visualização.
 */
export function sanitizarTentativaParaAluno(
  tent: TentativaAvaliacao,
  avaliacaoStatus?: StatusAvaliacao
): TentativaAvaliacao {
  const copia: TentativaAvaliacao = { ...tent };

  // 1. Remove observações internas confidenciais do professor
  if (copia.feedback) {
    copia.feedback = { ...copia.feedback };
    delete copia.feedback.observacoesInternas;
  }

  // 2. Mascara se gabarito não foi liberado
  const politica = copia.politicaGabaritoUtilizada || "gabarito_imediato";
  const liberado = isGabaritoLiberado(politica, copia.status, avaliacaoStatus);

  if (!liberado && copia.respostasObjetivas) {
    // Mantém as alternativas escolhidas, mas remove indicador individual de acerto e pontos
    copia.respostasObjetivas = copia.respostasObjetivas.map((r) => ({
      ...r,
      correta: undefined,
      pontosObtidos: undefined,
    }));
  }

  return copia;
}

/**
 * Sanitiza a avaliação objetiva para o aluno, removendo alternativa correta e explicações
 * caso o gabarito não esteja liberado.
 */
export function sanitizarAvaliacaoParaAluno(
  avaliacao: import("../types").Avaliacao,
  liberado: boolean
): import("../types").Avaliacao {
  if (liberado || avaliacao.tipo !== "objetiva" || !avaliacao.questoes) {
    return avaliacao;
  }
  return {
    ...avaliacao,
    questoes: avaliacao.questoes.map((q) => {
      const qCopia = { ...q };
      delete (qCopia as { alternativaCorretaId?: string }).alternativaCorretaId;
      delete (qCopia as { explicacao?: string }).explicacao;
      return qCopia;
    }),
  };
}

export const tentativaAvaliacaoRepository = {
  async listar(filters?: TentativaFilters): Promise<TentativaAvaliacao[]> {
    const list = loadTentativasFromStorage();
    let filtradas = list;

    if (filters?.avaliacaoId) {
      filtradas = filtradas.filter((t) => t.avaliacaoId === filters.avaliacaoId);
    }
    if (filters?.alunoId) {
      filtradas = filtradas.filter((t) => t.alunoId === filters.alunoId);
    }
    if (filters?.status && filters.status !== "todos") {
      filtradas = filtradas.filter((t) => t.status === filters.status);
    }
    if (filters?.busca) {
      const q = filters.busca.toLowerCase().trim();
      filtradas = filtradas.filter(
        (t) =>
          (t.alunoNome && t.alunoNome.toLowerCase().includes(q)) ||
          t.avaliacaoId.toLowerCase().includes(q)
      );
    }

    return filtradas.sort(
      (a, b) => new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime()
    );
  },

  async listarPorAluno(alunoId: string): Promise<TentativaAvaliacao[]> {
    const list = loadTentativasFromStorage();
    return list
      .filter((t) => t.alunoId === alunoId)
      .map((t) => sanitizarTentativaParaAluno(t))
      .sort((a, b) => new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime());
  },

  async obterPorId(id: string, paraAluno = false): Promise<TentativaAvaliacao | null> {
    const list = loadTentativasFromStorage();
    const tent = list.find((t) => t.id === id);
    if (!tent) return null;
    return paraAluno ? sanitizarTentativaParaAluno(tent) : tent;
  },

  /**
   * Inicia uma nova tentativa de avaliação pelo discente.
   * Regras:
   * - Bloqueia se o aluno já atingiu o limite de tentativas (a menos que tenha autorização extra).
   * - Bloqueia se houver uma tentativa em andamento para a mesma avaliação.
   * - Armazena a versão atual da avaliação.
   */
  async iniciarTentativa(
    avaliacaoId: string,
    alunoId: string,
    alunoNome: string
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const avaliacao = await avaliacaoRepository.obterPorId(avaliacaoId);
    if (!avaliacao) {
      return { success: false, error: "Avaliação não encontrada." };
    }
    if (avaliacao.status !== "publicada") {
      return { success: false, error: "Esta avaliação não está disponível para tentativas no momento." };
    }

    const list = loadTentativasFromStorage();
    const tentativasAluno = list.filter(
      (t) => t.avaliacaoId === avaliacaoId && t.alunoId === alunoId
    );

    // 1. Bloqueia tentativas simultâneas em andamento
    const emAndamento = tentativasAluno.find((t) => t.status === "em_andamento");
    if (emAndamento) {
      return {
        success: true,
        data: sanitizarTentativaParaAluno(emAndamento),
      };
    }

    // 2. Verifica limite de tentativas
    const tentativasConcluidas = tentativasAluno.filter(
      (t) => t.status !== "em_andamento"
    );
    const possuiAutorizacaoExtra = tentativasAluno.some((t) => t.autorizacaoTentativaExtra);

    if (
      tentativasConcluidas.length >= avaliacao.maxTentativas &&
      !possuiAutorizacaoExtra
    ) {
      return {
        success: false,
        error: `Você já atingiu o limite máximo de ${avaliacao.maxTentativas} tentativa(s) para esta avaliação.`,
      };
    }

    const agora = new Date().toISOString();
    const numeroTentativa = tentativasAluno.length + 1;
    const novoId = `tent-${String(list.length + 1).padStart(3, "0")}`;
    const politicaGabarito = avaliacao.politicaGabarito || "gabarito_imediato";

    const nova: TentativaAvaliacao = {
      id: novoId,
      avaliacaoId,
      versaoAvaliacao: avaliacao.versao,
      alunoId,
      alunoNome,
      numeroTentativa,
      iniciadaEm: agora,
      status: "em_andamento",
      notaMaxima: avaliacao.notaMaxima,
      politicaGabaritoUtilizada: politicaGabarito,
      atrasada: avaliacao.prazo ? new Date().getTime() > new Date(avaliacao.prazo).getTime() : false,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(nova);
    saveTentativasToStorage(list);
    return { success: true, data: sanitizarTentativaParaAluno(nova, avaliacao.status) };
  },

  /**
   * Salva rascunho de respostas durante a execução de uma tentativa.
   */
  async salvarRascunho(
    tentativaId: string,
    alunoId: string,
    respostasObjetivas?: RespostaQuestaoObjetiva[],
    respostaPratica?: RespostaAvaliacaoPratica
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const list = loadTentativasFromStorage();
    const index = list.findIndex((t) => t.id === tentativaId && t.alunoId === alunoId);
    if (index === -1) {
      return { success: false, error: "Tentativa não encontrada." };
    }

    const tent = list[index];
    if (tent.status !== "em_andamento") {
      return { success: false, error: "Esta tentativa já foi enviada e não pode ser modificada." };
    }

    tent.respostasObjetivas = respostasObjetivas ?? tent.respostasObjetivas;
    tent.respostaPratica = respostaPratica ?? tent.respostaPratica;
    tent.atualizadoEm = new Date().toISOString();

    saveTentativasToStorage(list);
    return { success: true, data: sanitizarTentativaParaAluno(tent) };
  },

  /**
   * Envia a tentativa final pelo discente.
   * Regras:
   * - Para objetivas: correção automática instantânea + cálculo de nota.
   * - Para práticas: encaminha para 'aguardando_correcao'.
   * - Bloqueia edição após envio.
   */
  async enviarTentativa(
    tentativaId: string,
    alunoId: string,
    dadosEnvio: {
      respostasObjetivasMap?: Record<string, string>; // questaoId -> alternativaEscolhidaId
      respostaPratica?: RespostaAvaliacaoPratica;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const list = loadTentativasFromStorage();
    const index = list.findIndex((t) => t.id === tentativaId && t.alunoId === alunoId);
    if (index === -1) {
      return { success: false, error: "Tentativa não encontrada." };
    }

    const tent = list[index];
    if (tent.status !== "em_andamento") {
      return { success: false, error: "Esta tentativa já foi enviada." };
    }

    const avaliacao = await avaliacaoRepository.obterPorId(tent.avaliacaoId);
    if (!avaliacao) {
      return { success: false, error: "Avaliação vinculada não encontrada." };
    }

    const agora = new Date().toISOString();
    tent.enviadaEm = agora;
    tent.atualizadoEm = agora;
    tent.atrasada = avaliacao.prazo ? new Date().getTime() > new Date(avaliacao.prazo).getTime() : false;
    if (!tent.politicaGabaritoUtilizada) {
      tent.politicaGabaritoUtilizada = avaliacao.politicaGabarito || "gabarito_imediato";
    }

    if (avaliacao.tipo === "objetiva") {
      const questoes = avaliacao.questoes || [];
      const mapaRespostas = dadosEnvio.respostasObjetivasMap || {};

      // 1. Corrige cada questão individualmente
      const respostasCorrigidas: RespostaQuestaoObjetiva[] = questoes.map((q) => {
        const altEscolhida = mapaRespostas[q.id];
        return corrigirQuestaoObjetiva(q, altEscolhida);
      });

      // 2. Calcula a nota matemática da avaliação
      const { notaFinal } = calcularNotaAvaliacaoObjetiva(
        questoes,
        respostasCorrigidas,
        avaliacao.notaMaxima
      );

      tent.respostasObjetivas = respostasCorrigidas;
      tent.nota = notaFinal;
      tent.status = "corrigida";

      const notaCorte = avaliacao.notaMinimaAprovacao ?? (avaliacao.notaMaxima * 0.7);
      tent.resultado = notaFinal >= notaCorte ? "aprovado" : "precisa_reforco";
    } else {
      // Prática: registra texto e link
      tent.respostaPratica = dadosEnvio.respostaPratica;
      tent.status = "aguardando_correcao";
    }

    saveTentativasToStorage(list);
    return { success: true, data: sanitizarTentativaParaAluno(tent) };
  },

  /**
   * Correção pedagógica de avaliação prática pelo professor.
   */
  async corrigirTentativaPratica(
    tentativaId: string,
    professorId: string,
    professorNome: string,
    dadosCorrecao: {
      itensRubrica: Array<{ criterioId: string; pontosAtribuidos: number; comentario?: string }>;
      pontosFortes: string;
      pontosADesenvolver: string;
      orientacoes: string;
      observacoesInternas?: string;
      resultado: ResultadoAvaliacao;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const list = loadTentativasFromStorage();
    const index = list.findIndex((t) => t.id === tentativaId);
    if (index === -1) {
      return { success: false, error: "Tentativa não encontrada." };
    }

    const tent = list[index];
    const avaliacao = await avaliacaoRepository.obterPorId(tent.avaliacaoId);
    if (!avaliacao || !avaliacao.rubrica) {
      return { success: false, error: "Rubrica da avaliação não encontrada." };
    }

    const { notaFinal } = calcularNotaAvaliacaoPratica(
      avaliacao.rubrica,
      dadosCorrecao.itensRubrica,
      avaliacao.notaMaxima
    );

    const agora = new Date().toISOString();
    const feedback: FeedbackAvaliacao = {
      corrigidoPorProfessorId: professorId,
      corrigidoPorProfessorNome: professorNome,
      corrigidoEm: agora,
      itensRubrica: dadosCorrecao.itensRubrica,
      pontosFortes: dadosCorrecao.pontosFortes,
      pontosADesenvolver: dadosCorrecao.pontosADesenvolver,
      orientacoes: dadosCorrecao.orientacoes,
      observacoesInternas: dadosCorrecao.observacoesInternas,
      resultado: dadosCorrecao.resultado,
    };

    tent.nota = notaFinal;
    tent.resultado = dadosCorrecao.resultado;
    tent.feedback = feedback;
    tent.status = "corrigida";
    tent.atualizadoEm = agora;

    saveTentativasToStorage(list);
    return { success: true, data: tent };
  },

  /**
   * Autorização de tentativa extra pelo professor mediante justificativa obrigatória.
   */
  async autorizarTentativaExtra(
    avaliacaoId: string,
    alunoId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ): Promise<OperationResult<boolean>> {
    if (!justificativa || justificativa.trim().length < 10) {
      return { success: false, error: "A justificativa para tentativa adicional deve ter no mínimo 10 caracteres." };
    }

    const list = loadTentativasFromStorage();
    const ultimasTentativas = list
      .filter((t) => t.avaliacaoId === avaliacaoId && t.alunoId === alunoId)
      .sort((a, b) => new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime());

    if (ultimasTentativas.length === 0) {
      return { success: false, error: "Nenhuma tentativa anterior encontrada para autorizar nova tentativa." };
    }

    const ultima = ultimasTentativas[0];
    ultima.autorizacaoTentativaExtra = {
      professorId,
      professorNome,
      justificativa: justificativa.trim(),
      autorizadoEm: new Date().toISOString(),
    };
    ultima.atualizadoEm = new Date().toISOString();

    saveTentativasToStorage(list);
    return { success: true, data: true };
  },
};
