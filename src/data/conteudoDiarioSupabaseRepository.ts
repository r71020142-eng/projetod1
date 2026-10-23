import { ConteudoDiario, ConteudoDiarioFilters, OperationResult } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { conteudoDiarioLocalStorageRepository } from "./conteudoDiarioLocalStorageRepository";
import { validateConteudoDiarioInput, normalizeText } from "./validators";

interface ConteudoDiarioDbRow {
  id: string;
  titulo: string;
  texto: string;
  data_programada: string;
  nivel_recomendado: string;
  destino_tipo: string;
  destino_id: string | null;
  material_id: string | null;
  atividade_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Conteúdos Diários] Cliente Supabase não pôde ser inicializado."
    );
  }
  return client;
}

function mapRowToConteudo(row: ConteudoDiarioDbRow): ConteudoDiario {
  return {
    id: row.id,
    titulo: row.titulo,
    texto: row.texto,
    dataProgramada: row.data_programada,
    nivelRecomendado: row.nivel_recomendado as ConteudoDiario["nivelRecomendado"],
    destinoTipo: row.destino_tipo as ConteudoDiario["destinoTipo"],
    destinoId: row.destino_id || undefined,
    materialId: row.material_id || undefined,
    atividadeId: row.atividade_id || undefined,
    status: row.status as ConteudoDiario["status"],
    criadoEm: row.created_at,
  };
}

export const conteudoDiarioSupabaseRepository = {
  async listar(filters?: ConteudoDiarioFilters): Promise<ConteudoDiario[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("conteudos_diarios").select("*");

      if (filters?.status && filters.status !== "todos") query = query.eq("status", filters.status);
      if (filters?.data) query = query.eq("data_programada", filters.data);

      const { data, error } = await query.order("data_programada", { ascending: false });
      if (error) {
        console.warn("[Supabase Conteúdos Diários] Erro ao listar, fallback local:", error.message);
        return conteudoDiarioLocalStorageRepository.listar(filters);
      }

      let result = (data as ConteudoDiarioDbRow[]).map(mapRowToConteudo);

      if (filters?.busca) {
        const q = filters.busca.toLowerCase();
        result = result.filter((c) => c.titulo.toLowerCase().includes(q) || c.texto.toLowerCase().includes(q));
      }

      return result;
    } catch {
      return conteudoDiarioLocalStorageRepository.listar(filters);
    }
  },

  async obterPraticaDeHoje(
    alunoId?: string,
    turmasDoAluno: string[] = []
  ): Promise<ConteudoDiario | null> {
    try {
      const supabase = getSupabase();
      const hoje = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("conteudos_diarios")
        .select("*")
        .eq("status", "publicado")
        .lte("data_programada", hoje)
        .order("data_programada", { ascending: false });

      if (!error && data) {
        const candidatos = (data as ConteudoDiarioDbRow[])
          .map(mapRowToConteudo)
          .filter((c) => {
            if (alunoId) {
              if (c.destinoTipo === "geral") return true;
              if (c.destinoTipo === "turma" && c.destinoId && turmasDoAluno.includes(c.destinoId)) return true;
              if (c.destinoTipo === "aluno" && c.destinoId === alunoId) return true;
              return false;
            }
            return true;
          });

        if (candidatos.length > 0) {
          const exato = candidatos.find((c) => c.dataProgramada === hoje);
          return exato || candidatos[0];
        }
      }

      return conteudoDiarioLocalStorageRepository.obterPraticaDeHoje(alunoId, turmasDoAluno);
    } catch {
      return conteudoDiarioLocalStorageRepository.obterPraticaDeHoje(alunoId, turmasDoAluno);
    }
  },

  async obterPorId(id: string): Promise<ConteudoDiario | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("conteudos_diarios").select("*").eq("id", id).maybeSingle();
      if (error || !data) return conteudoDiarioLocalStorageRepository.obterPorId(id);
      return mapRowToConteudo(data as ConteudoDiarioDbRow);
    } catch {
      return conteudoDiarioLocalStorageRepository.obterPorId(id);
    }
  },

  async criar(dados: Partial<ConteudoDiario>): Promise<OperationResult<ConteudoDiario>> {
    const validation = validateConteudoDiarioInput(dados);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do conteúdo diário preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    try {
      const supabase = getSupabase();
      const payload = {
        titulo: normalizeText(dados.titulo!),
        texto: dados.texto!.trim(),
        data_programada: dados.dataProgramada!,
        nivel_recomendado: dados.nivelRecomendado || "todos",
        destino_tipo: dados.destinoTipo || "geral",
        destino_id: dados.destinoId || null,
        material_id: dados.materialId || null,
        atividade_id: dados.atividadeId || null,
        status: dados.status || "publicado",
      };

      const { data, error } = await supabase.from("conteudos_diarios").insert(payload).select().single();
      if (error) {
        console.warn("[Supabase Conteúdos Diários] Erro ao criar, fallback local:", error.message);
        return conteudoDiarioLocalStorageRepository.criar(dados);
      }

      return { success: true, data: mapRowToConteudo(data as ConteudoDiarioDbRow) };
    } catch {
      return conteudoDiarioLocalStorageRepository.criar(dados);
    }
  },

  async atualizar(id: string, dados: Partial<ConteudoDiario>): Promise<OperationResult<ConteudoDiario>> {
    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {};

      if (dados.titulo !== undefined) payload.titulo = normalizeText(dados.titulo);
      if (dados.texto !== undefined) payload.texto = dados.texto.trim();
      if (dados.dataProgramada !== undefined) payload.data_programada = dados.dataProgramada;
      if (dados.status !== undefined) payload.status = dados.status;

      const { data, error } = await supabase.from("conteudos_diarios").update(payload).eq("id", id).select().single();
      if (error) {
        console.warn("[Supabase Conteúdos Diários] Erro ao atualizar, fallback local:", error.message);
        return conteudoDiarioLocalStorageRepository.atualizar(id, dados);
      }

      return { success: true, data: mapRowToConteudo(data as ConteudoDiarioDbRow) };
    } catch {
      return conteudoDiarioLocalStorageRepository.atualizar(id, dados);
    }
  },

  async arquivar(id: string): Promise<OperationResult<ConteudoDiario>> {
    return this.atualizar(id, { status: "arquivado" });
  },

  async contarAgendados(): Promise<number> {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from("conteudos_diarios")
        .select("*", { count: "exact", head: true })
        .eq("status", "agendado");

      if (!error && count !== null) return count;
      return conteudoDiarioLocalStorageRepository.contarAgendados();
    } catch {
      return conteudoDiarioLocalStorageRepository.contarAgendados();
    }
  },
};
