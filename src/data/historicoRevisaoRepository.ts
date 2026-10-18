import {
  Baralho,
  FlashcardsMetricasAdmin,
  FlashcardsMetricasAluno,
  HistoricoRevisao,
} from "@/types";
import { SEED_HISTORICO_REVISOES } from "./mockData";
import { loadBaralhosFromStorage } from "./baralhoRepository";
import { loadCartoesFromStorage } from "./cartaoRepository";
import { loadProgressosFromStorage } from "./progressoCartaoRepository";

const STORAGE_KEY = "mtd_demonstrativo_historico_revisoes_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadHistoricoFromStorage(): HistoricoRevisao[] {
  if (!isBrowser()) {
    return [...SEED_HISTORICO_REVISOES];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_HISTORICO_REVISOES));
      return [...SEED_HISTORICO_REVISOES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as HistoricoRevisao[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_HISTORICO_REVISOES));
    return [...SEED_HISTORICO_REVISOES];
  } catch (err) {
    console.warn("Aviso ao carregar histórico de revisões do localStorage:", err);
    return [...SEED_HISTORICO_REVISOES];
  }
}

export function saveHistoricoToStorage(historico: HistoricoRevisao[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(historico));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "historico_revisoes" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir histórico de revisões:", err);
    return false;
  }
}

