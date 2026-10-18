import { RegistroHistoricoNivel, OperationResult } from "@/types";
import { SEED_HISTORICO_NIVEIS } from "./mockData";

const STORAGE_KEY = "mtd_demonstrativo_historico_niveis_v1";

let memoryCache: RegistroHistoricoNivel[] | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): RegistroHistoricoNivel[] {
  if (!isBrowser()) {
    if (!memoryCache) {
      memoryCache = [...SEED_HISTORICO_NIVEIS];
    }
    return memoryCache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_HISTORICO_NIVEIS));
      return [...SEED_HISTORICO_NIVEIS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as RegistroHistoricoNivel[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_HISTORICO_NIVEIS));
    return [...SEED_HISTORICO_NIVEIS];
  } catch (err) {
    console.warn("Aviso ao carregar histórico de níveis do localStorage:", err);
    return [...SEED_HISTORICO_NIVEIS];
  }
}

function saveToStorage(registros: RegistroHistoricoNivel[]): boolean {
  if (!isBrowser()) {
    memoryCache = [...registros];
    return true;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "historico_niveis" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir histórico de níveis:", err);
    return false;
  }
}

function generateRegistroId(existing: RegistroHistoricoNivel[]): string {
  const maxNum = existing.reduce((acc, r) => {
    const match = r.id.match(/^hn-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const next = maxNum + 1;
  return `hn-${String(next).padStart(3, "0")}`;
}

export const historicoNivelRepository = {
  async listarPorAluno(alunoId: string): Promise<RegistroHistoricoNivel[]> {
    const list = loadFromStorage();
    return list
      .filter((r) => r.alunoId === alunoId)
      .sort((a, b) => new Date(b.dataAlteracao).getTime() - new Date(a.dataAlteracao).getTime());
  },

  async listarTodos(): Promise<RegistroHistoricoNivel[]> {
    const list = loadFromStorage();
    return list.sort(
      (a, b) => new Date(b.dataAlteracao).getTime() - new Date(a.dataAlteracao).getTime()
    );
  },

  async obterPorId(id: string): Promise<RegistroHistoricoNivel | null> {
    const list = loadFromStorage();
    const found = list.find((r) => r.id === id);
    return found ? { ...found } : null;
  },

  async registrarAlteracao(
    dados: Omit<RegistroHistoricoNivel, "id" | "dataAlteracao">
  ): Promise<OperationResult<RegistroHistoricoNivel>> {
    const list = loadFromStorage();
    const novoRegistro: RegistroHistoricoNivel = {
      ...dados,
      id: generateRegistroId(list),
      dataAlteracao: new Date().toISOString(),
    };

    list.unshift(novoRegistro);
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return {
        success: false,
        error: "Falha ao gravar histórico de nível no armazenamento local.",
      };
    }

    return {
      success: true,
      data: novoRegistro,
    };
  },
};
