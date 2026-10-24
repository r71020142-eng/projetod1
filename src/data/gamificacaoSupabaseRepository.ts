import {
  ModeloConquista,
  ConquistaConcedida,
  SolicitacaoPlacaFisica,
  EventoPontos,
  NotificacaoInterna,
  MetricasGamificacaoAdmin,
  OperationResult,
  CategoriaConquista,
  TipoCriterioConquista,
  TipoPremioConquista,
  StatusPlacaFisica,
  TipoAcaoPontos,
  TipoNotificacaoInterna,
  StatusModeloConquista,
  StatusConquistaConcedida,
} from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TABELA_PONTOS_PADRAO,
  ContextoAvaliacaoConquistas,
  atendeCriterioConquista,
} from "./gamificacaoMotor";

interface ModeloDbRow {
  id: string;
  nome: string;
  titulo: string | null;
  descricao: string;
  icone: string;
  cor: string;
  categoria: string;
  tipo_criterio: string;
  tipo_marco: string | null;
  tipo_premio: string;
  regra_criterio: Record<string, unknown>;
  pontos_recompensa: number;
  habilitar_placa_fisica: boolean;
  elegivel_placa_fisica: boolean;
  ordem: number;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ConcedidaDbRow {
  id: string;
  aluno_id: string;
  aluno_nome: string | null;
  modelo_id: string;
  modelo_nome: string | null;
  categoria: string | null;
  tipo_premio: string | null;
  origem: string | null;
  pontos_atribuidos: number;
  concedido_por: string | null;
  professor_id: string | null;
  professor_nome: string | null;
  justificativa_docente: string | null;
  status: string;
  notificada: boolean;
  concedida_em: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface PlacaDbRow {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  conquista_id: string;
  conquista_nome: string | null;
  nivel_marco: string | null;
  nome_gravacao: string | null;
  endereco_entrega: Record<string, unknown>;
  status: string;
  codigo_rastreio: string | null;
  codigo_validacao: string | null;
  motivo_rejeicao: string | null;
  observacoes_internas: string | null;
  historico_status: Record<string, unknown>[];
  metadata: Record<string, unknown> | null;
  solicitada_em: string;
  atualizada_em: string;
}

interface EventoPontosDbRow {
  id: string;
  aluno_id: string;
  aluno_nome: string | null;
  tipo_acao: string;
  pontos: number;
  origem_id: string | null;
  descricao: string;
  created_at: string;
}

interface NotificacaoDbRow {
  id: string;
  usuario_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link: string | null;
  created_at: string;
}

function getSupabase(clientOverride?: SupabaseClient): SupabaseClient {
  if (clientOverride) return clientOverride;
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Gamificação] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client as unknown as SupabaseClient;
}

function mapRowToModelo(row: ModeloDbRow): ModeloConquista {
  return {
    id: row.id,
    nome: row.nome || row.titulo || "Conquista MTD",
    descricao: row.descricao,
    categoria: row.categoria as CategoriaConquista,
    icone: row.icone,
    cor: row.cor,
    tipoCriterio: row.tipo_criterio as TipoCriterioConquista,
    tipoPremio: row.tipo_premio as TipoPremioConquista,
    pontosRecompensa: row.pontos_recompensa,
    elegivelPlacaFisica: row.elegivel_placa_fisica ?? row.habilitar_placa_fisica ?? false,
    ordem: row.ordem,
    ordemExibicao: row.ordem,
    status: (row.status || "ativo") as StatusModeloConquista,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function mapRowToConcedida(row: ConcedidaDbRow): ConquistaConcedida {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome || undefined,
    modeloId: row.modelo_id,
    modeloNome: row.modelo_nome || "Conquista MTD",
    categoria: (row.categoria || "especial") as CategoriaConquista,
    tipoPremio: (row.tipo_premio || "digital") as TipoPremioConquista,
    origem: row.origem || undefined,
    status: (row.status || "concedida") as StatusConquistaConcedida,
    concedidoPor: row.concedido_por || undefined,
    professorId: row.professor_id || undefined,
    professorNome: row.professor_nome || undefined,
    justificativaDocente: row.justificativa_docente || undefined,
    pontosAtribuidos: row.pontos_atribuidos || 0,
    visualizadaPeloAluno: row.notificada,
    concedidaEm: row.concedida_em || row.created_at,
    dataConcessao: row.concedida_em || row.created_at,
  };
}

function mapRowToPlaca(row: PlacaDbRow): SolicitacaoPlacaFisica {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome,
    conquistaId: row.conquista_id,
    conquistaNome: row.conquista_nome || undefined,
    nivelMarco: row.nivel_marco || undefined,
    nomeParaGravacao: row.nome_gravacao || undefined,
    status: (row.status || "solicitada") as StatusPlacaFisica,
    dataSolicitacao: row.solicitada_em,
    dataInteresse: row.solicitada_em,
    codigoRastreio: row.codigo_rastreio || undefined,
    codigoValidacao: row.codigo_validacao || undefined,
    codigoAutenticidade: row.codigo_validacao || undefined,
    observacoesInternas: row.observacoes_internas || undefined,
    historicoStatus: Array.isArray(row.historico_status)
      ? (row.historico_status as unknown as SolicitacaoPlacaFisica["historicoStatus"])
      : [],
    criadoEm: row.solicitada_em,
    atualizadoEm: row.atualizada_em,
  };
}

export const gamificacaoSupabaseRepository = {
  // ==========================================
  // MODELOS DE CONQUISTAS
  // ==========================================

  async listarModelos(status?: string, clientOverride?: SupabaseClient): Promise<ModeloConquista[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase.from("modelos_conquistas").select("*");

    if (status && status !== "todos") {
      query = query.in("status", [status, status === "ativa" ? "ativo" : status]);
    }

    const { data, error } = await query
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao listar modelos de conquistas: ${error.message}`);
    }

    return ((data || []) as ModeloDbRow[]).map(mapRowToModelo);
  },

  async obterModeloPorId(id: string, clientOverride?: SupabaseClient): Promise<ModeloConquista | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("modelos_conquistas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao obter modelo de conquista ${id}: ${error.message}`);
    }
    if (!data) return null;

