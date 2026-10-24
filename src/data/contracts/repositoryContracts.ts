/**
 * Contratos de Repositório do DEMOSTRATIVO MTD (Etapa 10.1).
 *
 * Define as interfaces formais desacopladas da camada de persistência.
 * Permite que a camada de UI consuma dados sem saber se a fonte é localStorage (demo)
 * ou PostgreSQL/Supabase (produção).
 */

import {
  Aluno,
  AlunoFilters,
  Professor,
  ProfessorFilters,
  Turma,
  TurmaFilters,
  Aula,
  AulaFilters,
  RegistroPresencaItem,
  ConflitoHorario,
  FrequenciaCalculada,
  Material,
  MaterialFilters,
  Atividade,
  AtividadeFilters,
  Entrega,
  EntregaFilters,
  SelfPresentation,
  SelfPresentationFilters,
  AvaliacaoPedagogica,
  SolicitacaoReenvio,
  ConsentimentoUsoVideo,
  SelfPresentationsMetricasAdmin,
  Baralho,
  BaralhoFilters,
  Avaliacao,
  AvaliacaoFilters,
  TentativaAvaliacao,
  TentativaFilters,
  RespostaAvaliacaoPratica,
  RespostaQuestaoObjetiva,
  CorrecaoItemRubrica,
  ResultadoAvaliacao,
  AutorizacaoTentativaExtra,
  EspacoComunidade,
  PublicacaoComunidade,
  ComentarioPublicacao,
  DenunciaConteudo,
  OportunidadeIntercambio,
  InteresseOportunidade,
  MetricasComunidadeAdmin,
  TipoPublicacaoComunidade,
  AcaoModeracao,
  MotivoDenuncia,
  ModeloConquista,
  ConquistaConcedida,
  CategoriaConquista,
  TipoCriterioConquista,
  TipoPremioConquista,
  StatusPlacaFisica,
  SolicitacaoPlacaFisica,
  TipoAcaoPontos,
  EventoPontos,
  TipoNotificacaoInterna,
  NotificacaoInterna,
  MetricasGamificacaoAdmin,
  OperationResult,
  NivelAluno,
  OrigemAlteracaoNivel,
} from "@/types";

export interface IAlunoRepository {
  listar(filters?: AlunoFilters): Promise<Aluno[]>;
  obterPorId(id: string): Promise<Aluno | null>;
  criar(dados: Omit<Aluno, "id" | "dataCadastro"> & { senha?: string }): Promise<OperationResult<Aluno>>;
  atualizar(
    id: string,
    dados: Partial<Omit<Aluno, "id" | "dataCadastro">> & { senha?: string }
  ): Promise<OperationResult<Aluno>>;
  inativar(id: string): Promise<OperationResult<Aluno>>;
  reativar(id: string): Promise<OperationResult<Aluno>>;
  atualizarNivel(
    alunoId: string,
    novoNivel: NivelAluno,
    detalhes: {
      origem: OrigemAlteracaoNivel;
      origemReferenciaId?: string;
      professorId?: string;
      professorNome?: string;
      justificativa?: string;
    }
  ): Promise<OperationResult<Aluno>>;
  contarAtivos(): Promise<number>;
  contarTotal(): Promise<number>;
}

export interface IProfessorRepository {
  listar(filters?: ProfessorFilters): Promise<Professor[]>;
  obterPorId(id: string): Promise<Professor | null>;
  criar(dados: Omit<Professor, "id" | "dataCadastro">): Promise<OperationResult<Professor>>;
  atualizar(
    id: string,
    dados: Partial<Omit<Professor, "id" | "dataCadastro">>
  ): Promise<OperationResult<Professor>>;
  inativar(id: string): Promise<OperationResult<Professor>>;
  reativar(id: string): Promise<OperationResult<Professor>>;
  contarAtivos(): Promise<number>;
  contarTotal?(): Promise<number>;
}

export interface ITurmaRepository {
  listar(filters?: TurmaFilters): Promise<Turma[]>;
  obterPorId(id: string): Promise<Turma | null>;
  listarPorAluno(alunoId: string): Promise<Turma[]>;
  listarPorProfessor(professorId: string): Promise<Turma[]>;
  contarAtivas(): Promise<number>;
  criar(dados: Omit<Turma, "id" | "dataCadastro">): Promise<OperationResult<Turma>>;
  atualizar(
    id: string,
    dados: Partial<Omit<Turma, "id" | "dataCadastro">>
  ): Promise<OperationResult<Turma>>;
  matricularAluno(turmaId: string, alunoId: string, motivo?: string): Promise<OperationResult<Turma>>;
  desmatricularAluno(turmaId: string, alunoId: string, motivo?: string): Promise<OperationResult<Turma>>;
  alterarStatus(turmaId: string, novoStatus: Turma["status"]): Promise<OperationResult<Turma>>;
}

