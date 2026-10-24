import { Aluno, AlunoFilters, OperationResult, NivelAluno, OrigemAlteracaoNivel } from "@/types";
import { IAlunoRepository } from "./contracts/repositoryContracts";
import { getAlunoRepository } from "./repositoryFactory";
import { alunoLocalStorageRepository } from "./alunoLocalStorageRepository";

export { alunoLocalStorageRepository };

/**
 * Repositório Unificado de Alunos (Etapa 10.2B2).
 *
 * Delega dinamicamente as operações para o repositório ativo determinado pelo
 * CORE_USERS_DATA_SOURCE:
 * - 'supabase': alunoSupabaseRepository (PostgreSQL remoto com RLS e auditoria)
 * - 'local': alunoLocalStorageRepository (localStorage / dados demonstrativos)
 */
export const alunoRepository: IAlunoRepository = {
  listar(filters?: AlunoFilters): Promise<Aluno[]> {
    return getAlunoRepository().listar(filters);
  },

  obterPorId(id: string): Promise<Aluno | null> {
    return getAlunoRepository().obterPorId(id);
  },

  criar(dados: Omit<Aluno, "id" | "dataCadastro"> & { senha?: string }): Promise<OperationResult<Aluno>> {
    return getAlunoRepository().criar(dados);
  },

  atualizar(
    id: string,
    dados: Partial<Omit<Aluno, "id" | "dataCadastro">> & { senha?: string }
  ): Promise<OperationResult<Aluno>> {
    return getAlunoRepository().atualizar(id, dados);
  },

  inativar(id: string): Promise<OperationResult<Aluno>> {
    return getAlunoRepository().inativar(id);
  },

  reativar(id: string): Promise<OperationResult<Aluno>> {
    return getAlunoRepository().reativar(id);
  },

  atualizarNivel(
    alunoId: string,
    novoNivel: NivelAluno,
    detalhes: {
      origem: OrigemAlteracaoNivel;
      origemReferenciaId?: string;
      professorId?: string;
      professorNome?: string;
      justificativa?: string;
    }
  ): Promise<OperationResult<Aluno>> {
    return getAlunoRepository().atualizarNivel(alunoId, novoNivel, detalhes);
  },

  contarAtivos(): Promise<number> {
    return getAlunoRepository().contarAtivos();
  },

  contarTotal(): Promise<number> {
    return getAlunoRepository().contarTotal();
  },
};
