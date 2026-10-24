import {
  EspacoComunidade,
  PublicacaoComunidade,
  ComentarioPublicacao,
  DenunciaConteudo,
  OportunidadeIntercambio,
  InteresseOportunidade,
  MetricasComunidadeAdmin,
  OperationResult,
  Aluno,
  AcaoModeracao,
  MotivoDenuncia,
  TipoPublicacaoComunidade,
} from "@/types";
import { IComunidadeRepository } from "./contracts/repositoryContracts";
import { comunidadeLocalStorageRepository } from "./comunidadeLocalStorageRepository";
import { comunidadeSupabaseRepository } from "./comunidadeSupabaseRepository";
import { getComunidadeRepository } from "./repositoryFactory";

export { comunidadeLocalStorageRepository, comunidadeSupabaseRepository };

/**
 * Repositório Unificado da Comunidade MTD.
 *
 * Conecta dinamicamente à fonte ativa configurada pelo sistema (Supabase PostgreSQL ou LocalStorage/Demo).
 */
export const comunidadeRepository: IComunidadeRepository = {
  listarEspacos(
    paraAdmin?: boolean,
    aluno?: Aluno,
    turmasMatriculado?: string[]
  ): Promise<EspacoComunidade[]> {
    return getComunidadeRepository().listarEspacos(paraAdmin, aluno, turmasMatriculado);
  },

  obterEspacoPorId(id: string): Promise<EspacoComunidade | null> {
    return getComunidadeRepository().obterEspacoPorId(id);
  },

  salvarEspaco(
    dados: Partial<EspacoComunidade> & { nome: string; descricao: string }
  ): Promise<OperationResult<EspacoComunidade>> {
    return getComunidadeRepository().salvarEspaco(dados);
  },

  listarPublicacoes(espacoId?: string, paraAluno?: boolean): Promise<PublicacaoComunidade[]> {
    return getComunidadeRepository().listarPublicacoes(espacoId, paraAluno);
  },

  obterPublicacaoPorId(id: string, paraAluno?: boolean): Promise<PublicacaoComunidade | null> {
    return getComunidadeRepository().obterPublicacaoPorId(id, paraAluno);
  },

  criarPublicacao(
    dados: {
      espacoId: string;
      autorId: string;
      autorNome: string;
      autorAvatar?: string;
      autorPapel: "aluno" | "professor" | "admin" | "administrador";
      tipo: TipoPublicacaoComunidade;
      titulo?: string;
      conteudo: string;
      linkExternoUrl?: string;
      linkExternoTitulo?: string;
      oportunidadeId?: string;
    },
    alunoValidador?: Aluno,
    turmasMatriculado?: string[]
  ): Promise<OperationResult<PublicacaoComunidade>> {
    return getComunidadeRepository().criarPublicacao(dados, alunoValidador, turmasMatriculado);
  },

  alternarReacaoPublicacao(
    publicacaoId: string,
    tipo: string,
    usuarioId: string
  ): Promise<OperationResult<PublicacaoComunidade>> {
    return getComunidadeRepository().alternarReacaoPublicacao(publicacaoId, tipo, usuarioId);
  },

  alternarCurtidaComentario(
    comentarioId: string,
    usuarioId: string
  ): Promise<OperationResult<{ totalCurtidas: number; curtiu: boolean }>> {
    return getComunidadeRepository().alternarCurtidaComentario(comentarioId, usuarioId);
  },

  listarComentarios(publicacaoId: string, paraAluno = false): Promise<ComentarioPublicacao[]> {
    return getComunidadeRepository().listarComentarios(publicacaoId, paraAluno);
  },

  criarComentario(
    dados: {
      publicacaoId: string;
      autorId: string;
      autorNome: string;
      autorAvatar?: string;
      autorPapel: "aluno" | "professor" | "admin" | "administrador";
      conteudo: string;
    },
    alunoValidador?: Aluno,
    turmasMatriculado?: string[]
  ): Promise<OperationResult<ComentarioPublicacao>> {
    return getComunidadeRepository().criarComentario(dados, alunoValidador, turmasMatriculado);
  },

  denunciarConteudo(dados: {
    alvoTipo: "publicacao" | "comentario";
    alvoId: string;
    publicacaoId: string;
    denuncianteId: string;
    denuncianteNome: string;
    motivo: MotivoDenuncia;
    descricao?: string;
  }): Promise<OperationResult<DenunciaConteudo>> {
    return getComunidadeRepository().denunciarConteudo(dados);
  },

  listarDenuncias(): Promise<DenunciaConteudo[]> {
    return getComunidadeRepository().listarDenuncias();
  },

  moderarPublicacao(
    publicacaoId: string,
    acao: AcaoModeracao,
    motivo: string,
    moderadorId: string,
    moderadorNome: string
  ): Promise<OperationResult<PublicacaoComunidade>> {
    return getComunidadeRepository().moderarPublicacao(publicacaoId, acao, motivo, moderadorId, moderadorNome);
  },

  moderarComentario(
    comentarioId: string,
    acao: AcaoModeracao,
    motivo: string,
    moderadorId: string,
    moderadorNome: string
  ): Promise<OperationResult<ComentarioPublicacao>> {
    return getComunidadeRepository().moderarComentario(comentarioId, acao, motivo, moderadorId, moderadorNome);
  },

  listarOportunidades(): Promise<OportunidadeIntercambio[]> {
    return getComunidadeRepository().listarOportunidades();
  },

  obterOportunidadePorId(id: string): Promise<OportunidadeIntercambio | null> {
    return getComunidadeRepository().obterOportunidadePorId(id);
  },

  registrarInteresseOportunidade(dados: {
    oportunidadeId: string;
    alunoId: string;
    alunoNome: string;
    alunoEmail: string;
    alunoNivelAtual?: string;
    observacoesAluno?: string;
  }): Promise<OperationResult<InteresseOportunidade>> {
    return getComunidadeRepository().registrarInteresseOportunidade(dados);
  },

  listarInteressesPorOportunidade(oportunidadeId: string): Promise<InteresseOportunidade[]> {
    return getComunidadeRepository().listarInteressesPorOportunidade(oportunidadeId);
  },

  obterMetricasAdmin(): Promise<MetricasComunidadeAdmin> {
    return getComunidadeRepository().obterMetricasAdmin();
  },
};
