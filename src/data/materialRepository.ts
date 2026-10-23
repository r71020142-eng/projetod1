import { Material, MaterialFilters, OperationResult } from "@/types";
import { materialLocalStorageRepository } from "./materialLocalStorageRepository";
import { materialSupabaseRepository } from "./materialSupabaseRepository";
import { getMaterialRepository } from "./repositoryFactory";

export { materialLocalStorageRepository, materialSupabaseRepository };

/**
 * Repositório Unificado de Materiais Didáticos.
 *
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const materialRepository = {
  listar(filters?: MaterialFilters): Promise<Material[]> {
    return getMaterialRepository().listar(filters);
  },

  listarParaAluno(alunoId: string, turmasIds?: string[]): Promise<Material[]> {
    return getMaterialRepository().listarParaAluno(alunoId, turmasIds);
  },

  obterPorId(id: string): Promise<Material | null> {
    return getMaterialRepository().obterPorId(id);
  },

  obterPorIdParaAluno(id: string, alunoId: string, turmasIds?: string[]): Promise<Material | null> {
    return getMaterialRepository().obterPorIdParaAluno(id, alunoId, turmasIds);
  },

  criar(dados: Partial<Material>): Promise<OperationResult<Material>> {
    return getMaterialRepository().criar(dados);
  },

  atualizar(id: string, dados: Partial<Material>): Promise<OperationResult<Material>> {
    return getMaterialRepository().atualizar(id, dados);
  },

  arquivar(id: string): Promise<OperationResult<Material>> {
    return getMaterialRepository().arquivar(id);
  },

  restaurar(id: string): Promise<OperationResult<Material>> {
    return getMaterialRepository().restaurar(id);
  },

  contarPublicados(): Promise<number> {
    return getMaterialRepository().contarPublicados();
  },

  contarAgendados(): Promise<number> {
    return getMaterialRepository().contarAgendados();
  },
};
