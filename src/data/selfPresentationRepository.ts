import {
  SelfPresentation,
  SelfPresentationFilters,
  OperationResult,
  AvaliacaoPedagogica,
  SolicitacaoReenvio,
  ConsentimentoUsoVideo,
  SelfPresentationsMetricasAdmin,
  Aluno,
} from "@/types";
import {
  selfPresentationLocalStorageRepository,
  loadSelfPresentationsFromStorage,
  saveSelfPresentationsToStorage,
} from "./selfPresentationLocalStorageRepository";
import { selfPresentationSupabaseRepository } from "./selfPresentationSupabaseRepository";
import { getAcademicSelfPresentationDataSource } from "./repositoryFactory";

export {
  selfPresentationLocalStorageRepository,
  selfPresentationSupabaseRepository,
  loadSelfPresentationsFromStorage,
  saveSelfPresentationsToStorage,
};

function getActiveRepository() {
  if (getAcademicSelfPresentationDataSource() === "supabase") {
    return selfPresentationSupabaseRepository;
  }
  return selfPresentationLocalStorageRepository;
}

/**
 * Repositório Unificado de Self Presentation (Fluência Oral)
 */
export const selfPresentationRepository = {
  listar(filters?: SelfPresentationFilters): Promise<SelfPresentation[]> {
    return getActiveRepository().listar(filters);
  },

  obterPorId(id: string): Promise<SelfPresentation | null> {
    return getActiveRepository().obterPorId(id);
  },

  obterParaAluno(id: string, alunoId: string): Promise<SelfPresentation | null> {
    return getActiveRepository().obterParaAluno(id, alunoId);
  },

  listarParaAluno(alunoId: string): Promise<SelfPresentation[]> {
    return getActiveRepository().listarParaAluno(alunoId);
  },

  listarPorAluno(alunoId: string): Promise<SelfPresentation[]> {
    return getActiveRepository().listarPorAluno(alunoId);
  },

  obterAtivaParaAluno(alunoId: string): Promise<SelfPresentation | null> {
    return getActiveRepository().obterAtivaParaAluno(alunoId);
  },

  salvarRascunho(dados: {
    id?: string;
    alunoId: string;
    alunoNome?: string;
    tipo?: "nivelamento_inicial" | "reavaliacao";
    titulo: string;
    linkVideo?: string;
    dataGravacao?: string;
    observacaoAluno?: string;
    consentimento?: ConsentimentoUsoVideo;
  }): Promise<OperationResult<SelfPresentation>> {
    return getActiveRepository().salvarRascunho(dados);
  },

  enviar(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>> {
    return getActiveRepository().enviar(id, dados);
  },

  assumirAvaliacao(
    id: string,
    professorId: string,
    professorNome: string
  ): Promise<OperationResult<SelfPresentation>> {
    return getActiveRepository().assumirAvaliacao(id, professorId, professorNome);
  },

  salvarAvaliacao(
    id: string,
    avaliacaoInput: Partial<AvaliacaoPedagogica>,
    publicar = false
  ): Promise<OperationResult<SelfPresentation>> {
    return getActiveRepository().salvarAvaliacao(id, avaliacaoInput, publicar);
  },

  solicitarReenvio(
    id: string,
    solicitacao: SolicitacaoReenvio
  ): Promise<OperationResult<SelfPresentation>> {
    return getActiveRepository().solicitarReenvio(id, solicitacao);
  },

  criarNovaVersao(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>> {
    return getActiveRepository().criarNovaVersao(id, dados);
  },

  aplicarNivelAoPerfil(
    id: string,
    professorId: string,
    professorNome: string
  ): Promise<OperationResult<{ aluno: Aluno; sp: SelfPresentation }>> {
    return getActiveRepository().aplicarNivelAoPerfil(id, professorId, professorNome);
  },

  contadoresDashboard(): Promise<SelfPresentationsMetricasAdmin> {
    return getActiveRepository().contadoresDashboard();
  },
};
