import { Professor, ProfessorFilters, OperationResult } from "@/types";
import { IProfessorRepository } from "./contracts/repositoryContracts";
import { validateProfessorInput, normalizeEmail, normalizeText } from "./validators";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

interface ProfessorDbRow {
  id: string;
  perfil_id: string | null;
  nome_completo: string;
  email: string;
  telefone: string | null;
  biografia_pedagogica: string | null;
  idiomas_falados: string[] | null;
  status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Professores] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToProfessor(row: ProfessorDbRow): Professor {
  return {
    id: row.id,
    nomeCompleto: row.nome_completo,
    email: row.email,
    telefone: row.telefone || undefined,
    biografiaCurta: row.biografia_pedagogica || "",
    idiomasFalados: row.idiomas_falados || [],
    status: (row.status || "ativo") as Professor["status"],
    dataCadastro: row.created_at,
    avatarUrl: row.avatar_url || undefined,
  };
}

function notifyMutation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mtd_core_users_updated", { detail: { entity: "professores" } })
    );
  }
}

export const professorSupabaseRepository: IProfessorRepository = {
  async listar(filters?: ProfessorFilters): Promise<Professor[]> {
    const supabase = getSupabase();

    let query = supabase
      .from("professores")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters) {
      if (filters.busca && filters.busca.trim()) {
        const q = filters.busca.trim();
        query = query.or(`nome_completo.ilike.%${q}%,email.ilike.%${q}%`);
      }

      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase Professores] Erro ao listar professores:", error);
      throw new Error(`Erro ao listar professores do banco: ${error.message}`);
    }

    return (data || []).map((row: ProfessorDbRow) => mapRowToProfessor(row));
  },

  async obterPorId(id: string): Promise<Professor | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("professores")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[Supabase Professores] Erro ao buscar professor ${id}:`, error);
      return null;
    }

    if (!data) return null;
    return mapRowToProfessor(data as ProfessorDbRow);
  },

  async criar(
    dados: Omit<Professor, "id" | "dataCadastro">
  ): Promise<OperationResult<Professor>> {
    const validation = validateProfessorInput(dados, undefined, []);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os campos informados antes de prosseguir.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const supabase = getSupabase();
    const nomeNormalizado = normalizeText(dados.nomeCompleto);
    const emailNormalizado = normalizeEmail(dados.email);

    const { data: novoProf, error: insertError } = await supabase
      .from("professores")
      .insert({
        nome_completo: nomeNormalizado,
        email: emailNormalizado,
        telefone: dados.telefone ? normalizeText(dados.telefone) : null,
        biografia_pedagogica: dados.biografiaCurta ? normalizeText(dados.biografiaCurta) : null,
        idiomas_falados: (dados.idiomasFalados || [])
          .map((i) => normalizeText(i))
          .filter(Boolean),
        status: dados.status || "ativo",
        avatar_url: dados.avatarUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("unique") ||
        insertError.message?.toLowerCase().includes("idx_professores_email_lower")
      ) {
        return {
          success: false,
          error: "Este e-mail já está cadastrado para outro professor.",
          fieldErrors: { email: "Este e-mail já está em uso por outro professor." },
        };
      }
      return {
        success: false,
        error: `Erro ao criar professor no banco: ${insertError.message}`,
      };
    }

    notifyMutation();

    return {
      success: true,
      data: mapRowToProfessor(novoProf as ProfessorDbRow),
    };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Professor, "id" | "dataCadastro">>
  ): Promise<OperationResult<Professor>> {
    const supabase = getSupabase();

    const payload: {
      nome_completo?: string;
      email?: string;
      telefone?: string | null;
      biografia_pedagogica?: string | null;
      idiomas_falados?: string[];
      status?: string;
      avatar_url?: string | null;
    } = {};
    if (dados.nomeCompleto !== undefined) {
      payload.nome_completo = normalizeText(dados.nomeCompleto);
    }
    if (dados.email !== undefined) {
      payload.email = normalizeEmail(dados.email);
    }
    if (dados.telefone !== undefined) {
      payload.telefone = dados.telefone ? normalizeText(dados.telefone) : null;
    }
    if (dados.biografiaCurta !== undefined) {
      payload.biografia_pedagogica = dados.biografiaCurta
        ? normalizeText(dados.biografiaCurta)
        : null;
    }
    if (dados.idiomasFalados !== undefined) {
      payload.idiomas_falados = dados.idiomasFalados
        .map((i) => normalizeText(i))
        .filter(Boolean);
    }
    if (dados.status !== undefined) {
      payload.status = dados.status;
    }
    if (dados.avatarUrl !== undefined) {
      payload.avatar_url = dados.avatarUrl || null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("professores")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      if (
        updateError.code === "23505" ||
        updateError.message?.toLowerCase().includes("unique") ||
        updateError.message?.toLowerCase().includes("idx_professores_email_lower")
      ) {
        return {
          success: false,
          error: "Este e-mail já está cadastrado para outro professor.",
          fieldErrors: { email: "Este e-mail já está em uso por outro professor." },
        };
      }
      return {
        success: false,
        error: `Erro ao atualizar professor: ${updateError.message}`,
      };
    }

    notifyMutation();

    return {
      success: true,
      data: mapRowToProfessor(updated as ProfessorDbRow),
    };
  },

  async inativar(id: string): Promise<OperationResult<Professor>> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("professores")
      .update({ status: "inativo" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Erro ao inativar professor: ${error.message}` };
    }

    notifyMutation();
    return { success: true, data: mapRowToProfessor(data as ProfessorDbRow) };
  },

  async reativar(id: string): Promise<OperationResult<Professor>> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("professores")
      .update({ status: "ativo" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Erro ao reativar professor: ${error.message}` };
    }

    notifyMutation();
    return { success: true, data: mapRowToProfessor(data as ProfessorDbRow) };
  },

  async contarAtivos(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("professores")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");

    if (error) {
      console.warn("[Supabase Professores] Erro ao contar professores ativos:", error);
      return 0;
    }

    return count || 0;
  },

  async contarTotal(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("professores")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.warn("[Supabase Professores] Erro ao contar total de professores:", error);
      return 0;
    }

    return count || 0;
  },
};
