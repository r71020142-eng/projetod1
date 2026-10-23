/**
 * Fábrica Central de Repositórios do DEMOSTRATIVO MTD (Etapa 10.2B2).
 *
 * Gerencia a resolução da camada de dados de acordo com o APP_MODE e fontes granulares:
 * - DATA_SOURCE: 'local' | 'supabase' (fonte geral da aplicação)
 * - CORE_USERS_DATA_SOURCE: 'local' | 'supabase' (fonte específica para Alunos e Professores)
 * - Na Etapa 10.2B2: CORE_USERS_DATA_SOURCE=supabase ativa os adaptadores de Alunos e Professores
 *   no Supabase PostgreSQL remoto com RLS, mantendo os demais módulos locais/demonstrativos.
 */

import { getServerEnv, getClientEnv, DataSource } from "@/lib/env";
import { alunoLocalStorageRepository } from "./alunoLocalStorageRepository";
import { professorLocalStorageRepository } from "./professorLocalStorageRepository";
import { alunoSupabaseRepository } from "./alunoSupabaseRepository";
import { professorSupabaseRepository } from "./professorSupabaseRepository";
import { turmaLocalStorageRepository } from "./turmaLocalStorageRepository";
import { turmaSupabaseRepository } from "./turmaSupabaseRepository";
import { aulaLocalStorageRepository } from "./aulaLocalStorageRepository";
import { aulaSupabaseRepository } from "./aulaSupabaseRepository";
import { presencaSupabaseRepository } from "./presencaSupabaseRepository";
import { materialLocalStorageRepository } from "./materialLocalStorageRepository";
import { materialSupabaseRepository } from "./materialSupabaseRepository";
import { atividadeLocalStorageRepository } from "./atividadeLocalStorageRepository";
import { atividadeSupabaseRepository } from "./atividadeSupabaseRepository";
import { entregaLocalStorageRepository } from "./entregaLocalStorageRepository";
import { entregaSupabaseRepository } from "./entregaSupabaseRepository";
import { conteudoDiarioLocalStorageRepository } from "./conteudoDiarioLocalStorageRepository";
import { conteudoDiarioSupabaseRepository } from "./conteudoDiarioSupabaseRepository";
import { selfPresentationLocalStorageRepository } from "./selfPresentationLocalStorageRepository";
import { selfPresentationSupabaseRepository } from "./selfPresentationSupabaseRepository";
import { baralhoLocalStorageRepository } from "./baralhoLocalStorageRepository";
import { baralhoSupabaseRepository } from "./baralhoSupabaseRepository";
import { avaliacaoLocalStorageRepository } from "./avaliacaoLocalStorageRepository";
import { avaliacaoSupabaseRepository } from "./avaliacaoSupabaseRepository";
import { tentativaAvaliacaoLocalStorageRepository } from "./tentativaAvaliacaoLocalStorageRepository";
import { tentativaAvaliacaoSupabaseRepository } from "./tentativaAvaliacaoSupabaseRepository";
import { comunidadeLocalStorageRepository } from "./comunidadeLocalStorageRepository";
import { comunidadeSupabaseRepository } from "./comunidadeSupabaseRepository";
import { gamificacaoLocalStorageRepository } from "./gamificacaoLocalStorageRepository";
import { gamificacaoSupabaseRepository } from "./gamificacaoSupabaseRepository";
import {
  IAlunoRepository,
  IProfessorRepository,
  ITurmaRepository,
  IAulaRepository,
  IPresencaRepository,
  IMaterialRepository,
  IAtividadeRepository,
  IEntregaRepository,
  ISelfPresentationRepository,
  IBaralhoRepository,
  IAvaliacaoRepository,
  ITentativaAvaliacaoRepository,
  IComunidadeRepository,
  IGamificacaoRepository,
} from "./contracts/repositoryContracts";

export function isLocalDataSource(): boolean {
  if (typeof window === "undefined") {
    try {
      const env = getServerEnv();
      return env.dataSource === "local";
    } catch {
      return true;
    }
  }
  try {
    const clientEnv = getClientEnv();
    return clientEnv.dataSource === "local";
  } catch {
    return true;
  }
}

/**
 * Retorna a fonte de dados configurada para os módulos de usuários centrais (Alunos e Professores).
 */