function generateHistoricoId(existingList: HistoricoRevisao[]): string {
  const maxNum = existingList.reduce((acc, h) => {
    const match = h.id.match(/^hr-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `hr-${String(nextNum).padStart(3, "0")}`;
}

/**
 * Adiciona registro imutável ao histórico de revisões (Append-only).
 */
export async function registrarRevisao(
  dados: Omit<HistoricoRevisao, "id">
): Promise<HistoricoRevisao> {
  const list = loadHistoricoFromStorage();
  const novo: HistoricoRevisao = {
    id: generateHistoricoId(list),
    ...dados,
  };

  list.push(novo);
  saveHistoricoToStorage(list);
  return novo;
}

export async function obterHistoricoPorAluno(alunoId: string): Promise<HistoricoRevisao[]> {
  const list = loadHistoricoFromStorage();
  return list
    .filter((h) => h.alunoId === alunoId)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
}

export async function obterHistoricoPorCartao(cartaoId: string): Promise<HistoricoRevisao[]> {
  const list = loadHistoricoFromStorage();
  return list
    .filter((h) => h.cartaoId === cartaoId)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
}

/**
 * Formata um timestamp em YYYY-MM-DD no fuso horário local
 */
function toLocalDateString(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calcula a sequência ininterrupta de dias de estudo (streak) para o discente.
 * Um dia sem revisões encerra o streak. Se hoje ainda não houve revisão mas ontem houve,
 * o streak do dia anterior ainda é mantido ativo para que o aluno possa cumprir a meta de hoje.
 */
export function calcularSequenciaDias(alunoId: string, dataReferencia: Date = new Date()): number {
  const historico = loadHistoricoFromStorage().filter((h) => h.alunoId === alunoId);
  if (historico.length === 0) return 0;

  // Conjunto de dias únicos estudados
  const diasUnicos = new Set<string>();
  for (const item of historico) {
    diasUnicos.add(toLocalDateString(item.dataHora));
  }

  const cursor = new Date(dataReferencia);
  const hojeStr = toLocalDateString(cursor.toISOString());

  // Cursor ontem
  const ontem = new Date(dataReferencia);
  ontem.setDate(ontem.getDate() - 1);
  const ontemStr = toLocalDateString(ontem.toISOString());

  // Se não estudou nem hoje nem ontem, o streak foi quebrado
  if (!diasUnicos.has(hojeStr) && !diasUnicos.has(ontemStr)) {
    return 0;
  }

  // Começa a contagem a partir de hoje (se estudou hoje) ou de ontem (se ainda não estudou hoje)
  const dataContagem = diasUnicos.has(hojeStr) ? new Date(cursor) : new Date(ontem);
  let streak = 0;

  while (true) {
    const diaStr = toLocalDateString(dataContagem.toISOString());
    if (diasUnicos.has(diaStr)) {
      streak++;
      dataContagem.setDate(dataContagem.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcula métricas consolidadas do discente para o dashboard e tela de flashcards.
 */
export async function obterMetricasAluno(
  alunoId: string,
  baralhosAutorizados: Baralho[]
): Promise<FlashcardsMetricasAluno> {
  const baralhosIds = new Set(baralhosAutorizados.map((b) => b.id));
  const todosCartoes = loadCartoesFromStorage().filter((c) => baralhosIds.has(c.baralhoId) && c.status === "ativo");
  const todosProgressos = loadProgressosFromStorage().filter((p) => p.alunoId === alunoId && baralhosIds.has(p.baralhoId));
  const progressoMap = new Map(todosProgressos.map((p) => [p.cartaoId, p]));

  const agora = new Date();

  let revisoesHoje = 0;
  let emAprendizado = 0;
  let novosDisponiveis = 0;
  let proximaRevisaoMaisProxima: string | undefined = undefined;

  for (const cartao of todosCartoes) {
    const prog = progressoMap.get(cartao.id);

    if (!prog || prog.estado === "novo") {
      novosDisponiveis++;
    } else if (prog.estado === "aprendendo") {
      emAprendizado++;
      if (new Date(prog.proximaRevisao).getTime() <= agora.getTime()) {
        revisoesHoje++;
      }
    } else if (prog.estado === "revisao") {
      if (new Date(prog.proximaRevisao).getTime() <= agora.getTime()) {
        revisoesHoje++;
      } else {
        // Encontra a menor data futura de revisão
        if (!proximaRevisaoMaisProxima || new Date(prog.proximaRevisao).getTime() < new Date(proximaRevisaoMaisProxima).getTime()) {
          proximaRevisaoMaisProxima = prog.proximaRevisao;
        }
      }
    }
  }

  const historicoAluno = loadHistoricoFromStorage().filter((h) => h.alunoId === alunoId);
  const sequenciaDias = calcularSequenciaDias(alunoId, agora);

  return {
    revisoesHoje,
    emAprendizado,
    novosDisponiveis,
    sequenciaDias,
    totalEstudadosHistorico: historicoAluno.length,
    proximaRevisaoGeral: proximaRevisaoMaisProxima,
  };
}

/**
 * Calcula métricas para o dashboard e gestão administrativa dos flashcards.
 */
export async function obterMetricasAdmin(): Promise<FlashcardsMetricasAdmin> {
  const baralhos = loadBaralhosFromStorage();
  const cartoes = loadCartoesFromStorage();
  const historico = loadHistoricoFromStorage();
  const progressos = loadProgressosFromStorage();

  const totalBaralhosPublicados = baralhos.filter((b) => b.status === "publicado").length;
  const totalCartoesAtivos = cartoes.filter((c) => c.status === "ativo").length;
  const revisoesRealizadas = historico.length;

  const alunosUnicos = new Set(historico.map((h) => h.alunoId));
  const alunosAtivosRevisando = alunosUnicos.size;

  // Encontra os cartões com maior número de lapsos (erros)
  const cartoesLapsosMap = new Map<string, number>();
  for (const prog of progressos) {
    if (prog.totalLapsos > 0) {
      cartoesLapsosMap.set(prog.cartaoId, (cartoesLapsosMap.get(prog.cartaoId) || 0) + prog.totalLapsos);
    }
  }

  const baralhoNomeMap = new Map(baralhos.map((b) => [b.id, b.nome]));
  const cartaoMap = new Map(cartoes.map((c) => [c.id, c]));

  const sortedLapsos = Array.from(cartoesLapsosMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const cartoesMaisErros = sortedLapsos.map(([cartaoId, lapsos]) => {
    const card = cartaoMap.get(cartaoId);
    return {
      cartaoId,
      baralhoNome: card ? baralhoNomeMap.get(card.baralhoId) || "Baralho" : "Baralho",
      frente: card ? card.frente : "Cartão",
      totalLapsos: lapsos,
    };
  });

  return {
    totalBaralhosPublicados,
    totalCartoesAtivos,
    revisoesRealizadas,
    alunosAtivosRevisando,
    cartoesMaisErros,
  };
}
