import {
  Aula,
  AulaFilters,
  OperationResult,
  RegistroPresencaItem,
  ConflitoHorario,
  FrequenciaCalculada,
} from "@/types";
import { IAulaRepository } from "./contracts/repositoryContracts";
import { getAulaRepository } from "./repositoryFactory";
import { aulaLocalStorageRepository } from "./aulaLocalStorageRepository";
import { aulaSupabaseRepository } from "./aulaSupabaseRepository";

export { aulaLocalStorageRepository, aulaSupabaseRepository };

/**
 * Repositório Unificado de Aulas (Etapa 10.3B2).
 *
 * Delega dinamicamente as operações para o repositório ativo determinado pelo
 * ACADEMIC_AGENDA_DATA_SOURCE:
 * - 'supabase': aulaSupabaseRepository (PostgreSQL remoto com RLS, views e RPCs)
 * - 'local': aulaLocalStorageRepository (localStorage / dados demonstrativos)
 */
export const aulaRepository: IAulaRepository & {
  calcularFrequenciaGeral(): Promise<{
    porcentagem: number | null;
    totalAulas: number;
    presentes: number;
    ausentes: number;
    justificados: number;
  }>;
  verificarConflitos(aulaCandidate: {
    id?: string;
    turmaId: string;
    professorId: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
    status: Aula["status"];
  }): Promise<ConflitoHorario[]>;
} = {
  listar(filters?: AulaFilters): Promise<Aula[]> {
    return getAulaRepository().listar(filters);
  },

  obterPorId(id: string): Promise<Aula | null> {
    return getAulaRepository().obterPorId(id);
  },

  listarPorTurma(turmaId: string): Promise<Aula[]> {
    return getAulaRepository().listarPorTurma(turmaId);
  },

  listarPorAluno(alunoId: string): Promise<Aula[]> {
    return getAulaRepository().listarPorAluno(alunoId);
  },

  listarPorProfessor(professorId: string): Promise<Aula[]> {
    return getAulaRepository().listarPorProfessor(professorId);
  },

  obterProximaAulaAluno(alunoId: string): Promise<Aula | null> {
    return getAulaRepository().obterProximaAulaAluno(alunoId);
  },

  listarProximas(limite?: number): Promise<Aula[]> {
    return getAulaRepository().listarProximas(limite);
  },

  contarAgendadas(): Promise<number> {
    return getAulaRepository().contarAgendadas();
  },

  criar(
    dados: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas"> & {
      professorId?: string;
      presencas?: Record<string, RegistroPresencaItem>;
    }
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }> {
    return getAulaRepository().criar(dados);
  },

  criarSequenciaSemanal(
    dadosBase: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas">,
    quantidadeEncontros: number
  ): Promise<OperationResult<Aula[]> & { conflitos?: ConflitoHorario[] }> {
    return getAulaRepository().criarSequenciaSemanal(dadosBase, quantidadeEncontros);
  },

  atualizar(
    id: string,
    dados: Partial<Omit<Aula, "id" | "dataCadastro">>
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }> {
    return getAulaRepository().atualizar(id, dados);
  },

  cancelar(id: string, motivo?: string): Promise<OperationResult<Aula>> {
    return getAulaRepository().cancelar(id, motivo);
  },

  concluir(id: string, confirmarPendencias?: boolean): Promise<OperationResult<Aula>> {
    return getAulaRepository().concluir(id, confirmarPendencias);
  },

  registrarPresencas(
    id: string,
    presencas: Record<string, RegistroPresencaItem>,
    topicoTrabalhadoOuConcluir?: string | boolean,
    observacoes?: string
  ): Promise<OperationResult<Aula>> {
    return getAulaRepository().registrarPresencas(
      id,
      presencas,
      topicoTrabalhadoOuConcluir,
      observacoes
    );
  },

  calcularFrequenciaAluno(alunoId: string, turmaId?: string): Promise<FrequenciaCalculada> {
    return getAulaRepository().calcularFrequenciaAluno(alunoId, turmaId);
  },

  calcularFrequenciaTurma(turmaId: string): Promise<FrequenciaCalculada> {
    return getAulaRepository().calcularFrequenciaTurma(turmaId);
  },

  calcularFrequenciaGeral(): Promise<{
    porcentagem: number | null;
    totalAulas: number;
    presentes: number;
    ausentes: number;
    justificados: number;
  }> {
    const active = getAulaRepository();
    if (active.calcularFrequenciaGeral) {
      return active.calcularFrequenciaGeral();
    }
    return aulaLocalStorageRepository.calcularFrequenciaGeral!();
  },

  verificarConflitos(aulaCandidate: {
    id?: string;
    turmaId: string;
    professorId: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
    status: Aula["status"];
  }): Promise<ConflitoHorario[]> {
    const active = getAulaRepository();
    if (active.verificarConflitos) {
      return active.verificarConflitos(aulaCandidate);
    }
    return aulaLocalStorageRepository.verificarConflitos!(aulaCandidate);
  },
};
