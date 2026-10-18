import { Programa, StatusPrograma, OperationResult } from "../types";
import { SEED_PROGRAMAS } from "./mockData";

const STORAGE_KEY = "mtd_demonstrativo_programas_v1";

function loadProgramasFromStorage(): Programa[] {
  if (typeof window === "undefined") {
    return SEED_PROGRAMAS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROGRAMAS));
      return SEED_PROGRAMAS;
    }
    return JSON.parse(raw) as Programa[];
  } catch (err) {
    console.error("Erro ao carregar programas do storage:", err);
    return SEED_PROGRAMAS;
  }
}

function saveProgramasToStorage(list: Programa[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "programas" } })
    );
  } catch (err) {
    console.error("Erro ao salvar programas no storage:", err);
  }
}

export const programaRepository = {
  async listar(): Promise<Programa[]> {
    return loadProgramasFromStorage();
  },

  async obterPorId(id: string): Promise<Programa | null> {
    const list = loadProgramasFromStorage();
    return list.find((p) => p.id === id) || null;
  },

  async salvar(
    dados: Omit<Programa, "id" | "criadoEm" | "atualizadoEm"> & { id?: string }
  ): Promise<OperationResult<Programa>> {
    const list = loadProgramasFromStorage();
    const agora = new Date().toISOString();

    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O nome do programa deve ter ao menos 3 caracteres." };
    }

    if (dados.id) {
      const index = list.findIndex((p) => p.id === dados.id);
      if (index === -1) {
        return { success: false, error: "Programa não encontrado para edição." };
      }
      const atualizado: Programa = {
        ...list[index],
        ...dados,
        id: dados.id,
        atualizadoEm: agora,
      };
      list[index] = atualizado;
      saveProgramasToStorage(list);
      return { success: true, data: atualizado };
    }

    const novoId = `prog-${String(list.length + 1).padStart(3, "0")}`;
    const novo: Programa = {
      id: novoId,
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      idioma: dados.idioma || "Inglês",
      duracaoMesesEstimada: dados.duracaoMesesEstimada || 12,
      status: dados.status || "ativo",
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(novo);
    saveProgramasToStorage(list);
    return { success: true, data: novo };
  },

  async alterarStatus(id: string, status: StatusPrograma): Promise<OperationResult<Programa>> {
    const list = loadProgramasFromStorage();
    const prog = list.find((p) => p.id === id);
    if (!prog) {
      return { success: false, error: "Programa não encontrado." };
    }
    prog.status = status;
    prog.atualizadoEm = new Date().toISOString();
    saveProgramasToStorage(list);
    return { success: true, data: prog };
  },
};
