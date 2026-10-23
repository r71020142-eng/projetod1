import {
  ModeloConquista,
  ConquistaConcedida,
  SolicitacaoPlacaFisica,
  StatusPlacaFisica,
  EventoPontos,
  TipoAcaoPontos,
  NotificacaoInterna,
  MetricasGamificacaoAdmin,
  OperationResult,
} from "../types";
import {
  SEED_MODELOS_CONQUISTAS,
  SEED_CONQUISTAS_CONCEDIDAS,
  SEED_SOLICITACOES_PLACAS,
  SEED_EVENTOS_PONTOS,
  SEED_NOTIFICACOES_INTERNAS,
} from "./mockData";
import {
  TABELA_PONTOS_PADRAO,
  calcularPontosTotaisAluno,
  gerarCodigoValidacaoPlaca,
  ContextoAvaliacaoConquistas,
  atendeCriterioConquista,
} from "./gamificacaoMotor";

const STORAGE_MODELOS = "mtd_demonstrativo_modelos_conquistas_v1";
const STORAGE_CONCEDIDAS = "mtd_demonstrativo_conquistas_concedidas_v1";
const STORAGE_PLACAS = "mtd_demonstrativo_solicitacoes_placas_v1";
const STORAGE_EVENTOS_PONTOS = "mtd_demonstrativo_eventos_pontos_v1";
const STORAGE_NOTIFICACOES = "mtd_demonstrativo_notificacoes_v1";

function loadFromStorage<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch (err) {
    console.error(`Erro ao carregar storage (${key}):`, err);
    return seed;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: key } })
    );
  } catch (err) {
    console.error(`Erro ao salvar storage (${key}):`, err);
  }
}