export function getCoreUsersDataSource(): DataSource {
  if (typeof window === "undefined") {
    const env = getServerEnv();
    return env.coreUsersDataSource;
  }
  try {
    const clientEnv = getClientEnv();
    return clientEnv.coreUsersDataSource || "local";
  } catch {
    return "local";
  }
}

/**
 * Retorna a fonte de dados configurada para os módulos acadêmicos centrais (Turmas e Matrículas).
 */
export function getAcademicCoreDataSource(): DataSource {
  if (typeof window === "undefined") {
    const env = getServerEnv();
    return env.academicCoreDataSource;
  }
  try {
    const clientEnv = getClientEnv();
    return clientEnv.academicCoreDataSource || "local";
  } catch {
    return "local";
  }
}

/**
 * Retorna a fonte de dados configurada para os módulos de Agenda, Aulas e Presenças (Etapa 10.3B1).
 */
export function getAcademicAgendaDataSource(): DataSource {
  if (typeof window === "undefined") {
    const env = getServerEnv();
    return env.academicAgendaDataSource;
  }
  try {
    const clientEnv = getClientEnv();
    return clientEnv.academicAgendaDataSource || "local";
  } catch {
    return "local";
  }
}

/**
 * Retorna a fonte de dados configurada para os módulos de Materiais Didáticos e Atividades (Etapa 10.4A).
 */
export function getAcademicContentDataSource(): DataSource {
  if (typeof window === "undefined") {
    const env = getServerEnv();
    return env.academicContentDataSource;
  }
  try {
    const clientEnv = getClientEnv();
    return clientEnv.academicContentDataSource || "local";
  } catch {
    return "local";
  }
}

/**
 * Retorna a fonte de dados configurada para os módulos de Avaliações e Tentativas (Etapa 10.4B).
 */
export function getAcademicEvaluationsDataSource(): DataSource {
  if (typeof window === "undefined") {
    const env = getServerEnv();
    return env.academicEvaluationsDataSource;
  }
  try {
    const clientEnv = getClientEnv();
    return clientEnv.academicEvaluationsDataSource || "local";
  } catch {
    return "local";
  }
}

export class UnimplementedSupabaseRepositoryError extends Error {
  constructor(nomeRepositorio: string, etapaPlanejada: string) {
    super(
      `[Segurança MTD] O repositório "${nomeRepositorio}" ainda não foi migrado para Supabase em produção. ` +
        `Migração planejada para a ${etapaPlanejada}. ` +
        `Em produção, o fallback silencioso para localStorage é rigorosamente proibido para evitar corrupção de dados.`
    );
    this.name = "UnimplementedSupabaseRepositoryError";
  }
}

/**
 * Retorna o repositório de Alunos ativo para o ambiente.
 */
export function getAlunoRepository(): IAlunoRepository {
  if (getCoreUsersDataSource() === "supabase") {
    return alunoSupabaseRepository;
  }
  return alunoLocalStorageRepository;
}

/**
 * Retorna o repositório de Professores ativo para o ambiente.
 */
export function getProfessorRepository(): IProfessorRepository {
  if (getCoreUsersDataSource() === "supabase") {
    return professorSupabaseRepository;
  }
  return professorLocalStorageRepository;
}

/**
 * Retorna o repositório de Turmas ativo para o ambiente (Etapa 10.3A).
 */
export function getTurmaRepository(): ITurmaRepository {
  if (getAcademicCoreDataSource() === "supabase") {
    return turmaSupabaseRepository;
  }
  return turmaLocalStorageRepository;
}

/**
 * Retorna o repositório de Aulas ativo para o ambiente (Etapa 10.3B1).
 */
export function getAulaRepository(): IAulaRepository {
  if (getAcademicAgendaDataSource() === "supabase") {
    return aulaSupabaseRepository;
  }
  return aulaLocalStorageRepository;
}

/**
 * Retorna o repositório de Presenças ativo para o ambiente (Etapa 10.3B1).
 */
export function getPresencaRepository(): IPresencaRepository {
  if (getAcademicAgendaDataSource() === "supabase") {
    return presencaSupabaseRepository;
  }
  return {
    salvarChamada: async (aulaId, presencas, topico, obs) => {
      const presencasMap: Record<string, import("@/types").RegistroPresencaItem> = {};
      for (const p of presencas) {
        presencasMap[p.alunoId] = {
          status: p.status,
          justificativa: p.justificativa,
          observacao: p.observacaoPedagogica,
        };
      }
      const res = await aulaLocalStorageRepository.registrarPresencas(aulaId, presencasMap, topico, obs);
      return res.success ? { success: true } : { success: false, error: res.error };
    },
    calcularFrequenciaAluno: async (alunoId: string) => {
      return aulaLocalStorageRepository.calcularFrequenciaAluno(alunoId);
    },
  };
}

