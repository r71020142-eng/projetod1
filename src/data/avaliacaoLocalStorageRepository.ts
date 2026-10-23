import {
  Avaliacao,
  StatusAvaliacao,
  OperationResult,
  AvaliacaoFilters,
} from "../types";
import { SEED_AVALIACOES } from "./mockData";
import { validarQuestaoObjetiva, validarRubricaPratica } from "./pedagogicoCalculos";

const STORAGE_KEY = "mtd_demonstrativo_avaliacoes_v1";

export function loadAvaliacoesFromStorage(): Avaliacao[] {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") {
    return SEED_AVALIACOES;
  }
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_AVALIACOES));
      } else if (globalThis.localStorage) {
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_AVALIACOES));
      }
      return SEED_AVALIACOES;
    }
    return JSON.parse(raw) as Avaliacao[];
  } catch (err) {
    console.error("Erro ao carregar avaliações do storage:", err);
    return SEED_AVALIACOES;
  }
}

export function saveAvaliacoesToStorage(list: Avaliacao[]): void {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") return;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("mtd_storage_updated", { detail: { entity: "avaliacoes" } })
      );
    } else if (globalThis.localStorage) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error("Erro ao salvar avaliações no storage:", err);
  }
}

export const avaliacaoLocalStorageRepository = {
  async listar(filters?: AvaliacaoFilters): Promise<Avaliacao[]> {
    const list = loadAvaliacoesFromStorage();
    let filtradas = list;

    if (filters?.busca) {
      const q = filters.busca.toLowerCase().trim();
      filtradas = filtradas.filter(
        (a) =>
          a.titulo.toLowerCase().includes(q) ||
          a.descricao.toLowerCase().includes(q) ||
          (a.professorNome && a.professorNome.toLowerCase().includes(q))
      );
    }
    if (filters?.tipo && filters.tipo !== "todos") {
      filtradas = filtradas.filter((a) => a.tipo === filters.tipo);
    }
    if (filters?.status && filters.status !== "todos") {
      filtradas = filtradas.filter((a) => a.status === filters.status);
    }
    if (filters?.moduloId) {
      filtradas = filtradas.filter((a) => a.moduloId === filters.moduloId);
    }
    if (filters?.professorId) {
      filtradas = filtradas.filter((a) => a.professorId === filters.professorId);
    }

    return filtradas.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  },

  async listarParaAluno(alunoId: string, turmaIds: string[] = []): Promise<Avaliacao[]> {
    const list = loadAvaliacoesFromStorage();
    return list.filter((a) => {
      const statusOk = a.status === "publicada" || a.status === "encerrada";
      if (!statusOk) return false;

      if (a.destinoTipo === "geral") return true;
      if (a.destinoTipo === "aluno" && a.destinoAlunoId === alunoId) return true;
      if (a.destinoTipo === "turma" && a.destinoTurmaId && turmaIds.includes(a.destinoTurmaId)) {
        return true;
      }
      return false;
    });
  },

  async obterPorId(id: string): Promise<Avaliacao | null> {
    const list = loadAvaliacoesFromStorage();
    return list.find((a) => a.id === id) || null;
  },

  async salvar(
    dados: Omit<Avaliacao, "id" | "criadoEm" | "atualizadoEm"> & { id?: string },
    possuiTentativas = false
  ): Promise<OperationResult<Avaliacao>> {
    const list = loadAvaliacoesFromStorage();
    const agora = new Date().toISOString();

    if (!dados.titulo || dados.titulo.trim().length < 3) {
      return { success: false, error: "O título da avaliação deve ter ao menos 3 caracteres." };
    }
    if (!dados.moduloId) {
      return { success: false, error: "A avaliação deve ser vinculada a um módulo pedagógico." };
    }

    if (dados.tipo === "objetiva") {
      const questoes = dados.questoes || [];
      if (questoes.length === 0) {
        return { success: false, error: "A avaliação objetiva deve possuir ao menos 1 questão." };
      }
      for (const q of questoes) {
        const val = validarQuestaoObjetiva(q);
        if (!val.isValid) {
          return { success: false, error: val.errors[0] };
        }
      }
    } else if (dados.tipo === "pratica") {
      const rubrica = dados.rubrica || [];
      const val = validarRubricaPratica(rubrica);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] };
      }
    }

    if (dados.id) {
      const index = list.findIndex((a) => a.id === dados.id);
      if (index === -1) {
        return { success: false, error: "Avaliação não encontrada para edição." };
      }

      if (possuiTentativas) {
        const anterior = list[index];
        if (dados.tipo === "objetiva" && JSON.stringify(anterior.questoes) !== JSON.stringify(dados.questoes)) {
          return {
            success: false,
            error:
              "Esta avaliação já possui tentativas enviadas. As questões não podem ser modificadas nesta versão; duplique-a como nova versão para fazer alterações.",
          };
        }
        if (dados.tipo === "pratica" && JSON.stringify(anterior.rubrica) !== JSON.stringify(dados.rubrica)) {
          return {
            success: false,
            error:
              "Esta avaliação já possui tentativas enviadas. A rubrica não pode ser alterada nesta versão; duplique-a como nova versão.",
          };
        }
      }

      const atualizada: Avaliacao = {
        ...list[index],
        ...dados,
        id: dados.id,
        atualizadoEm: agora,
      };
      list[index] = atualizada;
      saveAvaliacoesToStorage(list);
      return { success: true, data: atualizada };
    }

    const novoId = `aval-${String(list.length + 1).padStart(3, "0")}`;
    const nova: Avaliacao = {
      ...dados,
      id: novoId,
      versao: dados.versao || 1,
      politicaGabarito: dados.politicaGabarito || "gabarito_imediato",
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(nova);
    saveAvaliacoesToStorage(list);
    return { success: true, data: nova };
  },

  async duplicarComoNovaVersao(avaliacaoId: string): Promise<OperationResult<Avaliacao>> {
    const list = loadAvaliacoesFromStorage();
    const original = list.find((a) => a.id === avaliacaoId);
    if (!original) {
      return { success: false, error: "Avaliação original não encontrada." };
    }

    const agora = new Date().toISOString();
    const novaVersaoNum = (original.versao || 1) + 1;
    const novoId = `aval-${String(list.length + 1).padStart(3, "0")}`;

    const duplicada: Avaliacao = {
      ...original,
      id: novoId,
      titulo: `${original.titulo} (v${novaVersaoNum})`,
      status: "rascunho",
      versao: novaVersaoNum,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    list.push(duplicada);
    saveAvaliacoesToStorage(list);
    return { success: true, data: duplicada };
  },

  async alterarStatus(id: string, status: StatusAvaliacao): Promise<OperationResult<Avaliacao>> {
    const list = loadAvaliacoesFromStorage();
    const aval = list.find((a) => a.id === id);
    if (!aval) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    if (status === "publicada") {
      if (aval.tipo === "objetiva" && (!aval.questoes || aval.questoes.length === 0)) {
        return { success: false, error: "Não é possível publicar uma avaliação objetiva sem questões." };
      }
      if (aval.tipo === "pratica" && (!aval.rubrica || aval.rubrica.length === 0)) {
        return { success: false, error: "Não é possível publicar uma avaliação prática sem rubrica." };
      }
      aval.dataPublicacao = new Date().toISOString();
    }

    aval.status = status;
    aval.atualizadoEm = new Date().toISOString();
    saveAvaliacoesToStorage(list);
    return { success: true, data: aval };
  },
};
