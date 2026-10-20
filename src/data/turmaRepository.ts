import { Turma, TurmaFilters, OperationResult } from "@/types";
import { ITurmaRepository } from "./contracts/repositoryContracts";
import { getTurmaRepository } from "./repositoryFactory";
import { turmaLocalStorageRepository } from "./turmaLocalStorageRepository";
import { turmaSupabaseRepository } from "./turmaSupabaseRepository";

export { turmaLocalStorageRepository, turmaSupabaseRepository };

/**
 * Repositório Unificado de Turmas (Etapa 10.3A).
 *
 * Delega dinamicamente as operações para o repositório ativo determinado pelo
 * ACADEMIC_CORE_DATA_SOURCE:
 * - 'supabase': turmaSupabaseRepository (PostgreSQL remoto com RLS, matriculas_turmas e locks)
 * - 'local': turmaLocalStorageRepository (localStorage / dados demonstrativos)
 */
export const turmaRepository: ITurmaRepository = {
  listar(filters?: TurmaFilters): Promise<Turma[]> {
    return getTurmaRepository().listar(filters);
  },

  obterPorId(id: string): Promise<Turma | null> {
    return getTurmaRepository().obterPorId(id);
  },

  listarPorAluno(alunoId: string): Promise<Turma[]> {
    return getTurmaRepository().listarPorAluno(alunoId);
  },

  listarPorProfessor(professorId: string): Promise<Turma[]> {
    return getTurmaRepository().listarPorProfessor(professorId);
  },

  contarAtivas(): Promise<number> {
    return getTurmaRepository().contarAtivas();
  },

  criar(dados: Omit<Turma, "id" | "dataCadastro">): Promise<OperationResult<Turma>> {
    return getTurmaRepository().criar(dados);
  },

  atualizar(
    id: string,
    dados: Partial<Omit<Turma, "id" | "dataCadastro">>
  ): Promise<OperationResult<Turma>> {
    return getTurmaRepository().atualizar(id, dados);
  },

  matricularAluno(
    turmaId: string,
    alunoId: string,
    motivo?: string
  ): Promise<OperationResult<Turma>> {
    return getTurmaRepository().matricularAluno(turmaId, alunoId, motivo);
  },

  desmatricularAluno(
    turmaId: string,
    alunoId: string,
    motivo?: string
  ): Promise<OperationResult<Turma>> {
    return getTurmaRepository().desmatricularAluno(turmaId, alunoId, motivo);
  },

  alterarStatus(
    turmaId: string,
    novoStatus: Turma["status"]
  ): Promise<OperationResult<Turma>> {
    return getTurmaRepository().alterarStatus(turmaId, novoStatus);
  },
};