/**
 * Retorna o repositório de Materiais ativo para o ambiente (Etapa 10.4A).
 */
export function getMaterialRepository(): IMaterialRepository {
  if (getAcademicContentDataSource() === "supabase") {
    return materialSupabaseRepository;
  }
  return materialLocalStorageRepository;
}

/**
 * Retorna o repositório de Atividades ativo para o ambiente (Etapa 10.4A).
 */
export function getAtividadeRepository(): IAtividadeRepository {
  if (getAcademicContentDataSource() === "supabase") {
    return atividadeSupabaseRepository;
  }
  return atividadeLocalStorageRepository;
}

/**
 * Retorna o repositório de Entregas ativo para o ambiente (Etapa 10.4A).
 */
export function getEntregaRepository(): IEntregaRepository {
  if (getAcademicContentDataSource() === "supabase") {
    return entregaSupabaseRepository;
  }
  return entregaLocalStorageRepository;
}

/**
 * Retorna o repositório de Conteúdos Diários ativo para o ambiente (Etapa 10.4A).
 */
export function getConteudoDiarioRepository() {
  if (getAcademicContentDataSource() === "supabase") {
    return conteudoDiarioSupabaseRepository;
  }
  return conteudoDiarioLocalStorageRepository;
}

/**
 * Retorna o repositório de Self Presentation ativo para o ambiente.
 */
export function getSelfPresentationRepository(): ISelfPresentationRepository {
  if (isLocalDataSource()) {
    return selfPresentationLocalStorageRepository;
  }
  return selfPresentationSupabaseRepository;
}

/**
 * Retorna o repositório de Flashcards/Baralhos ativo para o ambiente.
 */
export function getBaralhoRepository(): IBaralhoRepository {
  if (isLocalDataSource()) {
    return baralhoLocalStorageRepository;
  }
  return baralhoSupabaseRepository;
}

/**
 * Retorna o repositório de Avaliações ativo para o ambiente (Etapa 10.4B).
 */
export function getAvaliacaoRepository(): IAvaliacaoRepository {
  if (getAcademicEvaluationsDataSource() === "supabase") {
    return avaliacaoSupabaseRepository;
  }
  return avaliacaoLocalStorageRepository;
}

/**
 * Retorna o repositório de Tentativas de Avaliação ativo para o ambiente (Etapa 10.4B).
 */
export function getTentativaAvaliacaoRepository(): ITentativaAvaliacaoRepository {
  if (getAcademicEvaluationsDataSource() === "supabase") {
    return tentativaAvaliacaoSupabaseRepository;
  }
  return tentativaAvaliacaoLocalStorageRepository;
}

/**
 * Retorna o repositório da Comunidade ativo para o ambiente.
 */
export function getComunidadeRepository(): IComunidadeRepository {
  if (isLocalDataSource()) {
    return comunidadeLocalStorageRepository;
  }
  return comunidadeSupabaseRepository;
}

/**
 * Retorna o repositório de Gamificação ativo para o ambiente.
 */
export function getGamificacaoRepository(): IGamificacaoRepository {
  if (isLocalDataSource()) {
    return gamificacaoLocalStorageRepository;
  }
  return gamificacaoSupabaseRepository;
}

export {
  aulaLocalStorageRepository,
  aulaSupabaseRepository,
  presencaSupabaseRepository,
  materialLocalStorageRepository,
  materialSupabaseRepository,
  atividadeLocalStorageRepository,
  atividadeSupabaseRepository,
  entregaLocalStorageRepository,
  entregaSupabaseRepository,
  conteudoDiarioLocalStorageRepository,
  conteudoDiarioSupabaseRepository,
  avaliacaoLocalStorageRepository,
  avaliacaoSupabaseRepository,
  tentativaAvaliacaoLocalStorageRepository,
  tentativaAvaliacaoSupabaseRepository,
  comunidadeLocalStorageRepository,
  comunidadeSupabaseRepository,
  gamificacaoLocalStorageRepository,
  gamificacaoSupabaseRepository,
};
