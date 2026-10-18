import { Modulo, StatusModulo, CriteriosConclusaoModulo, OperationResult } from "../types";
import { SEED_MODULOS } from "./mockData";

const STORAGE_KEY = "mtd_demonstrativo_modulos_v1";

function loadModulosFromStorage(): Modulo[] {
  if (typeof window === "undefined") {
    return SEED_MODULOS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_MODULOS));
      return SEED_MODULOS;
    }
    return JSON.parse(raw) as Modulo[];
  } catch (err) {
    console.error("Erro ao carregar módulos do storage:", err);
    return SEED_MODULOS;
  }
}

function saveModulosToStorage(list: Modulo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "modulos" } })
    );
  } catch (err) {
    console.error("Erro ao salvar módulos no storage:", err);
  }
}

export const moduloRepository = {
  async listar(etapaId?: string): Promise<Modulo[]> {
    const list = loadModulosFromStorage();
    let filtrados = list;
    if (etapaId) {
      filtrados = filtrados.filter((m) => m.etapaId === etapaId);
    }
    return filtrados.sort((a, b) => a.ordem - b.ordem);
  },

  async obterPorId(id: string): Promise<Modulo | null> {
    const list = loadModulosFromStorage();
    return list.find((m) => m.id === id) || null;
  },

  async salvar(
    dados: Omit<Modulo, "id" | "criadoEm" | "atualizadoEm"> & { id?: string }
  ): Promise<OperationResult<Modulo>> {
    const list = loadModulosFromStorage();
    const agora = new Date().toISOString();

    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O nome do módulo deve ter ao menos 3 caracteres." };
    }
    if (!dados.etapaId) {
      return { success: false, error: "O módulo deve estar vinculado a uma etapa." };
    }

    if (dados.id) {
      const index = list.findIndex((m) => m.id === dados.id);
      if (index === -1) {
        return { success: false, error: "Módulo não encontrado para edição." };
      }
      const atualizado: Modulo = {
        ...list[index],
        ...dados,
        id: dados.id,
        atualizadoEm: agora,
      };
      list[index] = atualizado;
      saveModulosToStorage(list);
      return { success: true, data: atualizado };
    }

    const modulosEtapa = list.filter((m) => m.etapaId === dados.etapaId);
    const ordem = dados.ordem || modulosEtapa.length + 1;
    const novoId = `mod-${String(list.length + 1).padStart(3, "0")}`;

    const novo: Modulo = {
      id: novoId,
      etapaId: dados.etapaId,
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      ordem,
      nivelReferenciaCEFR: dados.nivelReferenciaCEFR,
      objetivosPedagogicos: dados.objetivosPedagogicos || [],
      cargaHorariaEstimadaHoras: dados.cargaHorariaEstimadaHoras || 20,
      criteriosConclusao: dados.criteriosConclusao || {
        presencaMinimaPercentual: 75,
        atividadesMinimasConcluidas: 3,
        notaMinimaObjetivas: 7.0,
        avaliacaoPraticaObrigatoria: true,
        exigeValidacaoHumana: true,
      },
      status: dados.status || "ativo",
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(novo);
    saveModulosToStorage(list);
    return { success: true, data: novo };
  },

  async moverOrdem(moduloId: string, direcao: "cima" | "baixo"): Promise<OperationResult<Modulo[]>> {
    const list = loadModulosFromStorage();
    const index = list.findIndex((m) => m.id === moduloId);
    if (index === -1) {
      return { success: false, error: "Módulo não encontrado." };
    }

    const moduloAtual = list[index];
    const modulosEtapa = list
      .filter((m) => m.etapaId === moduloAtual.etapaId)
      .sort((a, b) => a.ordem - b.ordem);

    const pos = modulosEtapa.findIndex((m) => m.id === moduloId);
    if (direcao === "cima" && pos > 0) {
      const anterior = modulosEtapa[pos - 1];
      const tempOrdem = moduloAtual.ordem;
      moduloAtual.ordem = anterior.ordem;
      anterior.ordem = tempOrdem;
    } else if (direcao === "baixo" && pos < modulosEtapa.length - 1) {
      const proximo = modulosEtapa[pos + 1];
      const tempOrdem = moduloAtual.ordem;
      moduloAtual.ordem = proximo.ordem;
      proximo.ordem = tempOrdem;
    }

    saveModulosToStorage(list);
    return {
      success: true,
      data: list.filter((m) => m.etapaId === moduloAtual.etapaId).sort((a, b) => a.ordem - b.ordem),
    };
  },

  async atualizarCriteriosConclusao(
    moduloId: string,
    criterios: CriteriosConclusaoModulo
  ): Promise<OperationResult<Modulo>> {
    const list = loadModulosFromStorage();
    const modulo = list.find((m) => m.id === moduloId);
    if (!modulo) {
      return { success: false, error: "Módulo não encontrado." };
    }
    modulo.criteriosConclusao = criterios;
    modulo.atualizadoEm = new Date().toISOString();
    saveModulosToStorage(list);
    return { success: true, data: modulo };
  },

  async alterarStatus(id: string, status: StatusModulo): Promise<OperationResult<Modulo>> {
    const list = loadModulosFromStorage();
    const modulo = list.find((m) => m.id === id);
    if (!modulo) {
      return { success: false, error: "Módulo não encontrado." };
    }
    modulo.status = status;
    modulo.atualizadoEm = new Date().toISOString();
    saveModulosToStorage(list);
    return { success: true, data: modulo };
  },
};
