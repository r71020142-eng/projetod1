import { Atividade, AtividadeFilters, OperationResult } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { atividadeLocalStorageRepository } from "./atividadeLocalStorageRepository";
import { validateAtividadeInput, normalizeText } from "./validators";

interface AtividadeDbRow {
  id: string;
  titulo: string;
  instrucoes: string;
  tipo: string;
  nivel_recomendado: string | null;
  material_relacionado_id: string | null;
  destino_tipo: string;
  destino_id: string | null;
  data_publicacao: string;
  prazo_entrega: string | null;
  pontuacao_maxima: number | null;
  status: string;
  professor_id: string;
  permitir_atraso: boolean;
  observacoes_internas: string | null;
  modulo_id: string | null;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Atividades] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToAtividade(row: AtividadeDbRow): Atividade {
  return {
    id: row.id,
    titulo: row.titulo,
    instrucoes: row.instrucoes,
    tipo: row.tipo as Atividade["tipo"],
    nivelRecomendado: (row.nivel_recomendado as Atividade["nivelRecomendado"]) || undefined,
    materialRelacionadoId: row.material_relacionado_id || undefined,
    destinoTipo: row.destino_tipo as Atividade["destinoTipo"],
    destinoId: row.destino_id || undefined,
    dataPublicacao: row.data_publicacao,
    prazoEntrega: row.prazo_entrega || undefined,
    pontuacaoMaxima: row.pontuacao_maxima !== null ? Number(row.pontuacao_maxima) : null,
    status: row.status as Atividade["status"],
    professorId: row.professor_id,
    permitirAtraso: row.permitir_atraso ?? true,
    observacoesInternas: row.observacoes_internas || undefined,
    moduloId: row.modulo_id || undefined,
    moduleId: row.modulo_id || undefined,
    criadoEm: row.created_at,
  };
}

