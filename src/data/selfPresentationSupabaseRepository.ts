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
import { selfPresentationLocalStorageRepository } from "./selfPresentationLocalStorageRepository";
import { alunoRepository } from "./alunoRepository";

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
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function getSupabase() {
  return createBrowserSupabaseClient();
}

export const selfPresentationSupabaseRepository = {
  async listar(filters?: SelfPresentationFilters): Promise<SelfPresentation[]> {
    try {
      const supabase = getSupabase();
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
        console.warn("[Supabase SelfPresentation] Erro ao listar, fallback local:", error.message);
        return selfPresentationLocalStorageRepository.listar(filters);
      }
      return ((data || []) as unknown as SelfPresentationDbRow[]).map(mapRowToSelfPresentation);
    } catch {
      return selfPresentationLocalStorageRepository.listar(filters);
    }
  },

  async obterPorId(id: string): Promise<SelfPresentation | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("self_presentations").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        return selfPresentationLocalStorageRepository.obterPorId(id);
      }
      return mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow);
    } catch {
      return selfPresentationLocalStorageRepository.obterPorId(id);
    }
  },

  async obterParaAluno(id: string, alunoId: string): Promise<SelfPresentation | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("vw_aluno_self_presentations")
        .select("*")
        .eq("id", id)
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (error || !data) {
        return selfPresentationLocalStorageRepository.obterParaAluno(id, alunoId);
      }
      return mapRowToSelfPresentation(data as unknown as SelfPresentationDbRow);
    } catch {
      return selfPresentationLocalStorageRepository.obterParaAluno(id, alunoId);
    }
  },

  async listarParaAluno(alunoId: string): Promise<SelfPresentation[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("vw_aluno_self_presentations")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("created_at", { ascending: false });

      if (error) {
        return selfPresentationLocalStorageRepository.listarParaAluno(alunoId);
      }
      return ((data || []) as unknown as SelfPresentationDbRow[]).map(mapRowToSelfPresentation);
    } catch {
      return selfPresentationLocalStorageRepository.listarParaAluno(alunoId);
    }
  },

  async listarPorAluno(alunoId: string): Promise<SelfPresentation[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("self_presentations")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("created_at", { ascending: false });

      if (error) {
        return selfPresentationLocalStorageRepository.listarPorAluno(alunoId);
      }
      return ((data || []) as unknown as SelfPresentationDbRow[]).map(mapRowToSelfPresentation);
    } catch {
      return selfPresentationLocalStorageRepository.listarPorAluno(alunoId);
    }
  },

  async obterAtivaParaAluno(alunoId: string): Promise<SelfPresentation | null> {
    const list = await this.listarParaAluno(alunoId);
    return list[0] || null;
  },

  async salvarRascunho(dados: {
    id?: string;
    alunoId: string;
    alunoNome?: string;
    tipo?: "nivelamento_inicial" | "reavaliacao";
    titulo: string;
    linkVideo?: string;
    dataGravacao?: string;
    observacaoAluno?: string;
    consentimento?: ConsentimentoUsoVideo;
  }): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase();
      const tipo = dados.tipo || "nivelamento_inicial";
      const now = new Date().toISOString();

      const aluno = await alunoRepository.obterPorId(dados.alunoId);
      const alunoNome = dados.alunoNome || aluno?.nomeCompleto || "Aluno";

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
    }
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase();
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
    professorNome: string
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase();
      const now = new Date().toISOString();
      const payload = {
        professor_avaliador_id: professorId,
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
    publicar = false
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase();
      const atual = await this.obterPorId(id);
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
    solicitacao: SolicitacaoReenvio
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase();
      const atual = await this.obterPorId(id);
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
    }
  ): Promise<OperationResult<SelfPresentation>> {
    try {
      const supabase = getSupabase();
      const atual = await this.obterPorId(id);
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
    professorNome: string
  ): Promise<OperationResult<{ aluno: Aluno; sp: SelfPresentation }>> {
    try {
      const sp = await this.obterPorId(id);
      if (!sp || !sp.avaliacao || !sp.avaliacao.publicada) {
        return { success: false, error: "A avaliação precisa estar concluída e publicada antes de ser aplicada ao perfil." };
      }

      const resAluno = await alunoRepository.atualizarNivel(
        sp.alunoId,
        sp.avaliacao.nivelDefinido,
        {
          origem: "self_presentation",
          origemReferenciaId: id,
          professorId,
          professorNome,
          justificativa: `Nivelamento inicial via Self Presentation (${sp.titulo}). Justificativa: ${sp.avaliacao.justificativaNivel}`,
        }
      );

      if (!resAluno.success || !resAluno.data) {
        return { success: false, error: resAluno.error || "Erro ao atualizar nível no perfil do aluno." };
      }

      return { success: true, data: { aluno: resAluno.data, sp } };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha ao aplicar nível ao perfil: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async contadoresDashboard(): Promise<SelfPresentationsMetricasAdmin> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("self_presentations").select("status");
      if (error || !data) {
        return selfPresentationLocalStorageRepository.contadoresDashboard();
      }
      const list = data as { status: string }[];
      return {
        aguardando: list.filter((i) => i.status === "enviada").length,
        emAvaliacao: list.filter((i) => i.status === "em_avaliacao").length,
        reenviosPendentes: list.filter((i) => i.status === "reenvio_solicitado").length,
        avaliadas: list.filter((i) => i.status === "avaliada").length,
        tempoMedioHorasTexto: "—",
      };
    } catch {
      return selfPresentationLocalStorageRepository.contadoresDashboard();
    }
  },
};
