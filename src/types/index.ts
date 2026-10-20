import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  exact?: boolean;
}

export interface AlunoProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: "aluno";
  streakWeeks: number;
  currentModule: string;
  journeyProgress: number; // 0 to 100
  studyHoursThisWeek: string; // e.g. "5h 20min"
  completedActivitiesCount: number; // e.g. 12
  teacher: {
    name: string;
    role: string;
    avatarUrl: string;
    bio: string;
  };
}

export interface ProximaAula {
  id: string;
  modulo: string;
  titulo: string;
  dataTexto: string; // e.g. "Hoje, 19:30"
  horario: string; // "19:30"
  professorNome: string;
  professorTitulo: string;
  professorAvatar: string;
  status: "confirmada" | "a_confirmar";
  meetingUrlNotice: string; // Informative notice explaining manual Zoom link
  meetingUrl?: string; // Optional manual Zoom HTTPS URL
}

export interface AtividadePendente {
  id: string;
  titulo: string;
  modulo: string;
  duracaoTexto: string;
  concluida: boolean;
  tipo: "video" | "exercicio" | "leitura" | "self-presentation" | "flashcards";
}

export interface DiaEvolucao {
  dia: "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom";
  minutos: number;
  alturaPercentual: number; // For clean visual bar sizing
}

export interface FlashcardResumo {
  totalParaRevisarHoje: number;
  revisadosHoje: number;
  sequenciaDias: number;
  proximaSessaoTexto: string;
}

export interface ConquistaItem {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  icone: string;
  conquistada: boolean;
}

export interface AlunoDashboardData {
  aluno: AlunoProfile;
  proximaAula: ProximaAula;
  atividadesPendentes: AtividadePendente[];
  evolucaoSemanal: DiaEvolucao[];
  flashcardsResumo: FlashcardResumo;
  conquistasRecentes: ConquistaItem[];
  praticaDeHoje?: ConteudoDiario | null;
  selfPresentationAtiva?: SelfPresentation | null;
  flashcardsMetricas?: FlashcardsMetricasAluno;
  progressoJornada?: ProgressoJornadaAluno;
}

export interface AdminMetric {
  id: string;
  label: string;
  valor: string | number;
  comparativo: string;
  variacao: string;
  tipo: "alunos" | "professores" | "aulas" | "conclusao";
}

export interface IndicadoresPedagogicos {
  atividadesPublicadas: number;
  entregasAguardando: number;
  entregasAtrasadas: number;
  conteudosAgendados: number;
}

export interface AdminProximaAula {
  id: string;
  horario: string;
  dataLabel: string;
  alunoNome: string;
  alunoAvatar: string;
  turmaOuModulo: string;
  status: "Confirmada" | "A confirmar";
}

export interface AlunoAtencao {
  id: string;
  nome: string;
  avatarUrl: string;
  modulo: string;
  progresso: number; // 0 to 100
  ultimaAula: string;
  status: "Atrasado" | "Atenção" | "Em dia";
}

export interface EvolucaoCrescimentoPonto {
  mes: string;
  alunos: number;
}

export interface SelfPresentationPendente {
  id: string;
  alunoNome: string;
  alunoAvatar: string;
  modulo: string;
  dataEnvio: string;
  status: "Aguardando avaliação" | "Em análise";
}

export interface AdminDashboardData {
  mesReferencia: string;
  metricas: AdminMetric[];
  indicadoresPedagogicos?: IndicadoresPedagogicos;
  evolucaoAlunos: EvolucaoCrescimentoPonto[];
  proximasAulas: AdminProximaAula[];
  alunosAtencao: AlunoAtencao[];
  selfPresentationsPendentes: SelfPresentationPendente[];
  selfPresentationsMetricas?: SelfPresentationsMetricasAdmin;
  flashcardsMetricas?: FlashcardsMetricasAdmin;
  metricasAvaliacoes?: MetricasAvaliacoesAdmin;
}

// ==========================================
// ETAPA 2: CADASTROS DE ALUNOS E PROFESSORES
// ==========================================

export type NivelAluno =
  | "nao_avaliado"
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1"
  | "C2";

export type StatusCadastro = "ativo" | "inativo";

export interface Aluno {
  id: string;
  perfilId?: string;
  nomeCompleto: string;
  email: string;
  telefone?: string;
  objetivoIngles: string;
  nivel: NivelAluno;
  status: StatusCadastro;
  dataCadastro: string; // ISO 8601
  observacoesPedagogicas?: string;
  avatarUrl?: string;
}

export interface Professor {
  id: string;
  perfilId?: string;
  nomeCompleto: string;
  email: string;
  telefone?: string;
  biografiaCurta: string;
  idiomasFalados: string[];
  status: StatusCadastro;
  dataCadastro: string; // ISO 8601
  avatarUrl?: string;
}

export interface AlunoFilters {
  busca?: string;
  status?: StatusCadastro | "todos";
  nivel?: NivelAluno | "todos";
}

export interface ProfessorFilters {
  busca?: string;
  status?: StatusCadastro | "todos";
}

export interface FormValidationResult<T = Record<string, unknown>> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>> | Record<string, string>;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ==========================================
// ETAPA 3: TURMAS, MATRÍCULAS, AULAS E PRESENÇA
// ==========================================

export type ModalidadeTurma = "individual" | "grupo";

export type NivelTurma =
  | "nao_definido"
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1"
  | "C2";

export type StatusTurma = "formacao" | "ativa" | "pausada" | "encerrada";

export interface Turma {
  id: string;
  nome: string;
  modalidade: ModalidadeTurma;
  nivel: NivelTurma;
  objetivoPrincipal: string;
  professorId: string;
  alunoIds: string[];
  capacidade: number;
  status: StatusTurma;
  dataInicio: string; // YYYY-MM-DD
  observacoes?: string;
  moduloId?: string; // Vínculo pedagógico opcional (Etapa 7)
  moduleId?: string; // Alias
  dataCadastro: string; // ISO
}

