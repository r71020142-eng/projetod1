import { Aluno, AlunoFilters, OperationResult, NivelAluno, OrigemAlteracaoNivel } from "@/types";
import { SEED_ALUNOS } from "./mockData";
import { validateAlunoInput, normalizeEmail, normalizeText } from "./validators";
import { historicoNivelRepository } from "./historicoNivelRepository";
import { IAlunoRepository } from "./contracts/repositoryContracts";

const STORAGE_KEY = "mtd_demonstrativo_alunos_v1";

let memoryCache: Aluno[] | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Aluno[] {
  if (!isBrowser()) {
    if (!memoryCache) {
      memoryCache = [...SEED_ALUNOS];
    }
    return memoryCache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First initialization: seed into storage
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ALUNOS));
      return [...SEED_ALUNOS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure avatars are populated even if storage was initialized previously
      const merged = (parsed as Aluno[]).map((a) => {
        if (!a.avatarUrl) {
          const seed = SEED_ALUNOS.find((s) => s.id === a.id);
          if (seed?.avatarUrl) {
            return { ...a, avatarUrl: seed.avatarUrl };
          }
        }
        return a;
      });
      return merged;
    }
    // If empty or invalid array, reseed
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ALUNOS));
    return [...SEED_ALUNOS];
  } catch (err) {
    console.warn("Aviso ao carregar alunos do localStorage, usando dados padrão:", err);
    return [...SEED_ALUNOS];
  }
}

function saveToStorage(alunos: Aluno[]): boolean {
  if (!isBrowser()) {
    memoryCache = [...alunos];
    return true;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alunos));
    window.dispatchEvent(new CustomEvent("mtd_storage_updated", { detail: { entity: "alunos" } }));
    return true;
  } catch (err) {
    console.error("Erro ao persistir no localStorage:", err);
    return false;
  }
}

function generateAlunoId(existingList: Aluno[]): string {
  const maxNum = existingList.reduce((acc, a) => {
    const match = a.id.match(/^alu-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `alu-${String(nextNum).padStart(3, "0")}`;
}

export const alunoLocalStorageRepository: IAlunoRepository = {
  async listar(filters?: AlunoFilters): Promise<Aluno[]> {
    const list = loadFromStorage();

    if (!filters) return list;

    let result = [...list];

    // Filter by Search (Name or Email)
    if (filters.busca && filters.busca.trim()) {
      const q = filters.busca.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.nomeCompleto.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      );
    }

    // Filter by Status
    if (filters.status && filters.status !== "todos") {
      result = result.filter((a) => a.status === filters.status);
    }

    // Filter by Level
    if (filters.nivel && filters.nivel !== "todos") {
      result = result.filter((a) => a.nivel === filters.nivel);
    }

    // Sort: most recent first
    return result.sort(
      (a, b) => new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime()
    );
  },

  async obterPorId(id: string): Promise<Aluno | null> {
    const list = loadFromStorage();
    const item = list.find((a) => a.id === id);
    return item ? { ...item } : null;
  },

  async criar(
    dados: Omit<Aluno, "id" | "dataCadastro">
  ): Promise<OperationResult<Aluno>> {
    const list = loadFromStorage();

    // Validation
    const validation = validateAlunoInput(dados, undefined, list);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os campos informados antes de prosseguir.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const novoAluno: Aluno = {
      id: generateAlunoId(list),
      nomeCompleto: normalizeText(dados.nomeCompleto),
      email: normalizeEmail(dados.email),
      telefone: dados.telefone ? normalizeText(dados.telefone) : undefined,
      objetivoIngles: normalizeText(dados.objetivoIngles),
      nivel: dados.nivel || "nao_avaliado",
      status: dados.status || "ativo",
      dataCadastro: new Date().toISOString(),
      observacoesPedagogicas: dados.observacoesPedagogicas
        ? normalizeText(dados.observacoesPedagogicas)
        : undefined,
    };

    const updatedList = [novoAluno, ...list];
    const saved = saveToStorage(updatedList);

    if (!saved && isBrowser()) {
      return {
        success: false,
        error: "Falha ao salvar dados no armazenamento local do navegador.",
      };
    }

    return {
      success: true,
      data: novoAluno,
    };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Aluno, "id" | "dataCadastro">>
  ): Promise<OperationResult<Aluno>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);

    if (index === -1) {
      return {
        success: false,
        error: "Aluno não encontrado.",
      };
    }

    const current = list[index];
    const merged = {
      ...current,
      ...dados,
    };

    const validation = validateAlunoInput(merged, id, list);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os campos antes de salvar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const updatedAluno: Aluno = {
      ...current,
      nomeCompleto: normalizeText(merged.nomeCompleto),
      email: normalizeEmail(merged.email),
      telefone: merged.telefone ? normalizeText(merged.telefone) : undefined,
      objetivoIngles: normalizeText(merged.objetivoIngles),
      nivel: merged.nivel,
      status: merged.status,
      observacoesPedagogicas: merged.observacoesPedagogicas
        ? normalizeText(merged.observacoesPedagogicas)
        : undefined,
    };

    list[index] = updatedAluno;
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return {
        success: false,
        error: "Falha ao atualizar dados no armazenamento local do navegador.",
      };
    }

    return {
      success: true,
      data: updatedAluno,
    };
  },

  async inativar(id: string): Promise<OperationResult<Aluno>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);

    if (index === -1) {
      return { success: false, error: "Aluno não encontrado." };
    }

    list[index] = { ...list[index], status: "inativo" };
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return { success: false, error: "Erro ao inativar no armazenamento local." };
    }

    return { success: true, data: list[index] };
  },

  async reativar(id: string): Promise<OperationResult<Aluno>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === id);

    if (index === -1) {
      return { success: false, error: "Aluno não encontrado." };
    }

    list[index] = { ...list[index], status: "ativo" };
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return { success: false, error: "Erro ao reativar no armazenamento local." };
    }

    return { success: true, data: list[index] };
  },

  async atualizarNivel(
    alunoId: string,
    novoNivel: NivelAluno,
    detalhes: {
      origem: OrigemAlteracaoNivel;
      origemReferenciaId?: string;
      professorId?: string;
      professorNome?: string;
      justificativa?: string;
    }
  ): Promise<OperationResult<Aluno>> {
    const list = loadFromStorage();
    const index = list.findIndex((a) => a.id === alunoId);
    if (index === -1) {
      return { success: false, error: "Aluno não encontrado." };
    }

    const alunoAtual = list[index];
    const nivelAnterior = alunoAtual.nivel;

    const updatedAluno: Aluno = {
      ...alunoAtual,
      nivel: novoNivel,
    };

    list[index] = updatedAluno;
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return { success: false, error: "Falha ao atualizar nível do aluno no armazenamento local." };
    }

    await historicoNivelRepository.registrarAlteracao({
      alunoId,
      nivelAnterior,
      novoNivel,
      origem: detalhes.origem,
      origemReferenciaId: detalhes.origemReferenciaId,
      professorId: detalhes.professorId,
      professorNome: detalhes.professorNome,
      justificativa: detalhes.justificativa,
    });

    return {
      success: true,
      data: updatedAluno,
    };
  },

  async contarAtivos(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((a) => a.status === "ativo").length;
  },

  async contarTotal(): Promise<number> {
    const list = loadFromStorage();
    return list.length;
  },
};
