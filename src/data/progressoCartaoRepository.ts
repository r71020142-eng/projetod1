import { CartaoProgressoAluno, RespostaSRS } from "@/types";
import {
  progressoCartaoLocalStorageRepository,
  loadProgressosFromStorage,
  saveProgressosToStorage,
  FilaEstudoBaralhoResultado,
} from "./progressoCartaoLocalStorageRepository";
import { progressoCartaoSupabaseRepository } from "./progressoCartaoSupabaseRepository";
import { isLocalDataSource } from "./repositoryFactory";

export {
  progressoCartaoLocalStorageRepository,
  progressoCartaoSupabaseRepository,
  loadProgressosFromStorage,
  saveProgressosToStorage,
};
export type { FilaEstudoBaralhoResultado };

function getActiveRepository() {
  if (isLocalDataSource()) {
    return progressoCartaoLocalStorageRepository;
  }
  return progressoCartaoSupabaseRepository;
}

export async function obterProgresso(
  alunoId: string,
  cartaoId: string
): Promise<CartaoProgressoAluno | null> {
  return getActiveRepository().obterProgresso(alunoId, cartaoId);
}

export function obterOuCriarProgresso(
  alunoId: string,
  cartaoId: string,
  baralhoId: string,
  dataReferencia: Date = new Date()
): CartaoProgressoAluno {
  return getActiveRepository().obterOuCriarProgresso(alunoId, cartaoId, baralhoId, dataReferencia);
}

export async function obterFilaEstudoBaralho(
  alunoId: string,
  baralhoId: string,
  limiteDiarioNovos = 20,
  dataReferencia: Date = new Date()
): Promise<FilaEstudoBaralhoResultado> {
  return getActiveRepository().obterFilaEstudoBaralho(
    alunoId,
    baralhoId,
    limiteDiarioNovos,
    dataReferencia
  );
}

export async function registrarRespostaEstudo(
  alunoId: string,
  cartaoId: string,
  baralhoId: string,
  resposta: RespostaSRS,
  dataReferencia: Date = new Date()
): Promise<{
  progresso: CartaoProgressoAluno;
  historicoId: string;
  reagendadoParaRevisao: boolean;
  reagendadoMinutos?: number;
  reagendadoMesmaSessao: boolean;
}> {
  return getActiveRepository().registrarRespostaEstudo(
    alunoId,
    cartaoId,
    baralhoId,
    resposta,
    dataReferencia
  );
}

export const progressoCartaoRepository = {
  obterProgresso,
  obterOuCriarProgresso,
  obterFilaEstudoBaralho,
  registrarRespostaEstudo,
};
