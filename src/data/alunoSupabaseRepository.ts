import { Aluno, AlunoFilters, OperationResult, NivelAluno, OrigemAlteracaoNivel } from "@/types";
import { IAlunoRepository } from "./contracts/repositoryContracts";
import { validateAlunoInput, normalizeEmail, normalizeText } from "./validators";
import { historicoNivelRepository } from "./historicoNivelRepository";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

interface AlunoDbRow {
  id: string;
  perfil_id: string | null;
  nome_completo: string;
  email: string;
  telefone: string | null;
  objetivo: string;
  nivel_operacional: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  alunos_dados_pedagogicos?:
    | { observacoes_pedagogicas: string | null }[]
    | { observacoes_pedagogicas: string | null }
    | null;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Alunos] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToAluno(row: AlunoDbRow, overrideObservacoes?: string): Aluno {
  let observacoes: string | undefined = undefined;

  if (overrideObservacoes !== undefined) {
    observacoes = overrideObservacoes || undefined;
  } else if (row.alunos_dados_pedagogicos) {
    if (Array.isArray(row.alunos_dados_pedagogicos)) {
      observacoes = row.alunos_dados_pedagogicos[0]?.observacoes_pedagogicas || undefined;
    } else if (typeof row.alunos_dados_pedagogicos === "object") {
      observacoes = row.alunos_dados_pedagogicos.observacoes_pedagogicas || undefined;
    }
  }

  return {
    id: row.id,
    perfilId: row.perfil_id || undefined,
    nomeCompleto: row.nome_completo,
    email: row.email,
    telefone: row.telefone || undefined,
    objetivoIngles: row.objetivo || "Geral",
    nivel: (row.nivel_operacional || "nao_avaliado") as NivelAluno,
    status: (row.status || "ativo") as Aluno["status"],
    dataCadastro: row.created_at,
    observacoesPedagogicas: observacoes,
    avatarUrl: row.avatar_url || undefined,
  };
}

function notifyMutation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mtd_core_users_updated", { detail: { entity: "alunos" } })
    );
  }
}

