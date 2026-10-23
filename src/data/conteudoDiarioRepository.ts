import { ConteudoDiario, ConteudoDiarioFilters, OperationResult } from "@/types";
import { conteudoDiarioLocalStorageRepository } from "./conteudoDiarioLocalStorageRepository";
import { conteudoDiarioSupabaseRepository } from "./conteudoDiarioSupabaseRepository";
import { isLocalDataSource } from "./repositoryFactory";

export { conteudoDiarioLocalStorageRepository, conteudoDiarioSupabaseRepository };

function getActiveRepository() {
  if (isLocalDataSource()) {
    return conteudoDiarioLocalStorageRepository;
  }
  return conteudoDiarioSupabaseRepository;
}

export const conteudoDiarioRepository = {
  listar(filters?: ConteudoDiarioFilters): Promise<ConteudoDiario[]> {
    return getActiveRepository().listar(filters);
  },

  obterPraticaDeHoje(
    alunoId?: string,
    turmasDoAluno: string[] = []
  ): Promise<ConteudoDiario | null> {
    return getActiveRepository().obterPraticaDeHoje(alunoId, turmasDoAluno);
  },

  obterPorId(id: string): Promise<ConteudoDiario | null> {
    return getActiveRepository().obterPorId(id);
  },

  criar(dados: Partial<ConteudoDiario>): Promise<OperationResult<ConteudoDiario>> {
    return getActiveRepository().criar(dados);
  },

  atualizar(
    id: string,
    dados: Partial<ConteudoDiario>
  ): Promise<OperationResult<ConteudoDiario>> {
    return getActiveRepository().atualizar(id, dados);
  },

  arquivar(id: string): Promise<OperationResult<ConteudoDiario>> {
    return getActiveRepository().arquivar(id);
  },

  contarAgendados(): Promise<number> {
    return getActiveRepository().contarAgendados();
  },
};