export type StatusAula = "agendada" | "concluida" | "cancelada";

export type StatusPresenca =
  | "presente"
  | "ausente"
  | "justificado"
  | "nao_registrado";

export interface RegistroPresencaItem {
  status: StatusPresenca;
  observacao?: string;
  justificativa?: string;
  alunoId?: string;
  registradoEm?: string;
}

export interface Aula {
  id: string;
  turmaId: string;
  professorId: string; // obtido da turma
  titulo: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  duracaoMinutos: number; // padrão 50 ou 60
  meetingUrl?: string; // HTTPS Zoom link
  linkZoom?: string; // Alias para meetingUrl
  topicoTrabalhado?: string;
  status: StatusAula;
  observacoes?: string;
  presencas: Record<string, RegistroPresencaItem>; // chave: alunoId
  chamada?: Array<{ alunoId: string; presenca?: StatusPresenca; statusPresenca?: StatusPresenca; status?: StatusPresenca }>;
  dataCadastro: string; // ISO
}

export interface ConflitoHorario {
  tipo: "professor" | "aluno";
  pessoaId: string;
  pessoaNome: string;
  nomeEnvolvido?: string;
  aulaExistenteTitulo?: string;
  turmaNome?: string;
  horarioExistente?: string;
  horarioFimExistente?: string;
  aulaConflitante: {
    id: string;
    titulo: string;
    turmaNome: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
  };
  mensagem: string;
}

export interface TurmaFilters {
  busca?: string;
  status?: StatusTurma | "todos";
  nivel?: NivelTurma | "todos";
  modalidade?: ModalidadeTurma | "todos";
}

