import { Professor, ProfessorFilters, OperationResult } from "@/types";
import { SEED_PROFESSORES } from "./mockData";
import { validateProfessorInput, normalizeEmail, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_professores_v1";

let memoryCache: Professor[] | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Professor[] {
  if (!isBrowser()) {
    if (!memoryCache) {
      memoryCache = [...SEED_PROFESSORES];
    }
    return memoryCache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROFESSORES));
      return [...SEED_PROFESSORES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure avatars are populated even if storage was initialized previously
      const merged = (parsed as Professor[]).map((p) => {
        if (!p.avatarUrl) {
          const seed = SEED_PROFESSORES.find((s) => s.id === p.id);
          if (seed?.avatarUrl) {
            return { ...p, avatarUrl: seed.avatarUrl };
          }
        }
        return p;
      });
      return merged;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROFESSORES));
    return [...SEED_PROFESSORES];
  } catch (err) {
    console.warn("Aviso ao carregar professores do localStorage, usando dados padrão:", err);
    return [...SEED_PROFESSORES];
  }
}

function saveToStorage(professores: Professor[]): boolean {
  if (!isBrowser()) {
    memoryCache = [...professores];
    return true;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(professores));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "professores" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir no localStorage:", err);
    return false;
  }
}

function generateProfessorId(existingList: Professor[]): string {
  const maxNum = existingList.reduce((acc, p) => {
    const match = p.id.match(/^prof-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `prof-${String(nextNum).padStart(3, "0")}`;
}

export const professorRepository = {
  async listar(filters?: ProfessorFilters): Promise<Professor[]> {
    const list = loadFromStorage();

    if (!filters) return list;

    let result = [...list];

    // Filter by Search (Name, Email or Languages)
    if (filters.busca && filters.busca.trim()) {
      const q = filters.busca.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.nomeCompleto.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.idiomasFalados.some((i) => i.toLowerCase().includes(q))
      );
    }

    // Filter by Status
    if (filters.status && filters.status !== "todos") {
      result = result.filter((p) => p.status === filters.status);
    }

    // Sort: most recent first
    return result.sort(
      (a, b) => new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime()
    );
  },

  async obterPorId(id: string): Promise<Professor | null> {
    const list = loadFromStorage();
    const item = list.find((p) => p.id === id);
    return item ? { ...item } : null;
  },

  async criar(
    dados: Omit<Professor, "id" | "dataCadastro">
  ): Promise<OperationResult<Professor>> {
    const list = loadFromStorage();

    const validation = validateProfessorInput(dados, undefined, list);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os campos informados antes de prosseguir.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const novoProfessor: Professor = {
      id: generateProfessorId(list),
      nomeCompleto: normalizeText(dados.nomeCompleto),
      email: normalizeEmail(dados.email),
      telefone: dados.telefone ? normalizeText(dados.telefone) : undefined,
      biografiaCurta: normalizeText(dados.biografiaCurta),
      idiomasFalados: dados.idiomasFalados
        .map((i) => normalizeText(i))
        .filter(Boolean),
      status: dados.status || "ativo",
      dataCadastro: new Date().toISOString(),
    };

    const updatedList = [novoProfessor, ...list];
    const saved = saveToStorage(updatedList);

    if (!saved && isBrowser()) {
      return {
        success: false,
        error: "Falha ao salvar dados no armazenamento local do navegador.",
      };
    }

    return {
      success: true,
      data: novoProfessor,
    };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Professor, "id" | "dataCadastro">>
  ): Promise<OperationResult<Professor>> {
    const list = loadFromStorage();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      return {
        success: false,
        error: "Professor não encontrado.",
      };
    }

    const current = list[index];
    const merged = {
      ...current,
      ...dados,
    };

    const validation = validateProfessorInput(merged, id, list);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os campos antes de salvar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const updatedProfessor: Professor = {
      ...current,
      nomeCompleto: normalizeText(merged.nomeCompleto),
      email: normalizeEmail(merged.email),
      telefone: merged.telefone ? normalizeText(merged.telefone) : undefined,
      biografiaCurta: normalizeText(merged.biografiaCurta),
      idiomasFalados: (merged.idiomasFalados || [])
        .map((i) => normalizeText(i))
        .filter(Boolean),
      status: merged.status,
    };

    list[index] = updatedProfessor;
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return {
        success: false,
        error: "Falha ao atualizar dados no armazenamento local do navegador.",
      };
    }

    return {
      success: true,
      data: updatedProfessor,
    };
  },

  async inativar(id: string): Promise<OperationResult<Professor>> {
    const list = loadFromStorage();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      return { success: false, error: "Professor não encontrado." };
    }

    list[index] = { ...list[index], status: "inativo" };
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return { success: false, error: "Erro ao inativar no armazenamento local." };
    }

    return { success: true, data: list[index] };
  },

  async reativar(id: string): Promise<OperationResult<Professor>> {
    const list = loadFromStorage();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      return { success: false, error: "Professor não encontrado." };
    }

    list[index] = { ...list[index], status: "ativo" };
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return { success: false, error: "Erro ao reativar no armazenamento local." };
    }

    return { success: true, data: list[index] };
  },

  async contarAtivos(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((p) => p.status === "ativo").length;
  },

  async contarTotal(): Promise<number> {
    const list = loadFromStorage();
    return list.length;
  },
};
