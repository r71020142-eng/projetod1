import { Atividade, AtividadeFilters, OperationResult } from "@/types";
import { atividadeLocalStorageRepository } from "./atividadeLocalStorageRepository";
import { atividadeSupabaseRepository } from "./atividadeSupabaseRepository";
import { getAtividadeRepository } from "./repositoryFactory";

export { atividadeLocalStorageRepository, atividadeSupabaseRepository };

/**
 * Repositório Unificado de Atividades.
 *
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const atividadeRepository = {
  listar(filters?: AtividadeFilters): Promise<Atividade[]> {
    return getAtividadeRepository().listar(filters);
  },

  listarParaAluno(
    alunoId: string,
    turmasDoAluno: string[] = [],
    filters?: AtividadeFilters
  ): Promise<Atividade[]> {
    return getAtividadeRepository().listarParaAluno(alunoId, turmasDoAluno, filters);
  },

  obterPorId(id: string): Promise<Atividade | null> {
    return getAtividadeRepository().obterPorId(id);
  },

  obterPorIdParaAluno(
    id: string,
    alunoId: string,
    turmasDoAluno: string[] = []
  ): Promise<Atividade | null> {
    return getAtividadeRepository().obterPorIdParaAluno(id, alunoId, turmasDoAluno);
  },

  criar(dados: Partial<Atividade>): Promise<OperationResult<Atividade>> {
    return getAtividadeRepository().criar(dados);
  },

  atualizar(id: string, dados: Partial<Atividade>): Promise<OperationResult<Atividade>> {
    return getAtividadeRepository().atualizar(id, dados);
  },

  encerrar(id: string): Promise<OperationResult<Atividade>> {
    return getAtividadeRepository().encerrar(id);
  },

  arquivar(id: string): Promise<OperationResult<Atividade>> {
    return getAtividadeRepository().arquivar(id);
  },

  contarPublicadas(): Promise<number> {
    return getAtividadeRepository().contarPublicadas();
  },
};
