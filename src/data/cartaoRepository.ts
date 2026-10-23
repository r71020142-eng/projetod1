import { Cartao, OperationResult, StatusCartao } from "@/types";
import {
  cartaoLocalStorageRepository,
  loadCartoesFromStorage,
  saveCartoesToStorage,
} from "./cartaoLocalStorageRepository";
import { cartaoSupabaseRepository } from "./cartaoSupabaseRepository";
import { isLocalDataSource } from "./repositoryFactory";

export {
  cartaoLocalStorageRepository,
  cartaoSupabaseRepository,
  loadCartoesFromStorage,
  saveCartoesToStorage,
};

function getActiveRepository() {
  if (isLocalDataSource()) {
    return cartaoLocalStorageRepository;
  }
  return cartaoSupabaseRepository;
}

export async function getCartoesPorBaralho(
  baralhoId: string,
  apenasAtivos = false
): Promise<Cartao[]> {
  return getActiveRepository().getCartoesPorBaralho(baralhoId, apenasAtivos);
}

export async function getCartaoById(id: string): Promise<Cartao | null> {
  return getActiveRepository().getCartaoById(id);
}

export async function salvarCartao(
  dados: Partial<Cartao>
): Promise<OperationResult<Cartao>> {
  return getActiveRepository().salvarCartao(dados);
}

export async function atualizarStatusCartao(
  id: string,
  novoStatus: StatusCartao
): Promise<OperationResult<Cartao>> {
  return getActiveRepository().atualizarStatusCartao(id, novoStatus);
}

export async function excluirCartao(id: string): Promise<OperationResult<boolean>> {
  return getActiveRepository().excluirCartao(id);
}

export async function importarCartoesCSV(
  baralhoId: string,
  itensValidos: Array<{
    frente: string;
    verso: string;
    exemplo?: string;
    traducao?: string;
    dica?: string;
    pronuncia?: string;
    tags?: string[];
  }>
): Promise<OperationResult<Cartao[]>> {
  return getActiveRepository().importarCartoesCSV(baralhoId, itensValidos);
}

/**
 * Repositório Unificado de Cartões
 */
export const cartaoRepository = {
  getCartoesPorBaralho,
  getCartaoById,
  salvarCartao,
  atualizarStatusCartao,
  excluirCartao,
  importarCartoesCSV,
};
