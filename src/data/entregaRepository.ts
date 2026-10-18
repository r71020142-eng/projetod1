import { Entrega, EntregaFilters, HistoricoEnvio, OperationResult } from "@/types";
import { SEED_ENTREGAS } from "./mockData";
import { atividadeRepository } from "./atividadeRepository";
import { validateEntregaInput, validateCorrecaoInput } from "./validators";

const STORAGE_KEY = "mtd_demonstrativo_entregas_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Entrega[] {
  if (!isBrowser()) {
    return [...SEED_ENTREGAS];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENTREGAS));
      return [...SEED_ENTREGAS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Entrega[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENTREGAS));
    return [...SEED_ENTREGAS];
  } catch (err) {
    console.warn("Aviso ao carregar entregas do localStorage, usando semente:", err);
    return [...SEED_ENTREGAS];
  }
}

function saveToStorage(entregas: Entrega[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entregas));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "entregas" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir entregas no localStorage:", err);
    return false;
  }
}

function generateEntregaId(existingList: Entrega[]): string {
  const maxNum = existingList.reduce((acc, e) => {
    const match = e.id.match(/^ent-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `ent-${String(nextNum).padStart(3, "0")}`;
}

export const entregaRepository = {
  async listar(filters?: EntregaFilters): Promise<Entrega[]> {
    const list = loadFromStorage();

    if (!filters) {
      return [...list].sort(
        (a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
      );
    }

    let result = [...list];

    if (filters.atividadeId) {
      result = result.filter((e) => e.atividadeId === filters.atividadeId);
    }

    if (filters.alunoId) {
      result = result.filter((e) => e.alunoId === filters.alunoId);
    }

    if (filters.status && filters.status !== "todos") {
      result = result.filter((e) => e.status === filters.status);
    }

    return result.sort(
      (a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
    );
  },

  async obterPorId(id: string): Promise<Entrega | null> {
    const list = loadFromStorage();
    return list.find((e) => e.id === id) || null;
  },

  async obterPorAtividadeEAluno(
    atividadeId: string,
    alunoId: string
  ): Promise<Entrega | null> {
    const list = loadFromStorage();
    return list.find((e) => e.atividadeId === atividadeId && e.alunoId === alunoId) || null;
  },

  async salvarRascunho(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>> {
    const atividade = await atividadeRepository.obterPorId(atividadeId);
    if (!atividade) {
      return { success: false, error: "Atividade não encontrada." };
    }

    const list = loadFromStorage();
    const idx = list.findIndex(
      (e) => e.atividadeId === atividadeId && e.alunoId === alunoId
    );

    const agora = new Date().toISOString();

    if (idx !== -1) {
      const current = list[idx];
      // Cannot edit if already submitted or corrected unless resubmission requested
      if (
        current.status === "entregue" ||
        current.status === "atrasada" ||
        current.status === "corrigida"
      ) {
        return {
          success: false,
          error: "Esta atividade já foi enviada e está bloqueada para edição até o professor solicitar reenvio.",
        };
      }

      list[idx] = {
        ...current,
        respostaTexto: dados.respostaTexto !== undefined ? dados.respostaTexto : current.respostaTexto,
        respostaLink: dados.respostaLink !== undefined ? dados.respostaLink.trim() : current.respostaLink,
        status: "em_andamento",
        atualizadoEm: agora,
      };

      saveToStorage(list);
      return { success: true, data: list[idx] };
    }

    // Create new draft
    const nova: Entrega = {
      id: generateEntregaId(list),
      atividadeId,
      alunoId,
      respostaTexto: dados.respostaTexto || undefined,
      respostaLink: dados.respostaLink ? dados.respostaLink.trim() : undefined,
      status: "em_andamento",
      criadoEm: agora,
      atualizadoEm: agora,
      historicoEnvios: [],
    };

    const updated = [...list, nova];
    saveToStorage(updated);
    return { success: true, data: nova };
  },

  async enviarEntrega(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>> {
    const atividade = await atividadeRepository.obterPorId(atividadeId);
    if (!atividade) {
      return { success: false, error: "Atividade não encontrada." };
    }

    const list = loadFromStorage();
    const idx = list.findIndex(
      (e) => e.atividadeId === atividadeId && e.alunoId === alunoId
    );

    if (idx !== -1) {
      const current = list[idx];
      if (
        current.status === "entregue" ||
        current.status === "atrasada" ||
        current.status === "corrigida"
      ) {
        return {
          success: false,
          error: "Esta atividade já foi entregue e não permite alterações.",
        };
      }
    }

    // Validate inputs and deadline
    const validation = validateEntregaInput(dados, atividade, false);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique sua resposta antes de entregar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const agora = new Date().toISOString();
    const statusFinal: Entrega["status"] = validation.atrasada ? "atrasada" : "entregue";

    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        respostaTexto: dados.respostaTexto?.trim() || undefined,
        respostaLink: dados.respostaLink?.trim() || undefined,
        status: statusFinal,
        entregueEm: agora,
        atualizadoEm: agora,
      };

      saveToStorage(list);
      return { success: true, data: list[idx] };
    }

    const nova: Entrega = {
      id: generateEntregaId(list),
      atividadeId,
      alunoId,
      respostaTexto: dados.respostaTexto?.trim() || undefined,
      respostaLink: dados.respostaLink?.trim() || undefined,
      status: statusFinal,
      entregueEm: agora,
      criadoEm: agora,
      atualizadoEm: agora,
      historicoEnvios: [],
    };

    const updated = [...list, nova];
    saveToStorage(updated);
    return { success: true, data: nova };
  },

  async corrigir(
    entregaId: string,
    professorId: string,
    dados: { feedback: string; pontuacao?: number | null }
  ): Promise<OperationResult<Entrega>> {
    const list = loadFromStorage();
    const idx = list.findIndex((e) => e.id === entregaId);
    if (idx === -1) {
      return { success: false, error: "Entrega não encontrada." };
    }

    const entrega = list[idx];
    const atividade = await atividadeRepository.obterPorId(entrega.atividadeId);

    const validation = validateCorrecaoInput(dados, atividade || undefined);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da correção.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const agora = new Date().toISOString();
    list[idx] = {
      ...entrega,
      feedback: dados.feedback.trim(),
      pontuacao:
        dados.pontuacao !== undefined && dados.pontuacao !== null
          ? Number(dados.pontuacao)
          : null,
      status: "corrigida",
      corrigidoEm: agora,
      professorCorretorId: professorId,
      atualizadoEm: agora,
    };

    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async solicitarReenvio(
    entregaId: string,
    professorId: string,
    motivo: string
  ): Promise<OperationResult<Entrega>> {
    if (!motivo || motivo.trim().length < 5) {
      return {
        success: false,
        error: "Informe o motivo e as orientações para o reenvio (mínimo 5 caracteres).",
      };
    }

    const list = loadFromStorage();
    const idx = list.findIndex((e) => e.id === entregaId);
    if (idx === -1) {
      return { success: false, error: "Entrega não encontrada." };
    }

    const current = list[idx];
    const agora = new Date().toISOString();

    // Preserve previous submission in history!
    const registroHistorico: HistoricoEnvio = {
      id: `hist-${Date.now()}`,
      respostaTexto: current.respostaTexto,
      respostaLink: current.respostaLink,
      enviadoEm: current.entregueEm || current.atualizadoEm,
      feedbackAnterior: current.feedback,
      pontuacaoAnterior: current.pontuacao,
      motivoReenvio: motivo.trim(),
    };

    const historicoAtualizado = [...(current.historicoEnvios || []), registroHistorico];

    list[idx] = {
      ...current,
      status: "reenviar",
      feedback: motivo.trim(),
      professorCorretorId: professorId,
      corrigidoEm: agora,
      atualizadoEm: agora,
      historicoEnvios: historicoAtualizado,
    };

    saveToStorage(list);
    return { success: true, data: list[idx] };
  },

  async contarAguardandoCorrecao(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((e) => e.status === "entregue" || e.status === "atrasada").length;
  },

  async contarAtrasadas(): Promise<number> {
    const list = loadFromStorage();
    return list.filter((e) => e.status === "atrasada").length;
  },

  async contarConcluidasPorAluno(alunoId: string): Promise<number> {
    const list = loadFromStorage();
    return list.filter(
      (e) => e.alunoId === alunoId && (e.status === "corrigida" || e.status === "entregue")
    ).length;
  },
};
