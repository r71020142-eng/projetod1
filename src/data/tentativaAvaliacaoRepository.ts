import {
  TentativaAvaliacao,
  OperationResult,
  TentativaFilters,
  RespostaAvaliacaoPratica,
  RespostaQuestaoObjetiva,
  CorrecaoItemRubrica,
  AutorizacaoTentativaExtra,
  ResultadoAvaliacao,
} from "../types";
import {
  tentativaAvaliacaoLocalStorageRepository,
  sanitizarTentativaParaAluno,
  isGabaritoLiberado,
} from "./tentativaAvaliacaoLocalStorageRepository";
import { tentativaAvaliacaoSupabaseRepository } from "./tentativaAvaliacaoSupabaseRepository";
import { isLocalDataSource } from "./repositoryFactory";

export {
  tentativaAvaliacaoLocalStorageRepository,
  tentativaAvaliacaoSupabaseRepository,
  sanitizarTentativaParaAluno,
  isGabaritoLiberado,
};

function getActiveRepository() {
  if (isLocalDataSource()) {
    return tentativaAvaliacaoLocalStorageRepository;
  }
  return tentativaAvaliacaoSupabaseRepository;
}

/**
 * Repositório Unificado de Tentativas de Avaliação.
 *
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const tentativaAvaliacaoRepository = {
  listar(filters?: TentativaFilters): Promise<TentativaAvaliacao[]> {
    return getActiveRepository().listar(filters);
  },

  listarPorAluno(alunoId: string): Promise<TentativaAvaliacao[]> {
    return getActiveRepository().listarPorAluno(alunoId);
  },

  obterPorId(id: string, paraAluno = false): Promise<TentativaAvaliacao | null> {
    return getActiveRepository().obterPorId(id, paraAluno);
  },

  iniciarTentativa(
    avaliacaoId: string,
    alunoId: string,
    alunoNome: string
  ): Promise<OperationResult<TentativaAvaliacao>> {
    return getActiveRepository().iniciarTentativa(avaliacaoId, alunoId, alunoNome);
  },

  salvarRascunho(
    tentativaId: string,
    alunoId: string,
    dadosEnvio?:
      | {
          respostasObjetivasMap?: Record<string, string>;
          respostaPratica?: RespostaAvaliacaoPratica;
        }
      | RespostaQuestaoObjetiva[],
    respostaPraticaExtra?: RespostaAvaliacaoPratica
  ): Promise<OperationResult<TentativaAvaliacao>> {
    return getActiveRepository().salvarRascunho(
      tentativaId,
      alunoId,
      dadosEnvio,
      respostaPraticaExtra
    );
  },

  enviarTentativa(
    tentativaId: string,
    alunoId: string,
    dadosEnvio: {
      respostasObjetivasMap?: Record<string, string>;
      respostaPratica?: RespostaAvaliacaoPratica;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    return getActiveRepository().enviarTentativa(tentativaId, alunoId, dadosEnvio);
  },

  corrigirTentativaPratica(
    tentativaId: string,
    professorId: string,
    professorNome: string,
    dadosCorrecao: {
      itensRubrica: CorrecaoItemRubrica[];
      pontosFortes: string;
      pontosADesenvolver: string;
      orientacoes: string;
      observacoesInternas?: string;
      resultado?: ResultadoAvaliacao;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    return getActiveRepository().corrigirTentativaPratica(
      tentativaId,
      professorId,
      professorNome,
      dadosCorrecao
    );
  },

  autorizarTentativaExtra(
    avaliacaoId: string,
    alunoId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ): Promise<OperationResult<AutorizacaoTentativaExtra>> {
    return getActiveRepository().autorizarTentativaExtra(
      avaliacaoId,
      alunoId,
      professorId,
      professorNome,
      justificativa
    );
  },
};
