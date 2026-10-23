import { Cartao, OperationResult, StatusCartao } from "@/types";
import { SEED_CARTOES } from "./mockData";
import { validateCartaoInput } from "./validators";
import { sincronizarContagemCartoes } from "./baralhoRepository";

const STORAGE_KEY = "mtd_demonstrativo_cartoes_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadCartoesFromStorage(): Cartao[] {
  if (!isBrowser()) {
    return [...SEED_CARTOES];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CARTOES));
      return [...SEED_CARTOES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Cartao[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CARTOES));
    return [...SEED_CARTOES];
  } catch (err) {
    console.warn("Aviso ao carregar cartões do localStorage, usando semente:", err);
    return [...SEED_CARTOES];
  }
}

export function saveCartoesToStorage(cartoes: Cartao[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartoes));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "cartoes" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir cartões no localStorage:", err);
    return false;
  }
}

function generateCartaoId(existingList: Cartao[]): string {
  const maxNum = existingList.reduce((acc, c) => {
    const match = c.id.match(/^card-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `card-${String(nextNum).padStart(3, "0")}`;
}

export const cartaoLocalStorageRepository = {
  async getCartoesPorBaralho(baralhoId: string, apenasAtivos = false): Promise<Cartao[]> {
    const list = loadCartoesFromStorage();
    let filtered = list.filter((c) => c.baralhoId === baralhoId);
    if (apenasAtivos) {
      filtered = filtered.filter((c) => c.status === "ativo");
    }
    return filtered;
  },

  async getCartaoById(id: string): Promise<Cartao | null> {
    const list = loadCartoesFromStorage();
    const found = list.find((c) => c.id === id);
    return found || null;
  },

  async salvarCartao(dados: Partial<Cartao>): Promise<OperationResult<Cartao>> {
    const validation = validateCartaoInput(dados);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || "Dados do cartão inválidos.";
      return { success: false, error: firstError };
    }

    const list = loadCartoesFromStorage();
    const nowIso = new Date().toISOString();

    if (dados.id) {
      const index = list.findIndex((c) => c.id === dados.id);
      if (index === -1) {
        return { success: false, error: "Cartão não encontrado para edição." };
      }

      const atualizado: Cartao = {
        ...list[index],
        frente: dados.frente!.trim(),
        verso: dados.verso!.trim(),
        exemplo: dados.exemplo?.trim() || undefined,
        traducao: dados.traducao?.trim() || undefined,
        dica: dados.dica?.trim() || undefined,
        pronuncia: dados.pronuncia?.trim() || undefined,
        linkAudio: dados.linkAudio?.trim() || undefined,
        tags: dados.tags || list[index].tags,
        status: dados.status || list[index].status,
        atualizadoEm: nowIso,
      };

      list[index] = atualizado;
      saveCartoesToStorage(list);
      return { success: true, data: atualizado };
    } else {
      const novoId = generateCartaoId(list);
      const novo: Cartao = {
        id: novoId,
        baralhoId: dados.baralhoId!,
        frente: dados.frente!.trim(),
        verso: dados.verso!.trim(),
        exemplo: dados.exemplo?.trim() || undefined,
        traducao: dados.traducao?.trim() || undefined,
        dica: dados.dica?.trim() || undefined,
        pronuncia: dados.pronuncia?.trim() || undefined,
        linkAudio: dados.linkAudio?.trim() || undefined,
        tags: dados.tags || [],
        status: dados.status || "ativo",
        criadoEm: nowIso,
        atualizadoEm: nowIso,
      };

      list.push(novo);
      saveCartoesToStorage(list);

      const totalNoBaralho = list.filter((c) => c.baralhoId === dados.baralhoId).length;
      sincronizarContagemCartoes(dados.baralhoId!, totalNoBaralho);

      return { success: true, data: novo };
    }
  },

  async atualizarStatusCartao(id: string, novoStatus: StatusCartao): Promise<OperationResult<Cartao>> {
    const list = loadCartoesFromStorage();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return { success: false, error: "Cartão não encontrado." };
    }

    list[index] = {
      ...list[index],
      status: novoStatus,
      atualizadoEm: new Date().toISOString(),
    };

    saveCartoesToStorage(list);
    return { success: true, data: list[index] };
  },

  async excluirCartao(id: string): Promise<OperationResult<boolean>> {
    const list = loadCartoesFromStorage();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return { success: false, error: "Cartão não encontrado." };
    }

    const baralhoId = list[index].baralhoId;
    list.splice(index, 1);
    saveCartoesToStorage(list);

    const totalNoBaralho = list.filter((c) => c.baralhoId === baralhoId).length;
    sincronizarContagemCartoes(baralhoId, totalNoBaralho);

    return { success: true, data: true };
  },

  async importarCartoesCSV(
    baralhoId: string,
    itensValidos: Array<{
      frente: string;
      verso: string;
      exemplo?: string;
      traducao?: string;
      dica?: string;
      pronuncia?: string;
      tags?: string[];
    }>
  ): Promise<OperationResult<Cartao[]>> {
    if (!baralhoId) {
      return { success: false, error: "BaralhoId não fornecido para importação." };
    }
    if (!itensValidos || itensValidos.length === 0) {
      return { success: false, error: "Nenhum item válido para importar." };
    }

    const list = loadCartoesFromStorage();
    const nowIso = new Date().toISOString();
    const inseridos: Cartao[] = [];

    for (const item of itensValidos) {
      const novoId = generateCartaoId([...list, ...inseridos]);
      const novo: Cartao = {
        id: novoId,
        baralhoId,
        frente: item.frente.trim(),
        verso: item.verso.trim(),
        exemplo: item.exemplo?.trim() || undefined,
        traducao: item.traducao?.trim() || undefined,
        dica: item.dica?.trim() || undefined,
        pronuncia: item.pronuncia?.trim() || undefined,
        tags: item.tags || [],
        status: "ativo",
        criadoEm: nowIso,
        atualizadoEm: nowIso,
      };
      inseridos.push(novo);
    }

    const updatedList = [...list, ...inseridos];
    saveCartoesToStorage(updatedList);

    const totalNoBaralho = updatedList.filter((c) => c.baralhoId === baralhoId).length;
    sincronizarContagemCartoes(baralhoId, totalNoBaralho);

    return { success: true, data: inseridos };
  },
};
