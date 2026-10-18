import { Material, MaterialFilters, OperationResult } from "@/types";
import { SEED_MATERIAIS } from "./mockData";
import { validateMaterialInput, normalizeText } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_materiais_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Material[] {
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

function saveToStorage(materiais: Material[]): boolean {
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

function generateMaterialId(existingList: Material[]): string {
  const maxNum = existingList.reduce((acc, m) => {
    const match = m.id.match(/^mat-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `mat-${String(nextNum).padStart(3, "0")}`;
}

export const materialRepository = {
  async listar(filters?: MaterialFilters): Promise<Material[]> {
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
        (m) =>
          m.titulo.toLowerCase().includes(term) ||
          m.descricao.toLowerCase().includes(term) ||
          m.categoria.toLowerCase().includes(term) ||
          m.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    if (filters.tipo && filters.tipo !== "todos") {
      result = result.filter((m) => m.tipo === filters.tipo);
    }

    if (filters.status && filters.status !== "todos") {
      result = result.filter((m) => m.status === filters.status);
    }

    if (filters.nivel && filters.nivel !== "todos") {
      result = result.filter(
        (m) => m.nivelRecomendado === filters.nivel || m.nivelRecomendado === "todos"
      );
    }

    if (filters.destinoTipo && filters.destinoTipo !== "todos") {
      result = result.filter((m) => m.destinoTipo === filters.destinoTipo);
    }

    if (filters.destinoId) {
      result = result.filter((m) => m.destinoId === filters.destinoId);
    }

    return result.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  },

  async listarParaAluno(
    alunoId: string,
    turmasDoAluno: string[],
    filters?: MaterialFilters
  ): Promise<Material[]> {
    const list = loadFromStorage();
    const hoje = new Date().toISOString().slice(0, 10);

    // Filter only materials accessible by the student
    let permitidos = list.filter((m) => {
      // Drafts and archived are never visible to students
      if (m.status === "rascunho" || m.status === "arquivado") return false;

      // Scheduled materials only appear on or after publication date
      if (m.status === "agendado") {
        if (!m.dataPublicacao || m.dataPublicacao > hoje) return false;
      }

      // Check destination
      if (m.destinoTipo === "geral") return true;
      if (m.destinoTipo === "turma" && m.destinoId && turmasDoAluno.includes(m.destinoId)) {
        return true;
      }
      if (m.destinoTipo === "aluno" && m.destinoId === alunoId) {
        return true;
      }

      return false;
    });

    if (filters?.busca && filters.busca.trim().length > 0) {
      const term = filters.busca.toLowerCase().trim();
      permitidos = permitidos.filter(
        (m) =>
          m.titulo.toLowerCase().includes(term) ||
          m.descricao.toLowerCase().includes(term) ||
          m.categoria.toLowerCase().includes(term) ||
          m.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    if (filters?.tipo && filters.tipo !== "todos") {
      permitidos = permitidos.filter((m) => m.tipo === filters.tipo);
    }

    if (filters?.categoria && filters.categoria !== "todas") {
      permitidos = permitidos.filter((m) => m.categoria === filters.categoria);
    }

    // Sanitize internal notes for students
    return permitidos
      .map((m) => ({
        ...m,
        observacoesInternas: undefined,
      }))
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  async obterPorId(id: string): Promise<Material | null> {
    const list = loadFromStorage();
    return list.find((m) => m.id === id) || null;
  },

  async obterPorIdParaAluno(
    id: string,
    alunoId: string,
    turmasDoAluno: string[]
  ): Promise<Material | null> {
    const m = await this.obterPorId(id);
    if (!m) return null;

    if (m.status === "rascunho" || m.status === "arquivado") return null;
    const hoje = new Date().toISOString().slice(0, 10);
    if (m.status === "agendado" && (!m.dataPublicacao || m.dataPublicacao > hoje)) {
      return null;
    }

    const hasAccess =
      m.destinoTipo === "geral" ||
      (m.destinoTipo === "turma" && m.destinoId && turmasDoAluno.includes(m.destinoId)) ||
      (m.destinoTipo === "aluno" && m.destinoId === alunoId);

    if (!hasAccess) return null;

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

    const list = loadFromStorage();
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
      arquivoUrl: dados.arquivoUrl ? dados.arquivoUrl.trim() : undefined,
      arquivoNome: dados.arquivoNome ? normalizeText(dados.arquivoNome) : undefined,
    };

    const updated = [...list, novo];
    saveToStorage(updated);
    return { success: true, data: novo };
  },

  async atualizar(id: string, dados: Partial<Material>): Promise<OperationResult<Material>> {
    const list = loadFromStorage();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) {
      return { success: false, error: "Material não encontrado." };
    }

    const current = list[idx];
    const merged = { ...current, ...dados };
    const validation = validateMaterialInput(merged);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do material preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    list[idx] = {
      ...merged,
      titulo: normalizeText(merged.titulo),
      descricao: normalizeText(merged.descricao),
      categoria: normalizeText(merged.categoria),
      linkExterno: merged.linkExterno ? merged.linkExterno.trim() : undefined,
      conteudoTexto: merged.conteudoTexto ? merged.conteudoTexto.trim() : undefined,
      tags: merged.tags ? merged.tags.map(normalizeText) : [],
      observacoesInternas: merged.observacoesInternas ? normalizeText(merged.observacoesInternas) : undefined,
    };

    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async arquivar(id: string): Promise<OperationResult<Material>> {
    const list = loadFromStorage();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) {
      return { success: false, error: "Material não encontrado." };
    }

    list[idx].status = "arquivado";
    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async restaurar(id: string): Promise<OperationResult<Material>> {
    const list = loadFromStorage();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) {
      return { success: false, error: "Material não encontrado." };
    }

    list[idx].status = "publicado";
    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async contarPublicados(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((m) => m.status === "publicado").length;
  },

  async contarAgendados(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((m) => m.status === "agendado").length;
  },
};
