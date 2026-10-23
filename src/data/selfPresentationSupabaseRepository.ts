import {
  SelfPresentation,
  SelfPresentationFilters,
  OperationResult,
  AvaliacaoPedagogica,
  SolicitacaoReenvio,
  ConsentimentoUsoVideo,
  SelfPresentationsMetricasAdmin,
  Aluno,
  VersaoHistoricoSelfPresentation,
} from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { alunoRepository } from "./alunoRepository";
import { SupabaseClient } from "@supabase/supabase-js";

interface SelfPresentationDbRow {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  tipo: string;
  titulo: string;
  idioma_avaliado: string;
  link_video: string;
  data_gravacao: string;
  status: string;
  versao: number;
  consentimento?: ConsentimentoUsoVideo;
  consentimento_aceito?: boolean;
  consentimento_data_hora?: string;
  consentimento_versao_texto?: string;
  consentimento_ip_dispositivo?: string | null;
  observacao_aluno?: string | null;
  professor_avaliador_id?: string | null;
  professor_avaliador_nome?: string | null;
  avaliacao?: AvaliacaoPedagogica | null;
  solicitacao_reenvio?: SolicitacaoReenvio | null;
  historico_versoes?: import("@/types").VersaoHistoricoSelfPresentation[];
  created_at: string;
  updated_at: string;
}

