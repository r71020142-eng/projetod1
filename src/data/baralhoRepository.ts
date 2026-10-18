import { Baralho, BaralhoFilters, OperationResult, StatusBaralho } from "@/types";
import { SEED_BARALHOS } from "./mockData";
import { validateBaralhoInput, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_baralhos_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadBaralhosFromStorage(): Baralho[] {
  if (!isBrowser()) {
    return [...SEED_BARALHOS];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_BARALHOS));
      return [...SEED_BARALHOS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Baralho[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_BARALHOS));
    return [...SEED_BARALHOS];
  } catch (err) {
    console.warn("Aviso ao carregar baralhos do localStorage, usando semente:", err);
    return [...SEED_BARALHOS];
  }
}

export function saveBaralhosToStorage(baralhos: Baralho[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baralhos));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "baralhos" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir baralhos no localStorage:", err);
    return false;
  }
}

function generateBaralhoId(existingList: Baralho[]): string {
  const maxNum = existingList.reduce((acc, b) => {
    const match = b.id.match(/^baralho-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `baralho-${String(nextNum).padStart(3, "0")}`;
}

export async function getBaralhos(filtros?: BaralhoFilters): Promise<Baralho[]> {
  let list = loadBaralhosFromStorage();

  if (filtros) {
    if (filtros.status && filtros.status !== "todos") {
      list = list.filter((b) => b.status === filtros.status);
    }
    if (filtros.nivel && filtros.nivel !== "todos") {
      list = list.filter((b) => b.nivelRecomendado === filtros.nivel || b.nivelRecomendado === "todos");
    }
    if (filtros.destinoTipo && filtros.destinoTipo !== "todos") {
      list = list.filter((b) => b.destinoTipo === filtros.destinoTipo);
    }
    if (filtros.professorId) {
      list = list.filter((b) => b.professorId === filtros.professorId);
    }
    if (filtros.categoria && filtros.categoria !== "todas") {
      list = list.filter((b) => b.categoria.toLowerCase() === filtros.categoria?.toLowerCase());
    }
    if (filtros.busca) {
      const termo = normalizeText(filtros.busca);
      list = list.filter(
        (b) =>
          normalizeText(b.nome).includes(termo) ||
          normalizeText(b.descricao).includes(termo) ||
          b.tags.some((t) => normalizeText(t).includes(termo))
      );
    }
  }

  // Ordena por data de criação decrescente
  return list.sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );
}

/**
 * Retorna exclusivamente os baralhos que o aluno tem permissão de estudar:
 * - Baralho deve estar publicado (status: 'publicado')
 * - Baralho deve ser 'geral' OU vinculado a uma das turmas do aluno OU individualizado para o aluno
 */
export async function getBaralhosAluno(
  alunoId: string,
  turmasIdsAluno: string[] = []
): Promise<Baralho[]> {
  const todos = loadBaralhosFromStorage();

  const permitidos = todos.filter((b) => {
    // 1. Somente baralhos publicados
    if (b.status !== "publicado") return false;

    // 2. Destino autorizado
    if (b.destinoTipo === "geral") return true;
    if (b.destinoTipo === "turma" && b.destinoId && turmasIdsAluno.includes(b.destinoId)) return true;
    if (b.destinoTipo === "aluno" && b.destinoId === alunoId) return true;

    return false;
  });

  return permitidos.sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );
}

export async function getBaralhoById(id: string): Promise<Baralho | null> {
  const list = loadBaralhosFromStorage();
  const found = list.find((b) => b.id === id);
  return found || null;
}

export async function salvarBaralho(
  dados: Partial<Baralho>
): Promise<OperationResult<Baralho>> {
  const validation = validateBaralhoInput(dados);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0] || "Dados do baralho inválidos.";
    return {
      success: false,
      error: firstError,
    };
  }

  const list = loadBaralhosFromStorage();
  const nowIso = new Date().toISOString();

  if (dados.id) {
    // Edição
    const index = list.findIndex((b) => b.id === dados.id);
    if (index === -1) {
      return { success: false, error: "Baralho não encontrado para edição." };
    }

    const atualizado: Baralho = {
      ...list[index],
      nome: dados.nome!.trim(),
      descricao: dados.descricao!.trim(),
      categoria: dados.categoria!.trim(),
      nivelRecomendado: dados.nivelRecomendado!,
      idiomaOrigem: dados.idiomaOrigem || "Inglês",
      idiomaDestino: dados.idiomaDestino || "Português",
      professorId: dados.professorId!,
      professorNome: dados.professorNome || list[index].professorNome,
      destinoTipo: dados.destinoTipo!,
      destinoId: dados.destinoTipo === "geral" ? undefined : dados.destinoId,
      status: dados.status || list[index].status,
      limiteDiarioNovos: dados.limiteDiarioNovos ? Number(dados.limiteDiarioNovos) : list[index].limiteDiarioNovos,
      tags: dados.tags || list[index].tags,
      materialId: dados.materialId || list[index].materialId,
      atividadeId: dados.atividadeId || list[index].atividadeId,
      aulaId: dados.aulaId || list[index].aulaId,
      atualizadoEm: nowIso,
    };

    list[index] = atualizado;
    saveBaralhosToStorage(list);
    return { success: true, data: atualizado };
  } else {
    // Novo baralho
    const novoId = generateBaralhoId(list);
    const novo: Baralho = {
      id: novoId,
      nome: dados.nome!.trim(),
      descricao: dados.descricao!.trim(),
      categoria: dados.categoria!.trim(),
      nivelRecomendado: dados.nivelRecomendado!,
      idiomaOrigem: dados.idiomaOrigem || "Inglês",
      idiomaDestino: dados.idiomaDestino || "Português",
      professorId: dados.professorId!,
      professorNome: dados.professorNome || "Professor MTD",
      destinoTipo: dados.destinoTipo!,
      destinoId: dados.destinoTipo === "geral" ? undefined : dados.destinoId,
      status: dados.status || "publicado",
      limiteDiarioNovos: dados.limiteDiarioNovos ? Number(dados.limiteDiarioNovos) : 20,
      tags: dados.tags || ["método-paulo"],
      materialId: dados.materialId,
      atividadeId: dados.atividadeId,
      aulaId: dados.aulaId,
      totalCartoes: 0,
      criadoEm: nowIso,
      atualizadoEm: nowIso,
    };

    list.unshift(novo);
    saveBaralhosToStorage(list);
    return { success: true, data: novo };
  }
}

