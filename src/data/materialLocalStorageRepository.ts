import { Material, MaterialFilters, OperationResult } from "@/types";
import { SEED_MATERIAIS } from "./mockData";
import { validateMaterialInput, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_materiais_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadMateriaisFromStorage(): Material[] {
  if (!isBrowser()) {
    return [...SEED_MATERIAIS];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_MATERIAIS));
      return [...SEED_MATERIAIS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Material[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_MATERIAIS));
    return [...SEED_MATERIAIS];
  } catch (err) {
    console.warn("Aviso ao carregar materiais do localStorage, usando semente:", err);
    return [...SEED_MATERIAIS];
  }
}

export function saveMateriaisToStorage(materiais: Material[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(materiais));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "materiais" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir materiais no localStorage:", err);
    return false;
  }
}

function generateMaterialId(list: Material[]): string {
  const max = list.reduce((acc, curr) => {
    const num = parseInt(curr.id.replace("mat-", ""), 10);
    return isNaN(num) ? acc : Math.max(acc, num);
  }, 0);
  return `mat-${String(max + 1).padStart(3, "0")}`;
}

export const materialLocalStorageRepository = {
  async listar(filters?: MaterialFilters): Promise<Material[]> {
    let list = loadMateriaisFromStorage();

    if (!filters) return list;

    if (filters.busca) {
      const q = filters.busca.toLowerCase();
      list = list.filter(
        (m) =>
          m.titulo.toLowerCase().includes(q) ||
          m.descricao.toLowerCase().includes(q) ||
          m.categoria.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.tipo && filters.tipo !== "todos") {
      list = list.filter((m) => m.tipo === filters.tipo);
    }

    if (filters.status && filters.status !== "todos") {
      list = list.filter((m) => m.status === filters.status);
    }

    if (filters.nivel && filters.nivel !== "todos") {
      list = list.filter(
        (m) => m.nivelRecomendado === filters.nivel || m.nivelRecomendado === "todos"
      );
    }

    if (filters.categoria && filters.categoria !== "todas") {
      list = list.filter((m) => m.categoria.toLowerCase() === filters.categoria!.toLowerCase());
    }

    if (filters.destinoTipo && filters.destinoTipo !== "todos") {
      list = list.filter((m) => m.destinoTipo === filters.destinoTipo);
    }

    if (filters.destinoId) {
      list = list.filter((m) => m.destinoId === filters.destinoId);
    }

    if (filters.moduloId) {
      list = list.filter((m) => m.moduloId === filters.moduloId || m.moduleId === filters.moduloId);
    }

    return list.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  async listarParaAluno(
    alunoId: string,
    turmasIds: string[] = []
  ): Promise<Material[]> {
    const list = loadMateriaisFromStorage();
    const hoje = new Date().toISOString().slice(0, 10);

    return list
      .filter((m) => {
        if (m.status !== "publicado") return false;
        if (m.dataPublicacao && m.dataPublicacao > hoje) return false;

        if (m.destinoTipo === "geral") return true;
        if (m.destinoTipo === "turma" && m.destinoId && turmasIds.includes(m.destinoId)) return true;
        if (m.destinoTipo === "aluno" && m.destinoId === alunoId) return true;

        return false;
      })
      .map((m) => ({
        ...m,
        observacoesInternas: undefined,
      }))
      .sort((a, b) => new Date(b.dataPublicacao || b.criadoEm).getTime() - new Date(a.dataPublicacao || a.criadoEm).getTime());
  },

  async obterPorId(id: string): Promise<Material | null> {
    const list = loadMateriaisFromStorage();
    return list.find((m) => m.id === id) || null;
  },

  async obterPorIdParaAluno(
    id: string,
    alunoId: string,
    turmasIds: string[] = []
  ): Promise<Material | null> {
    const m = await this.obterPorId(id);
    if (!m) return null;

    const hoje = new Date().toISOString().slice(0, 10);
    if (m.status !== "publicado") return null;
    if (m.dataPublicacao && m.dataPublicacao > hoje) return null;

    let temAcesso = false;
    if (m.destinoTipo === "geral") temAcesso = true;
    if (m.destinoTipo === "turma" && m.destinoId && turmasIds.includes(m.destinoId)) temAcesso = true;
    if (m.destinoTipo === "aluno" && m.destinoId === alunoId) temAcesso = true;

    if (!temAcesso) return null;

    return {
      ...m,
      observacoesInternas: undefined,
    };
  },

  async criar(dados: Partial<Material>): Promise<OperationResult<Material>> {
    const validation = validateMaterialInput(dados);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do material preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const list = loadMateriaisFromStorage();
    const novo: Material = {
      id: generateMaterialId(list),
      titulo: normalizeText(dados.titulo!),
      descricao: normalizeText(dados.descricao!),
      tipo: dados.tipo!,
      categoria: normalizeText(dados.categoria!),
      nivelRecomendado: dados.nivelRecomendado || "todos",
      autorId: dados.autorId!,
      autorNome: dados.autorNome ? normalizeText(dados.autorNome) : undefined,
      criadoEm: new Date().toISOString(),
      dataPublicacao: dados.dataPublicacao || new Date().toISOString().slice(0, 10),
      status: dados.status || "rascunho",
      destinoTipo: dados.destinoTipo || "geral",
      destinoId: dados.destinoId,
      linkExterno: dados.linkExterno ? dados.linkExterno.trim() : undefined,
      conteudoTexto: dados.conteudoTexto ? dados.conteudoTexto.trim() : undefined,
      tags: dados.tags ? dados.tags.map(normalizeText) : [],
      observacoesInternas: dados.observacoesInternas ? normalizeText(dados.observacoesInternas) : undefined,
      moduloId: dados.moduloId || dados.moduleId,
      arquivoUrl: dados.arquivoUrl ? dados.arquivoUrl.trim() : undefined,
      arquivoNome: dados.arquivoNome ? normalizeText(dados.arquivoNome) : undefined,
    };

    const updated = [...list, novo];
    saveMateriaisToStorage(updated);
    return { success: true, data: novo };
  },

  async atualizar(id: string, dados: Partial<Material>): Promise<OperationResult<Material>> {
    const list = loadMateriaisFromStorage();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, error: "Material não encontrado." };
    }

    const atual = list[index];
    const validation = validateMaterialInput({ ...atual, ...dados });
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do material preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const atualizado: Material = {
      ...atual,
      ...dados,
      titulo: dados.titulo ? normalizeText(dados.titulo) : atual.titulo,
      descricao: dados.descricao ? normalizeText(dados.descricao) : atual.descricao,
      categoria: dados.categoria ? normalizeText(dados.categoria) : atual.categoria,
      linkExterno: dados.linkExterno !== undefined ? dados.linkExterno.trim() : atual.linkExterno,
      conteudoTexto: dados.conteudoTexto !== undefined ? dados.conteudoTexto.trim() : atual.conteudoTexto,
      tags: dados.tags ? dados.tags.map(normalizeText) : atual.tags,
      observacoesInternas:
        dados.observacoesInternas !== undefined
          ? normalizeText(dados.observacoesInternas)
          : atual.observacoesInternas,
      moduloId: dados.moduloId || dados.moduleId || atual.moduloId,
    };

    list[index] = atualizado;
    saveMateriaisToStorage(list);
    return { success: true, data: atualizado };
  },

  async arquivar(id: string): Promise<OperationResult<Material>> {
    const list = loadMateriaisFromStorage();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, error: "Material não encontrado." };
    }
    list[index].status = "arquivado";
    saveMateriaisToStorage(list);
    return { success: true, data: list[index] };
  },

  async restaurar(id: string): Promise<OperationResult<Material>> {
    const list = loadMateriaisFromStorage();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, error: "Material não encontrado." };
    }
    list[index].status = "publicado";
    saveMateriaisToStorage(list);
    return { success: true, data: list[index] };
  },

  async contarPublicados(): Promise<number> {
    const list = loadMateriaisFromStorage();
    return list.filter((m) => m.status === "publicado").length;
  },

  async contarAgendados(): Promise<number> {
    const list = loadMateriaisFromStorage();
    return list.filter((m) => m.status === "agendado").length;
  },
};
