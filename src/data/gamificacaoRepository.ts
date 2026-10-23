import {
  ModeloConquista,
  ConquistaConcedida,
  SolicitacaoPlacaFisica,
  EventoPontos,
  NotificacaoInterna,
  MetricasGamificacaoAdmin,
  OperationResult,
  CategoriaConquista,
  TipoCriterioConquista,
  TipoPremioConquista,
  StatusPlacaFisica,
  TipoAcaoPontos,
  TipoNotificacaoInterna,
} from "@/types";
import { IGamificacaoRepository } from "./contracts/repositoryContracts";
import { ContextoAvaliacaoConquistas } from "./gamificacaoMotor";
import { gamificacaoLocalStorageRepository } from "./gamificacaoLocalStorageRepository";
import { gamificacaoSupabaseRepository } from "./gamificacaoSupabaseRepository";
import { getGamificacaoRepository } from "./repositoryFactory";

export { gamificacaoLocalStorageRepository, gamificacaoSupabaseRepository };

/**
 * Repositório Unificado de Gamificação e Conquistas MTD.
 *
 * Conecta dinamicamente à fonte ativa configurada pelo sistema (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const gamificacaoRepository: IGamificacaoRepository = {
  listarModelos(status?: string): Promise<ModeloConquista[]> {
    return getGamificacaoRepository().listarModelos(status);
  },

  obterModeloPorId(id: string): Promise<ModeloConquista | null> {
    return getGamificacaoRepository().obterModeloPorId(id);
  },

  salvarModelo(
    dados: Partial<ModeloConquista> & {
      nome: string;
      descricao: string;
      categoria: CategoriaConquista;
      tipoCriterio: TipoCriterioConquista;
      tipoPremio: TipoPremioConquista;
      icone: string;
    }
  ): Promise<OperationResult<ModeloConquista>> {
    return getGamificacaoRepository().salvarModelo(dados);
  },

  listarConquistasAluno(alunoId: string): Promise<ConquistaConcedida[]> {
    return getGamificacaoRepository().listarConquistasAluno(alunoId);
  },

  listarTodasConcedidas(): Promise<ConquistaConcedida[]> {
    return getGamificacaoRepository().listarTodasConcedidas();
  },

  concederConquistaManual(dados: {
    alunoId: string;
    alunoNome: string;
    modeloId: string;
    professorId?: string;
    professorNome?: string;
    justificativaDocente?: string;
  }): Promise<OperationResult<ConquistaConcedida>> {
    return getGamificacaoRepository().concederConquistaManual(dados);
  },

  verificarEConcederAutomaticas(
    contexto: ContextoAvaliacaoConquistas,
    alunoNome: string
  ): Promise<ConquistaConcedida[]> {
    return getGamificacaoRepository().verificarEConcederAutomaticas(contexto, alunoNome);
  },

  registrarEventoPontos(dados: {
    alunoId: string;
    alunoNome: string;
    tipoAcao: TipoAcaoPontos;
    pontos?: number;
    descricao?: string;
    referenciaId?: string;
  }): Promise<EventoPontos> {
    return getGamificacaoRepository().registrarEventoPontos(dados);
  },

  obterPontosAluno(alunoId: string): Promise<{
    pontosTotais: number;
    historicoEventos: EventoPontos[];
  }> {
    return getGamificacaoRepository().obterPontosAluno(alunoId);
  },

  listarSolicitacoesPlacas(alunoId?: string): Promise<SolicitacaoPlacaFisica[]> {
    return getGamificacaoRepository().listarSolicitacoesPlacas(alunoId);
  },

  obterSolicitacaoPlacaPorId(id: string): Promise<SolicitacaoPlacaFisica | null> {
    return getGamificacaoRepository().obterSolicitacaoPlacaPorId(id);
  },

  registrarInteressePlacaFisica(dados: {
    alunoId: string;
    alunoNome: string;
    conquistaId: string;
    conquistaNome: string;
    nivelMarco?: string;
  }): Promise<OperationResult<SolicitacaoPlacaFisica>> {
    return getGamificacaoRepository().registrarInteressePlacaFisica(dados);
  },

  atualizarStatusPlacaFisica(
    solicitacaoId: string,
    novoStatus: StatusPlacaFisica,
    responsavelNome: string,
    observacao?: string,
    codigoRastreio?: string,
    observacoesInternas?: string
  ): Promise<OperationResult<SolicitacaoPlacaFisica>> {
    return getGamificacaoRepository().atualizarStatusPlacaFisica(
      solicitacaoId,
      novoStatus,
      responsavelNome,
      observacao,
      codigoRastreio,
      observacoesInternas
    );
  },

  criarNotificacao(dados: {
    usuarioId: string;
    tipo: TipoNotificacaoInterna;
    titulo: string;
    mensagem: string;
    linkDestino?: string;
  }): Promise<NotificacaoInterna> {
    return getGamificacaoRepository().criarNotificacao(dados);
  },

  listarNotificacoes(usuarioId: string): Promise<NotificacaoInterna[]> {
    return getGamificacaoRepository().listarNotificacoes(usuarioId);
  },

  marcarNotificacaoComoLida(id: string): Promise<OperationResult<boolean>> {
    return getGamificacaoRepository().marcarNotificacaoComoLida(id);
  },

  marcarTodasComoLidas(usuarioId: string): Promise<OperationResult<boolean>> {
    return getGamificacaoRepository().marcarTodasComoLidas(usuarioId);
  },

  obterMetricasAdmin(): Promise<MetricasGamificacaoAdmin> {
    return getGamificacaoRepository().obterMetricasAdmin();
  },
};
