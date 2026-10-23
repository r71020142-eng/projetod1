import { Entrega, EntregaFilters, OperationResult } from "@/types";
import { entregaLocalStorageRepository } from "./entregaLocalStorageRepository";
import { entregaSupabaseRepository } from "./entregaSupabaseRepository";
import { getEntregaRepository } from "./repositoryFactory";

export { entregaLocalStorageRepository, entregaSupabaseRepository };

/**
 * Repositório Unificado de Entregas e Correções.
 *
 * Conecta dinamicamente à fonte ativa (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const entregaRepository = {
  listar(filters?: EntregaFilters): Promise<Entrega[]> {
    return getEntregaRepository().listar(filters);
  },

  obterPorId(id: string): Promise<Entrega | null> {
    return getEntregaRepository().obterPorId(id);
  },

  obterPorAtividadeEAluno(atividadeId: string, alunoId: string): Promise<Entrega | null> {
    return getEntregaRepository().obterPorAtividadeEAluno(atividadeId, alunoId);
  },

  salvarRascunho(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>> {
    return getEntregaRepository().salvarRascunho(atividadeId, alunoId, dados);
  },

  enviarEntrega(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>> {
    return getEntregaRepository().enviarEntrega(atividadeId, alunoId, dados);
  },

  corrigir(
    entregaId: string,
    professorId: string,
    dados: { feedback: string; pontuacao?: number | null }
  ): Promise<OperationResult<Entrega>> {
    return getEntregaRepository().corrigir(entregaId, professorId, dados);
  },

  solicitarReenvio(
    entregaId: string,
    professorId: string,
    motivo: string
  ): Promise<OperationResult<Entrega>> {
    return getEntregaRepository().solicitarReenvio(entregaId, professorId, motivo);
  },

  contarAguardandoCorrecao(): Promise<number> {
    return getEntregaRepository().contarAguardandoCorrecao();
  },

  contarAtrasadas(): Promise<number> {
    return getEntregaRepository().contarAtrasadas();
  },

  contarConcluidasPorAluno(alunoId: string): Promise<number> {
    return getEntregaRepository().contarConcluidasPorAluno(alunoId);
  },
};