export const atividadeSupabaseRepository = {
  async listar(filters?: AtividadeFilters): Promise<Atividade[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("atividades").select("*");

      if (filters?.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
      }
      if (filters?.tipo && filters.tipo !== "todos") {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters?.destinoTipo && filters.destinoTipo !== "todos") {
        query = query.eq("destino_tipo", filters.destinoTipo);
      }
      if (filters?.destinoId) {
        query = query.eq("destino_id", filters.destinoId);
      }
      if (filters?.professorId) {
        query = query.eq("professor_id", filters.professorId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        console.warn("[Supabase Atividades] Erro ao listar, fallback local:", error.message);
        return atividadeLocalStorageRepository.listar(filters);
      }

      let result = (data as AtividadeDbRow[]).map(mapRowToAtividade);

      if (filters?.busca) {
        const q = filters.busca.toLowerCase();
        result = result.filter(
          (a) =>
            a.titulo.toLowerCase().includes(q) ||
            a.instrucoes.toLowerCase().includes(q)
        );
      }

      return result;
    } catch {
      return atividadeLocalStorageRepository.listar(filters);
    }
  },

  async listarParaAluno(
    alunoId: string,
    turmasDoAluno: string[] = [],
    filters?: AtividadeFilters
  ): Promise<Atividade[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("vw_aluno_atividades")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        let list = (data as AtividadeDbRow[]).map(mapRowToAtividade);
        if (filters?.tipo && filters.tipo !== "todos") {
          list = list.filter((a) => a.tipo === filters.tipo);
        }
        if (filters?.busca) {
          const q = filters.busca.toLowerCase();
          list = list.filter((a) => a.titulo.toLowerCase().includes(q) || a.instrucoes.toLowerCase().includes(q));
        }
        return list;
      }

      const query = supabase
        .from("atividades")
        .select("*")
        .in("status", ["publicada", "encerrada"])
        .lte("data_publicacao", new Date().toISOString().slice(0, 10));

      const { data: directData, error: directErr } = await query;
      if (!directErr && directData) {
        let list = (directData as AtividadeDbRow[])
          .map(mapRowToAtividade)
          .filter((a) => {
            if (a.destinoTipo === "geral") return true;
            if (a.destinoTipo === "turma" && a.destinoId && turmasDoAluno.includes(a.destinoId)) return true;
            if (a.destinoTipo === "aluno" && a.destinoId === alunoId) return true;
            return false;
          })
          .map((a) => ({ ...a, observacoesInternas: undefined }));

        if (filters?.tipo && filters.tipo !== "todos") {
          list = list.filter((a) => a.tipo === filters.tipo);
        }
        return list;
      }

      return atividadeLocalStorageRepository.listarParaAluno(alunoId, turmasDoAluno, filters);
    } catch {
      return atividadeLocalStorageRepository.listarParaAluno(alunoId, turmasDoAluno, filters);
    }
  },

  async obterPorId(id: string): Promise<Atividade | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("atividades").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        return atividadeLocalStorageRepository.obterPorId(id);
      }
      return mapRowToAtividade(data as AtividadeDbRow);
    } catch {
      return atividadeLocalStorageRepository.obterPorId(id);
    }
  },

  async obterPorIdParaAluno(
    id: string,
    alunoId: string,
    turmasDoAluno: string[] = []
  ): Promise<Atividade | null> {
    const atv = await this.obterPorId(id);
    if (!atv) return null;

    if (atv.status === "rascunho" || atv.status === "arquivada") return null;
    const hoje = new Date().toISOString().slice(0, 10);
    if (atv.status === "agendada" && (!atv.dataPublicacao || atv.dataPublicacao > hoje)) return null;

    const hasAccess =
      atv.destinoTipo === "geral" ||
      (atv.destinoTipo === "turma" && atv.destinoId && turmasDoAluno.includes(atv.destinoId)) ||
      (atv.destinoTipo === "aluno" && atv.destinoId === alunoId);

    if (!hasAccess) return null;

    return { ...atv, observacoesInternas: undefined };
  },

  async criar(dados: Partial<Atividade>): Promise<OperationResult<Atividade>> {
    const validation = validateAtividadeInput(dados);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da atividade preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    try {
      const supabase = getSupabase();
      const payload = {
        titulo: normalizeText(dados.titulo!),
        instrucoes: dados.instrucoes!.trim(),
        tipo: dados.tipo!,
        nivel_recomendado: dados.nivelRecomendado || null,
        material_relacionado_id: dados.materialRelacionadoId || null,
        destino_tipo: dados.destinoTipo || "geral",
        destino_id: dados.destinoId || null,
        data_publicacao: dados.dataPublicacao || new Date().toISOString().slice(0, 10),
        prazo_entrega: dados.prazoEntrega || null,
        pontuacao_maxima:
          dados.pontuacaoMaxima !== undefined && dados.pontuacaoMaxima !== null
            ? Number(dados.pontuacaoMaxima)
            : null,
        status: dados.status || "rascunho",
        professor_id: dados.professorId!,
        permitir_atraso: dados.permitirAtraso ?? true,
        observacoes_internas: dados.observacoesInternas ? normalizeText(dados.observacoesInternas) : null,
        modulo_id: dados.moduloId || dados.moduleId || null,
      };

      const { data, error } = await supabase.from("atividades").insert(payload).select().single();
      if (error) {
        console.warn("[Supabase Atividades] Erro ao inserir, fallback local:", error.message);
        return atividadeLocalStorageRepository.criar(dados);
      }

      return { success: true, data: mapRowToAtividade(data as AtividadeDbRow) };
    } catch {
      return atividadeLocalStorageRepository.criar(dados);
    }
  },

  async atualizar(id: string, dados: Partial<Atividade>): Promise<OperationResult<Atividade>> {
    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {};

      if (dados.titulo !== undefined) payload.titulo = normalizeText(dados.titulo);
      if (dados.instrucoes !== undefined) payload.instrucoes = dados.instrucoes.trim();
      if (dados.tipo !== undefined) payload.tipo = dados.tipo;
      if (dados.status !== undefined) payload.status = dados.status;
      if (dados.destinoTipo !== undefined) payload.destino_tipo = dados.destinoTipo;
      if (dados.destinoId !== undefined) payload.destino_id = dados.destinoId || null;
      if (dados.prazoEntrega !== undefined) payload.prazo_entrega = dados.prazoEntrega || null;
      if (dados.permitirAtraso !== undefined) payload.permitir_atraso = dados.permitirAtraso;
      if (dados.pontuacaoMaxima !== undefined) payload.pontuacao_maxima = dados.pontuacaoMaxima !== null ? Number(dados.pontuacaoMaxima) : null;
      if (dados.observacoesInternas !== undefined) payload.observacoes_internas = dados.observacoesInternas ? normalizeText(dados.observacoesInternas) : null;

      const { data, error } = await supabase.from("atividades").update(payload).eq("id", id).select().single();
      if (error) {
        console.warn("[Supabase Atividades] Erro ao atualizar, fallback local:", error.message);
        return atividadeLocalStorageRepository.atualizar(id, dados);
      }

      return { success: true, data: mapRowToAtividade(data as AtividadeDbRow) };
    } catch {
      return atividadeLocalStorageRepository.atualizar(id, dados);
    }
  },

  async encerrar(id: string): Promise<OperationResult<Atividade>> {
    return this.atualizar(id, { status: "encerrada" });
  },

  async arquivar(id: string): Promise<OperationResult<Atividade>> {
    return this.atualizar(id, { status: "arquivada" });
  },

  async contarPublicadas(): Promise<number> {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from("atividades")
        .select("*", { count: "exact", head: true })
        .eq("status", "publicada");
      if (!error && count !== null) return count;
      return atividadeLocalStorageRepository.contarPublicadas();
    } catch {
      return atividadeLocalStorageRepository.contarPublicadas();
    }
  },
};
