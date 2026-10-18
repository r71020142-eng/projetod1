import { Etapa, StatusEtapa, OperationResult } from "../types";
import { SEED_ETAPAS } from "./mockData";

const STORAGE_KEY = "mtd_demonstrativo_etapas_v1";

function loadEtapasFromStorage(): Etapa[] {
  if (typeof window === "undefined") {
    return SEED_ETAPAS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ETAPAS));
      return SEED_ETAPAS;
    }
    return JSON.parse(raw) as Etapa[];
  } catch (err) {
    console.error("Erro ao carregar etapas do storage:", err);
    return SEED_ETAPAS;
  }
}

function saveEtapasToStorage(list: Etapa[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "etapas" } })
    );
  } catch (err) {
    console.error("Erro ao salvar etapas no storage:", err);
  }
}

export const etapaRepository = {
  async listar(programaId?: string): Promise<Etapa[]> {
    const list = loadEtapasFromStorage();
    let filtradas = list;
    if (programaId) {
      filtradas = filtradas.filter((e) => e.programaId === programaId);
    }
    return filtradas.sort((a, b) => a.ordem - b.ordem);
  },

  async obterPorId(id: string): Promise<Etapa | null> {
    const list = loadEtapasFromStorage();
    return list.find((e) => e.id === id) || null;
  },

  async salvar(
    dados: Omit<Etapa, "id" | "criadoEm" | "atualizadoEm"> & { id?: string }
  ): Promise<OperationResult<Etapa>> {
    const list = loadEtapasFromStorage();
    const agora = new Date().toISOString();

    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O nome da etapa deve ter ao menos 3 caracteres." };
    }
    if (!dados.programaId) {
      return { success: false, error: "A etapa deve estar vinculada a um programa." };
    }

    if (dados.id) {
      const index = list.findIndex((e) => e.id === dados.id);
      if (index === -1) {
        return { success: false, error: "Etapa não encontrada para edição." };
      }
      const atualizada: Etapa = {
        ...list[index],
        ...dados,
        id: dados.id,
        atualizadoEm: agora,
      };
      list[index] = atualizada;
      saveEtapasToStorage(list);
      return { success: true, data: atualizada };
    }

    const etapasPrograma = list.filter((e) => e.programaId === dados.programaId);
    const ordem = dados.ordem || etapasPrograma.length + 1;
    const novoId = `etapa-${String(list.length + 1).padStart(3, "0")}`;

    const nova: Etapa = {
      id: novoId,
      programaId: dados.programaId,
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      ordem,
      objetivos: dados.objetivos || [],
      status: dados.status || "ativa",
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(nova);
    saveEtapasToStorage(list);
    return { success: true, data: nova };
  },

  async moverOrdem(etapaId: string, direcao: "cima" | "baixo"): Promise<OperationResult<Etapa[]>> {
    const list = loadEtapasFromStorage();
    const index = list.findIndex((e) => e.id === etapaId);
    if (index === -1) {
      return { success: false, error: "Etapa não encontrada." };
    }

    const etapaAtual = list[index];
    const etapasPrograma = list
      .filter((e) => e.programaId === etapaAtual.programaId)
      .sort((a, b) => a.ordem - b.ordem);

    const pos = etapasPrograma.findIndex((e) => e.id === etapaId);
    if (direcao === "cima" && pos > 0) {
      const anterior = etapasPrograma[pos - 1];
      const tempOrdem = etapaAtual.ordem;
      etapaAtual.ordem = anterior.ordem;
      anterior.ordem = tempOrdem;
    } else if (direcao === "baixo" && pos < etapasPrograma.length - 1) {
      const proxima = etapasPrograma[pos + 1];
      const tempOrdem = etapaAtual.ordem;
      etapaAtual.ordem = proxima.ordem;
      proxima.ordem = tempOrdem;
    }

    saveEtapasToStorage(list);
    return {
      success: true,
      data: list.filter((e) => e.programaId === etapaAtual.programaId).sort((a, b) => a.ordem - b.ordem),
    };
  },

  async alterarStatus(id: string, status: StatusEtapa): Promise<OperationResult<Etapa>> {
    const list = loadEtapasFromStorage();
    const etapa = list.find((e) => e.id === id);
    if (!etapa) {
      return { success: false, error: "Etapa não encontrada." };
    }
    etapa.status = status;
    etapa.atualizadoEm = new Date().toISOString();
    saveEtapasToStorage(list);
    return { success: true, data: etapa };
  },
};
