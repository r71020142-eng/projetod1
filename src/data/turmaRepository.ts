import { Turma, TurmaFilters, OperationResult } from "@/types";
import { SEED_TURMAS } from "./mockData";
import { alunoRepository } from "./alunoRepository";
import { professorRepository } from "./professorRepository";
import { validateTurmaInput, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_turmas_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Turma[] {
  if (!isBrowser()) {
    return [...SEED_TURMAS];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TURMAS));
      return [...SEED_TURMAS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Turma[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TURMAS));
    return [...SEED_TURMAS];
  } catch (err) {
    console.warn("Aviso ao carregar turmas do localStorage, usando semente:", err);
    return [...SEED_TURMAS];
  }
}

function saveToStorage(turmas: Turma[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(turmas));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "turmas" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir turmas no localStorage:", err);
    return false;
  }
}

function generateTurmaId(existingList: Turma[]): string {
  const maxNum = existingList.reduce((acc, t) => {
    const match = t.id.match(/^turma-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `turma-${String(nextNum).padStart(3, "0")}`;
}

export const turmaRepository = {
  async listar(filters?: TurmaFilters): Promise<Turma[]> {
    const list = loadFromStorage();

    if (!filters) return list;

    let result = [...list];

    // Filter by Status
    if (filters.status && filters.status !== "todos") {
      result = result.filter((t) => t.status === filters.status);
    }

    // Filter by Nível
    if (filters.nivel && filters.nivel !== "todos") {
      result = result.filter((t) => t.nivel === filters.nivel);
    }

    // Filter by Modalidade
    if (filters.modalidade && filters.modalidade !== "todos") {
      result = result.filter((t) => t.modalidade === filters.modalidade);
    }

    // Search by Turma Name or Professor Name
    if (filters.busca && filters.busca.trim()) {
      const q = filters.busca.trim().toLowerCase();
      const todosProfs = await professorRepository.listar();
      const profMap = new Map(todosProfs.map((p) => [p.id, p.nomeCompleto.toLowerCase()]));

      result = result.filter((t) => {
        const matchesName = t.nome.toLowerCase().includes(q);
        const profNome = profMap.get(t.professorId) || "";
        const matchesProf = profNome.includes(q);
        return matchesName || matchesProf;
      });
    }

    // Sort: most recent first
    return result.sort(
      (a, b) => new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime()
    );
  },

  async obterPorId(id: string): Promise<Turma | null> {
    const list = loadFromStorage();
    const item = list.find((t) => t.id === id);
    return item ? { ...item } : null;
  },

  async listarPorAluno(alunoId: string): Promise<Turma[]> {
    const list = loadFromStorage();
    return list.filter((t) => t.alunoIds.includes(alunoId));
  },

  async listarPorProfessor(professorId: string): Promise<Turma[]> {
    const list = loadFromStorage();
    return list.filter((t) => t.professorId === professorId);
  },

  async contarAtivas(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((t) => t.status === "ativa").length;
  },

  async criar(dados: Omit<Turma, "id" | "dataCadastro">): Promise<OperationResult<Turma>> {
    const list = loadFromStorage();
    const [professores, alunos] = await Promise.all([
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    const validation = validateTurmaInput(dados, professores, alunos, null);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados informados para a turma.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const novaTurma: Turma = {
      id: generateTurmaId(list),
      nome: normalizeText(dados.nome),
      modalidade: dados.modalidade,
      nivel: dados.nivel,
      objetivoPrincipal: normalizeText(dados.objetivoPrincipal),
      professorId: dados.professorId,
      alunoIds: dados.alunoIds || [],
      capacidade: dados.modalidade === "individual" ? 1 : (dados.capacidade || 6),
      status: dados.status || "formacao",
      dataInicio: dados.dataInicio,
      observacoes: dados.observacoes ? normalizeText(dados.observacoes) : undefined,
      dataCadastro: new Date().toISOString(),
    };

    const updatedList = [novaTurma, ...list];
    const saved = saveToStorage(updatedList);

    if (!saved && isBrowser()) {
      return { success: false, error: "Falha ao gravar turma no armazenamento local." };
    }

    return { success: true, data: novaTurma };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Turma, "id" | "dataCadastro">>
  ): Promise<OperationResult<Turma>> {
    const list = loadFromStorage();
    const index = list.findIndex((t) => t.id === id);

    if (index === -1) {
      return { success: false, error: "Turma não encontrada." };
    }

    const current = list[index];
    const merged = { ...current, ...dados };

    const [professores, alunos] = await Promise.all([
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    const validation = validateTurmaInput(merged, professores, alunos, current);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da turma antes de salvar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const updatedTurma: Turma = {
      ...current,
      nome: normalizeText(merged.nome),
      modalidade: merged.modalidade,
      nivel: merged.nivel,
      objetivoPrincipal: normalizeText(merged.objetivoPrincipal),
      professorId: merged.professorId,
      alunoIds: merged.alunoIds,
      capacidade: merged.modalidade === "individual" ? 1 : merged.capacidade,
      status: merged.status,
      dataInicio: merged.dataInicio,
      observacoes: merged.observacoes ? normalizeText(merged.observacoes) : undefined,
    };

    list[index] = updatedTurma;
    const saved = saveToStorage(list);

    if (!saved && isBrowser()) {
      return { success: false, error: "Falha ao atualizar turma no armazenamento local." };
    }

    return { success: true, data: updatedTurma };
  },

  async matricularAluno(turmaId: string, alunoId: string): Promise<OperationResult<Turma>> {
    const list = loadFromStorage();
    const index = list.findIndex((t) => t.id === turmaId);
    if (index === -1) {
      return { success: false, error: "Turma não encontrada." };
    }

    const turma = list[index];

    // Check duplicate in same class
    if (turma.alunoIds.includes(alunoId)) {
      return { success: false, error: "Este discente já está matriculado nesta turma." };
    }

    // Check individual limit
    if (turma.modalidade === "individual" && turma.alunoIds.length >= 1) {
      return { success: false, error: "Turma individual já atingiu a capacidade máxima (1 aluno)." };
    }

    // Check group capacity
    if (turma.modalidade === "grupo" && turma.alunoIds.length >= turma.capacidade) {
      return { success: false, error: `A turma atingiu a capacidade máxima planejada (${turma.capacidade} alunos).` };
    }

    // Check student existence and status
    const aluno = await alunoRepository.obterPorId(alunoId);
    if (!aluno) {
      return { success: false, error: "Aluno não encontrado." };
    }
    if (aluno.status !== "ativo") {
      return {
        success: false,
        error: `O discente "${aluno.nomeCompleto}" está inativo. Apenas alunos com matrícula ativa podem ser vinculados.`,
      };
    }

    turma.alunoIds.push(alunoId);
    list[index] = { ...turma };
    saveToStorage(list);

    return { success: true, data: turma };
  },

  async desmatricularAluno(turmaId: string, alunoId: string): Promise<OperationResult<Turma>> {
    const list = loadFromStorage();
    const index = list.findIndex((t) => t.id === turmaId);
    if (index === -1) {
      return { success: false, error: "Turma não encontrada." };
    }

    const turma = list[index];
    turma.alunoIds = turma.alunoIds.filter((id) => id !== alunoId);
    list[index] = { ...turma };
    saveToStorage(list);

    return { success: true, data: turma };
  },

  async alterarStatus(turmaId: string, novoStatus: Turma["status"]): Promise<OperationResult<Turma>> {
    const list = loadFromStorage();
    const index = list.findIndex((t) => t.id === turmaId);
    if (index === -1) {
      return { success: false, error: "Turma não encontrada." };
    }

    list[index].status = novoStatus;
    saveToStorage(list);
    return { success: true, data: list[index] };
  },
};
