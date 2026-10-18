import { ConteudoDiario, ConteudoDiarioFilters, OperationResult } from "@/types";
import { SEED_CONTEUDOS_DIARIOS } from "./mockData";
import { validateConteudoDiarioInput, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_conteudos_diarios_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): ConteudoDiario[] {
  if (!isBrowser()) {
    return [...SEED_CONTEUDOS_DIARIOS];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONTEUDOS_DIARIOS));
      return [...SEED_CONTEUDOS_DIARIOS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as ConteudoDiario[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONTEUDOS_DIARIOS));
    return [...SEED_CONTEUDOS_DIARIOS];
  } catch (err) {
    console.warn("Aviso ao carregar conteúdos diários do localStorage, usando semente:", err);
    return [...SEED_CONTEUDOS_DIARIOS];
  }
}

function saveToStorage(conteudos: ConteudoDiario[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conteudos));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "conteudos_diarios" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir conteúdos diários no localStorage:", err);
    return false;
  }
}

function generateConteudoId(existingList: ConteudoDiario[]): string {
  const maxNum = existingList.reduce((acc, c) => {
    const match = c.id.match(/^cd-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `cd-${String(nextNum).padStart(3, "0")}`;
}

export const conteudoDiarioRepository = {
  async listar(filters?: ConteudoDiarioFilters): Promise<ConteudoDiario[]> {
    const list = loadFromStorage();

    if (!filters) {
      return [...list].sort(
        (a, b) => new Date(b.dataProgramada).getTime() - new Date(a.dataProgramada).getTime()
      );
    }

    let result = [...list];

    if (filters.busca && filters.busca.trim().length > 0) {
      const term = filters.busca.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.titulo.toLowerCase().includes(term) ||
          c.texto.toLowerCase().includes(term)
      );
    }

    if (filters.status && filters.status !== "todos") {
      result = result.filter((c) => c.status === filters.status);
    }

    if (filters.nivel && filters.nivel !== "todos") {
      result = result.filter(
        (c) => c.nivelRecomendado === filters.nivel || c.nivelRecomendado === "todos"
      );
    }

    if (filters.data) {
      result = result.filter((c) => c.dataProgramada === filters.data);
    }

    return result.sort(
      (a, b) => new Date(b.dataProgramada).getTime() - new Date(a.dataProgramada).getTime()
    );
  },

  async obterPraticaDeHoje(
    alunoId?: string,
    turmasDoAluno: string[] = []
  ): Promise<ConteudoDiario | null> {
    const list = loadFromStorage();
    const hoje = new Date().toISOString().slice(0, 10);

    // Eligible items: not draft or archived, scheduled for today or earlier published
    const candidatos = list.filter((c) => {
      if (c.status === "rascunho" || c.status === "arquivado") return false;
      if (c.status === "agendado" && c.dataProgramada > hoje) return false;

      // Filter destination if student info provided
      if (alunoId) {
        if (c.destinoTipo === "geral") return true;
        if (c.destinoTipo === "turma" && c.destinoId && turmasDoAluno.includes(c.destinoId)) {
          return true;
        }
        if (c.destinoTipo === "aluno" && c.destinoId === alunoId) {
          return true;
        }
        return false;
      }

      return true;
    });

    if (candidatos.length === 0) return null;

    // Prefer item scheduled exactly for today
    const exatoHoje = candidatos.find((c) => c.dataProgramada === hoje);
    if (exatoHoje) return exatoHoje;

    // Otherwise return most recent published
    return candidatos.sort(
      (a, b) => new Date(b.dataProgramada).getTime() - new Date(a.dataProgramada).getTime()
    )[0];
  },

  async obterPorId(id: string): Promise<ConteudoDiario | null> {
    const list = loadFromStorage();
    return list.find((c) => c.id === id) || null;
  },

  async criar(dados: Partial<ConteudoDiario>): Promise<OperationResult<ConteudoDiario>> {
    const validation = validateConteudoDiarioInput(dados);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do conteúdo diário preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const list = loadFromStorage();
    const novo: ConteudoDiario = {
      id: generateConteudoId(list),
      titulo: normalizeText(dados.titulo!),
      texto: dados.texto!.trim(),
      dataProgramada: dados.dataProgramada!,
      nivelRecomendado: dados.nivelRecomendado || "todos",
      destinoTipo: dados.destinoTipo || "geral",
      destinoId: dados.destinoId,
      materialId: dados.materialId,
      atividadeId: dados.atividadeId,
      status: dados.status || "publicado",
      criadoEm: new Date().toISOString(),
    };

    const updated = [...list, novo];
    saveToStorage(updated);
    return { success: true, data: novo };
  },

  async atualizar(
    id: string,
    dados: Partial<ConteudoDiario>
  ): Promise<OperationResult<ConteudoDiario>> {
    const list = loadFromStorage();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) {
      return { success: false, error: "Conteúdo diário não encontrado." };
    }

    const current = list[idx];
    const merged = { ...current, ...dados };
    const validation = validateConteudoDiarioInput(merged);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do conteúdo diário preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    list[idx] = {
      ...merged,
      titulo: normalizeText(merged.titulo),
      texto: merged.texto.trim(),
    };

    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async arquivar(id: string): Promise<OperationResult<ConteudoDiario>> {
    const list = loadFromStorage();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) {
      return { success: false, error: "Conteúdo diário não encontrado." };
    }

    list[idx].status = "arquivado";
    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async contarAgendados(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((c) => c.status === "agendado").length;
  },
};
