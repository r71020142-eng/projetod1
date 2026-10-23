import { Baralho, BaralhoFilters, OperationResult, StatusBaralho } from "@/types";
import {
  baralhoLocalStorageRepository,
  loadBaralhosFromStorage,
  saveBaralhosToStorage,
} from "./baralhoLocalStorageRepository";
import { baralhoSupabaseRepository } from "./baralhoSupabaseRepository";
import { isLocalDataSource } from "./repositoryFactory";

export {
  baralhoLocalStorageRepository,
  baralhoSupabaseRepository,
  loadBaralhosFromStorage,
  saveBaralhosToStorage,
};

function getActiveRepository() {
  if (isLocalDataSource()) {
    return baralhoLocalStorageRepository;
  }
  return baralhoSupabaseRepository;
}

export async function getBaralhos(filtros?: BaralhoFilters): Promise<Baralho[]> {
  return getActiveRepository().getBaralhos(filtros);
}

export async function getBaralhosAluno(
  alunoId: string,
  turmasIdsAluno: string[] = []
): Promise<Baralho[]> {
  return getActiveRepository().getBaralhosAluno(alunoId, turmasIdsAluno);
}

export async function getBaralhoById(id: string): Promise<Baralho | null> {
  return getActiveRepository().getBaralhoById(id);
}

export async function salvarBaralho(
  dados: Partial<Baralho>
): Promise<OperationResult<Baralho>> {
  return getActiveRepository().salvarBaralho(dados);
}

export async function atualizarStatusBaralho(
  id: string,
  novoStatus: StatusBaralho
): Promise<OperationResult<Baralho>> {
  return getActiveRepository().atualizarStatusBaralho(id, novoStatus);
}

export async function excluirBaralho(id: string): Promise<OperationResult<boolean>> {
  return getActiveRepository().excluirBaralho(id);
}

export function sincronizarContagemCartoes(baralhoId: string, total: number): void {
  getActiveRepository().sincronizarContagemCartoes(baralhoId, total);
}

/**
 * Repositório Unificado de Baralhos
 */
export const baralhoRepository = {
  getBaralhos,
  getBaralhosAluno,
  getBaralhoById,
  salvarBaralho,
  atualizarStatusBaralho,
  excluirBaralho,
  sincronizarContagemCartoes,
};