export interface IAulaRepository {
  listar(filters?: AulaFilters): Promise<Aula[]>;
  obterPorId(id: string): Promise<Aula | null>;
  listarPorTurma(turmaId: string): Promise<Aula[]>;
  listarPorAluno(alunoId: string): Promise<Aula[]>;
  listarPorProfessor(professorId: string): Promise<Aula[]>;
  obterProximaAulaAluno(alunoId: string): Promise<Aula | null>;
  listarProximas(limite?: number): Promise<Aula[]>;
  contarAgendadas(): Promise<number>;
  criar(
    dados: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas"> & {
      professorId?: string;
      presencas?: Record<string, RegistroPresencaItem>;
    }
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }>;
  criarSequenciaSemanal(
    dadosBase: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas">,
    quantidadeEncontros: number
  ): Promise<OperationResult<Aula[]> & { conflitos?: ConflitoHorario[] }>;
  atualizar(
    id: string,
    dados: Partial<Omit<Aula, "id" | "dataCadastro">>
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }>;
  cancelar(id: string, motivo?: string): Promise<OperationResult<Aula>>;
  concluir(id: string, confirmarPendencias?: boolean): Promise<OperationResult<Aula>>;
  registrarPresencas(
    id: string,
    presencas: Record<string, RegistroPresencaItem>,
    topicoTrabalhadoOuConcluir?: string | boolean,
    observacoes?: string
  ): Promise<OperationResult<Aula>>;
  calcularFrequenciaAluno(alunoId: string, turmaId?: string): Promise<FrequenciaCalculada>;
  calcularFrequenciaTurma(turmaId: string): Promise<FrequenciaCalculada>;
  calcularFrequenciaGeral?(): Promise<{
    porcentagem: number | null;
    totalAulas: number;
    presentes: number;
    ausentes: number;
    justificados: number;
  }>;
  verificarConflitos?(aulaCandidate: {
    id?: string;
    turmaId: string;
    professorId: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
    status: Aula["status"];
  }): Promise<ConflitoHorario[]>;
}

export interface SerieAula {
  id: string;
  turmaId: string;
  professorId: string;
  diaSemana: number;
  horarioLocal: string;
  duracaoMinutos: number;
  timezone: string;
  dataInicio: string;
  dataFim: string;
  status: "ativa" | "cancelada" | "concluida";
  createdAt: string;
  updatedAt: string;
}

export interface ISerieAulaRepository {
  criarSerie(dados: {
    turmaId: string;
    professorId: string;
    tituloBase: string;
    diaSemana: number;
    horarioLocal: string;
    duracaoMinutos: number;
    quantidadeEncontros: number;
    dataInicio: string;
    meetingUrl?: string;
    observacoes?: string;
  }): Promise<OperationResult<{ serieId: string }>>;
}

export interface IPresencaRepository {
  salvarChamada(
    aulaId: string,
    presencas: Array<{
      alunoId: string;
      status: import("@/types").StatusPresenca;
      justificativa?: string;
      observacaoPedagogica?: string;
    }>,
    topicoTrabalhado?: string,
    observacoes?: string
  ): Promise<OperationResult<void>>;
  calcularFrequenciaAluno(alunoId: string, turmaId?: string): Promise<FrequenciaCalculada>;
}

