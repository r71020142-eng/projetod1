import { Entrega, EntregaFilters, HistoricoEnvio, OperationResult } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { entregaLocalStorageRepository } from "./entregaLocalStorageRepository";
import { atividadeRepository } from "./atividadeRepository";
import { validateEntregaInput, validateCorrecaoInput } from "./validators";

interface EntregaDbRow {
  id: string;
  atividade_id: string;
  aluno_id: string;
  resposta_texto: string | null;
  resposta_link: string | null;
  status: string;
  entregue_em: string | null;
  feedback: string | null;
  pontuacao: number | null;
  corrigido_em: string | null;
  professor_corretor_id: string | null;
  motivo_reenvio: string | null;
  historico_envios: HistoricoEnvio[] | null;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Entregas] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToEntrega(row: EntregaDbRow): Entrega {
  return {
    id: row.id,
    atividadeId: row.atividade_id,
    alunoId: row.aluno_id,
    respostaTexto: row.resposta_texto || undefined,
    respostaLink: row.resposta_link || undefined,
    status: row.status as Entrega["status"],
    entregueEm: row.entregue_em || undefined,
    feedback: row.feedback || undefined,
    pontuacao: row.pontuacao !== null ? Number(row.pontuacao) : null,
    corrigidoEm: row.corrigido_em || undefined,
    professorCorretorId: row.professor_corretor_id || undefined,
    motivoReenvio: row.motivo_reenvio || undefined,
    historicoEnvios: Array.isArray(row.historico_envios) ? row.historico_envios : [],
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export const entregaSupabaseRepository = {
  async listar(filters?: EntregaFilters): Promise<Entrega[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("entregas_atividades").select("*");

      if (filters?.atividadeId) query = query.eq("atividade_id", filters.atividadeId);
      if (filters?.alunoId) query = query.eq("aluno_id", filters.alunoId);
      if (filters?.status && filters.status !== "todos") query = query.eq("status", filters.status);

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) {
        console.warn("[Supabase Entregas] Erro ao listar, fallback local:", error.message);
        return entregaLocalStorageRepository.listar(filters);
      }

      return (data as EntregaDbRow[]).map(mapRowToEntrega);
    } catch {
      return entregaLocalStorageRepository.listar(filters);
    }
  },

  async obterPorId(id: string): Promise<Entrega | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("entregas_atividades").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        return entregaLocalStorageRepository.obterPorId(id);
      }
      return mapRowToEntrega(data as EntregaDbRow);
    } catch {
      return entregaLocalStorageRepository.obterPorId(id);
    }
  },

  async obterPorAtividadeEAluno(atividadeId: string, alunoId: string): Promise<Entrega | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("entregas_atividades")
        .select("*")
        .eq("atividade_id", atividadeId)
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (error || !data) {
        return entregaLocalStorageRepository.obterPorAtividadeEAluno(atividadeId, alunoId);
      }
      return mapRowToEntrega(data as EntregaDbRow);
    } catch {
      return entregaLocalStorageRepository.obterPorAtividadeEAluno(atividadeId, alunoId);
    }
  },

  async salvarRascunho(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>> {
    try {
      const supabase = getSupabase();
      const atual = await this.obterPorAtividadeEAluno(atividadeId, alunoId);

      if (atual && (atual.status === "entregue" || atual.status === "atrasada" || atual.status === "corrigida")) {
        return {
          success: false,
          error: "Esta atividade já foi enviada e está bloqueada para edição até o professor solicitar reenvio.",
        };
      }

      const payload = {
        atividade_id: atividadeId,
        aluno_id: alunoId,
        resposta_texto: dados.respostaTexto || null,
        resposta_link: dados.respostaLink ? dados.respostaLink.trim() : null,
        status: "em_andamento",
      };

      const { data, error } = await supabase
        .from("entregas_atividades")
        .upsert(payload, { onConflict: "atividade_id,aluno_id" })
        .select()
        .single();

      if (error) {
        console.warn("[Supabase Entregas] Erro ao salvar rascunho, fallback local:", error.message);
        return entregaLocalStorageRepository.salvarRascunho(atividadeId, alunoId, dados);
      }

      return { success: true, data: mapRowToEntrega(data as EntregaDbRow) };
    } catch {
      return entregaLocalStorageRepository.salvarRascunho(atividadeId, alunoId, dados);
    }
  },

  async enviarEntrega(
    atividadeId: string,
    alunoId: string,
    dados: { respostaTexto?: string; respostaLink?: string }
  ): Promise<OperationResult<Entrega>> {
    const atividade = await atividadeRepository.obterPorId(atividadeId);
    if (!atividade) {
      return { success: false, error: "Atividade não encontrada." };
    }

    const validation = validateEntregaInput(dados, atividade, false);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique sua resposta antes de entregar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    try {
      const supabase = getSupabase();
      const atual = await this.obterPorAtividadeEAluno(atividadeId, alunoId);

      if (atual && (atual.status === "entregue" || atual.status === "atrasada" || atual.status === "corrigida")) {
        return {
          success: false,
          error: "Esta atividade já foi entregue e não permite alterações.",
        };
      }

      const statusFinal: Entrega["status"] = validation.atrasada ? "atrasada" : "entregue";
      const agora = new Date().toISOString();

      const payload = {
        atividade_id: atividadeId,
        aluno_id: alunoId,
        resposta_texto: dados.respostaTexto?.trim() || null,
        resposta_link: dados.respostaLink?.trim() || null,
        status: statusFinal,
        entregue_em: agora,
      };

      const { data, error } = await supabase
        .from("entregas_atividades")
        .upsert(payload, { onConflict: "atividade_id,aluno_id" })
        .select()
        .single();

      if (error) {
        console.warn("[Supabase Entregas] Erro ao enviar, fallback local:", error.message);
        return entregaLocalStorageRepository.enviarEntrega(atividadeId, alunoId, dados);
      }

      return { success: true, data: mapRowToEntrega(data as EntregaDbRow) };
    } catch {
      return entregaLocalStorageRepository.enviarEntrega(atividadeId, alunoId, dados);
    }
  },

  async corrigir(
    entregaId: string,
    professorId: string,
    dados: { feedback: string; pontuacao?: number | null }
  ): Promise<OperationResult<Entrega>> {
    const entrega = await this.obterPorId(entregaId);
    if (!entrega) {
      return { success: false, error: "Entrega não encontrada." };
    }

    const atividade = await atividadeRepository.obterPorId(entrega.atividadeId);
    const validation = validateCorrecaoInput(dados, atividade || undefined);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da correção.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    try {
      const supabase = getSupabase();
      const agora = new Date().toISOString();

      const payload = {
        feedback: dados.feedback.trim(),
        pontuacao: dados.pontuacao !== undefined && dados.pontuacao !== null ? Number(dados.pontuacao) : null,
        status: "corrigida",
        corrigido_em: agora,
        professor_corretor_id: professorId,
      };

      const { data, error } = await supabase
        .from("entregas_atividades")
        .update(payload)
        .eq("id", entregaId)
        .select()
        .single();

      if (error) {
        console.warn("[Supabase Entregas] Erro ao corrigir, fallback local:", error.message);
        return entregaLocalStorageRepository.corrigir(entregaId, professorId, dados);
      }

      return { success: true, data: mapRowToEntrega(data as EntregaDbRow) };
    } catch {
      return entregaLocalStorageRepository.corrigir(entregaId, professorId, dados);
    }
  },

  async solicitarReenvio(
    entregaId: string,
    professorId: string,
    motivo: string
  ): Promise<OperationResult<Entrega>> {
    if (!motivo || motivo.trim().length < 5) {
      return {
        success: false,
        error: "Informe o motivo e as orientações para o reenvio (mínimo 5 caracteres).",
      };
    }

    const current = await this.obterPorId(entregaId);
    if (!current) {
      return { success: false, error: "Entrega não encontrada." };
    }

    try {
      const supabase = getSupabase();
      const agora = new Date().toISOString();

      const registroHistorico: HistoricoEnvio = {
        id: `hist-${Date.now()}`,
        respostaTexto: current.respostaTexto,
        respostaLink: current.respostaLink,
        enviadoEm: current.entregueEm || current.atualizadoEm,
        feedbackAnterior: current.feedback,
        pontuacaoAnterior: current.pontuacao,
        motivoReenvio: motivo.trim(),
      };

      const historicoAtualizado = [...(current.historicoEnvios || []), registroHistorico];

      const payload = {
        status: "reenviar",
        feedback: motivo.trim(),
        professor_corretor_id: professorId,
        corrigido_em: agora,
        historico_envios: historicoAtualizado,
      };

      const { data, error } = await supabase
        .from("entregas_atividades")
        .update(payload)
        .eq("id", entregaId)
        .select()
        .single();

      if (error) {
        console.warn("[Supabase Entregas] Erro ao solicitar reenvio, fallback local:", error.message);
        return entregaLocalStorageRepository.solicitarReenvio(entregaId, professorId, motivo);
      }

      return { success: true, data: mapRowToEntrega(data as EntregaDbRow) };
    } catch {
      return entregaLocalStorageRepository.solicitarReenvio(entregaId, professorId, motivo);
    }
  },

  async contarAguardandoCorrecao(): Promise<number> {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from("entregas_atividades")
        .select("*", { count: "exact", head: true })
        .in("status", ["entregue", "atrasada"]);

      if (!error && count !== null) return count;
      return entregaLocalStorageRepository.contarAguardandoCorrecao();
    } catch {
      return entregaLocalStorageRepository.contarAguardandoCorrecao();
    }
  },

  async contarAtrasadas(): Promise<number> {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from("entregas_atividades")
        .select("*", { count: "exact", head: true })
        .eq("status", "atrasada");

      if (!error && count !== null) return count;
      return entregaLocalStorageRepository.contarAtrasadas();
    } catch {
      return entregaLocalStorageRepository.contarAtrasadas();
    }
  },

  async contarConcluidasPorAluno(alunoId: string): Promise<number> {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from("entregas_atividades")
        .select("*", { count: "exact", head: true })
        .eq("aluno_id", alunoId)
        .in("status", ["corrigida", "entregue"]);

      if (!error && count !== null) return count;
      return entregaLocalStorageRepository.contarConcluidasPorAluno(alunoId);
    } catch {
      return entregaLocalStorageRepository.contarConcluidasPorAluno(alunoId);
    }
  },
};
