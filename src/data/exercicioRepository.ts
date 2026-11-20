import {
  ExercicioInterativo,
  ExercicioFilters,
  OperationResult,
} from "@/types";
import { exercicioLocalStorageRepository } from "./exercicioLocalStorageRepository";
import { exercicioSupabaseRepository } from "./exercicioSupabaseRepository";
import { getExercicioRepository } from "./repositoryFactory";

export { exercicioLocalStorageRepository, exercicioSupabaseRepository };

/**
 * Repositório Unificado de Exercícios Interativos (Lingua.com Inspired).
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const exercicioRepository = {
  listar(filters?: ExercicioFilters): Promise<ExercicioInterativo[]> {
    return getExercicioRepository().listar(filters);
  },

  listarParaAluno(
    alunoId: string,
    nivelAluno?: string,
    turmaIds: string[] = []
  ): Promise<ExercicioInterativo[]> {
    return getExercicioRepository().listarParaAluno(alunoId, nivelAluno, turmaIds);
  },

  obterPorId(id: string): Promise<ExercicioInterativo | null> {
    return getExercicioRepository().obterPorId(id);
  },

  criar(
    dados: Omit<ExercicioInterativo, "id" | "criadoEm" | "atualizadoEm" | "versao">
  ): Promise<OperationResult<ExercicioInterativo>> {
    return getExercicioRepository().criar(dados);
  },

  atualizar(
    id: string,
    dados: Partial<ExercicioInterativo>
  ): Promise<OperationResult<ExercicioInterativo>> {
    return getExercicioRepository().atualizar(id, dados);
  },

  excluir(id: string): Promise<OperationResult<boolean>> {
    return getExercicioRepository().excluir(id);
  },

  duplicar(
    id: string,
    novoProfessorId?: string
  ): Promise<OperationResult<ExercicioInterativo>> {
    return getExercicioRepository().duplicar(id, novoProfessorId);
  },
};
