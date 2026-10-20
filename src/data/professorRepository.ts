import { Professor, ProfessorFilters, OperationResult } from "@/types";
import { IProfessorRepository } from "./contracts/repositoryContracts";
import { getProfessorRepository } from "./repositoryFactory";
import { professorLocalStorageRepository } from "./professorLocalStorageRepository";

export { professorLocalStorageRepository };

/**
 * Repositório Unificado de Professores (Etapa 10.2B2).
 *
 * Delega dinamicamente as operações para o repositório ativo determinado pelo
 * CORE_USERS_DATA_SOURCE:
 * - 'supabase': professorSupabaseRepository (PostgreSQL remoto com RLS e auditoria)
 * - 'local': professorLocalStorageRepository (localStorage / dados demonstrativos)
 */
export const professorRepository: IProfessorRepository = {
  listar(filters?: ProfessorFilters): Promise<Professor[]> {
    return getProfessorRepository().listar(filters);
  },

  obterPorId(id: string): Promise<Professor | null> {
    return getProfessorRepository().obterPorId(id);
  },

  criar(dados: Omit<Professor, "id" | "dataCadastro">): Promise<OperationResult<Professor>> {
    return getProfessorRepository().criar(dados);
  },

  atualizar(
    id: string,
    dados: Partial<Omit<Professor, "id" | "dataCadastro">>
  ): Promise<OperationResult<Professor>> {
    return getProfessorRepository().atualizar(id, dados);
  },

  inativar(id: string): Promise<OperationResult<Professor>> {
    return getProfessorRepository().inativar(id);
  },

  reativar(id: string): Promise<OperationResult<Professor>> {
    return getProfessorRepository().reativar(id);
  },

  contarAtivos(): Promise<number> {
    return getProfessorRepository().contarAtivos();
  },

  contarTotal(): Promise<number> {
    return getProfessorRepository().contarTotal ? getProfessorRepository().contarTotal!() : Promise.resolve(0);
  },
};
