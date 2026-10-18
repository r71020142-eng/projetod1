import { Atividade, AtividadeFilters, OperationResult } from "@/types";
import { SEED_ATIVIDADES } from "./mockData";
import { validateAtividadeInput, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_atividades_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Atividade[] {
  if (!isBrowser()) {
    return [...SEED_ATIVIDADES];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ATIVIDADES));
      return [...SEED_ATIVIDADES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Atividade[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ATIVIDADES));
    return [...SEED_ATIVIDADES];
  } catch (err) {
    console.warn("Aviso ao carregar atividades do localStorage, usando semente:", err);
    return [...SEED_ATIVIDADES];
  }
}

function saveToStorage(atividades: Atividade[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atividades));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "atividades" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir atividades no localStorage:", err);
    return false;
  }
}

function generateAtividadeId(existingList: Atividade[]): string {
  const maxNum = existingList.reduce((acc, a) => {
    const match = a.id.match(/^atv-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `atv-${String(nextNum).padStart(3, "0")}`;
}

export const atividadeRepository = {
  async listar(filters?: AtividadeFilters): Promise<Atividade[]> {
    const list = loadFromStorage();

    if (!filters) {
      return [...list].sort(
        (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
    }

    let result = [...list];

    if (filters.busca && filters.busca.trim().length > 0) {
      const term = filters.busca.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.titulo.toLowerCase().includes(term) ||
          a.instrucoes.toLowerCase().includes(term)
      );
    }

    if (filters.tipo && filters.tipo !== "todos") {
      result = result.filter((a) => a.tipo === filters.tipo);
    }

    if (filters.status && filters.status !== "todos") {
      result = result.filter((a) => a.status === filters.status);
    }

    if (filters.destinoTipo && filters.destinoTipo !== "todos") {
      result = result.filter((a) => a.destinoTipo === filters.destinoTipo);
    }

    if (filters.destinoId) {
      result = result.filter((a) => a.destinoId === filters.destinoId);
    }

    if (filters.professorId) {
      result = result.filter((a) => a.professorId === filters.professorId);
    }

    return result.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  },

  async listarParaAluno(
    alunoId: string,
    turmasDoAluno: string[],
    filters?: AtividadeFilters
  ): Promise<Atividade[]> {
    const list = loadFromStorage();
    const hoje = new Date().toISOString().slice(0, 10);

    let permitidas = list.filter((a) => {
      // Drafts and archived are hidden from students
      if (a.status === "rascunho" || a.status === "arquivada") return false;

      // Scheduled: only on or after publication date
      if (a.status === "agendada") {
        if (!a.dataPublicacao || a.dataPublicacao > hoje) return false;
      }

      // Check destination
      if (a.destinoTipo === "geral") return true;
      if (a.destinoTipo === "turma" && a.destinoId && turmasDoAluno.includes(a.destinoId)) {
        return true;
      }
      if (a.destinoTipo === "aluno" && a.destinoId === alunoId) {
        return true;
      }

      return false;
    });

    if (filters?.busca && filters.busca.trim().length > 0) {
      const term = filters.busca.toLowerCase().trim();
      permitidas = permitidas.filter(
        (a) =>
          a.titulo.toLowerCase().includes(term) ||
          a.instrucoes.toLowerCase().includes(term)
      );
    }

    if (filters?.tipo && filters.tipo !== "todos") {
      permitidas = permitidas.filter((a) => a.tipo === filters.tipo);
    }

    // Sanitize internal notes for students
    return permitidas
      .map((a) => ({
        ...a,
        observacoesInternas: undefined,
      }))
      .sort((a, b) => {
        // Sort by deadline if available, otherwise by creation
        if (a.prazoEntrega && b.prazoEntrega) {
          return new Date(a.prazoEntrega).getTime() - new Date(b.prazoEntrega).getTime();
        }
        return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      });
  },

  async obterPorId(id: string): Promise<Atividade | null> {
    const list = loadFromStorage();
    return list.find((a) => a.id === id) || null;
  },

  async obterPorIdParaAluno(
    id: string,
    alunoId: string,
    turmasDoAluno: string[]
  ): Promise<Atividade | null> {
    const a = await this.obterPorId(id);
    if (!a) return null;

    if (a.status === "rascunho" || a.status === "arquivada") return null;
    const hoje = new Date().toISOString().slice(0, 10);
    if (a.status === "agendada" && (!a.dataPublicacao || a.dataPublicacao > hoje)) {
      return null;
    }

    const hasAccess =
      a.destinoTipo === "geral" ||
      (a.destinoTipo === "turma" && a.destinoId && turmasDoAluno.includes(a.destinoId)) ||
      (a.destinoTipo === "aluno" && a.destinoId === alunoId);

    if (!hasAccess) return null;

    return {
      ...a,
      observacoesInternas: undefined,
    };
  },

  async criar(dados: Partial<Atividade>): Promise<OperationResult<Atividade>> {
    const validation = validateAtividadeInput(dados);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da atividade preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const list = loadFromStorage();
    const nova: Atividade = {
      id: generateAtividadeId(list),
      titulo: normalizeText(dados.titulo!),
      instrucoes: dados.instrucoes!.trim(),
      tipo: dados.tipo!,
      materialRelacionadoId: dados.materialRelacionadoId,
      destinoTipo: dados.destinoTipo || "geral",
      destinoId: dados.destinoId,
      dataPublicacao: dados.dataPublicacao || new Date().toISOString().slice(0, 10),
      prazoEntrega: dados.prazoEntrega || undefined,
      pontuacaoMaxima:
        dados.pontuacaoMaxima !== undefined && dados.pontuacaoMaxima !== null
          ? Number(dados.pontuacaoMaxima)
          : null,
      status: dados.status || "rascunho",
      professorId: dados.professorId!,
      permitirAtraso: dados.permitirAtraso ?? true,
      observacoesInternas: dados.observacoesInternas ? normalizeText(dados.observacoesInternas) : undefined,
      criadoEm: new Date().toISOString(),
    };

    const updated = [...list, nova];
    saveToStorage(updated);
    return { success: true, data: nova };
  },

  async atualizar(id: string, dados: Partial<Atividade>): Promise<OperationResult<Atividade>> {
    const list = loadFromStorage();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) {
      return { success: false, error: "Atividade não encontrada." };
    }

    const current = list[idx];
    const merged = { ...current, ...dados };
    const validation = validateAtividadeInput(merged);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da atividade preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    list[idx] = {
      ...merged,
      titulo: normalizeText(merged.titulo),
      instrucoes: merged.instrucoes.trim(),
      observacoesInternas: merged.observacoesInternas ? normalizeText(merged.observacoesInternas) : undefined,
    };

    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async encerrar(id: string): Promise<OperationResult<Atividade>> {
    const list = loadFromStorage();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) {
      return { success: false, error: "Atividade não encontrada." };
    }

    list[idx].status = "encerrada";
    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async arquivar(id: string): Promise<OperationResult<Atividade>> {
    const list = loadFromStorage();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) {
      return { success: false, error: "Atividade não encontrada." };
    }

    list[idx].status = "arquivada";
    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async contarPublicadas(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((a) => a.status === "publicada").length;
  },
};
