import {
  ExercicioInterativo,
  ExercicioFilters,
  OperationResult,
} from "@/types";
import { SEED_EXERCICIOS } from "./mockData";
import { validarQuestaoExercicioInterativo } from "./pedagogicoCalculos";

const STORAGE_KEY = "mtd_demonstrativo_exercicios_v1";

export function loadExerciciosFromStorage(): ExercicioInterativo[] {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") {
    return SEED_EXERCICIOS;
  }
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EXERCICIOS));
      } else if (globalThis.localStorage) {
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EXERCICIOS));
      }
      return SEED_EXERCICIOS;
    }
    return JSON.parse(raw) as ExercicioInterativo[];
  } catch (err) {
    console.error("Erro ao carregar exercícios do storage:", err);
    return SEED_EXERCICIOS;
  }
}

export function saveExerciciosToStorage(list: ExercicioInterativo[]): void {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") return;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("mtd_storage_updated", { detail: { entity: "exercicios" } })
      );
    } else if (globalThis.localStorage) {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error("Erro ao salvar exercícios no storage:", err);
  }
}

export const exercicioLocalStorageRepository = {
  async listar(filters?: ExercicioFilters): Promise<ExercicioInterativo[]> {
    const list = loadExerciciosFromStorage();
    let filtradas = list;

    if (filters?.busca) {
      const q = filters.busca.toLowerCase().trim();
      filtradas = filtradas.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.descricao.toLowerCase().includes(q) ||
          e.categoria.toLowerCase().includes(q) ||
          (e.professorNome && e.professorNome.toLowerCase().includes(q))
      );
    }
    if (filters?.tipo && filters.tipo !== "todos") {
      filtradas = filtradas.filter((e) => e.tipo === filters.tipo);
    }
    if (filters?.nivel && filters.nivel !== "todos") {
      filtradas = filtradas.filter((e) => e.nivel === filters.nivel);
    }
    if (filters?.status && filters.status !== "todos") {
      filtradas = filtradas.filter((e) => e.status === filters.status);
    }
    if (filters?.categoria && filters.categoria !== "todas") {
      filtradas = filtradas.filter((e) => e.categoria === filters.categoria);
    }
    if (filters?.professorId) {
      filtradas = filtradas.filter((e) => e.professorId === filters.professorId);
    }
    if (filters?.destinoTipo && filters.destinoTipo !== "todos") {
      filtradas = filtradas.filter((e) => e.destinoTipo === filters.destinoTipo);
    }
    if (filters?.destinoTurmaId) {
      filtradas = filtradas.filter(
        (e) => e.destinoTipo === "geral" || e.destinoTurmaId === filters.destinoTurmaId
      );
    }

    return filtradas.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  },

  async listarParaAluno(
    alunoId: string,
    nivelAluno?: string,
    turmaIds: string[] = []
  ): Promise<ExercicioInterativo[]> {
    const list = loadExerciciosFromStorage();

    // Filtra apenas exercícios publicados
    return list
      .filter((e) => e.status === "publicado")
      .filter((e) => {
        // Regra de destino:
        if (e.destinoTipo === "geral") return true;
        if (e.destinoTipo === "aluno") return e.destinoAlunoId === alunoId;
        if (e.destinoTipo === "turma") {
          return e.destinoTurmaId && turmaIds.includes(e.destinoTurmaId);
        }
        return false;
      })
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  async obterPorId(id: string): Promise<ExercicioInterativo | null> {
    const list = loadExerciciosFromStorage();
    const item = list.find((e) => e.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  },

  async criar(
    dados: Omit<ExercicioInterativo, "id" | "criadoEm" | "atualizadoEm" | "versao">
  ): Promise<OperationResult<ExercicioInterativo>> {
    try {
      if (!dados.titulo || dados.titulo.trim().length < 3) {
        return { success: false, error: "O título do exercício deve ter pelo menos 3 caracteres." };
      }
      if (!dados.questoes || dados.questoes.length === 0) {
        return { success: false, error: "O exercício deve possuir pelo menos uma questão." };
      }

      // Validação estrita de cada questão com 4 alternativas
      for (let i = 0; i < dados.questoes.length; i++) {
        const q = dados.questoes[i];
        const val = validarQuestaoExercicioInterativo(q);
        if (!val.isValid) {
          return {
            success: false,
            error: `Erro na Questão ${i + 1}: ${val.errors.join("; ")}`,
          };
        }
      }

      if (dados.tipo === "leitura_audio" && (!dados.textoConteudo || dados.textoConteudo.trim().length < 20)) {
        return {
          success: false,
          error: "Exercícios de Leitura & Compreensão exigem um texto em inglês com pelo menos 20 caracteres.",
        };
      }

      const list = loadExerciciosFromStorage();
      const agora = new Date().toISOString();
      const novoId = `ex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const novoExercicio: ExercicioInterativo = {
        ...dados,
        id: novoId,
        versao: 1,
        criadoEm: agora,
        atualizadoEm: agora,
      };

      list.push(novoExercicio);
      saveExerciciosToStorage(list);

      return { success: true, data: novoExercicio };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao criar exercício." };
    }
  },

  async atualizar(
    id: string,
    dados: Partial<ExercicioInterativo>
  ): Promise<OperationResult<ExercicioInterativo>> {
    try {
      const list = loadExerciciosFromStorage();
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1) {
        return { success: false, error: "Exercício não encontrado." };
      }

      const atual = list[idx];

      // Se questões forem enviadas, valida cada uma
      if (dados.questoes) {
        if (dados.questoes.length === 0) {
          return { success: false, error: "O exercício deve possuir pelo menos uma questão." };
        }
        for (let i = 0; i < dados.questoes.length; i++) {
          const q = dados.questoes[i];
          const val = validarQuestaoExercicioInterativo(q);
          if (!val.isValid) {
            return {
              success: false,
              error: `Erro na Questão ${i + 1}: ${val.errors.join("; ")}`,
            };
          }
        }
      }

      const agora = new Date().toISOString();
      // Incrementa a versão para proteger snapshots históricos
      const novaVersao = (atual.versao || 1) + 1;

      const atualizado: ExercicioInterativo = {
        ...atual,
        ...dados,
        id: atual.id,
        versao: novaVersao,
        criadoEm: atual.criadoEm,
        atualizadoEm: agora,
      };

      list[idx] = atualizado;
      saveExerciciosToStorage(list);

      return { success: true, data: atualizado };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao atualizar exercício." };
    }
  },

  async excluir(id: string): Promise<OperationResult<boolean>> {
    try {
      const list = loadExerciciosFromStorage();
      const filtrada = list.filter((e) => e.id !== id);
      if (filtrada.length === list.length) {
        return { success: false, error: "Exercício não encontrado para exclusão." };
      }

      saveExerciciosToStorage(filtrada);
      return { success: true, data: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao excluir exercício." };
    }
  },

  async duplicar(
    id: string,
    novoProfessorId?: string
  ): Promise<OperationResult<ExercicioInterativo>> {
    try {
      const list = loadExerciciosFromStorage();
      const original = list.find((e) => e.id === id);
      if (!original) {
        return { success: false, error: "Exercício original não encontrado." };
      }

      const agora = new Date().toISOString();
      const novoId = `ex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const duplicado: ExercicioInterativo = {
        ...JSON.parse(JSON.stringify(original)),
        id: novoId,
        titulo: `${original.titulo} (Cópia)`,
        status: "rascunho",
        professorId: novoProfessorId || original.professorId,
        versao: 1,
        criadoEm: agora,
        atualizadoEm: agora,
      };

      list.push(duplicado);
      saveExerciciosToStorage(list);

      return { success: true, data: duplicado };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao duplicar exercício." };
    }
  },
};
