import {
  Avaliacao,
  StatusAvaliacao,
  OperationResult,
  AvaliacaoFilters,
} from "../types";
import { avaliacaoLocalStorageRepository } from "./avaliacaoLocalStorageRepository";
import { avaliacaoSupabaseRepository } from "./avaliacaoSupabaseRepository";
import { getAvaliacaoRepository } from "./repositoryFactory";

export { avaliacaoLocalStorageRepository, avaliacaoSupabaseRepository };

/**
 * Repositório Unificado de Avaliações Pedagógicas (Método Paulo).
 *
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const avaliacaoRepository = {
  listar(filters?: AvaliacaoFilters): Promise<Avaliacao[]> {
    return getAvaliacaoRepository().listar(filters);
  },

  listarParaAluno(alunoId: string, turmaIds: string[] = []): Promise<Avaliacao[]> {
    return getAvaliacaoRepository().listarParaAluno(alunoId, turmaIds);
  },

  obterPorId(id: string): Promise<Avaliacao | null> {
    return getAvaliacaoRepository().obterPorId(id);
  },

  salvar(
    dados: Omit<Avaliacao, "id" | "criadoEm" | "atualizadoEm"> & { id?: string },
    possuiTentativas = false
  ): Promise<OperationResult<Avaliacao>> {
    return getAvaliacaoRepository().salvar(dados, possuiTentativas);
  },

  duplicarComoNovaVersao(avaliacaoId: string): Promise<OperationResult<Avaliacao>> {
    return getAvaliacaoRepository().duplicarComoNovaVersao(avaliacaoId);
  },

  alterarStatus(id: string, status: StatusAvaliacao): Promise<OperationResult<Avaliacao>> {
    return getAvaliacaoRepository().alterarStatus(id, status);
  },
};