export interface AulaFilters {
  busca?: string;
  turmaId?: string;
  professorId?: string;
  status?: StatusAula | "todos";
  data?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface FrequenciaCalculada {
  totalAulasConcluidas: number;
  presentes: number;
  totalPresentes?: number;
  ausentes: number;
  totalAusentes?: number;
  justificados: number;
  totalJustificados?: number;
  naoRegistrados: number;
  porcentagem: number | null; // null if no data
  formulaExplicativa: string;
}

// ==========================================
// ETAPA 4: MATERIAIS, ATIVIDADES, ENTREGAS E CONTEÚDOS DIÁRIOS
// ==========================================

export type TipoMaterial = "texto" | "pdf" | "video" | "audio" | "link" | "documento";
export type NivelMaterial = "todos" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StatusMaterial = "rascunho" | "agendado" | "publicado" | "arquivado";
export type DestinoTipo = "geral" | "turma" | "aluno";

export interface Material {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoMaterial;
  categoria: string;
  nivelRecomendado: NivelMaterial;
  autorId: string;
  autorNome?: string;
  criadoEm: string;
  dataPublicacao?: string; // YYYY-MM-DD
  status: StatusMaterial;
  destinoTipo: DestinoTipo;
  destinoId?: string; // turmaId ou alunoId
  linkExterno?: string; // HTTPS URL
  conteudoTexto?: string;
  tags: string[];
  observacoesInternas?: string;
  moduloId?: string; // Vínculo pedagógico opcional (Etapa 7)
  moduleId?: string; // Alias
  arquivoUrl?: string; // Reservado para futura conexão com storage
  arquivoNome?: string;
}

export type TipoAtividade = "texto" | "link" | "multipla_escolha" | "audio" | "video" | "arquivo";
export type StatusAtividade = "rascunho" | "agendada" | "publicada" | "encerrada" | "arquivada";

export interface Atividade {
  id: string;
  titulo: string;
  instrucoes: string;
  tipo: TipoAtividade;
  nivelRecomendado?: NivelMaterial;
  materialRelacionadoId?: string;
  destinoTipo: DestinoTipo;
  destinoId?: string; // turmaId ou alunoId
  dataPublicacao: string; // YYYY-MM-DD
  prazoEntrega?: string; // YYYY-MM-DDTHH:mm ou YYYY-MM-DD
  pontuacaoMaxima?: number | null;
  status: StatusAtividade;
  professorId: string;
  permitirAtraso: boolean;
  observacoesInternas?: string;
  moduloId?: string; // Vínculo pedagógico opcional (Etapa 7)
  moduleId?: string; // Alias
  criadoEm: string;
}

export type StatusEntrega = "nao_iniciada" | "em_andamento" | "entregue" | "atrasada" | "corrigida" | "reenviar";

export interface HistoricoEnvio {
  id: string;
  respostaTexto?: string;
  respostaLink?: string;
  enviadoEm: string;
  feedbackAnterior?: string;
  pontuacaoAnterior?: number | null;
  motivoReenvio?: string;
}

export interface Entrega {
  id: string;
  atividadeId: string;
  alunoId: string;
  respostaTexto?: string;
  respostaLink?: string;
  status: StatusEntrega;
  entregueEm?: string;
  criadoEm: string;
  atualizadoEm: string;
  feedback?: string;
  pontuacao?: number | null;
  corrigidoEm?: string;
  professorCorretorId?: string;
  professorCorretorNome?: string;
  motivoReenvio?: string;
  historicoEnvios?: HistoricoEnvio[];
}

export type StatusConteudoDiario = "rascunho" | "agendado" | "publicado" | "arquivado";

export interface ConteudoDiario {
  id: string;
  titulo: string;
  texto: string;
  dataProgramada: string; // YYYY-MM-DD
  nivelRecomendado: NivelMaterial;
  destinoTipo: DestinoTipo;
  destinoId?: string;
  materialId?: string;
  atividadeId?: string;
  status: StatusConteudoDiario;
  criadoEm: string;
}

export interface MaterialFilters {
  busca?: string;
  tipo?: TipoMaterial | "todos";
  status?: StatusMaterial | "todos";
  nivel?: NivelMaterial | "todos";
  destinoTipo?: DestinoTipo | "todos";
  destinoId?: string;
  categoria?: string | "todas";
}

export interface AtividadeFilters {
  busca?: string;
  tipo?: TipoAtividade | "todos";
  status?: StatusAtividade | "todos";
  destinoTipo?: DestinoTipo | "todos";
  destinoId?: string;
  professorId?: string;
}

export interface EntregaFilters {
  atividadeId?: string;
  alunoId?: string;
  turmaId?: string;
  status?: StatusEntrega | "todos";
  busca?: string;
}

export interface ConteudoDiarioFilters {
  busca?: string;
  status?: StatusConteudoDiario | "todos";
  nivel?: NivelMaterial | "todos";
  data?: string;
}

// ==========================================
// ETAPA 5: SELF PRESENTATION, RUBRICAS E NIVELAMENTO
// ==========================================

export type TipoSelfPresentation = "nivelamento_inicial" | "reavaliacao";

export type StatusSelfPresentation =
  | "rascunho"
  | "enviada"
  | "em_avaliacao"
  | "reenvio_solicitado"
  | "avaliada";

export interface ConsentimentoUsoVideo {
  aceito: boolean;
  dataHora: string; // ISO
  versaoTexto: string; // Ex: "v1.0"
}

export interface CriterioRubrica {
  pontuacao: number; // 1 a 5
  comentario?: string;
  exemploObservado?: string;
}

export interface RubricaPedagogica {
  fluencia: CriterioRubrica;
  vocabulario: CriterioRubrica;
  gramaticaAplicada: CriterioRubrica;
  pronunciaInteligibilidade: CriterioRubrica;
  coerenciaOrganizacao: CriterioRubrica;
  compreensaoGeral: CriterioRubrica;
}

export interface AvaliacaoPedagogica {
  id: string;
  selfPresentationId: string;
  professorId: string;
  professorNome: string;
  rubrica: RubricaPedagogica;
  pontosFortes: string;
  pontosADesenvolver: string;
  orientacaoProximasAulas: string;
  observacoesInternas?: string; // Sigilosas: NUNCA expostas ao aluno!
  mediaCriteriosOrais: number; // Média aritmética estrita das notas (1 a 5) da rubrica
  nivelDefinido: NivelAluno; // Nível oficial validado e justificado manualmente pelo professor
  justificativaNivel: string; // Obrigatória
  concluidaEm: string;
  publicada: boolean;
  publicadaEm?: string;
}

export interface SolicitacaoReenvio {
  motivo: string;
  orientacoes: string;
  prazoSugerido?: string;
  solicitadoEm: string;
  professorId: string;
  professorNome: string;
}

export interface VersaoHistoricoSelfPresentation {
  versao: number;
  linkVideo: string;
  dataGravacao: string;
  dataEnvio: string;
  observacaoAluno?: string;
  consentimento: ConsentimentoUsoVideo;
  solicitacaoReenvio?: SolicitacaoReenvio;
  avaliacaoAnterior?: Partial<AvaliacaoPedagogica>;
  arquivadoEm: string;
}

export interface SelfPresentation {
  id: string;
  alunoId: string;
  alunoNome: string;
  tipo: TipoSelfPresentation;
  titulo: string;
  idiomaAvaliado: string; // "Inglês"
  linkVideo: string;
  dataGravacao: string;
  dataEnvio?: string;
  status: StatusSelfPresentation;
  versao: number;
  consentimento: ConsentimentoUsoVideo;
  observacaoAluno?: string;
  professorAvaliadorId?: string;
  professorAvaliadorNome?: string;
  dataInicioAvaliacao?: string;
  dataConclusao?: string;
  avaliacao?: AvaliacaoPedagogica;
  solicitacaoReenvio?: SolicitacaoReenvio;
  historicoVersoes?: VersaoHistoricoSelfPresentation[];
  nivelAplicadoAoPerfil?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export type OrigemAlteracaoNivel =
  | "self_presentation"
  | "ajuste_manual"
  | "cadastro_inicial";

export interface RegistroHistoricoNivel {
  id: string;
  alunoId: string;
  nivelAnterior: NivelAluno;
  novoNivel: NivelAluno;
  dataAlteracao: string;
  origem: OrigemAlteracaoNivel;
  origemReferenciaId?: string; // ID da Self Presentation
  professorId?: string;
  professorNome?: string;
  justificativa?: string;
}

export interface SelfPresentationFilters {
  busca?: string;
  status?: StatusSelfPresentation | "todos";
  professorId?: string;
  tipo?: TipoSelfPresentation | "todos";
  nivelAtual?: NivelAluno | "todos";
  ordenacao?: "antigas_primeiro" | "recentes_primeiro";
}

export interface SelfPresentationsMetricasAdmin {
  aguardando: number;
  emAvaliacao: number;
  reenviosPendentes: number;
  avaliadas: number;
  tempoMedioHorasTexto: string;
}

// ============================================================================
// ETAPA 6: FLASHCARDS E REPETIÇÃO ESPAÇADA (SRS)
// ============================================================================

export type StatusBaralho = "rascunho" | "publicado" | "arquivado";

export interface Baralho {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  nivelRecomendado: NivelMaterial;
  idiomaOrigem: string; // Ex: "Inglês"
  idiomaDestino: string; // Ex: "Português"
  professorId: string;
  professorNome: string;
  destinoTipo: DestinoTipo; // "geral" | "turma" | "aluno"
  destinoId?: string; // ID da turma ou do aluno
  status: StatusBaralho;
  limiteDiarioNovos: number; // 1 a 100, default 20
  tags: string[];
  materialId?: string;
  atividadeId?: string;
  aulaId?: string;
  moduloId?: string; // Vínculo pedagógico opcional (Etapa 7)
  moduleId?: string; // Alias
  totalCartoes?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusCartao = "ativo" | "suspenso";

export interface Cartao {
  id: string;
  baralhoId: string;
  frente: string;
  verso: string;
  exemplo?: string;
  traducao?: string;
  dica?: string;
  pronuncia?: string;
  linkAudio?: string; // HTTPS válido, opcional
  tags: string[];
  status: StatusCartao;
  criadoEm: string;
  atualizadoEm: string;
}

export type EstadoCartaoAprendizagem = "novo" | "aprendendo" | "revisao" | "suspenso";

export type RespostaSRS = "errei" | "dificil" | "bom" | "facil";

export interface CartaoProgressoAluno {
  id: string; // `cpa-${alunoId}-${cartaoId}`
  alunoId: string;
  cartaoId: string;
  baralhoId: string;
  estado: EstadoCartaoAprendizagem;
  totalRevisoes: number;
  totalLapsos: number;
  fatorFacilidade: number; // padrão 2.5, mínimo 1.3
  intervaloDias: number; // 0 para minutos / aprendizado inicial
  intervaloMinutos?: number; // 10 para errei
  proximaRevisao: string; // ISO timestamp
  ultimaRevisao?: string; // ISO timestamp
  ultimaResposta?: RespostaSRS;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HistoricoRevisao {
  id: string;
  alunoId: string;
  cartaoId: string;
  baralhoId: string;
  dataHora: string; // ISO timestamp
  dataRevisao?: string;
  revisadoEm?: string;
  resposta: RespostaSRS;
  estadoAnterior: EstadoCartaoAprendizagem;
  intervaloAnterior: number;
  novoEstado: EstadoCartaoAprendizagem;
  novoIntervalo: number;
  proximaRevisao: string;
  fatorAnterior: number;
  novoFator: number;
}

export type HistoricoRevisaoCartao = HistoricoRevisao;

export interface SessaoEstudoResumo {
  id: string;
  alunoId: string;
  baralhoId: string;
  iniciadaEm: string;
  concluidaEm: string;
  totalEstudado: number;
  erros: number;
  dificeis: number;
  bons: number;
  faceis: number;
  tempoSegundos: number;
  revisoesReagendadas: number;
  proximaRevisaoPrevista?: string;
}

export interface BaralhoFilters {
  busca?: string;
  status?: StatusBaralho | "todos";
  nivel?: NivelMaterial | "todos";
  destinoTipo?: DestinoTipo | "todos";
  professorId?: string;
  categoria?: string;
}

export interface FlashcardsMetricasAluno {
  revisoesHoje: number;
  emAprendizado: number;
  novosDisponiveis: number;
  sequenciaDias: number;
  totalEstudadosHistorico: number;
  proximaRevisaoGeral?: string;
}

export interface FlashcardsMetricasAdmin {
  totalBaralhosPublicados: number;
  totalCartoesAtivos: number;
  revisoesRealizadas: number;
  alunosAtivosRevisando: number;
  cartoesMaisErros: Array<{
    cartaoId: string;
    baralhoNome: string;
    frente: string;
    totalLapsos: number;
  }>;
}

export interface ItemImportacaoCSV {
  linha: number;
  frente: string;
  verso: string;
  exemplo?: string;
  traducao?: string;
  dica?: string;
  pronuncia?: string;
  tags: string[];
  status: "valido" | "invalido" | "duplicado";
  erro?: string;
}

// ============================================================================
// ETAPA 7: ESTRUTURA PEDAGÓGICA DO MÉTODO PAULO, AVALIAÇÕES E PROGRESSO
// ============================================================================

// ----------------------------------------------------------------------------
// PARTE 1 — ESTRUTURA DO MÉTODO (CONFIGURÁVEL)
// ----------------------------------------------------------------------------

export type StatusPrograma = "rascunho" | "ativo" | "arquivado";

export interface Programa {
  id: string;
  nome: string;
  descricao: string;
  idioma: string;
  duracaoMesesEstimada: number;
  status: StatusPrograma;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusEtapa = "rascunho" | "ativa" | "arquivada";

export interface Etapa {
  id: string;
  programaId: string;
  nome: string;
  descricao: string;
  ordem: number;
  objetivos: string[];
  status: StatusEtapa;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriteriosConclusaoModulo {
  presencaMinimaPercentual?: number; // Ex: 75%
  atividadesMinimasConcluidas?: number; // Ex: 3 atividades
  notaMinimaObjetivas?: number; // Ex: 7.0
  avaliacaoPraticaObrigatoria: boolean; // Se exige entrega e aprovação em avaliação prática
  exigeValidacaoHumana: boolean; // Se true, o professor precisa validar explicitamente a conclusão
}

export type StatusModulo = "rascunho" | "ativo" | "arquivado";

export interface Modulo {
  id: string;
  etapaId: string;
  nome: string;
  descricao: string;
  ordem: number;
  nivelReferenciaCEFR?: NivelAluno; // Apenas referência curricular, NÃO certificação formal
  objetivosPedagogicos: string[];
  cargaHorariaEstimadaHoras?: number;
  criteriosConclusao: CriteriosConclusaoModulo;
  status: StatusModulo;
  criadoEm: string;
  atualizadoEm: string;
}

// ----------------------------------------------------------------------------
// PROGRESSO DO ALUNO POR MÓDULO (ISOLADO DO CADASTRO DO ALUNO)
// ----------------------------------------------------------------------------

export type StatusProgressoModulo =
  | "nao_iniciado"
  | "em_andamento"
  | "aguardando_validacao"
  | "concluido"
  | "reaberto";

export interface IndicadoresModuloCalculados {
  presencaPercentual?: number | null;
  presencaCumprida?: boolean;
  atividadesConcluidas?: number;
  atividadesCumpridas?: boolean;
  mediaAvaliacoesObjetivas?: number | null;
  objetivasCumpridas?: boolean;
  avaliacaoPraticaConcluida?: boolean;
  avaliacaoPraticaAprovada?: boolean;
  praticaCumprida?: boolean;
  validacaoHumanaConcluida?: boolean;
  criteriosCumpridos: number;
  totalCriteriosAplicaveis: number;
  percentualConclusao: number; // (criteriosCumpridos / totalCriteriosAplicaveis) * 100
  todosCriteriosCumpridos: boolean;
}

export interface RegistroMudancaProgresso {
  id: string;
  dataHora: string;
  autorId: string;
  autorNome: string;
  acao: "inicio" | "conclusao_automatica" | "validacao_professor" | "reabertura";
  statusAnterior: StatusProgressoModulo;
  novoStatus: StatusProgressoModulo;
  justificativa?: string;
}

export interface ProgressoModuloAluno {
  id: string; // `pma-${alunoId}-${moduloId}`
  alunoId: string;
  moduloId: string;
  status: StatusProgressoModulo;
  iniciadoEm?: string;
  concluidoEm?: string;
  professorValidadorId?: string;
  professorValidadorNome?: string;
  observacaoValidacao?: string;
  indicadoresCalculados: IndicadoresModuloCalculados;
  historicoMudancas: RegistroMudancaProgresso[];
  atualizadoEm: string;
}

// ----------------------------------------------------------------------------
// PARTE 2 — AVALIAÇÕES (OBJETIVAS E PRÁTICAS)
// ----------------------------------------------------------------------------

export type TipoAvaliacao = "objetiva" | "pratica";
export type StatusAvaliacao =
  | "rascunho"
  | "agendada"
  | "publicada"
  | "encerrada"
  | "arquivada";

export interface AlternativaQuestao {
  id: string;
  texto: string;
  ordem: number;
}

export interface QuestaoObjetiva {
  id: string;
  enunciado: string;
  alternativas: AlternativaQuestao[]; // De 2 a 6 alternativas
  alternativaCorretaId: string; // Uma única correta
  explicacao?: string; // Opcional, exibida conforme configuração
  pontos: number; // Peso ou pontuação da questão
  ordem: number;
}

export interface CriterioRubricaPratica {
  id: string;
  nome: string;
  descricao: string;
  pontuacaoMaxima: number;
  ordem: number;
}

export type PoliticaExibicaoGabarito =
  | "nota_imediata"
  | "gabarito_imediato"
  | "gabarito_apos_encerramento";

export interface ConfigFeedbackAvaliacao {
  exibirNotaImediatamente: boolean;
  exibirRespostasCorretasAposEncerramento: boolean;
  exibirExplicacaoAposEncerramento: boolean;
}

export interface Avaliacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoAvaliacao;
  programaId: string;
  etapaId: string;
  moduloId: string;
  professorId: string;
  professorNome?: string;
  destinoTipo: DestinoTipo; // "geral" | "turma" | "aluno"
  destinoTurmaId?: string;
  destinoAlunoId?: string;
  status: StatusAvaliacao;
  dataPublicacao?: string; // ISO ou YYYY-MM-DD
  prazo?: string; // ISO ou YYYY-MM-DD
  maxTentativas: number; // Mínimo 1
  notaMaxima: number; // Padrão 10 ou 100
  notaMinimaAprovacao?: number;
  permitirEnvioAtrasado: boolean;
  instrucoes: string;
  versao: number; // Incrementada se duplicada
  politicaGabarito: PoliticaExibicaoGabarito; // Correção Etapa 7: política de exibição do gabarito
  configFeedback?: ConfigFeedbackAvaliacao;
  // Específico para Avaliação Objetiva
  questoes?: QuestaoObjetiva[];
  // Específico para Avaliação Prática
  rubrica?: CriterioRubricaPratica[];
  permitirTexto?: boolean;
  permitirLink?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

// ----------------------------------------------------------------------------
// TENTATIVAS DE AVALIAÇÃO
// ----------------------------------------------------------------------------

export type StatusTentativa =
  | "em_andamento"
  | "enviada"
  | "aguardando_correcao"
  | "corrigida"
  | "reaberta";

export type ResultadoAvaliacao = "aprovado" | "reprovado" | "precisa_reforco" | "refazer";

export interface RespostaQuestaoObjetiva {
  questaoId: string;
  alternativaEscolhidaId?: string;
  correta?: boolean;
  pontosObtidos?: number;
  respondidaEm?: string;
}

export interface RespostaAvaliacaoPratica {
  textoResposta?: string;
  linkExterno?: string; // HTTPS
}

export interface CorrecaoItemRubrica {
  criterioId: string;
  pontosAtribuidos: number;
  comentario?: string;
}

export interface FeedbackAvaliacao {
  corrigidoPorProfessorId: string;
  corrigidoPorProfessorNome: string;
  corrigidoEm: string;
  itensRubrica?: CorrecaoItemRubrica[];
  pontosFortes?: string;
  pontosADesenvolver?: string;
  orientacoes?: string;
  observacoesInternas?: string; // Sigilosas: NUNCA mostradas ao discente!
  resultado: ResultadoAvaliacao;
}

export interface AutorizacaoTentativaExtra {
  professorId: string;
  professorNome: string;
  justificativa: string;
  autorizadoEm: string;
}

export interface TentativaAvaliacao {
  id: string;
  avaliacaoId: string;
  versaoAvaliacao: number;
  alunoId: string;
  alunoNome?: string;
  numeroTentativa: number;
  iniciadaEm: string;
  enviadaEm?: string;
  status: StatusTentativa;
  respostasObjetivas?: RespostaQuestaoObjetiva[];
  respostaPratica?: RespostaAvaliacaoPratica;
  nota?: number;
  notaMaxima?: number;
  resultado?: ResultadoAvaliacao;
  feedback?: FeedbackAvaliacao;
  atrasada: boolean;
  politicaGabaritoUtilizada?: PoliticaExibicaoGabarito; // Registra a política no momento da submissão da versão
  autorizacaoTentativaExtra?: AutorizacaoTentativaExtra;
  criadoEm: string;
  atualizadoEm: string;
}

// ----------------------------------------------------------------------------
// FILTROS E MÉTRICAS
// ----------------------------------------------------------------------------

export interface AvaliacaoFilters {
  busca?: string;
  tipo?: TipoAvaliacao | "todos";
  status?: StatusAvaliacao | "todos";
  moduloId?: string;
  professorId?: string;
}

export interface TentativaFilters {
  busca?: string;
  avaliacaoId?: string;
  alunoId?: string;
  status?: StatusTentativa | "todos";
  tipo?: TipoAvaliacao | "todos";
}

export interface ProgressoModuloFilters {
  alunoId?: string;
  moduloId?: string;
  status?: StatusProgressoModulo | "todos";
}

export interface MetricasAvaliacoesAdmin {
  avaliacoesPublicadas: number;
  tentativasAguardandoCorrecao: number;
  alunosAguardandoValidacao: number;
  mediaAvaliacoesObjetivas: number | null; // Apenas quando houver dados
  totalAlunosPrecisandoReforco: number; // Contagem baseada nos resultados 'precisa_reforco'
}

export interface ProgressoJornadaAluno {
  programaNome: string;
  etapaAtualNome: string;
  moduloAtualNome: string;
  moduloAtualId: string;
  statusModuloAtual: StatusProgressoModulo;
  percentualConclusaoModulo: number;
  totalCriteriosAplicaveis: number;
  criteriosCumpridos: number;
  indicadores: IndicadoresModuloCalculados;
  criteriosPendentesDescricoes: string[];
  criteriosCumpridosDescricoes: string[];
  proximaAvaliacaoPendente?: {
    id: string;
    titulo: string;
    tipo: TipoAvaliacao;
    prazo?: string;
  } | null;
  avaliacoesAguardandoCorrecaoCount: number;
  resultadosRecentes: Array<{
    avaliacaoId: string;
    titulo: string;
    tipo: TipoAvaliacao;
    nota?: number;
    notaMaxima?: number;
    resultado?: ResultadoAvaliacao;
    data: string;
  }>;
}

// ============================================================================
// ETAPA 8: COMUNIDADE, GAMIFICAÇÃO, CONQUISTAS E PLACAS
// ============================================================================

// ----------------------------------------------------------------------------
// PARTE 1 — COMUNIDADE
// ----------------------------------------------------------------------------

export type TipoEspacoComunidade =
  | "geral"
  | "turma"
  | "nivel"
  | "objetivo"
  | "oportunidades";

export type StatusEspacoComunidade = "rascunho" | "ativo" | "arquivado";

export interface EspacoComunidade {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoEspacoComunidade;
  turmaId?: string; // Para tipo 'turma'
  turmaNome?: string;
  nivel?: string; // Para tipo 'nivel' (ex: "B1", "A2", etc.)
  nivelRecomendado?: string;
  objetivo?: string; // Para tipo 'objetivo'
  objetivoAlvo?: string;
  imagemUrl?: string; // Link externo HTTPS opcional
  regras?: string;
  status: StatusEspacoComunidade;
  permitirPublicacaoAluno?: boolean;
  permitirPublicacaoAlunos?: boolean;
  permitirComentarios: boolean;
  criadoPorId?: string;
  criadoPorNome?: string;
  responsavelNome?: string;
  totalPublicacoes?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoAutorComunidade = "aluno" | "professor" | "administrador" | "admin";
export type TipoPublicacaoComunidade =
  | "discussao"
  | "comunicado"
  | "conteudo"
  | "oportunidade"
  | "duvida"
  | "texto"
  | "artigo"
  | "aviso"
  | "conquista"
  | "dica";

export type StatusPublicacaoComunidade =
  | "publicada"
  | "oculta"
  | "arquivada"
  | "denunciada"
  | "removida";

export interface RegistroModeracaoConteudo {
  id?: string;
  dataHora: string;
  moderadorId?: string;
  responsavelId?: string;
  moderadorNome?: string;
  responsavelNome?: string;
  acao: "ocultar" | "restaurar" | "arquivar" | "remover" | "fixar" | "desafixar" | string;
  motivo: string;
  justificativa?: string;
}

export interface ReacoesPublicacao {
  gostei?: number;
  usuariosGostaram?: string[];
  curtidas?: number;
  apoio?: number;
  parabens?: number;
  [key: string]: unknown;
}

export interface PublicacaoComunidade {
  id: string;
  espacoId: string;
  espacoNome?: string;
  oportunidadeId?: string;
  autorId: string;
  autorNome: string;
  autorTipo?: TipoAutorComunidade;
  autorPapel?: TipoAutorComunidade;
  autorAvatar?: string;
  tipo: TipoPublicacaoComunidade;
  titulo?: string;
  texto?: string; // Plain text simples, sem HTML
  conteudo?: string;
  linkExterno?: string | { url: string; titulo?: string }; // HTTPS validado nativamente
  fixada: boolean;
  comentariosPermitidos?: boolean;
  status: StatusPublicacaoComunidade;
  editado?: boolean;
  editadoEm?: string;
  reacoes?: ReacoesPublicacao;
  reacoesPorUsuario?: Record<string, "curtidas" | "apoio" | "parabens">; // Registra a reação única de cada usuário (1 reação por usuário)
  reacoesCount?: number;
  reacoesUsuarios?: string[]; // IDs dos usuários que curtiram ("Gostei")
  comentariosCount: number;
  denunciasCount?: number;
  moderada?: boolean;
  observacoesInternas?: string;
  moderadoPorId?: string;
  dataModeracao?: string;
  registroModeracao?: RegistroModeracaoConteudo;
  historicoModeracao?: RegistroModeracaoConteudo[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface ComentarioPublicacao {
  id: string;
  publicacaoId: string;
  espacoId?: string;
  autorId: string;
  autorNome: string;
  autorTipo?: TipoAutorComunidade;
  autorPapel?: TipoAutorComunidade;
  autorAvatar?: string;
  texto?: string;
  conteudo?: string;
  status: "publicado" | "oculto" | "removido";
  editado?: boolean;
  editadoEm?: string;
  reacoes?: ReacoesPublicacao;
  registroModeracao?: RegistroModeracaoConteudo;
  criadoEm: string;
  atualizadoEm?: string;
}

export type MotivoDenuncia =
  | "conteudo_ofensivo"
  | "assedio"
  | "spam"
  | "spam_comercial"
  | "informacao_inadequada"
  | "desrespeito"
  | "fora_de_topico"
  | "outro";

export type StatusDenuncia =
  | "pendente"
  | "analisada"
  | "rejeitada"
  | "acao_aplicada"
  | "procedente"
  | "sob_analise";

export type AcaoModeracao =
  | "ocultar"
  | "restaurar"
  | "rejeitar"
  | "arquivar"
  | "remover"
  | "fixar"
  | "desafixar";

export interface DenunciaConteudo {
  id: string;
  tipoConteudo?: "publicacao" | "comentario";
  alvoTipo?: "publicacao" | "comentario";
  conteudoId?: string;
  alvoId?: string;
  espacoId?: string;
  publicacaoId: string; // Se for comentário, aponta para a publicação pai
  trechoConteudo?: string;
  autorConteudoId?: string;
  autorConteudoNome?: string;
  denuncianteId: string;
  denuncianteNome: string;
  motivo: MotivoDenuncia;
  descricao?: string;
  status: StatusDenuncia;
  moderadorId?: string;
  analisadoPorId?: string;
  moderadorNome?: string;
  decisao?: AcaoModeracao;
  justificativaDecisao?: string;
  decididoEm?: string;
  analisadoEm?: string;
  criadoEm: string;
}

export interface OportunidadeIntercambio {
  id: string;
  espacoId?: string;
  publicacaoId?: string;
  titulo: string;
  descricao: string;
  paisDestino?: string;
  destinoPais?: string;
  destinoCidade?: string;
  instituicaoParceira?: string;
  categoria?: string;
  modalidade?: "Presencial" | "Híbrido" | "Imersão de Férias" | "Trabalho & Estudo" | string;
  periodo: string;
  publicoRecomendado?: string;
  nivelRecomendado?: string;
  nivelOperacionalMinimo?: string;
  linkExterno?: string; // HTTPS
  linkOficial?: string;
  prazoInteresse?: string; // YYYY-MM-DD
  status: "aberta" | "ativa" | "encerrada" | "arquivada" | string;
  vagas?: number;
  criadoPorId?: string;
  criadoPorNome?: string;
  candidatosCount?: number;
  candidatosInscritosIds?: string[];
  criadoEm: string;
  atualizadoEm?: string;
}

export interface InteresseOportunidade {
  id: string;
  oportunidadeId: string;
  alunoId: string;
  alunoNome: string;
  alunoEmail: string;
  alunoNivelAtual?: string;
  mensagem?: string;
  observacoesAluno?: string;
  status?: string;
  statusContato?: "pendente" | "em_contato" | "finalizado";
  dataRegistro: string;
  observacaoEquipe?: string;
}

// ----------------------------------------------------------------------------
// PARTE 2 — GAMIFICAÇÃO, CONQUISTAS E PLACAS
// ----------------------------------------------------------------------------

export type CategoriaConquista =
  | "dedicacao"
  | "evolucao_pedagogica"
  | "nivel_operacional"
  | "avaliacoes_progresso"
  | "consistencia"
  | "desempenho"
  | "marcos_cefr"
  | "comunidade"
  | "especial"
  | "nivel_marco"
  | "aulas_frequencia"
  | "flashcards_estudo"
  | "comunidade_engajamento"
  | "placas_reconhecimento";

export type TipoCriterioConquista =
  | "horas_aulas_presenca" // Minutos totais de presença em aulas
  | "horas_aulas"
  | "atividades_entregues" // Quantidade de atividades concluídas
  | "modulos_concluidos" // Quantidade de módulos concluídos
  | "avaliacoes_realizadas" // Quantidade de avaliações realizadas
  | "avaliacoes_aprovadas"
  | "dias_consecutivos_flashcards" // Streak de estudo
  | "streak_dias"
  | "revisoes_flashcards" // Total de revisões de flashcards
  | "flashcards_revisados"
  | "nivel_operacional" // Nível manual aplicado pelo professor
  | "nivel_alcancado"
  | "participacao_comunidade"
  | "manual"
  | "manual_admin"; // Reconhecimento discricionário da escola

export type TipoPremioConquista =
  | "badge_digital"
  | "placa_digital"
  | "elegibilidade_placa_fisica"
  | "badge"
  | "placa_fisica";

export type StatusModeloConquista = "rascunho" | "ativo" | "ativa" | "arquivado" | "arquivada";

export interface ModeloConquista {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaConquista;
  icone: string; // Identificador do ícone Lucide
  cor?: "emerald" | "indigo" | "purple" | "amber" | "rose" | "blue" | "slate" | string;
  tipoCriterio: TipoCriterioConquista;
  metaValor?: number; // Ex: 10 (horas), 5 (atividades), 7 (dias de streak)
  metaNivel?: string; // Para critério 'nivel_operacional' (ex: "B1")
  nivelRequerido?: string;
  tipoPremio: TipoPremioConquista;
  pontosRecompensa?: number;
  elegivelPlacaFisica?: boolean;
  ordem?: number;
  ordemExibicao?: number;
  status: StatusModeloConquista;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusConquistaConcedida = "concedida" | "revogada" | "desbloqueada";

export interface ConquistaConcedida {
  id: string;
  alunoId: string;
  alunoNome?: string;
  modeloId: string;
  modeloNome: string;
  categoria: CategoriaConquista;
  tipoPremio: TipoPremioConquista;
  criterioAtingidoDescricao?: string;
  valorRegistrado?: number | string;
  origem?:
    | "automatica_aulas"
    | "automatica_atividades"
    | "automatica_modulos"
    | "automatica_flashcards"
    | "manual_professor_nivel"
    | "manual_admin"
    | string;
  status: StatusConquistaConcedida;
  concedidoPor?: string;
  professorId?: string;
  professorNome?: string;
  pontosAtribuidos?: number;
  visualizadaPeloAluno?: boolean;
  justificativaDocente?: string;
  codigoValidacaoDigital?: string;
  concedidaEm?: string;
  dataConcessao?: string;
  revogadaEm?: string;
  motivoRevogacao?: string;
  responsavelRevogacaoId?: string;
  responsavelRevogacaoNome?: string;
}

export type StatusPlacaFisica =
  | "elegivel"
  | "interesse_registrado"
  | "solicitada"
  | "em_analise"
  | "aprovado"
  | "aprovada"
  | "em_producao"
  | "pronta"
  | "enviado"
  | "enviada"
  | "entregue"
  | "rejeitada"
  | "cancelado";

export interface HistoricoStatusPlaca {
  id?: string;
  status?: StatusPlacaFisica;
  statusAnterior?: StatusPlacaFisica;
  statusNovo?: StatusPlacaFisica;
  responsavelId?: string;
  responsavelNome?: string;
  data?: string;
  dataHora?: string;
  motivo?: string;
  observacao?: string;
  observacaoInterna?: string;
}

export interface SolicitacaoPlacaFisica {
  id: string;
  alunoId: string;
  alunoNome: string;
  conquistaId?: string;
  conquistaNome?: string;
  nivelMarco?: string;
  conquistaConcedidaId?: string;
  modeloNome?: string;
  nomeParaGravacao?: string;
  status: StatusPlacaFisica;
  dataInteresse?: string;
  dataSolicitacao?: string;
  codigoRastreio?: string; // Opcional (sem integração logística)
  codigoAutenticidade?: string; // Identificador demonstrativo (formato para visualização; validação pública oficial dependerá de backend)
  codigoValidacao?: string;
  observacoesInternas?: string; // Confidencial: NÃO exibido para o discente
  historicoStatus: HistoricoStatusPlaca[];
  criadoEm?: string;
  atualizadoEm: string;
}

export type TipoAcaoPontos =
  | "presenca_aula"
  | "aula_presenca"
  | "revisao_flashcards_diaria"
  | "flashcard_revisao_diaria"
  | "manutencao_streak"
  | "conclusao_modulo"
  | "modulo_concluido"
  | "avaliacao_pratica_aprovada"
  | "atividade_entregue"
  | "marco_nivel_operacional"
  | "conquista_especial";

export interface EventoPontos {
  id: string;
  alunoId: string;
  alunoNome?: string;
  tipoAcao: TipoAcaoPontos;
  pontos: number;
  origemId?: string; // Garante idempotência: ex: aula-001, atv-001, mod-001, srs-2026-10-18
  referenciaId?: string;
  descricao: string;
  dataHora?: string;
  criadoEm?: string;
}

export interface ConfigPontosAcao {
  pontosPorAulaPresenca: number; // padrão: 50
  pontosPorAtividadeEntregue: number; // padrão: 30
  pontosPorModuloConcluido: number; // padrão: 100
  pontosPorRevisaoDiariaFlashcards: number; // padrão: 10
}

export type TipoNotificacaoInterna =
  | "conquista"
  | "conquista_desbloqueada"
  | "feedback_publicacao"
  | "comentario_recebido"
  | "comunicado_fixado"
  | "resultado_denuncia"
  | "status_placa"
  | "placa_status";

export interface NotificacaoInterna {
  id: string;
  destinatarioId?: string; // alunoId ou "admin"
  usuarioId?: string;
  tipo: TipoNotificacaoInterna;
  titulo: string;
  mensagem: string;
  linkDestino?: string;
  lida: boolean;
  criadaEm?: string;
  criadoEm?: string;
}

export interface MetricasComunidadeAdmin {
  totalEspacosAtivos: number;
  totalPublicacoes: number;
  totalComentarios?: number;
  totalReacoes?: number;
  publicacoesFixadas?: number;
  denunciasPendentes: number;
  oportunidadesAbertas: number;
  interessesPendentes: number;
}

export interface MetricasGamificacaoAdmin {
  totalModelosAtivos: number;
  totalConquistasDesbloqueadas: number;
  placasEmProducao: number;
  placasEntregues: number;
  totalPontosDistribuidos: number;
  conquistasConcedidasTotal?: number;
  alunosReconhecidosCount?: number;
  placasDigitaisLiberadas?: number;
  interessesPlacaFisica?: number;
  placasEnviadas?: number;
}

// =============================================================================
// ETAPA 10.2C1 — FUNDAÇÃO DE CONTAS DE ACESSO E CONVITES
// =============================================================================

export type TipoAcessoUsuario = "aluno" | "professor";

export type StatusAcessoUsuario =
  | "processando"
  | "convite_pendente"
  | "ativo"
  | "bloqueado"
  | "erro";

export interface AcessoUsuario {
  id: string;
  alunoId?: string;
  professorId?: string;
  perfilId?: string;
  emailNormalizado: string;
  tipo: TipoAcessoUsuario;
  status: StatusAcessoUsuario;
  convidadoPor?: string;
  conviteEnviadoEm?: string;
  acessoAtivadoEm?: string;
  ultimoErroInterno?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConviteAcessoRequest {
  tipo: TipoAcessoUsuario;
  id: string;
}

export interface ConviteAcessoResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  acessoId?: string;
}