export const gamificacaoLocalStorageRepository = {
  // ==========================================
  // MODELOS DE CONQUISTAS (CATÁLOGO)
  // ==========================================

  async listarModelos(status?: string): Promise<ModeloConquista[]> {
    const modelos = loadFromStorage<ModeloConquista>(STORAGE_MODELOS, SEED_MODELOS_CONQUISTAS);
    if (status && status !== "todos") {
      return modelos
        .filter((m) => m.status === status)
        .sort((a, b) => (a.ordemExibicao || 0) - (b.ordemExibicao || 0));
    }
    return modelos.sort((a, b) => (a.ordemExibicao || 0) - (b.ordemExibicao || 0));
  },

  async obterModeloPorId(id: string): Promise<ModeloConquista | null> {
    const modelos = loadFromStorage<ModeloConquista>(STORAGE_MODELOS, SEED_MODELOS_CONQUISTAS);
    return modelos.find((m) => m.id === id) || null;
  },

  async salvarModelo(
    dados: Partial<ModeloConquista> & { nome: string; descricao: string }
  ): Promise<OperationResult<ModeloConquista>> {
    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O título da conquista deve ter pelo menos 3 caracteres." };
    }

    const modelos = loadFromStorage<ModeloConquista>(STORAGE_MODELOS, SEED_MODELOS_CONQUISTAS);
    const agora = new Date().toISOString();

    if (dados.id) {
      const idx = modelos.findIndex((m) => m.id === dados.id);
      if (idx === -1) {
        return { success: false, error: "Modelo de conquista não encontrado para edição." };
      }
      const atualizado: ModeloConquista = {
        ...modelos[idx],
        ...dados,
        atualizadoEm: agora,
      };
      modelos[idx] = atualizado;
      saveToStorage(STORAGE_MODELOS, modelos);
      return { success: true, data: atualizado };
    }

    const novo: ModeloConquista = {
      id: `mod-conq-${String(modelos.length + 1).padStart(3, "0")}`,
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      categoria: dados.categoria || "avaliacoes_progresso",
      icone: dados.icone || "Award",
      tipoCriterio: dados.tipoCriterio || "modulos_concluidos",
      metaValor: dados.metaValor || 1,
      nivelRequerido: dados.nivelRequerido,
      tipoPremio: dados.tipoPremio || "badge",
      pontosRecompensa: Number(dados.pontosRecompensa) || 50,
      elegivelPlacaFisica: Boolean(dados.elegivelPlacaFisica),
      status: dados.status || "ativa",
      ordemExibicao: dados.ordemExibicao || modelos.length + 1,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    modelos.push(novo);
    saveToStorage(STORAGE_MODELOS, modelos);
    return { success: true, data: novo };
  },

  // ==========================================
  // CONQUISTAS CONCEDIDAS AOS ALUNOS
  // ==========================================

  async listarConquistasAluno(alunoId: string): Promise<ConquistaConcedida[]> {
    const concedidas = loadFromStorage<ConquistaConcedida>(
      STORAGE_CONCEDIDAS,
      SEED_CONQUISTAS_CONCEDIDAS
    );
    return concedidas
      .filter((c) => c.alunoId === alunoId)
      .sort((a, b) => {
        const dataB = new Date(b.dataConcessao || b.concedidaEm || 0).getTime();
        const dataA = new Date(a.dataConcessao || a.concedidaEm || 0).getTime();
        return dataB - dataA;
      });
  },

  async listarTodasConcedidas(): Promise<ConquistaConcedida[]> {
    const concedidas = loadFromStorage<ConquistaConcedida>(
      STORAGE_CONCEDIDAS,
      SEED_CONQUISTAS_CONCEDIDAS
    );
    return concedidas.sort((a, b) => {
      const dataB = new Date(b.dataConcessao || b.concedidaEm || 0).getTime();
      const dataA = new Date(a.dataConcessao || a.concedidaEm || 0).getTime();
      return dataB - dataA;
    });
  },

  async concederConquistaManual(dados: {
    modeloId: string;
    alunoId: string;
    alunoNome: string;
    professorId: string;
    professorNome: string;
    justificativaDocente: string;
  }): Promise<OperationResult<ConquistaConcedida>> {
    if (!dados.justificativaDocente || dados.justificativaDocente.trim().length < 10) {
      return {
        success: false,
        error: "A concessão manual exige uma justificativa pedagógica com no mínimo 10 caracteres.",
      };
    }

    const modelos = loadFromStorage<ModeloConquista>(STORAGE_MODELOS, SEED_MODELOS_CONQUISTAS);
    const modelo = modelos.find((m) => m.id === dados.modeloId);
    if (!modelo) {
      return { success: false, error: "Modelo de conquista não encontrado." };
    }

    const concedidas = loadFromStorage<ConquistaConcedida>(
      STORAGE_CONCEDIDAS,
      SEED_CONQUISTAS_CONCEDIDAS
    );
    const jaConcedida = concedidas.some(
      (c) => c.modeloId === dados.modeloId && c.alunoId === dados.alunoId
    );
    if (jaConcedida) {
      return { success: false, error: "Este aluno já possui esta conquista concedida." };
    }

    const agora = new Date().toISOString();
    const codigoValidacao = modelo.tipoPremio === "placa_digital" || modelo.tipoPremio === "placa_fisica"
      ? gerarCodigoValidacaoPlaca(dados.alunoId, modelo.nome)
      : undefined;

    const nova: ConquistaConcedida = {
      id: `conq-${dados.alunoId}-${Date.now()}`,
      modeloId: modelo.id,
      modeloNome: modelo.nome,
      categoria: modelo.categoria,
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      dataConcessao: agora,
      concedidoPor: "professor",
      professorId: dados.professorId,
      professorNome: dados.professorNome,
      justificativaDocente: dados.justificativaDocente.trim(),
      pontosAtribuidos: modelo.pontosRecompensa,
      tipoPremio: modelo.tipoPremio,
      codigoValidacaoDigital: codigoValidacao,
      status: "desbloqueada",
      visualizadaPeloAluno: false,
    };

    concedidas.push(nova);
    saveToStorage(STORAGE_CONCEDIDAS, concedidas);

    // Registra evento de pontos
    await this.registrarEventoPontos({
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      tipoAcao: "conquista_especial",
      pontos: modelo.pontosRecompensa,
      descricao: `Conquista desbloqueada: ${modelo.nome}`,
      referenciaId: nova.id,
    });

    // Cria notificação interna para o aluno
    await this.criarNotificacao({
      usuarioId: dados.alunoId,
      tipo: "conquista_desbloqueada",
      titulo: "Nova conquista concedida pelo professor!",
      mensagem: `Você recebeu o reconhecimento "${modelo.nome}" (+${modelo.pontosRecompensa} pontos).`,
      linkDestino: `/aluno/conquistas/${modelo.id}`,
    });

    return { success: true, data: nova };
  },

  /**
   * Avalia e desbloqueia conquistas automáticas para um discente com base no contexto.
   */
  async verificarEConcederAutomaticas(
    contexto: ContextoAvaliacaoConquistas,
    alunoNome: string
  ): Promise<ConquistaConcedida[]> {
    const modelos = loadFromStorage<ModeloConquista>(STORAGE_MODELOS, SEED_MODELOS_CONQUISTAS);
    const concedidas = loadFromStorage<ConquistaConcedida>(
      STORAGE_CONCEDIDAS,
      SEED_CONQUISTAS_CONCEDIDAS
    );

    const modelosAtivos = modelos.filter((m) => m.status === "ativa");
    const recemDesbloqueadas: ConquistaConcedida[] = [];

    for (const mod of modelosAtivos) {
      // Ignora as que já foram concedidas a este aluno
      const jaTem = concedidas.some((c) => c.modeloId === mod.id && c.alunoId === contexto.alunoId);
      if (jaTem) continue;

      const avaliacao = atendeCriterioConquista(mod, contexto);
      if (avaliacao.elegivel) {
        const agora = new Date().toISOString();
        const codigoValidacao =
          mod.tipoPremio === "placa_digital" || mod.tipoPremio === "placa_fisica"
            ? gerarCodigoValidacaoPlaca(contexto.alunoId, mod.nome)
            : undefined;

        const nova: ConquistaConcedida = {
          id: `conq-${contexto.alunoId}-${Date.now()}-${mod.id}`,
          modeloId: mod.id,
          modeloNome: mod.nome,
          categoria: mod.categoria,
          alunoId: contexto.alunoId,
          alunoNome,
          dataConcessao: agora,
          concedidoPor: "sistema",
          pontosAtribuidos: mod.pontosRecompensa,
          tipoPremio: mod.tipoPremio,
          codigoValidacaoDigital: codigoValidacao,
          status: "desbloqueada",
          visualizadaPeloAluno: false,
        };

        concedidas.push(nova);
        recemDesbloqueadas.push(nova);

        // Pontos
        await this.registrarEventoPontos({
          alunoId: contexto.alunoId,
          alunoNome,
          tipoAcao: mod.categoria === "nivel_marco" ? "marco_nivel_operacional" : "conquista_especial",
          pontos: mod.pontosRecompensa,
          descricao: `Conquista desbloqueada: ${mod.nome}`,
          referenciaId: nova.id,
        });

        // Notificação
        await this.criarNotificacao({
          usuarioId: contexto.alunoId,
          tipo: "conquista_desbloqueada",
          titulo: "Nova conquista desbloqueada!",
          mensagem: `Parabéns! Você alcançou o marco "${mod.nome}" (+${mod.pontosRecompensa} pontos).`,
          linkDestino: `/aluno/conquistas/${mod.id}`,
        });
      }
    }

    if (recemDesbloqueadas.length > 0) {
      saveToStorage(STORAGE_CONCEDIDAS, concedidas);
    }

    return recemDesbloqueadas;
  },

  // ==========================================
  // EVENTOS E PONTOS
  // ==========================================

  async registrarEventoPontos(dados: {
    alunoId: string;
    alunoNome: string;
    tipoAcao: TipoAcaoPontos;
    pontos?: number;
    descricao?: string;
    referenciaId?: string;
  }): Promise<EventoPontos> {
    const eventos = loadFromStorage<EventoPontos>(STORAGE_EVENTOS_PONTOS, SEED_EVENTOS_PONTOS);
    const regraPadrao = TABELA_PONTOS_PADRAO[dados.tipoAcao];

    const pontos = Number(dados.pontos ?? regraPadrao?.pontos ?? 10);
    const descricao = dados.descricao || regraPadrao?.descricao || "Pontos por dedicação no Método Paulo";

    const novoEvento: EventoPontos = {
      id: `ev-pts-${Date.now()}-${eventos.length + 1}`,
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      tipoAcao: dados.tipoAcao,
      pontos,
      descricao,
      referenciaId: dados.referenciaId,
      criadoEm: new Date().toISOString(),
    };

    eventos.push(novoEvento);
    saveToStorage(STORAGE_EVENTOS_PONTOS, eventos);
    return novoEvento;
  },

  async obterPontosAluno(alunoId: string): Promise<{
    pontosTotais: number;
    historicoEventos: EventoPontos[];
  }> {
    const eventos = loadFromStorage<EventoPontos>(STORAGE_EVENTOS_PONTOS, SEED_EVENTOS_PONTOS);
    const eventosAluno = eventos
      .filter((e) => e.alunoId === alunoId)
      .sort((a, b) => new Date(b.criadoEm || b.dataHora || 0).getTime() - new Date(a.criadoEm || a.dataHora || 0).getTime());

    const pontosTotais = calcularPontosTotaisAluno(eventos, alunoId);
    return { pontosTotais, historicoEventos: eventosAluno };
  },

  // ==========================================
  // PLACAS FÍSICAS (SOLICITAÇÕES E GESTÃO)
  // ==========================================

  async listarSolicitacoesPlacas(alunoId?: string): Promise<SolicitacaoPlacaFisica[]> {
    const placas = loadFromStorage<SolicitacaoPlacaFisica>(STORAGE_PLACAS, SEED_SOLICITACOES_PLACAS);
    if (alunoId) {
      // Sanitização: aluno não vê observações internas da equipe
      return placas
        .filter((p) => p.alunoId === alunoId)
        .map((p) => {
          const copia = { ...p };
          delete copia.observacoesInternas;
          return copia;
        })
        .sort((a, b) => new Date(b.dataSolicitacao || b.criadoEm || 0).getTime() - new Date(a.dataSolicitacao || a.criadoEm || 0).getTime());
    }
    return placas.sort((a, b) => new Date(b.dataSolicitacao || b.criadoEm || 0).getTime() - new Date(a.dataSolicitacao || a.criadoEm || 0).getTime());
  },

  async obterSolicitacaoPlacaPorId(
    id: string,
    paraAluno = false
  ): Promise<SolicitacaoPlacaFisica | null> {
    const placas = loadFromStorage<SolicitacaoPlacaFisica>(STORAGE_PLACAS, SEED_SOLICITACOES_PLACAS);
    const placa = placas.find((p) => p.id === id);
    if (!placa) return null;

    if (paraAluno) {
      const copia = { ...placa };
      delete copia.observacoesInternas;
      return copia;
    }
    return placa;
  },

  /**
   * Registro de interesse na placa física pelo aluno elegível.
   * Não coleta endereço sensível no localStorage (processo de contato humano offline).
   */
  async registrarInteressePlacaFisica(dados: {
    alunoId: string;
    alunoNome: string;
    conquistaId: string;
    conquistaNome: string;
    nivelMarco?: string;
  }): Promise<OperationResult<SolicitacaoPlacaFisica>> {
    const concedidas = loadFromStorage<ConquistaConcedida>(
      STORAGE_CONCEDIDAS,
      SEED_CONQUISTAS_CONCEDIDAS
    );

    // Validação de elegibilidade: o aluno DEVE ter a conquista desbloqueada
    const temConquista = concedidas.some(
      (c) =>
        c.alunoId === dados.alunoId &&
        (c.modeloId === dados.conquistaId || c.modeloNome === dados.conquistaNome)
    );
    if (!temConquista) {
      return {
        success: false,
        error: "Você precisa primeiro desbloquear este marco pedagógico para se tornar elegível à placa de reconhecimento.",
      };
    }

    const placas = loadFromStorage<SolicitacaoPlacaFisica>(STORAGE_PLACAS, SEED_SOLICITACOES_PLACAS);
    const jaSolicitou = placas.some(
      (p) => p.alunoId === dados.alunoId && p.conquistaId === dados.conquistaId && p.status !== "cancelado"
    );
    if (jaSolicitou) {
      return {
        success: false,
        error: "Você já possui uma solicitação ativa para esta placa física. Acompanhe o status nesta tela.",
      };
    }

    const agora = new Date().toISOString();
    const codigoValidacao = gerarCodigoValidacaoPlaca(dados.alunoId, dados.conquistaNome);
    const novoId = `sol-plk-${String(placas.length + 1).padStart(3, "0")}`;

    const nova: SolicitacaoPlacaFisica = {
      id: novoId,
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      conquistaId: dados.conquistaId,
      conquistaNome: dados.conquistaNome,
      nivelMarco: dados.nivelMarco,
      dataSolicitacao: agora,
      status: "interesse_registrado",
      codigoValidacao,
      historicoStatus: [
        {
          status: "elegivel",
          dataHora: agora,
          responsavelNome: "Sistema Pedagógico MTD",
          observacao: "Aluno atingiu todos os requisitos de elegibilidade para a placa de reconhecimento.",
        },
        {
          status: "interesse_registrado",
          dataHora: agora,
          responsavelNome: `${dados.alunoNome} (Aluno)`,
          observacao: "Interesse manifestado pelo discente através do portal.",
        },
      ],
      atualizadoEm: agora,
    };

    placas.push(nova);
    saveToStorage(STORAGE_PLACAS, placas);

    // Cria notificação para o aluno
    await this.criarNotificacao({
      usuarioId: dados.alunoId,
      tipo: "placa_status",
      titulo: "Interesse na Placa de Reconhecimento registrado!",
      mensagem: "Recebemos sua manifestação de interesse. Nossa equipe pedagógica entrará em contato para confirmar detalhes e disponibilidade logística.",
      linkDestino: "/aluno/conquistas",
    });

    return { success: true, data: nova };
  },

  async atualizarStatusPlacaFisica(
    solicitacaoId: string,
    novoStatus: StatusPlacaFisica,
    responsavelNome: string,
    observacao?: string,
    codigoRastreio?: string,
    observacoesInternas?: string
  ): Promise<OperationResult<SolicitacaoPlacaFisica>> {
    const placas = loadFromStorage<SolicitacaoPlacaFisica>(STORAGE_PLACAS, SEED_SOLICITACOES_PLACAS);
    const idx = placas.findIndex((p) => p.id === solicitacaoId);
    if (idx === -1) {
      return { success: false, error: "Solicitação de placa não encontrada." };
    }

    const placa = placas[idx];
    const agora = new Date().toISOString();

    placa.status = novoStatus;
    if (codigoRastreio) {
      placa.codigoRastreio = codigoRastreio.trim();
    }
    if (observacoesInternas) {
      placa.observacoesInternas = observacoesInternas.trim();
    }

    placa.historicoStatus = placa.historicoStatus || [];
    placa.historicoStatus.push({
      status: novoStatus,
      dataHora: agora,
      responsavelNome,
      observacao: observacao?.trim(),
    });
    placa.atualizadoEm = agora;

    saveToStorage(STORAGE_PLACAS, placas);

    // Notificação ao aluno
    const labelsStatus: Record<StatusPlacaFisica, string> = {
      elegivel: "Elegível",
      interesse_registrado: "Interesse Registrado",
      solicitada: "Solicitada",
      em_analise: "Em Análise pela Coordenação",
      aprovado: "Aprovado para Fabricação",
      aprovada: "Aprovada para Fabricação",
      em_producao: "Em Processo de Gravação a Laser",
      pronta: "Pronta",
      enviado: "Enviado para Entrega",
      enviada: "Enviada para Entrega",
      entregue: "Entregue ao Aluno",
      rejeitada: "Rejeitada pela Coordenação",
      cancelado: "Cancelado",
    };

    await this.criarNotificacao({
      usuarioId: placa.alunoId,
      tipo: "placa_status",
      titulo: `Atualização da sua Placa: ${labelsStatus[novoStatus]}`,
      mensagem: observacao || `Sua placa de reconhecimento agora está com o status: ${labelsStatus[novoStatus]}.`,
      linkDestino: "/aluno/conquistas",
    });

    return { success: true, data: placa };
  },

  // ==========================================
  // NOTIFICAÇÕES INTERNAS
  // ==========================================

  async criarNotificacao(dados: {
    usuarioId: string;
    tipo: import("../types").TipoNotificacaoInterna;
    titulo: string;
    mensagem: string;
    linkDestino?: string;
  }): Promise<NotificacaoInterna> {
    const notifs = loadFromStorage<NotificacaoInterna>(
      STORAGE_NOTIFICACOES,
      SEED_NOTIFICACOES_INTERNAS
    );
    const nova: NotificacaoInterna = {
      id: `notif-${Date.now()}-${notifs.length + 1}`,
      usuarioId: dados.usuarioId,
      tipo: dados.tipo,
      titulo: dados.titulo.trim(),
      mensagem: dados.mensagem.trim(),
      linkDestino: dados.linkDestino,
      lida: false,
      criadoEm: new Date().toISOString(),
    };

    notifs.unshift(nova);
    saveToStorage(STORAGE_NOTIFICACOES, notifs);
    return nova;
  },

  async listarNotificacoes(
    usuarioId: string,
    apenasNaoLidas = false
  ): Promise<NotificacaoInterna[]> {
    const notifs = loadFromStorage<NotificacaoInterna>(
      STORAGE_NOTIFICACOES,
      SEED_NOTIFICACOES_INTERNAS
    );
    let filtradas = notifs.filter((n) => n.usuarioId === usuarioId);
    if (apenasNaoLidas) {
      filtradas = filtradas.filter((n) => !n.lida);
    }
    return filtradas.sort(
      (a, b) =>
        new Date(b.criadoEm || b.criadaEm || 0).getTime() -
        new Date(a.criadoEm || a.criadaEm || 0).getTime()
    );
  },

  async marcarNotificacaoComoLida(id: string): Promise<OperationResult<boolean>> {
    const notifs = loadFromStorage<NotificacaoInterna>(
      STORAGE_NOTIFICACOES,
      SEED_NOTIFICACOES_INTERNAS
    );
    const notif = notifs.find((n) => n.id === id);
    if (!notif) {
      return { success: false, error: "Notificação não encontrada." };
    }
    notif.lida = true;
    saveToStorage(STORAGE_NOTIFICACOES, notifs);
    return { success: true, data: true };
  },

  async marcarTodasComoLidas(usuarioId: string): Promise<OperationResult<boolean>> {
    const notifs = loadFromStorage<NotificacaoInterna>(
      STORAGE_NOTIFICACOES,
      SEED_NOTIFICACOES_INTERNAS
    );
    for (const n of notifs) {
      if (n.usuarioId === usuarioId) {
        n.lida = true;
      }
    }
    saveToStorage(STORAGE_NOTIFICACOES, notifs);
    return { success: true, data: true };
  },

  // ==========================================
  // MÉTRICAS ADMINISTRATIVAS DE GAMIFICAÇÃO
  // ==========================================

  async obterMetricasAdmin(): Promise<MetricasGamificacaoAdmin> {
    const modelos = loadFromStorage<ModeloConquista>(STORAGE_MODELOS, SEED_MODELOS_CONQUISTAS);
    const concedidas = loadFromStorage<ConquistaConcedida>(
      STORAGE_CONCEDIDAS,
      SEED_CONQUISTAS_CONCEDIDAS
    );
    const placas = loadFromStorage<SolicitacaoPlacaFisica>(STORAGE_PLACAS, SEED_SOLICITACOES_PLACAS);
    const eventos = loadFromStorage<EventoPontos>(STORAGE_EVENTOS_PONTOS, SEED_EVENTOS_PONTOS);

    const totalPontosDistribuidos = eventos.reduce((acc, e) => acc + (e.pontos || 0), 0);

    return {
      totalModelosAtivos: modelos.filter((m) => m.status === "ativa").length,
      totalConquistasDesbloqueadas: concedidas.length,
      placasEmProducao: placas.filter((p) => p.status === "em_producao").length,
      placasEntregues: placas.filter((p) => p.status === "entregue").length,
      totalPontosDistribuidos,
    };
  },
};
