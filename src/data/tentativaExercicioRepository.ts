import {
  TentativaExercicio,
  OperationResult,
} from "@/types";
import { tentativaExercicioLocalStorageRepository } from "./tentativaExercicioLocalStorageRepository";
import { tentativaExercicioSupabaseRepository } from "./tentativaExercicioSupabaseRepository";
import { getTentativaExercicioRepository } from "./repositoryFactory";

export {
  tentativaExercicioLocalStorageRepository,
  tentativaExercicioSupabaseRepository,
};

/**
 * Repositório Unificado de Tentativas de Exercícios Interativos.
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const tentativaExercicioRepository = {
  iniciarTentativa(dados: {
    exercicioId: string;
    alunoId: string;
    alunoNome?: string;
  }): Promise<OperationResult<TentativaExercicio>> {
    return getTentativaExercicioRepository().iniciarTentativa(dados);
  },

  concluirTentativa(dados: {
    tentativaId: string;
    respostas: { questaoId: string; alternativaEscolhidaId?: string }[];
    tempoGastoSegundos: number;
  }): Promise<OperationResult<TentativaExercicio>> {
    return getTentativaExercicioRepository().concluirTentativa(dados);
  },

  obterPorId(id: string): Promise<TentativaExercicio | null> {
    return getTentativaExercicioRepository().obterPorId(id);
  },

  listarPorAluno(
    alunoId: string,
    exercicioId?: string
  ): Promise<TentativaExercicio[]> {
    return getTentativaExercicioRepository().listarPorAluno(alunoId, exercicioId);
  },

  listarPorExercicio(exercicioId: string): Promise<TentativaExercicio[]> {
    return getTentativaExercicioRepository().listarPorExercicio(exercicioId);
  },

  obterUltimaTentativa(
    alunoId: string,
    exercicioId: string
  ): Promise<TentativaExercicio | null> {
    return getTentativaExercicioRepository().obterUltimaTentativa(
      alunoId,
      exercicioId
    );
  },

  obterResumoDesempenho(alunoId: string): Promise<{
    totalConcluidos: number;
    mediaNotas: number;
    totalAcertos: number;
    totalQuestoes: number;
    percentualGeral: number;
  }> {
    return getTentativaExercicioRepository().obterResumoDesempenho(alunoId);
  },
};