function mapRowToSelfPresentation(row: SelfPresentationDbRow): SelfPresentation {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome,
    tipo: row.tipo as SelfPresentation["tipo"],
    titulo: row.titulo,
    idiomaAvaliado: row.idioma_avaliado || "Inglês",
    linkVideo: row.link_video,
    dataGravacao: row.data_gravacao,
    status: row.status as SelfPresentation["status"],
    versao: row.versao || 1,
    consentimento: row.consentimento || {
      aceito: row.consentimento_aceito ?? false,
      dataHora: row.consentimento_data_hora || row.created_at,
      versaoTexto: row.consentimento_versao_texto || "v1.0",
    },
    observacaoAluno: row.observacao_aluno || undefined,
    professorAvaliadorId: row.professor_avaliador_id || undefined,
    professorAvaliadorNome: row.professor_avaliador_nome || undefined,
    avaliacao: row.avaliacao || undefined,
    solicitacaoReenvio: row.solicitacao_reenvio || undefined,
    historicoVersoes: row.historico_versoes || [],
    nivelAplicadoAoPerfil: (row.avaliacao as (AvaliacaoPedagogica & { nivelAplicadoAoPerfil?: boolean }) | undefined)?.nivelAplicadoAoPerfil ?? false,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function getSupabase(clientOverride?: SupabaseClient) {
  return clientOverride || (createBrowserSupabaseClient() as unknown as SupabaseClient);
}

const isUuid = (val?: string | null) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export const selfPresentationSupabaseRepository = {
  async listar(filters?: SelfPresentationFilters, clientOverride?: SupabaseClient): Promise<SelfPresentation[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase.from("self_presentations").select("*");

    if (filters) {
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
      }
      if (filters.tipo && filters.tipo !== "todos") {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters.professorId && filters.professorId !== "todos") {
        query = query.eq("professor_avaliador_id", filters.professorId);
      }
      if (filters.busca && filters.busca.trim()) {
        query = query.or(`aluno_nome.ilike.%${filters.busca.trim()}%,titulo.ilike.%${filters.busca.trim()}%`);
      }
      if (filters.ordenacao === "recentes_primeiro") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: true });
      }
    } else {
      query = query.order("created_at", { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[Supabase SelfPresentation] Erro ao listar: ${error.message}`);
    }
    return ((data || []) as unknown as SelfPresentationDbRow[]).map(mapRowToSelfPresentation);
  },

  async obterPorId(id: string, paraAluno?: boolean, clientOverride?: SupabaseClient): Promise<SelfPresentation | null> {
    const supabase = getSupabase(clientOverride);
    const source = paraAluno ? "vw_aluno_self_presentations" : "self_presentations";
    const { data, error } = await supabase.from(source).select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new Error(`[Supabase SelfPresentation] Erro ao obter apresentação ${id}: ${error.message}`);
    }
    if (!data) return null;
    return mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow);
  },

  async obterParaAluno(id: string, alunoId: string, clientOverride?: SupabaseClient): Promise<SelfPresentation | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("vw_aluno_self_presentations")
      .select("*")
      .eq("id", id)
      .eq("aluno_id", alunoId)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase SelfPresentation] Erro ao obter apresentação para aluno: ${error.message}`);
    }
    if (!data) return null;
    return mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow);
  },

  async listarParaAluno(alunoId: string, clientOverride?: SupabaseClient): Promise<SelfPresentation[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("vw_aluno_self_presentations")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase SelfPresentation] Erro ao listar apresentações para aluno: ${error.message}`);
    }
    return ((data || []) as unknown as SelfPresentationDbRow[]).map(mapRowToSelfPresentation);
  },

  async listarPorAluno(alunoId: string, clientOverride?: SupabaseClient): Promise<SelfPresentation[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("self_presentations")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase SelfPresentation] Erro ao listar apresentações por aluno: ${error.message}`);
    }
    return ((data || []) as unknown as SelfPresentationDbRow[]).map(mapRowToSelfPresentation);
  },

  async obterAtivaParaAluno(alunoId: string, clientOverride?: SupabaseClient): Promise<SelfPresentation | null> {
    const list = await this.listarParaAluno(alunoId, clientOverride);
    return list[0] || null;
  },

  async salvarRascunho(
    dados: {
      id?: string;
      alunoId: string;
      alunoNome?: string;
      tipo?: "nivelamento_inicial" | "reavaliacao";
      titulo: string;
      linkVideo?: string;
      dataGravacao?: string;
      observacaoAluno?: string;
      consentimento?: ConsentimentoUsoVideo;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase(clientOverride);
      const tipo = dados.tipo || "nivelamento_inicial";
      const now = new Date().toISOString();

      let alunoNome = dados.alunoNome;
      if (!alunoNome) {
        try {
          const aluno = await alunoRepository.obterPorId(dados.alunoId);
          alunoNome = aluno?.nomeCompleto || "Aluno MTD";
        } catch {
          alunoNome = "Aluno MTD";
        }
      }

      const payload: Record<string, unknown> = {
        aluno_id: dados.alunoId,
        aluno_nome: alunoNome,
        tipo,
        titulo: dados.titulo.trim(),
        idioma_avaliado: "Inglês",
        link_video: dados.linkVideo?.trim() || "",
        data_gravacao: dados.dataGravacao || now,
        status: "rascunho",
        consentimento_aceito: dados.consentimento?.aceito ?? false,
        consentimento_data_hora: dados.consentimento?.dataHora || now,
        consentimento_versao_texto: dados.consentimento?.versaoTexto || "v1.0",
        observacao_aluno: dados.observacaoAluno?.trim() || null,
        updated_at: now,
      };

      if (dados.id) {
        const { data, error } = await supabase
          .from("self_presentations")
          .update(payload)
          .eq("id", dados.id)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Erro ao atualizar rascunho de apresentação no Supabase: ${error.message}`,
          };
        }
        return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
      } else {
        const nextId = `sp-${Date.now().toString().slice(-6)}`;
        payload.id = nextId;
        payload.versao = 1;
        payload.created_at = now;

        const { data, error } = await supabase
          .from("self_presentations")
          .insert(payload)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Erro ao criar rascunho de apresentação no Supabase: ${error.message}`,
          };
        }
        return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao salvar rascunho: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async enviar(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase(clientOverride);
      const now = new Date().toISOString();
      const payload = {
        link_video: dados.linkVideo.trim(),
        data_gravacao: dados.dataGravacao,
        observacao_aluno: dados.observacaoAluno?.trim() || null,
        consentimento_aceito: true,
        consentimento_data_hora: now,
        consentimento_versao_texto: dados.consentimento.versaoTexto || "v1.0",
        status: "enviada",
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("self_presentations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao enviar apresentação no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao enviar apresentação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async assumirAvaliacao(
    id: string,
    professorId: string,
    professorNome: string,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase(clientOverride);
      const now = new Date().toISOString();
      const payload = {
        professor_avaliador_id: isUuid(professorId) ? professorId : null,
        professor_avaliador_nome: professorNome,
        status: "em_avaliacao",
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("self_presentations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao assumir avaliação no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao assumir avaliação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async salvarAvaliacao(
    id: string,
    avaliacaoInput: Partial<AvaliacaoPedagogica>,
    publicar = false,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase(clientOverride);
      const atual = await this.obterPorId(id, false, clientOverride);
      if (!atual) return { success: false, error: "Apresentação não encontrada." };

      const now = new Date().toISOString();
      const avaliacaoSalva: AvaliacaoPedagogica = {
        id: atual.avaliacao?.id || `av-${Date.now()}`,
        selfPresentationId: id,
        professorId: avaliacaoInput.professorId || atual.professorAvaliadorId || "prof-001",
        professorNome: avaliacaoInput.professorNome || atual.professorAvaliadorNome || "Professor",
        rubrica: avaliacaoInput.rubrica!,
        pontosFortes: avaliacaoInput.pontosFortes?.trim() || "",
        pontosADesenvolver: avaliacaoInput.pontosADesenvolver?.trim() || "",
        orientacaoProximasAulas: avaliacaoInput.orientacaoProximasAulas?.trim() || "",
        observacoesInternas: avaliacaoInput.observacoesInternas?.trim() || undefined,
        mediaCriteriosOrais: avaliacaoInput.mediaCriteriosOrais ?? 0,
        nivelDefinido: avaliacaoInput.nivelDefinido || "nao_avaliado",
        justificativaNivel: avaliacaoInput.justificativaNivel?.trim() || "",
        concluidaEm: publicar ? now : (atual.avaliacao?.concluidaEm || now),
        publicada: publicar,
        publicadaEm: publicar ? now : undefined,
      };

      const payload = {
        avaliacao: avaliacaoSalva,
        status: publicar ? "avaliada" : "em_avaliacao",
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("self_presentations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao salvar avaliação no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao salvar avaliação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async solicitarReenvio(
    id: string,
    solicitacao: SolicitacaoReenvio,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase(clientOverride);
      const atual = await this.obterPorId(id, false, clientOverride);
      if (!atual) return { success: false, error: "Apresentação não encontrada." };

      const now = new Date().toISOString();
      const versaoHistorico: VersaoHistoricoSelfPresentation = {
        versao: atual.versao,
        linkVideo: atual.linkVideo,
        dataGravacao: atual.dataGravacao,
        dataEnvio: atual.dataEnvio || atual.criadoEm,
        observacaoAluno: atual.observacaoAluno,
        consentimento: atual.consentimento,
        solicitacaoReenvio: solicitacao,
        avaliacaoAnterior: atual.avaliacao ? { ...atual.avaliacao } : undefined,
        arquivadoEm: now,
      };

      const historicoAtualizado = [...(atual.historicoVersoes || []), versaoHistorico];

      const payload = {
        status: "reenvio_solicitado",
        solicitacao_reenvio: solicitacao,
        historico_versoes: historicoAtualizado,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("self_presentations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao solicitar reenvio no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao solicitar reenvio: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async criarNovaVersao(
    id: string,
    dados: {
      linkVideo: string;
      dataGravacao: string;
      observacaoAluno?: string;
      consentimento: ConsentimentoUsoVideo;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase(clientOverride);
      const atual = await this.obterPorId(id, false, clientOverride);
      if (!atual) return { success: false, error: "Apresentação anterior não encontrada." };

      const now = new Date().toISOString();
      const novaVersaoNum = (atual.versao || 1) + 1;

      const payload = {
        link_video: dados.linkVideo.trim(),
        data_gravacao: dados.dataGravacao || now,
        observacao_aluno: dados.observacaoAluno?.trim() || null,
        versao: novaVersaoNum,
        status: "enviada",
        consentimento_aceito: true,
        consentimento_data_hora: now,
        consentimento_versao_texto: dados.consentimento.versaoTexto || "v1.0",
        solicitacao_reenvio: null,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("self_presentations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao registrar nova versão no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao criar nova versão: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async aplicarNivelAoPerfil(
    id: string,
    professorId: string,
    professorNome: string,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<{ aluno: Aluno; sp: SelfPresentation }>> {
    try {
      const supabase = getSupabase(clientOverride);
      const sp = await this.obterPorId(id, false, clientOverride);
      if (!sp || !sp.avaliacao || !sp.avaliacao.publicada) {
        return { success: false, error: "A avaliação precisa estar concluída e publicada antes de ser aplicada ao perfil." };
      }

      // Atualiza o nível do aluno no banco via supabase/clientOverride
      const { data: alunoRow, error: alunoErr } = await supabase
        .from("alunos")
        .update({
          nivel_operacional: sp.avaliacao.nivelDefinido,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sp.alunoId)
        .select()
        .single();

      if (alunoErr || !alunoRow) {
        return { success: false, error: `Erro ao atualizar nível no perfil do aluno: ${alunoErr?.message || "Registro não encontrado"}` };
      }

      // Atualiza o estado da apresentação para refletir que o nível foi aplicado
      const avaliacaoAtualizada = {
        ...sp.avaliacao,
        nivelAplicadoAoPerfil: true,
      };

      await supabase
        .from("self_presentations")
        .update({
          avaliacao: avaliacaoAtualizada,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      const alunoMapeado: Aluno = {
        id: alunoRow.id,
        nomeCompleto: alunoRow.nome_completo,
        email: alunoRow.email,
        telefone: alunoRow.telefone || undefined,
        objetivoIngles: alunoRow.objetivo || "Geral",
        nivel: alunoRow.nivel_operacional,
        status: alunoRow.status,
        dataCadastro: alunoRow.created_at,
        avatarUrl: alunoRow.avatar_url || undefined,
      };

      const spAtualizada: SelfPresentation = {
        ...sp,
        avaliacao: avaliacaoAtualizada,
        nivelAplicadoAoPerfil: true,
      };

      return { success: true, data: { aluno: alunoMapeado, sp: spAtualizada } };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha ao aplicar nível ao perfil: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async contadoresDashboard(clientOverride?: SupabaseClient): Promise<SelfPresentationsMetricasAdmin> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase.from("self_presentations").select("status");
    if (error) {
      throw new Error(`[Supabase SelfPresentation] Erro ao obter contadores do dashboard: ${error.message}`);
    }
    const list = (data || []) as { status: string }[];
    return {
      aguardando: list.filter((i) => i.status === "enviada").length,
      emAvaliacao: list.filter((i) => i.status === "em_avaliacao").length,
      reenviosPendentes: list.filter((i) => i.status === "reenvio_solicitado").length,
      avaliadas: list.filter((i) => i.status === "avaliada").length,
      tempoMedioHorasTexto: "—",
    };
  },
};
