/**
 * Contratos de Repositório do DEMOSTRATIVO MTD (Etapa 10.1).
 *
 * Define as interfaces formais desacopladas da camada de persistência.
 * Permite que a camada de UI consuma dados sem saber se a fonte é localStorage (demo)
 * ou PostgreSQL/Supabase (produção).
 */

import {
  Aluno,
  AlunoFilters,
  Professor,
  ProfessorFilters,
  Turma,
  TurmaFilters,
  Aula,
  AulaFilters,
  Material,
  MaterialFilters,
  Atividade,
  AtividadeFilters,
  Entrega,
  EntregaFilters,
  SelfPresentation,
  SelfPresentationFilters,
  Baralho,
  BaralhoFilters,
  Avaliacao,
  AvaliacaoFilters,
  EspacoComunidade,
  PublicacaoComunidade,
  ModeloConquista,
  ConquistaConcedida,
  SolicitacaoPlacaFisica,
  OperationResult,
  NivelAluno,
  OrigemAlteracaoNivel,
} from "@/types";

export interface IAlunoRepository {
  listar(filters?: AlunoFilters): Promise<Aluno[]>;
  obterPorId(id: string): Promise<Aluno | null>;
  criar(dados: Omit<Aluno, "id" | "dataCadastro">): Promise<OperationResult<Aluno>>;
  atualizar(
    id: string,
    dados: Partial<Omit<Aluno, "id" | "dataCadastro">>
  ): Promise<OperationResult<Aluno>>;
  inativar(id: string): Promise<OperationResult<Aluno>>;
  reativar(id: string): Promise<OperationResult<Aluno>>;
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
  ): Promise<OperationResult<Aluno>>;
  contarAtivos(): Promise<number>;
  contarTotal(): Promise<number>;
}

export interface IProfessorRepository {
  listar(filters?: ProfessorFilters): Promise<Professor[]>;
  obterPorId(id: string): Promise<Professor | null>;
  criar(dados: Omit<Professor, "id" | "dataCadastro">): Promise<OperationResult<Professor>>;
  atualizar(
    id: string,
    dados: Partial<Omit<Professor, "id" | "dataCadastro">>
  ): Promise<OperationResult<Professor>>;
  inativar(id: string): Promise<OperationResult<Professor>>;
  reativar(id: string): Promise<OperationResult<Professor>>;
  contarAtivos(): Promise<number>;
  contarTotal?(): Promise<number>;
}

export interface ITurmaRepository {
  listar(filters?: TurmaFilters): Promise<Turma[]>;
  obterPorId(id: string): Promise<Turma | null>;
  listarPorAluno(alunoId: string): Promise<Turma[]>;
  listarPorProfessor(professorId: string): Promise<Turma[]>;
  contarAtivas(): Promise<number>;
}

export interface IAulaRepository {
  listar(filters?: AulaFilters): Promise<Aula[]>;
  obterPorId(id: string): Promise<Aula | null>;
  obterProximaAulaAluno(alunoId: string): Promise<Aula | null>;
}

export interface IMaterialRepository {
  listar(filters?: MaterialFilters): Promise<Material[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<Material | null>;
}

export interface IAtividadeRepository {
  listar(filters?: AtividadeFilters): Promise<Atividade[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<Atividade | null>;
  listarParaAluno(alunoId: string, turmasIds?: string[]): Promise<Atividade[]>;
}

export interface IEntregaRepository {
  listar(filters?: EntregaFilters): Promise<Entrega[]>;
  obterPorId(id: string): Promise<Entrega | null>;
  obterPorAtividadeEAluno(atividadeId: string, alunoId: string): Promise<Entrega | null>;
  contarConcluidasPorAluno(alunoId: string): Promise<number>;
}

export interface ISelfPresentationRepository {
  listar(filters?: SelfPresentationFilters): Promise<SelfPresentation[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<SelfPresentation | null>;
  obterAtivaParaAluno(alunoId: string): Promise<SelfPresentation | null>;
}

export interface IBaralhoRepository {
  getBaralhos(filters?: BaralhoFilters): Promise<Baralho[]>;
  getBaralhoById(id: string): Promise<Baralho | null>;
  getBaralhosAluno(alunoId: string, turmasIds?: string[]): Promise<Baralho[]>;
}

export interface IAvaliacaoRepository {
  listar(filters?: AvaliacaoFilters): Promise<Avaliacao[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<Avaliacao | null>;
}

export interface IComunidadeRepository {
  listarEspacos(): Promise<EspacoComunidade[]>;
  listarPublicacoes(espacoId?: string, paraAluno?: boolean): Promise<PublicacaoComunidade[]>;
}

export interface IGamificacaoRepository {
  listarModelos(status?: string): Promise<ModeloConquista[]>;
  listarConquistasAluno(alunoId: string): Promise<ConquistaConcedida[]>;
  listarSolicitacoesPlacas(alunoId?: string): Promise<SolicitacaoPlacaFisica[]>;
}