export const alunoSupabaseRepository: IAlunoRepository = {
  async listar(filters?: AlunoFilters): Promise<Aluno[]> {
    const supabase = getSupabase();

    let query = supabase
      .from("alunos")
      .select("*, alunos_dados_pedagogicos(observacoes_pedagogicas)")
      .order("created_at", { ascending: false });

    if (filters) {
      if (filters.busca && filters.busca.trim()) {
        const q = filters.busca.trim();
        query = query.or(`nome_completo.ilike.%${q}%,email.ilike.%${q}%`);
      }

      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
      }

      if (filters.nivel && filters.nivel !== "todos") {
        query = query.eq("nivel_operacional", filters.nivel);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase Alunos] Erro ao listar alunos:", error);
      throw new Error(`Erro ao listar alunos do banco: ${error.message}`);
    }

    return (data || []).map((row: AlunoDbRow) => mapRowToAluno(row));
  },

  async obterPorId(id: string): Promise<Aluno | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("alunos")
      .select("*, alunos_dados_pedagogicos(observacoes_pedagogicas)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[Supabase Alunos] Erro ao buscar aluno ${id}:`, error);
      return null;
    }

    if (!data) return null;
    return mapRowToAluno(data as AlunoDbRow);
  },

  async criar(
    dados: Omit<Aluno, "id" | "dataCadastro"> & { senha?: string }
  ): Promise<OperationResult<Aluno>> {
    const validation = validateAlunoInput(dados, undefined, []);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os campos informados antes de prosseguir.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    // Se executado no cliente, aciona a API administrativa segura que cria usuário Auth + Aluno
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/admin/alunos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          notifyMutation();
          return { success: true, data: json.data };
        }
        return {
          success: false,
          error: json.error || "Erro ao cadastrar novo aluno no servidor.",
          fieldErrors: json.fieldErrors,
        };
      } catch (apiErr: unknown) {
        console.warn("[alunoSupabaseRepository] Fallback para inserção direta no banco:", apiErr);
      }
    }

    const supabase = getSupabase();
    const nomeNormalizado = normalizeText(dados.nomeCompleto);
    const emailNormalizado = normalizeEmail(dados.email);

    // 1. Inserção na tabela public.alunos
    const { data: novoAluno, error: insertError } = await supabase
      .from("alunos")
      .insert({
        nome_completo: nomeNormalizado,
        email: emailNormalizado,
        telefone: dados.telefone ? normalizeText(dados.telefone) : null,
        objetivo: normalizeText(dados.objetivoIngles || "Geral"),
        nivel_operacional: dados.nivel || "nao_avaliado",
        status: dados.status || "ativo",
        avatar_url: dados.avatarUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("unique") ||
        insertError.message?.toLowerCase().includes("idx_alunos_email_lower")
      ) {
        return {
          success: false,
          error: "Este e-mail já está cadastrado para outro aluno.",
          fieldErrors: { email: "Este e-mail já está em uso por outro aluno." },
        };
      }
      return {
        success: false,
        error: `Erro ao criar aluno no banco: ${insertError.message}`,
      };
    }

    // 2. Se houver observações pedagógicas, salva na tabela confidencial
    const obs = dados.observacoesPedagogicas
      ? normalizeText(dados.observacoesPedagogicas)
      : undefined;

    if (obs) {
      const { error: obsError } = await supabase
        .from("alunos_dados_pedagogicos")
        .insert({
          aluno_id: novoAluno.id,
          observacoes_pedagogicas: obs,
        });

      if (obsError) {
        console.warn("[Supabase Alunos] Aviso ao gravar observações pedagógicas:", obsError);
      }
    }

    notifyMutation();

    return {
      success: true,
      data: mapRowToAluno(novoAluno as AlunoDbRow, obs),
    };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Aluno, "id" | "dataCadastro">> & { senha?: string }
  ): Promise<OperationResult<Aluno>> {
    // Se executado no cliente, aciona a API administrativa segura que sincroniza Auth + Aluno
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/admin/alunos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...dados }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          notifyMutation();
          return { success: true, data: json.data };
        }
        return {
          success: false,
          error: json.error || "Erro ao atualizar dados do aluno no servidor.",
          fieldErrors: json.fieldErrors,
        };
      } catch (apiErr: unknown) {
        console.warn("[alunoSupabaseRepository] Fallback para atualização direta no banco:", apiErr);
      }
    }

    const supabase = getSupabase();

    const payload: {
      nome_completo?: string;
      email?: string;
      telefone?: string | null;
      objetivo?: string;
      nivel_operacional?: string;
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
    if (dados.objetivoIngles !== undefined) {
      payload.objetivo = normalizeText(dados.objetivoIngles);
    }
    if (dados.nivel !== undefined) {
      payload.nivel_operacional = dados.nivel;
    }
    if (dados.status !== undefined) {
      payload.status = dados.status;
    }
    if (dados.avatarUrl !== undefined) {
      payload.avatar_url = dados.avatarUrl || null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("alunos")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      if (
        updateError.code === "23505" ||
        updateError.message?.toLowerCase().includes("unique") ||
        updateError.message?.toLowerCase().includes("idx_alunos_email_lower")
      ) {
        return {
          success: false,
          error: "Este e-mail já está cadastrado para outro aluno.",
          fieldErrors: { email: "Este e-mail já está em uso por outro aluno." },
        };
      }
      return {
        success: false,
        error: `Erro ao atualizar aluno: ${updateError.message}`,
      };
    }

    let obsRetorno: string | undefined = undefined;

    if (dados.observacoesPedagogicas !== undefined) {
      const obsTexto = dados.observacoesPedagogicas
        ? normalizeText(dados.observacoesPedagogicas)
        : null;

      obsRetorno = obsTexto || undefined;

      const { error: upsertError } = await supabase
        .from("alunos_dados_pedagogicos")
        .upsert(
          {
            aluno_id: id,
            observacoes_pedagogicas: obsTexto,
          },
          { onConflict: "aluno_id" }
        );

      if (upsertError) {
        console.warn("[Supabase Alunos] Aviso ao atualizar observações pedagógicas:", upsertError);
      }
    }

    notifyMutation();

    return {
      success: true,
      data: mapRowToAluno(updated as AlunoDbRow, obsRetorno),
    };
  },

  async inativar(id: string): Promise<OperationResult<Aluno>> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("alunos")
      .update({ status: "inativo" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Erro ao inativar aluno: ${error.message}` };
    }

    notifyMutation();
    return { success: true, data: mapRowToAluno(data as AlunoDbRow) };
  },

  async reativar(id: string): Promise<OperationResult<Aluno>> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("alunos")
      .update({ status: "ativo" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Erro ao reativar aluno: ${error.message}` };
    }

    notifyMutation();
    return { success: true, data: mapRowToAluno(data as AlunoDbRow) };
  },

  async atualizarNivel(
    alunoId: string,
    novoNivel: NivelAluno,
    detalhes: {
      origem: OrigemAlteracaoNivel;
      origemReferenciaId?: string;
      professorId?: string;
      professorNome?: string;
      justificativa?: string;
    }
  ): Promise<OperationResult<Aluno>> {
    const supabase = getSupabase();

    const alunoAtual = await this.obterPorId(alunoId);
    if (!alunoAtual) {
      return { success: false, error: "Aluno não encontrado." };
    }

    const nivelAnterior = alunoAtual.nivel;

    const { data, error } = await supabase
      .from("alunos")
      .update({ nivel_operacional: novoNivel })
      .eq("id", alunoId)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Erro ao atualizar nível no banco: ${error.message}` };
    }

    // Registra alteração no repositório de histórico
    await historicoNivelRepository.registrarAlteracao({
      alunoId,
      nivelAnterior,
      novoNivel,
      origem: detalhes.origem,
      origemReferenciaId: detalhes.origemReferenciaId,
      professorId: detalhes.professorId,
      professorNome: detalhes.professorNome,
      justificativa: detalhes.justificativa,
    });

    notifyMutation();

    return {
      success: true,
      data: mapRowToAluno(data as AlunoDbRow),
    };
  },

  async contarAtivos(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");

    if (error) {
      console.warn("[Supabase Alunos] Erro ao contar alunos ativos:", error);
      return 0;
    }

    return count || 0;
  },

  async contarTotal(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("alunos")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.warn("[Supabase Alunos] Erro ao contar total de alunos:", error);
      return 0;
    }

    return count || 0;
  },
};