export interface IMaterialRepository {
  listar(filters?: MaterialFilters): Promise<Material[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<Material | null>;
  listarParaAluno(alunoId: string, turmasIds?: string[]): Promise<Material[]>;
  obterPorIdParaAluno(id: string, alunoId: string, turmasIds?: string[]): Promise<Material | null>;
  criar(dados: Partial<Material>): Promise<OperationResult<Material>>;
  atualizar(id: string, dados: Partial<Material>): Promise<OperationResult<Material>>;
  arquivar(id: string): Promise<OperationResult<Material>>;
  restaurar(id: string): Promise<OperationResult<Material>>;
  contarPublicados(): Promise<number>;
  contarAgendados(): Promise<number>;
}

export interface IAtividadeRepository {
  listar(filters?: AtividadeFilters): Promise<Atividade[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<Atividade | null>;
  listarParaAluno(alunoId: string, turmasIds?: string[], filters?: AtividadeFilters): Promise<Atividade[]>;
  obterPorIdParaAluno(id: string, alunoId: string, turmasIds?: string[]): Promise<Atividade | null>;
  criar(dados: Partial<Atividade>): Promise<OperationResult<Atividade>>;
  atualizar(id: string, dados: Partial<Atividade>): Promise<OperationResult<Atividade>>;
  encerrar(id: string): Promise<OperationResult<Atividade>>;
  arquivar(id: string): Promise<OperationResult<Atividade>>;
  contarPublicadas(): Promise<number>;
}

export interface IEntregaRepository {
  listar(filters?: EntregaFilters): Promise<Entrega[]>;
  obterPorId(id: string): Promise<Entrega | null>;
  obterPorAtividadeEAluno(atividadeId: string, alunoId: string): Promise<Entrega | null>;
  salvarRascunho(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>>;
  enviarEntrega(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>>;
  corrigir(
    entregaId: string,
    professorId: string,
    dados: { feedback: string; pontuacao?: number | null }
  ): Promise<OperationResult<Entrega>>;
  solicitarReenvio(
    entregaId: string,
    professorId: string,
    motivo: string
  ): Promise<OperationResult<Entrega>>;
  contarAguardandoCorrecao(): Promise<number>;
  contarAtrasadas(): Promise<number>;
  contarConcluidasPorAluno(alunoId: string): Promise<number>;
}

export interface ISelfPresentationRepository {
  listar(filters?: SelfPresentationFilters): Promise<SelfPresentation[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<SelfPresentation | null>;
  obterParaAluno(id: string, alunoId: string): Promise<SelfPresentation | null>;
  listarParaAluno(alunoId: string): Promise<SelfPresentation[]>;
  listarPorAluno(alunoId: string): Promise<SelfPresentation[]>;
  obterAtivaParaAluno(alunoId: string): Promise<SelfPresentation | null>;
  salvarRascunho(dados: {
    id?: string;
    alunoId: string;
    alunoNome?: string;
    tipo?: "nivelamento_inicial" | "reavaliacao";
    titulo: string;
    linkVideo?: string;
    dataGravacao?: string;
    observacaoAluno?: string;
    consentimento?: ConsentimentoUsoVideo;
  }): Promise<OperationResult<SelfPresentation>>;
  enviar(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>>;
  assumirAvaliacao(
    id: string,
    professorId: string,
    professorNome: string
  ): Promise<OperationResult<SelfPresentation>>;
  salvarAvaliacao(
    id: string,
    avaliacaoInput: Partial<AvaliacaoPedagogica>,
    publicar?: boolean
  ): Promise<OperationResult<SelfPresentation>>;
  solicitarReenvio(
    id: string,
    solicitacao: SolicitacaoReenvio
  ): Promise<OperationResult<SelfPresentation>>;
  criarNovaVersao(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    }
  ): Promise<OperationResult<SelfPresentation>>;
  aplicarNivelAoPerfil(
    id: string,
    professorId: string,
    professorNome: string
  ): Promise<OperationResult<{ aluno: Aluno; sp: SelfPresentation }>>;
  contadoresDashboard(): Promise<SelfPresentationsMetricasAdmin>;
}

export interface IBaralhoRepository {
  getBaralhos(filters?: BaralhoFilters): Promise<Baralho[]>;
  getBaralhoById(id: string): Promise<Baralho | null>;
  getBaralhosAluno(alunoId: string, turmasIds?: string[]): Promise<Baralho[]>;
  salvarBaralho?(dados: Partial<Baralho>): Promise<OperationResult<Baralho>>;
  atualizarStatusBaralho?(id: string, novoStatus: import("@/types").StatusBaralho): Promise<OperationResult<Baralho>>;
  excluirBaralho?(id: string): Promise<OperationResult<boolean>>;
  sincronizarContagemCartoes?(baralhoId: string, total: number): void;
}

export interface ICartaoRepository {
  getCartoesPorBaralho(baralhoId: string, apenasAtivos?: boolean): Promise<import("@/types").Cartao[]>;
  getCartaoById(id: string): Promise<import("@/types").Cartao | null>;
  salvarCartao(dados: Partial<import("@/types").Cartao>): Promise<OperationResult<import("@/types").Cartao>>;
  atualizarStatusCartao(id: string, novoStatus: import("@/types").StatusCartao): Promise<OperationResult<import("@/types").Cartao>>;
  excluirCartao(id: string): Promise<OperationResult<boolean>>;
  importarCartoesCSV(
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
  ): Promise<OperationResult<import("@/types").Cartao[]>>;
}

export interface IProgressoCartaoRepository {
  obterProgresso(alunoId: string, cartaoId: string): Promise<import("@/types").CartaoProgressoAluno | null>;
  obterOuCriarProgresso(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    dataReferencia?: Date
  ): import("@/types").CartaoProgressoAluno;
  obterFilaEstudoBaralho(
    alunoId: string,
    baralhoId: string,
    limiteDiarioNovos?: number,
    dataReferencia?: Date
  ): Promise<unknown>;
  registrarRespostaEstudo(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    resposta: import("@/types").RespostaSRS,
    dataReferencia?: Date
  ): Promise<{
    progresso: import("@/types").CartaoProgressoAluno;
    historicoId: string;
    reagendadoParaRevisao: boolean;
    reagendadoMinutos?: number;
    reagendadoMesmaSessao: boolean;
  }>;
}

export interface IAvaliacaoRepository {
  listar(filters?: AvaliacaoFilters): Promise<Avaliacao[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<Avaliacao | null>;
  listarParaAluno(alunoId: string, turmaIds?: string[]): Promise<Avaliacao[]>;
  salvar(
    dados: Omit<Avaliacao, "id" | "criadoEm" | "atualizadoEm"> & { id?: string },
    possuiTentativas?: boolean
  ): Promise<OperationResult<Avaliacao>>;
  duplicarComoNovaVersao(avaliacaoId: string): Promise<OperationResult<Avaliacao>>;
  alterarStatus(id: string, status: import("@/types").StatusAvaliacao): Promise<OperationResult<Avaliacao>>;
}

export interface ITentativaAvaliacaoRepository {
  listar(filters?: TentativaFilters): Promise<TentativaAvaliacao[]>;
  listarPorAluno(alunoId: string): Promise<TentativaAvaliacao[]>;
  obterPorId(id: string, paraAluno?: boolean): Promise<TentativaAvaliacao | null>;
  iniciarTentativa(avaliacaoId: string, alunoId: string, alunoNome: string): Promise<OperationResult<TentativaAvaliacao>>;
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
  ): Promise<OperationResult<TentativaAvaliacao>>;
  enviarTentativa(
    tentativaId: string,
    alunoId: string,
    dadosEnvio: {
      respostasObjetivasMap?: Record<string, string>;
      respostaPratica?: RespostaAvaliacaoPratica;
    }
  ): Promise<OperationResult<TentativaAvaliacao>>;
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
  ): Promise<OperationResult<TentativaAvaliacao>>;
  autorizarTentativaExtra(
    avaliacaoId: string,
    alunoId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ): Promise<OperationResult<AutorizacaoTentativaExtra>>;
}

import { ContextoAvaliacaoConquistas } from "../gamificacaoMotor";

export interface IComunidadeRepository {
  listarEspacos(
    paraAdmin?: boolean,
    aluno?: Aluno,
    turmasMatriculado?: string[]
  ): Promise<EspacoComunidade[]>;
  obterEspacoPorId(id: string): Promise<EspacoComunidade | null>;
  salvarEspaco(
    dados: Partial<EspacoComunidade> & { nome: string; descricao: string }
  ): Promise<OperationResult<EspacoComunidade>>;
  listarPublicacoes(espacoId?: string, paraAluno?: boolean): Promise<PublicacaoComunidade[]>;
  obterPublicacaoPorId(id: string, paraAluno?: boolean): Promise<PublicacaoComunidade | null>;
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
  ): Promise<OperationResult<PublicacaoComunidade>>;
  alternarReacaoPublicacao(
    publicacaoId: string,
    tipo: string,
    usuarioId: string
  ): Promise<OperationResult<PublicacaoComunidade>>;
  alternarCurtidaComentario(
    comentarioId: string,
    usuarioId: string
  ): Promise<OperationResult<{ totalCurtidas: number; curtiu: boolean }>>;
  listarComentarios(publicacaoId: string, paraAluno?: boolean): Promise<ComentarioPublicacao[]>;
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
  ): Promise<OperationResult<ComentarioPublicacao>>;
  denunciarConteudo(dados: {
    alvoTipo: "publicacao" | "comentario";
    alvoId: string;
    publicacaoId: string;
    denuncianteId: string;
    denuncianteNome: string;
    motivo: MotivoDenuncia;
    descricao?: string;
  }): Promise<OperationResult<DenunciaConteudo>>;
  listarDenuncias(): Promise<DenunciaConteudo[]>;
  moderarPublicacao(
    publicacaoId: string,
    acao: AcaoModeracao,
    motivo: string,
    moderadorId: string,
    moderadorNome: string
  ): Promise<OperationResult<PublicacaoComunidade>>;
  moderarComentario(
    comentarioId: string,
    acao: AcaoModeracao,
    motivo: string,
    moderadorId: string,
    moderadorNome: string
  ): Promise<OperationResult<ComentarioPublicacao>>;
  listarOportunidades(): Promise<OportunidadeIntercambio[]>;
  obterOportunidadePorId(id: string): Promise<OportunidadeIntercambio | null>;
  registrarInteresseOportunidade(dados: {
    oportunidadeId: string;
    alunoId: string;
    alunoNome: string;
    alunoEmail: string;
    alunoNivelAtual?: string;
    observacoesAluno?: string;
  }): Promise<OperationResult<InteresseOportunidade>>;
  listarInteressesPorOportunidade(oportunidadeId: string): Promise<InteresseOportunidade[]>;
  obterMetricasAdmin(): Promise<MetricasComunidadeAdmin>;
}

export interface IGamificacaoRepository {
  listarModelos(status?: string): Promise<ModeloConquista[]>;
  obterModeloPorId(id: string): Promise<ModeloConquista | null>;
  salvarModelo(
    dados: Partial<ModeloConquista> & {
      nome: string;
      descricao: string;
      categoria: CategoriaConquista;
      tipoCriterio: TipoCriterioConquista;
      tipoPremio: TipoPremioConquista;
      icone: string;
    }
  ): Promise<OperationResult<ModeloConquista>>;
  listarConquistasAluno(alunoId: string): Promise<ConquistaConcedida[]>;
  listarTodasConcedidas(): Promise<ConquistaConcedida[]>;
  concederConquistaManual(dados: {
    alunoId: string;
    alunoNome: string;
    modeloId: string;
    professorId?: string;
    professorNome?: string;
    justificativaDocente?: string;
  }): Promise<OperationResult<ConquistaConcedida>>;
  verificarEConcederAutomaticas(
    contexto: ContextoAvaliacaoConquistas,
    alunoNome: string
  ): Promise<ConquistaConcedida[]>;
  registrarEventoPontos(dados: {
    alunoId: string;
    alunoNome: string;
    tipoAcao: TipoAcaoPontos;
    pontos?: number;
    descricao?: string;
    referenciaId?: string;
  }): Promise<EventoPontos>;
  obterPontosAluno(alunoId: string): Promise<{
    pontosTotais: number;
    historicoEventos: EventoPontos[];
  }>;
  listarSolicitacoesPlacas(alunoId?: string): Promise<SolicitacaoPlacaFisica[]>;
  obterSolicitacaoPlacaPorId(id: string): Promise<SolicitacaoPlacaFisica | null>;
  registrarInteressePlacaFisica(dados: {
    alunoId: string;
    alunoNome: string;
    conquistaId: string;
    conquistaNome: string;
    nivelMarco?: string;
  }): Promise<OperationResult<SolicitacaoPlacaFisica>>;
  atualizarStatusPlacaFisica(
    solicitacaoId: string,
    novoStatus: StatusPlacaFisica,
    responsavelNome: string,
    observacao?: string,
    codigoRastreio?: string,
    observacoesInternas?: string
  ): Promise<OperationResult<SolicitacaoPlacaFisica>>;
  criarNotificacao(dados: {
    usuarioId: string;
    tipo: TipoNotificacaoInterna;
    titulo: string;
    mensagem: string;
    linkDestino?: string;
  }): Promise<NotificacaoInterna>;
  listarNotificacoes(usuarioId: string): Promise<NotificacaoInterna[]>;
  marcarNotificacaoComoLida(id: string): Promise<OperationResult<boolean>>;
  marcarTodasComoLidas(usuarioId: string): Promise<OperationResult<boolean>>;
  obterMetricasAdmin(): Promise<MetricasGamificacaoAdmin>;
}
