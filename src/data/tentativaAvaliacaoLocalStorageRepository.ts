import {
  TentativaAvaliacao,
  ResultadoAvaliacao,
  OperationResult,
  TentativaFilters,
  RespostaQuestaoObjetiva,
  RespostaAvaliacaoPratica,
  CorrecaoItemRubrica,
  FeedbackAvaliacao,
  AutorizacaoTentativaExtra,
  PoliticaExibicaoGabarito,
  StatusAvaliacao,
} from "../types";
import { SEED_TENTATIVAS } from "./mockData";
import { avaliacaoLocalStorageRepository } from "./avaliacaoLocalStorageRepository";
import {
  corrigirQuestaoObjetiva,
  calcularNotaAvaliacaoObjetiva,
  calcularNotaAvaliacaoPratica,
} from "./pedagogicoCalculos";

const STORAGE_KEY = "mtd_demonstrativo_tentativas_v1";

export function loadTentativasFromStorage(): TentativaAvaliacao[] {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") {
    return SEED_TENTATIVAS;
  }
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TENTATIVAS));
      } else if (globalThis.localStorage) {
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TENTATIVAS));
      }
      return SEED_TENTATIVAS;
    }
    return JSON.parse(raw) as TentativaAvaliacao[];
  } catch (err) {
    console.error("Erro ao carregar tentativas do storage:", err);
    return SEED_TENTATIVAS;
  }
}

export function saveTentativasToStorage(list: TentativaAvaliacao[]): void {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") return;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("mtd_storage_updated", { detail: { entity: "tentativas" } })
      );
    } else if (globalThis.localStorage) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error("Erro ao salvar tentativas no storage:", err);
  }
}

export function isGabaritoLiberado(
  politica: PoliticaExibicaoGabarito = "gabarito_imediato",
  statusTentativa: string,
  statusAvaliacao?: StatusAvaliacao
): boolean {
  if (statusTentativa === "em_andamento") return false;

  switch (politica) {
    case "nota_imediata":
      return false;
    case "gabarito_apos_encerramento":
      return statusAvaliacao === "encerrada" || statusAvaliacao === "arquivada";
    case "gabarito_imediato":
    default:
      return true;
  }
}

export function sanitizarTentativaParaAluno(
  tent: TentativaAvaliacao,
  avaliacaoStatus?: StatusAvaliacao
): TentativaAvaliacao {
  const copia: TentativaAvaliacao = { ...tent };

  if (copia.feedback) {
    copia.feedback = { ...copia.feedback };
    delete copia.feedback.observacoesInternas;
  }

  const politica = copia.politicaGabaritoUtilizada || "gabarito_imediato";
  const liberado = isGabaritoLiberado(politica, copia.status, avaliacaoStatus);

  if (!liberado && copia.respostasObjetivas) {
    copia.respostasObjetivas = copia.respostasObjetivas.map((r) => ({
      ...r,
      correta: undefined,
      pontosObtidos: undefined,
    }));
  }

  return copia;
}