    return mapRowToModelo(data as ModeloDbRow);
  },

  async salvarModelo(
    dados: Partial<ModeloConquista> & {
      nome: string;
      descricao: string;
      categoria: CategoriaConquista;
      tipoCriterio: TipoCriterioConquista;
      tipoPremio: TipoPremioConquista;
      icone: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<ModeloConquista>> {
    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O título da conquista deve conter pelo menos 3 caracteres." };
    }

    try {
      const supabase = getSupabase(clientOverride);
      const modeloId = dados.id || `mod-conq-${Date.now()}`;
      const payload = {
        id: modeloId,
        nome: dados.nome.trim(),
        titulo: dados.nome.trim(),
        descricao: dados.descricao.trim(),
        categoria: dados.categoria,
        icone: dados.icone,
        cor: dados.cor || "indigo",
        tipo_criterio: dados.tipoCriterio,
        tipo_premio: dados.tipoPremio,
        pontos_recompensa: dados.pontosRecompensa ?? 100,
        habilitar_placa_fisica: Boolean(dados.elegivelPlacaFisica),
        elegivel_placa_fisica: Boolean(dados.elegivelPlacaFisica),
        ordem: dados.ordem ?? 0,
        status: dados.status || "ativo",
        metadata: {},
      };

      const { data, error } = await supabase
        .from("modelos_conquistas")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao salvar modelo de conquista no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToModelo(data as ModeloDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao salvar modelo: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // CONQUISTAS CONCEDIDAS
  // ==========================================

  async listarConquistasAluno(alunoId: string, clientOverride?: SupabaseClient): Promise<ConquistaConcedida[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("conquistas_concedidas")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("concedida_em", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao listar conquistas do aluno ${alunoId}: ${error.message}`);
    }

    return ((data || []) as ConcedidaDbRow[]).map(mapRowToConcedida);
  },

  async listarTodasConcedidas(clientOverride?: SupabaseClient): Promise<ConquistaConcedida[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("conquistas_concedidas")
      .select("*")
      .order("concedida_em", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao listar todas as conquistas concedidas: ${error.message}`);
    }

    return ((data || []) as ConcedidaDbRow[]).map(mapRowToConcedida);
  },

  async concederConquistaManual(
    dados: {
      alunoId: string;
      alunoNome: string;
      modeloId: string;
      professorId?: string;
      professorNome?: string;
      justificativaDocente?: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<ConquistaConcedida>> {
    try {
      const supabase = getSupabase(clientOverride);
      const modelo = await this.obterModeloPorId(dados.modeloId, clientOverride);
      if (!modelo) {
        return { success: false, error: "Modelo de conquista não encontrado." };
      }

      const concedidaId = `conq-concedida-${Date.now()}`;
      const payload = {
        id: concedidaId,
        aluno_id: dados.alunoId,
        aluno_nome: dados.alunoNome,
        modelo_id: modelo.id,
        modelo_nome: modelo.nome,
        categoria: modelo.categoria,
        tipo_premio: modelo.tipoPremio,
        origem: "manual_professor",
        pontos_atribuidos: modelo.pontosRecompensa || 0,
        concedido_por: dados.professorNome || "Equipe Pedagógica MTD",
        professor_id: dados.professorId || null,
        professor_nome: dados.professorNome || null,
        justificativa_docente: dados.justificativaDocente || null,
        status: "concedida",
        notificada: false,
        metadata: {},
      };

      const { data, error } = await supabase
        .from("conquistas_concedidas")
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao conceder conquista no Supabase: ${error.message}`,
        };
      }

      // Atribui pontos
      if (modelo.pontosRecompensa && modelo.pontosRecompensa > 0) {
        await this.registrarEventoPontos(
          {
            alunoId: dados.alunoId,
            alunoNome: dados.alunoNome,
            tipoAcao: "conquista_especial",
            pontos: modelo.pontosRecompensa,
            referenciaId: concedidaId,
            descricao: `Conquista "${modelo.nome}" concedida`,
          },
          clientOverride
        ).catch(() => null);
      }

      // Notificação
      await this.criarNotificacao(
        {
          usuarioId: dados.alunoId,
          tipo: "conquista_desbloqueada",
          titulo: "Nova conquista concedida!",
          mensagem: `Você recebeu o reconhecimento "${modelo.nome}" (+${modelo.pontosRecompensa || 0} pontos).`,
          linkDestino: `/aluno/conquistas/${modelo.id}`,
        },
        clientOverride
      ).catch(() => null);

      return { success: true, data: mapRowToConcedida(data as ConcedidaDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao conceder conquista: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async verificarEConcederAutomaticas(
    contexto: ContextoAvaliacaoConquistas,
    alunoNome: string,
    clientOverride?: SupabaseClient
  ): Promise<ConquistaConcedida[]> {
    const [modelos, jaConcedidas] = await Promise.all([
      this.listarModelos("ativa", clientOverride),
      this.listarConquistasAluno(contexto.alunoId, clientOverride),
    ]);

    const jaConquistadosIds = new Set(jaConcedidas.map((c) => c.modeloId));
    const recemDesbloqueadas: ConquistaConcedida[] = [];

    for (const mod of modelos) {
      if (jaConquistadosIds.has(mod.id)) continue;

      const avaliacao = atendeCriterioConquista(mod, contexto);
      if (avaliacao.elegivel) {
        const res = await this.concederConquistaManual(
          {
            alunoId: contexto.alunoId,
            alunoNome,
            modeloId: mod.id,
            justificativaDocente: "Concedida automaticamente pelo sistema pedagógico.",
          },
          clientOverride
        );
        if (res.success && res.data) {
          recemDesbloqueadas.push(res.data);
        }
      }
    }

    return recemDesbloqueadas;
  },

  // ==========================================
  // PONTOS E RECOMPENSAS
  // ==========================================

  async registrarEventoPontos(
    dados: {
      alunoId: string;
      alunoNome: string;
      tipoAcao: TipoAcaoPontos;
      pontos?: number;
      descricao?: string;
      referenciaId?: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<EventoPontos> {
    const evId = `pts-${Date.now()}`;
    const regraPadrao = TABELA_PONTOS_PADRAO[dados.tipoAcao];
    const pts = dados.pontos ?? regraPadrao?.pontos ?? 10;
    const desc = dados.descricao || regraPadrao?.descricao || "Pontos atribuídos";
    const payload = {
      id: evId,
      aluno_id: dados.alunoId,
      aluno_nome: dados.alunoNome,
      tipo_acao: dados.tipoAcao,
      pontos: pts,
      origem_id: dados.referenciaId || null,
      descricao: desc,
    };

    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("eventos_pontos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`[Supabase Gamificação] Erro ao registrar evento de pontos: ${error.message}`);
    }

    const r = data as EventoPontosDbRow;
    return {
      id: r.id,
      alunoId: r.aluno_id,
      alunoNome: r.aluno_nome || undefined,
      tipoAcao: r.tipo_acao as TipoAcaoPontos,
      pontos: r.pontos,
      origemId: r.origem_id || undefined,
      descricao: r.descricao,
      dataHora: r.created_at,
      criadoEm: r.created_at,
    };
  },

  async obterPontosAluno(
    alunoId: string,
    clientOverride?: SupabaseClient
  ): Promise<{
    pontosTotais: number;
    historicoEventos: EventoPontos[];
  }> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("eventos_pontos")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao obter pontos do aluno ${alunoId}: ${error.message}`);
    }

    const historicoEventos: EventoPontos[] = ((data || []) as EventoPontosDbRow[]).map((r) => ({
      id: r.id,
      alunoId: r.aluno_id,
      alunoNome: r.aluno_nome || undefined,
      tipoAcao: r.tipo_acao as TipoAcaoPontos,
      pontos: r.pontos,
      origemId: r.origem_id || undefined,
      descricao: r.descricao,
      dataHora: r.created_at,
      criadoEm: r.created_at,
    }));

    const pontosTotais = historicoEventos.reduce((acc, h) => acc + (h.pontos || 0), 0);
    return { pontosTotais, historicoEventos };
  },

  // ==========================================
  // PLACAS FÍSICAS DE RECONHECIMENTO
  // ==========================================

  async listarSolicitacoesPlacas(alunoId?: string, clientOverride?: SupabaseClient): Promise<SolicitacaoPlacaFisica[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase.from("solicitacoes_placas").select("*");

    if (alunoId) {
      query = query.eq("aluno_id", alunoId);
    }

    const { data, error } = await query.order("solicitada_em", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao listar solicitações de placas: ${error.message}`);
    }

    return ((data || []) as PlacaDbRow[]).map(mapRowToPlaca);
  },

  async obterSolicitacaoPlacaPorId(id: string, clientOverride?: SupabaseClient): Promise<SolicitacaoPlacaFisica | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("solicitacoes_placas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao obter solicitação de placa ${id}: ${error.message}`);
    }
    if (!data) return null;

    return mapRowToPlaca(data as PlacaDbRow);
  },

  async registrarInteressePlacaFisica(
    dados: {
      alunoId: string;
      alunoNome: string;
      conquistaId: string;
      conquistaNome: string;
      nivelMarco?: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SolicitacaoPlacaFisica>> {
    try {
      const supabase = getSupabase(clientOverride);

      // Verifica se o aluno possui a conquista
      const { data: conquistas, error: conqErr } = await supabase
        .from("conquistas_concedidas")
        .select("*")
        .eq("aluno_id", dados.alunoId);

      const possui =
        !conqErr &&
        conquistas &&
        conquistas.some(
          (c: ConcedidaDbRow) => c.modelo_id === dados.conquistaId || c.modelo_nome === dados.conquistaNome
        );

      if (!possui) {
        return {
          success: false,
          error: "Você precisa primeiro desbloquear este marco pedagógico para se tornar elegível à placa de reconhecimento.",
        };
      }

      // Verifica se já solicitou
      const { data: placasExistentes } = await supabase
        .from("solicitacoes_placas")
        .select("*")
        .eq("aluno_id", dados.alunoId)
        .eq("conquista_id", dados.conquistaId)
        .neq("status", "cancelado");

      if (placasExistentes && placasExistentes.length > 0) {
        return {
          success: false,
          error: "Você já possui uma solicitação ativa para esta placa física. Acompanhe o status nesta tela.",
        };
      }

      const agora = new Date().toISOString();
      const solId = `sol-plk-${Date.now()}`;
      const codVal = `MTD-PLK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const historicoInicial = [
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
      ];

      const payload = {
        id: solId,
        aluno_id: dados.alunoId,
        aluno_nome: dados.alunoNome,
        conquista_id: dados.conquistaId,
        conquista_nome: dados.conquistaNome,
        nivel_marco: dados.nivelMarco || null,
        nome_gravacao: dados.alunoNome,
        endereco_entrega: {},
        status: "interesse_registrado",
        codigo_validacao: codVal,
        historico_status: historicoInicial,
        solicitada_em: agora,
        atualizada_em: agora,
        metadata: {},
      };

      const { data, error } = await supabase
        .from("solicitacoes_placas")
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao manifestar interesse na placa no Supabase: ${error.message}`,
        };
      }

      // Notificação
      await this.criarNotificacao(
        {
          usuarioId: dados.alunoId,
          tipo: "placa_status",
          titulo: "Interesse na Placa de Reconhecimento registrado!",
          mensagem:
            "Recebemos sua manifestação de interesse. Nossa equipe pedagógica entrará em contato para confirmar detalhes e disponibilidade logística.",
          linkDestino: "/aluno/conquistas",
        },
        clientOverride
      ).catch(() => null);

      return { success: true, data: mapRowToPlaca(data as PlacaDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao manifestar interesse: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async atualizarStatusPlacaFisica(
    solicitacaoId: string,
    novoStatus: StatusPlacaFisica,
    responsavelNome: string,
    observacao?: string,
    codigoRastreio?: string,
    observacoesInternas?: string,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SolicitacaoPlacaFisica>> {
    try {
      const supabase = getSupabase(clientOverride);
      const placaAtual = await this.obterSolicitacaoPlacaPorId(solicitacaoId, clientOverride);
      if (!placaAtual) {
        return { success: false, error: "Solicitação de placa não encontrada." };
      }

      const agora = new Date().toISOString();
      const novoHistorico = [
        ...(placaAtual.historicoStatus || []),
        {
          status: novoStatus,
          statusAnterior: placaAtual.status,
          statusNovo: novoStatus,
          responsavelNome,
          dataHora: agora,
          motivo: observacao || undefined,
          observacao: observacao || `Status atualizado para ${novoStatus}`,
          observacaoInterna: observacoesInternas || undefined,
        },
      ];

      const updates: Record<string, unknown> = {
        status: novoStatus,
        historico_status: novoHistorico,
        atualizada_em: agora,
      };

      if (codigoRastreio) updates.codigo_rastreio = codigoRastreio.trim();
      if (observacoesInternas) updates.observacoes_internas = observacoesInternas.trim();
      if (observacao && novoStatus === "rejeitada") updates.motivo_rejeicao = observacao.trim();

      const { data, error } = await supabase
        .from("solicitacoes_placas")
        .update(updates)
        .eq("id", solicitacaoId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao atualizar status da placa no Supabase: ${error.message}`,
        };
      }

      // Notificação ao aluno
      await this.criarNotificacao(
        {
          usuarioId: placaAtual.alunoId,
          tipo: "placa_status",
          titulo: `Atualização da sua Placa: ${novoStatus}`,
          mensagem: observacao || `Sua placa de reconhecimento agora está com o status: ${novoStatus}.`,
          linkDestino: "/aluno/conquistas",
        },
        clientOverride
      ).catch(() => null);

      return { success: true, data: mapRowToPlaca(data as PlacaDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao atualizar placa: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // NOTIFICAÇÕES INTERNAS
  // ==========================================

  async criarNotificacao(
    dados: {
      usuarioId: string;
      tipo: TipoNotificacaoInterna;
      titulo: string;
      mensagem: string;
      linkDestino?: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<NotificacaoInterna> {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const supabase = getSupabase(clientOverride);
    const payload = {
      id: notifId,
      usuario_id: dados.usuarioId,
      titulo: dados.titulo,
      mensagem: dados.mensagem,
      tipo: dados.tipo,
      link: dados.linkDestino || null,
      lida: false,
      metadata: {},
    };

    const { data, error } = await supabase
      .from("notificacoes_sistema")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`[Supabase Gamificação] Erro ao criar notificação: ${error.message}`);
    }

    const r = data as NotificacaoDbRow;
    return {
      id: r.id,
      usuarioId: r.usuario_id,
      tipo: r.tipo as TipoNotificacaoInterna,
      titulo: r.titulo,
      mensagem: r.mensagem,
      linkDestino: r.link || undefined,
      lida: r.lida,
      criadoEm: r.created_at,
    };
  },

  async listarNotificacoes(usuarioId: string, clientOverride?: SupabaseClient): Promise<NotificacaoInterna[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("notificacoes_sistema")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Gamificação] Falha ao listar notificações do usuário ${usuarioId}: ${error.message}`);
    }

    return ((data || []) as NotificacaoDbRow[]).map((r) => ({
      id: r.id,
      usuarioId: r.usuario_id,
      tipo: r.tipo as TipoNotificacaoInterna,
      titulo: r.titulo,
      mensagem: r.mensagem,
      linkDestino: r.link || undefined,
      lida: r.lida,
      criadoEm: r.created_at,
    }));
  },

  async marcarNotificacaoComoLida(id: string, clientOverride?: SupabaseClient): Promise<OperationResult<boolean>> {
    try {
      const supabase = getSupabase(clientOverride);
      const { error } = await supabase
        .from("notificacoes_sistema")
        .update({ lida: true })
        .eq("id", id);

      if (error) {
        return { success: false, error: `Erro ao marcar notificação como lida: ${error.message}` };
      }

      return { success: true, data: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao marcar notificação como lida: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async marcarTodasComoLidas(usuarioId: string, clientOverride?: SupabaseClient): Promise<OperationResult<boolean>> {
    try {
      const supabase = getSupabase(clientOverride);
      const { error } = await supabase
        .from("notificacoes_sistema")
        .update({ lida: true })
        .eq("usuario_id", usuarioId);

      if (error) {
        return { success: false, error: `Erro ao marcar todas notificações como lidas: ${error.message}` };
      }

      return { success: true, data: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao marcar todas notificações como lidas: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // MÉTRICAS ADMINISTRATIVAS
  // ==========================================

  async obterMetricasAdmin(clientOverride?: SupabaseClient): Promise<MetricasGamificacaoAdmin> {
    const supabase = getSupabase(clientOverride);
    const [modelos, concedidas, placas, pontosRes] = await Promise.all([
      this.listarModelos(undefined, clientOverride),
      this.listarTodasConcedidas(clientOverride),
      this.listarSolicitacoesPlacas(undefined, clientOverride),
      supabase.from("eventos_pontos").select("pontos"),
    ]);

    const totalModelosAtivos = modelos.filter((m) => m.status === "ativo" || m.status === "ativa").length;
    const totalConquistasDesbloqueadas = concedidas.length;
    const placasEmProducao = placas.filter((p) => p.status === "em_producao").length;
    const placasEntregues = placas.filter((p) => p.status === "entregue").length;
    const totalPontosDistribuidos = (pontosRes.data || []).reduce((acc: number, row: { pontos?: number }) => acc + (row.pontos || 0), 0);

    return {
      totalModelosAtivos,
      totalConquistasDesbloqueadas,
      placasEmProducao,
      placasEntregues,
      totalPontosDistribuidos,
    };
  },
};