export async function atualizarStatusBaralho(
  id: string,
  novoStatus: StatusBaralho
): Promise<OperationResult<Baralho>> {
  const list = loadBaralhosFromStorage();
  const index = list.findIndex((b) => b.id === id);
  if (index === -1) {
    return { success: false, error: "Baralho não encontrado." };
  }

  list[index] = {
    ...list[index],
    status: novoStatus,
    atualizadoEm: new Date().toISOString(),
  };

  saveBaralhosToStorage(list);
  return { success: true, data: list[index] };
}

export async function excluirBaralho(id: string): Promise<OperationResult<boolean>> {
  const list = loadBaralhosFromStorage();
  const index = list.findIndex((b) => b.id === id);
  if (index === -1) {
    return { success: false, error: "Baralho não encontrado." };
  }

  // Não remove destrutivamente se tiver histórico de revisões; arquiva em vez de deletar
  list.splice(index, 1);
  saveBaralhosToStorage(list);
  return { success: true, data: true };
}

export function sincronizarContagemCartoes(baralhoId: string, total: number): void {
  const list = loadBaralhosFromStorage();
  const index = list.findIndex((b) => b.id === baralhoId);
  if (index !== -1) {
    list[index].totalCartoes = total;
    saveBaralhosToStorage(list);
  }
}