export const tentativaAvaliacaoLocalStorageRepository = {
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
    if (filters?.resultado && filters.resultado !== "todos") {
      filtradas = filtradas.filter((t) => t.resultado === filters.resultado);
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

    if (paraAluno) {
      const avaliacao = await avaliacaoLocalStorageRepository.obterPorId(tent.avaliacaoId);
      return sanitizarTentativaParaAluno(tent, avaliacao?.status);
    }
    return tent;
  },

  async iniciarTentativa(
    avaliacaoId: string,
    alunoId: string,
    alunoNome: string
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const avaliacao = await avaliacaoLocalStorageRepository.obterPorId(avaliacaoId);
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

    const tentativaEmAndamento = tentativasAluno.find((t) => t.status === "em_andamento");
    if (tentativaEmAndamento) {
      return { success: true, data: sanitizarTentativaParaAluno(tentativaEmAndamento) };
    }

    const tentativasConcluidas = tentativasAluno.filter(
      (t) => t.status === "enviada" || t.status === "corrigida" || t.status === "aguardando_correcao"
    );

    const possuiExtra = tentativasAluno.some((t) => t.autorizacaoTentativaExtra);

    if (tentativasConcluidas.length >= avaliacao.maxTentativas && !possuiExtra) {
      return {
        success: false,
        error: `Você já utilizou o limite máximo de ${avaliacao.maxTentativas} tentativa(s) permitida(s) para esta avaliação.`,
      };
    }

    const agora = new Date().toISOString();
    const novoNum = tentativasAluno.length + 1;
    const novoId = `tent-${avaliacaoId}-${alunoId}-${novoNum}`;

    const novaTentativa: TentativaAvaliacao = {
      id: novoId,
      avaliacaoId,
      versaoAvaliacao: avaliacao.versao,
      alunoId,
      alunoNome,
      numeroTentativa: novoNum,
      iniciadaEm: agora,
      status: "em_andamento",
      notaMaxima: avaliacao.notaMaxima,
      atrasada: avaliacao.prazo ? new Date().getTime() > new Date(avaliacao.prazo).getTime() : false,
      politicaGabaritoUtilizada: avaliacao.politicaGabarito,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(novaTentativa);
    saveTentativasToStorage(list);

    return { success: true, data: sanitizarTentativaParaAluno(novaTentativa) };
  },

  async salvarRascunho(
    tentativaId: string,
    alunoId: string,
    dadosEnvio?:
      | {
          respostasObjetivasMap?: Record<string, string>;
          respostaPratica?: RespostaAvaliacaoPratica;
        }
      | RespostaQuestaoObjetiva[],
    respostaPraticaExtra?: RespostaAvaliacaoPratica
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const list = loadTentativasFromStorage();
    const index = list.findIndex((t) => t.id === tentativaId && t.alunoId === alunoId);
    if (index === -1) {
      return { success: false, error: "Tentativa não encontrada." };
    }

    const tent = list[index];
    if (tent.status !== "em_andamento") {
      return { success: false, error: "Esta tentativa já foi enviada e não pode ser editada." };
    }

    if (Array.isArray(dadosEnvio)) {
      tent.respostasObjetivas = dadosEnvio;
    } else if (dadosEnvio && dadosEnvio.respostasObjetivasMap) {
      tent.respostasObjetivas = Object.entries(dadosEnvio.respostasObjetivasMap).map(
        ([questaoId, alternativaEscolhidaId]) => ({
          questaoId,
          alternativaEscolhidaId,
          respondidaEm: new Date().toISOString(),
        })
      );
    }

    if (respostaPraticaExtra) {
      tent.respostaPratica = respostaPraticaExtra;
    } else if (dadosEnvio && !Array.isArray(dadosEnvio) && dadosEnvio.respostaPratica) {
      tent.respostaPratica = dadosEnvio.respostaPratica;
    }

    tent.atualizadoEm = new Date().toISOString();
    saveTentativasToStorage(list);

    return { success: true, data: sanitizarTentativaParaAluno(tent) };
  },

  async enviarTentativa(
    tentativaId: string,
    alunoId: string,
    dadosEnvio: {
      respostasObjetivasMap?: Record<string, string>;
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

    const avaliacao = await avaliacaoLocalStorageRepository.obterPorId(tent.avaliacaoId);
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

      const respostasCorrigidas: RespostaQuestaoObjetiva[] = questoes.map((q) => {
        const altEscolhida = mapaRespostas[q.id];
        return corrigirQuestaoObjetiva(q, altEscolhida);
      });

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
      tent.respostaPratica = dadosEnvio.respostaPratica;
      tent.status = "aguardando_correcao";
    }

    saveTentativasToStorage(list);
    return { success: true, data: sanitizarTentativaParaAluno(tent) };
  },

  async corrigirTentativaPratica(
    tentativaId: string,
    professorId: string,
    professorNome: string,
    dadosCorrecao: {
      itensRubrica: CorrecaoItemRubrica[];
      pontosFortes: string;
      pontosADesenvolver: string;
      orientacoes: string;
      observacoesInternas?: string;
      resultado?: ResultadoAvaliacao;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const list = loadTentativasFromStorage();
    const index = list.findIndex((t) => t.id === tentativaId);
    if (index === -1) {
      return { success: false, error: "Tentativa não encontrada." };
    }

    const tent = list[index];
    const avaliacao = await avaliacaoLocalStorageRepository.obterPorId(tent.avaliacaoId);
    if (!avaliacao || avaliacao.tipo !== "pratica") {
      return { success: false, error: "Esta tentativa não pertence a uma avaliação prática." };
    }

    const rubrica = avaliacao.rubrica || [];
    const { notaFinal } = calcularNotaAvaliacaoPratica(
      rubrica,
      dadosCorrecao.itensRubrica,
      avaliacao.notaMaxima
    );

    const notaCorte = avaliacao.notaMinimaAprovacao ?? (avaliacao.notaMaxima * 0.7);
    const resultadoCalculado = dadosCorrecao.resultado || (notaFinal >= notaCorte ? "aprovado" : "precisa_reforco");

    const agora = new Date().toISOString();
    const feedback: FeedbackAvaliacao = {
      corrigidoPorProfessorId: professorId,
      corrigidoPorProfessorNome: professorNome,
      corrigidoEm: agora,
      itensRubrica: dadosCorrecao.itensRubrica,
      pontosFortes: dadosCorrecao.pontosFortes.trim(),
      pontosADesenvolver: dadosCorrecao.pontosADesenvolver.trim(),
      orientacoes: dadosCorrecao.orientacoes.trim(),
      observacoesInternas: dadosCorrecao.observacoesInternas?.trim() || undefined,
      resultado: resultadoCalculado,
    };

    tent.nota = notaFinal;
    tent.resultado = resultadoCalculado;
    tent.feedback = feedback;
    tent.status = "corrigida";
    tent.atualizadoEm = agora;

    saveTentativasToStorage(list);
    return { success: true, data: tent };
  },

  async autorizarTentativaExtra(
    avaliacaoId: string,
    alunoId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ): Promise<OperationResult<AutorizacaoTentativaExtra>> {
    if (!justificativa || justificativa.trim().length < 5) {
      return { success: false, error: "A justificativa para tentativa extra deve ter ao menos 5 caracteres." };
    }

    const list = loadTentativasFromStorage();
    const tentativas = list.filter((t) => t.avaliacaoId === avaliacaoId && t.alunoId === alunoId);
    if (tentativas.length === 0) {
      return { success: false, error: "O aluno não possui tentativas prévias nesta avaliação." };
    }

    const autorizacao: AutorizacaoTentativaExtra = {
      professorId,
      professorNome,
      justificativa: justificativa.trim(),
      autorizadoEm: new Date().toISOString(),
    };

    const ultima = tentativas[tentativas.length - 1];
    ultima.autorizacaoTentativaExtra = autorizacao;
    saveTentativasToStorage(list);

    return { success: true, data: autorizacao };
  },
};
