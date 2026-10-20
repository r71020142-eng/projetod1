/**
 * Fábrica Central de Repositórios do DEMOSTRATIVO MTD (Etapa 10.1).
 *
 * Gerencia a resolução da camada de dados de acordo com o APP_MODE:
 * - Em modo 'demo': resolve para os repositórios em localStorage (dados semente).
 * - Em modo 'production': resolve para os adaptadores do Supabase (quando implementados).
 * - Bloqueio estrito: em produção, NUNCA ocorre fallback silencioso para localStorage.
 */

import { isDemoMode } from "@/lib/demoMode";
import { alunoRepository } from "./alunoRepository";
import { professorRepository } from "./professorRepository";
import { turmaRepository } from "./turmaRepository";
import { aulaRepository } from "./aulaRepository";
import { materialRepository } from "./materialRepository";
import { atividadeRepository } from "./atividadeRepository";
import { entregaRepository } from "./entregaRepository";
import { selfPresentationRepository } from "./selfPresentationRepository";
import * as baralhoRepo from "./baralhoRepository";
import { avaliacaoRepository } from "./avaliacaoRepository";
import { comunidadeRepository } from "./comunidadeRepository";
import { gamificacaoRepository } from "./gamificacaoRepository";
import {
  IAlunoRepository,
  IProfessorRepository,
  ITurmaRepository,
  IAulaRepository,
  IMaterialRepository,
  IAtividadeRepository,
  IEntregaRepository,
  ISelfPresentationRepository,
  IBaralhoRepository,
  IAvaliacaoRepository,
  IComunidadeRepository,
  IGamificacaoRepository,
} from "./contracts/repositoryContracts";

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
  if (isDemoMode()) {
    return alunoRepository;
  }
  // Na Etapa 10.2, aqui será instanciado o SupabaseAlunoRepository
  throw new UnimplementedSupabaseRepositoryError("AlunoRepository", "Etapa 10.2");
}

/**
 * Retorna o repositório de Professores ativo para o ambiente.
 */
export function getProfessorRepository(): IProfessorRepository {
  if (isDemoMode()) {
    return professorRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("ProfessorRepository", "Etapa 10.2");
}

/**
 * Retorna o repositório de Turmas ativo para o ambiente.
 */
export function getTurmaRepository(): ITurmaRepository {
  if (isDemoMode()) {
    return turmaRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("TurmaRepository", "Etapa 10.2");
}

/**
 * Retorna o repositório de Aulas ativo para o ambiente.
 */
export function getAulaRepository(): IAulaRepository {
  if (isDemoMode()) {
    return aulaRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("AulaRepository", "Etapa 10.2");
}

/**
 * Retorna o repositório de Materiais ativo para o ambiente.
 */
export function getMaterialRepository(): IMaterialRepository {
  if (isDemoMode()) {
    return materialRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("MaterialRepository", "Etapa 10.3");
}

/**
 * Retorna o repositório de Atividades ativo para o ambiente.
 */
export function getAtividadeRepository(): IAtividadeRepository {
  if (isDemoMode()) {
    return atividadeRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("AtividadeRepository", "Etapa 10.3");
}

/**
 * Retorna o repositório de Entregas ativo para o ambiente.
 */
export function getEntregaRepository(): IEntregaRepository {
  if (isDemoMode()) {
    return entregaRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("EntregaRepository", "Etapa 10.3");
}

/**
 * Retorna o repositório de Self Presentation ativo para o ambiente.
 */
export function getSelfPresentationRepository(): ISelfPresentationRepository {
  if (isDemoMode()) {
    return selfPresentationRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("SelfPresentationRepository", "Etapa 10.3");
}

/**
 * Retorna o repositório de Flashcards/Baralhos ativo para o ambiente.
 */
export function getBaralhoRepository(): IBaralhoRepository {
  if (isDemoMode()) {
    return baralhoRepo;
  }
  throw new UnimplementedSupabaseRepositoryError("BaralhoRepository", "Etapa 10.4");
}

/**
 * Retorna o repositório de Avaliações ativo para o ambiente.
 */
export function getAvaliacaoRepository(): IAvaliacaoRepository {
  if (isDemoMode()) {
    return avaliacaoRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("AvaliacaoRepository", "Etapa 10.4");
}

/**
 * Retorna o repositório da Comunidade ativo para o ambiente.
 */
export function getComunidadeRepository(): IComunidadeRepository {
  if (isDemoMode()) {
    return comunidadeRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("ComunidadeRepository", "Etapa 10.5");
}

/**
 * Retorna o repositório de Gamificação ativo para o ambiente.
 */
export function getGamificacaoRepository(): IGamificacaoRepository {
  if (isDemoMode()) {
    return gamificacaoRepository;
  }
  throw new UnimplementedSupabaseRepositoryError("GamificacaoRepository", "Etapa 10.5");
}
