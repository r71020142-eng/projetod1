import { Cartao, CartaoProgressoAluno, RespostaSRS } from "@/types";
import { SEED_PROGRESSO_CARTOES } from "./mockData";
import { inicializarProgressoCartao, processarRespostaSRS } from "./srsAlgorithm";
import { registrarRevisao } from "./historicoRevisaoRepository";
import { getCartoesPorBaralho } from "./cartaoRepository";

const STORAGE_KEY = "mtd_demonstrativo_progresso_cartoes_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadProgressosFromStorage(): CartaoProgressoAluno[] {
  if (!isBrowser()) {
    return [...SEED_PROGRESSO_CARTOES];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROGRESSO_CARTOES));
      return [...SEED_PROGRESSO_CARTOES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as CartaoProgressoAluno[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROGRESSO_CARTOES));
    return [...SEED_PROGRESSO_CARTOES];
  } catch (err) {
    console.warn("Aviso ao carregar progresso dos cartões do localStorage:", err);
    return [...SEED_PROGRESSO_CARTOES];
  }
}

export function saveProgressosToStorage(progressos: CartaoProgressoAluno[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progressos));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "progresso_cartoes" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir progresso dos cartões:", err);
    return false;
  }
}

export interface FilaEstudoBaralhoResultado {
  fila: Cartao[];
  cartoes: Cartao[];
  progressos: Record<string, CartaoProgressoAluno>;
  totalVencidos: number;
  totalAprendendo: number;
  totalNovos: number;
}

export const progressoCartaoLocalStorageRepository = {
  async obterProgresso(alunoId: string, cartaoId: string): Promise<CartaoProgressoAluno | null> {
    const list = loadProgressosFromStorage();
    const found = list.find((p) => p.alunoId === alunoId && p.cartaoId === cartaoId);
    return found || null;
  },

  obterOuCriarProgresso(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    dataReferencia: Date = new Date()
  ): CartaoProgressoAluno {
    const list = loadProgressosFromStorage();
    const found = list.find((p) => p.alunoId === alunoId && p.cartaoId === cartaoId);
    if (found) return found;

    const novo = inicializarProgressoCartao(alunoId, cartaoId, baralhoId, dataReferencia);
    list.push(novo);
    saveProgressosToStorage(list);
    return novo;
  },

  async obterFilaEstudoBaralho(
    alunoId: string,
    baralhoId: string,
    limiteDiarioNovos = 20,
    dataReferencia: Date = new Date()
  ): Promise<FilaEstudoBaralhoResultado> {
    const cartoesAtivos = await getCartoesPorBaralho(baralhoId, true);
    const todosProgressos = loadProgressosFromStorage();

    const progressosMap: Record<string, CartaoProgressoAluno> = {};
    for (const c of cartoesAtivos) {
      const prog = todosProgressos.find((p) => p.alunoId === alunoId && p.cartaoId === c.id);
      if (prog) {
        progressosMap[c.id] = prog;
      } else {
        progressosMap[c.id] = inicializarProgressoCartao(alunoId, c.id, baralhoId, dataReferencia);
      }
    }

    const agoraTime = dataReferencia.getTime();
    const vencidosRevisao: Cartao[] = [];
    const vencidosAprendendo: Cartao[] = [];
    const novosDisponiveis: Cartao[] = [];

    for (const c of cartoesAtivos) {
      const prog = progressosMap[c.id];
      if (prog.estado === "suspenso") continue;

      if (prog.estado === "revisao") {
        if (new Date(prog.proximaRevisao).getTime() <= agoraTime) {
          vencidosRevisao.push(c);
        }
      } else if (prog.estado === "aprendendo") {
        if (new Date(prog.proximaRevisao).getTime() <= agoraTime) {
          vencidosAprendendo.push(c);
        }
      } else if (prog.estado === "novo") {
        novosDisponiveis.push(c);
      }
    }

    vencidosRevisao.sort((a, b) => {
      const tA = new Date(progressosMap[a.id].proximaRevisao).getTime();
      const tB = new Date(progressosMap[b.id].proximaRevisao).getTime();
      return tA - tB;
    });

    vencidosAprendendo.sort((a, b) => {
      const tA = new Date(progressosMap[a.id].proximaRevisao).getTime();
      const tB = new Date(progressosMap[b.id].proximaRevisao).getTime();
      return tA - tB;
    });

    const novosSelecionados = novosDisponiveis.slice(0, Math.max(0, limiteDiarioNovos));

    const fila: Cartao[] = [
      ...vencidosRevisao,
      ...vencidosAprendendo,
      ...novosSelecionados,
    ];

    return {
      fila,
      cartoes: cartoesAtivos,
      progressos: progressosMap,
      totalVencidos: vencidosRevisao.length,
      totalAprendendo: vencidosAprendendo.length,
      totalNovos: novosSelecionados.length,
    };
  },

  async registrarRespostaEstudo(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    resposta: RespostaSRS,
    dataReferencia: Date = new Date()
  ): Promise<{
    progresso: CartaoProgressoAluno;
    historicoId: string;
    reagendadoParaRevisao: boolean;
    reagendadoMinutos?: number;
    reagendadoMesmaSessao: boolean;
  }> {
    const list = loadProgressosFromStorage();
    let progressoAtual = list.find((p) => p.alunoId === alunoId && p.cartaoId === cartaoId);

    if (!progressoAtual) {
      progressoAtual = inicializarProgressoCartao(alunoId, cartaoId, baralhoId, dataReferencia);
      list.push(progressoAtual);
    }

    const resultado = processarRespostaSRS(progressoAtual, resposta, dataReferencia);

    const index = list.findIndex((p) => p.id === resultado.novoProgresso.id);
    if (index !== -1) {
      list[index] = resultado.novoProgresso;
    } else {
      list.push(resultado.novoProgresso);
    }
    saveProgressosToStorage(list);

    const historicoGravado = await registrarRevisao(resultado.registroHistorico);

    return {
      progresso: resultado.novoProgresso,
      historicoId: historicoGravado.id,
      reagendadoParaRevisao: resultado.reagendadoParaRevisao,
      reagendadoMinutos: resultado.reagendadoMinutos,
      reagendadoMesmaSessao: resultado.reagendadoMesmaSessao,
    };
  },
};
