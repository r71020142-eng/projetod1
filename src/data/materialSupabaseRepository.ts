import { Material, MaterialFilters, OperationResult } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { validateMaterialInput, normalizeText } from "./validators";

interface MaterialDbRow {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  categoria: string;
  nivel_recomendado: string;
  autor_id: string;
  autor_nome: string | null;
  data_publicacao: string;
  status: string;
  destino_tipo: string;
  destino_id: string | null;
  link_externo: string | null;
  conteudo_texto: string | null;
  tags: string[];
  observacoes_internas: string | null;
  modulo_id: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Materiais] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToMaterial(row: MaterialDbRow): Material {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    tipo: row.tipo as Material["tipo"],
    categoria: row.categoria,
    nivelRecomendado: row.nivel_recomendado as Material["nivelRecomendado"],
    autorId: row.autor_id,
    autorNome: row.autor_nome || undefined,
    dataPublicacao: row.data_publicacao,
    status: row.status as Material["status"],
    destinoTipo: row.destino_tipo as Material["destinoTipo"],
    destinoId: row.destino_id || undefined,
    linkExterno: row.link_externo || undefined,
    conteudoTexto: row.conteudo_texto || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    observacoesInternas: row.observacoes_internas || undefined,
    moduloId: row.modulo_id || undefined,
    moduleId: row.modulo_id || undefined,
    arquivoUrl: row.arquivo_url || undefined,
    arquivoNome: row.arquivo_nome || undefined,
    criadoEm: row.created_at,
  };
}

export const materialSupabaseRepository = {
  async listar(filters?: MaterialFilters): Promise<Material[]> {
    const supabase = getSupabase();
    let query = supabase.from("materiais").select("*");

    if (filters?.status && filters.status !== "todos") {
      query = query.eq("status", filters.status);
    }
    if (filters?.tipo && filters.tipo !== "todos") {
      query = query.eq("tipo", filters.tipo);
    }
    if (filters?.nivel && filters.nivel !== "todos") {
      query = query.in("nivel_recomendado", [filters.nivel, "todos"]);
    }
    if (filters?.destinoTipo && filters.destinoTipo !== "todos") {
      query = query.eq("destino_tipo", filters.destinoTipo);
    }
    if (filters?.destinoId) {
      query = query.eq("destino_id", filters.destinoId);
    }
    if (filters?.moduloId) {
      query = query.eq("modulo_id", filters.moduloId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Materiais] Erro ao listar materiais: ${error.message}`);
    }

    let result = (data as MaterialDbRow[]).map(mapRowToMaterial);

    if (filters?.busca) {
      const q = filters.busca.toLowerCase();
      result = result.filter(
        (m) =>
          m.titulo.toLowerCase().includes(q) ||
          m.descricao.toLowerCase().includes(q) ||
          m.categoria.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  },

  async listarParaAluno(alunoId: string, turmasIds: string[] = []): Promise<Material[]> {
    const supabase = getSupabase();
    // Consulta prioritária via view de segurança com security_barrier
    const { data, error } = await supabase
      .from("vw_aluno_materiais")
      .select("*")
      .order("data_publicacao", { ascending: false });

    if (!error && data) {
      return (data as MaterialDbRow[]).map(mapRowToMaterial);
    }

    // Se view retornar erro, consulta tabela aplicando isolamento estrito
    const query = supabase
      .from("materiais")
      .select("*")
      .eq("status", "publicado")
      .lte("data_publicacao", new Date().toISOString().slice(0, 10));

    const { data: directData, error: directErr } = await query;
    if (directErr) {
      throw new Error(`[Supabase Materiais] Erro ao listar materiais para aluno: ${directErr.message}`);
    }

    return (directData as MaterialDbRow[])
      .map(mapRowToMaterial)
      .filter((m) => {
        if (m.destinoTipo === "geral") return true;
        if (m.destinoTipo === "turma" && m.destinoId && turmasIds.includes(m.destinoId)) return true;
        if (m.destinoTipo === "aluno" && m.destinoId === alunoId) return true;
        return false;
      })
      .map((m) => ({
        ...m,
        observacoesInternas: undefined,
      }));
  },

  async obterPorId(id: string): Promise<Material | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("materiais").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new Error(`[Supabase Materiais] Erro ao obter material ${id}: ${error.message}`);
    }
    if (!data) return null;
    return mapRowToMaterial(data as MaterialDbRow);
  },

  async obterPorIdParaAluno(
    id: string,
    alunoId: string,
    turmasIds: string[] = []
  ): Promise<Material | null> {
    const mat = await this.obterPorId(id);
    if (!mat) return null;

    const hoje = new Date().toISOString().slice(0, 10);
    if (mat.status !== "publicado") return null;
    if (mat.dataPublicacao && mat.dataPublicacao > hoje) return null;

    let temAcesso = false;
    if (mat.destinoTipo === "geral") temAcesso = true;
    if (mat.destinoTipo === "turma" && mat.destinoId && turmasIds.includes(mat.destinoId)) temAcesso = true;
    if (mat.destinoTipo === "aluno" && mat.destinoId === alunoId) temAcesso = true;

    if (!temAcesso) return null;

    return {
      ...mat,
      observacoesInternas: undefined,
    };
  },

  async criar(dados: Partial<Material>): Promise<OperationResult<Material>> {
    const validation = validateMaterialInput(dados);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados do material preenchidos.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    try {
      const supabase = getSupabase();
      const payload = {
        titulo: normalizeText(dados.titulo!),
        descricao: normalizeText(dados.descricao!),
        tipo: dados.tipo!,
        categoria: normalizeText(dados.categoria!),
        nivel_recomendado: dados.nivelRecomendado || "todos",
        autor_id: dados.autorId!,
        autor_nome: dados.autorNome ? normalizeText(dados.autorNome) : null,
        data_publicacao: dados.dataPublicacao || new Date().toISOString().slice(0, 10),
        status: dados.status || "rascunho",
        destino_tipo: dados.destinoTipo || "geral",
        destino_id: dados.destinoId || null,
        link_externo: dados.linkExterno ? dados.linkExterno.trim() : null,
        conteudo_texto: dados.conteudoTexto ? dados.conteudoTexto.trim() : null,
        tags: dados.tags ? dados.tags.map(normalizeText) : [],
        observacoes_internas: dados.observacoesInternas ? normalizeText(dados.observacoesInternas) : null,
        modulo_id: dados.moduloId || dados.moduleId || null,
        arquivo_url: dados.arquivoUrl ? dados.arquivoUrl.trim() : null,
        arquivo_nome: dados.arquivoNome ? normalizeText(dados.arquivoNome) : null,
      };

      const { data, error } = await supabase.from("materiais").insert(payload).select().single();
      if (error) {
        return {
          success: false,
          error: `Erro ao salvar material no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToMaterial(data as MaterialDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao criar material: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async atualizar(id: string, dados: Partial<Material>): Promise<OperationResult<Material>> {
    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {};

      if (dados.titulo !== undefined) payload.titulo = normalizeText(dados.titulo);
      if (dados.descricao !== undefined) payload.descricao = normalizeText(dados.descricao);
      if (dados.tipo !== undefined) payload.tipo = dados.tipo;
      if (dados.categoria !== undefined) payload.categoria = normalizeText(dados.categoria);
      if (dados.nivelRecomendado !== undefined) payload.nivel_recomendado = dados.nivelRecomendado;
      if (dados.status !== undefined) payload.status = dados.status;
      if (dados.destinoTipo !== undefined) payload.destino_tipo = dados.destinoTipo;
      if (dados.destinoId !== undefined) payload.destino_id = dados.destinoId || null;
      if (dados.linkExterno !== undefined) payload.link_externo = dados.linkExterno ? dados.linkExterno.trim() : null;
      if (dados.conteudoTexto !== undefined) payload.conteudo_texto = dados.conteudoTexto ? dados.conteudoTexto.trim() : null;
      if (dados.tags !== undefined) payload.tags = dados.tags.map(normalizeText);
      if (dados.observacoesInternas !== undefined) payload.observacoes_internas = dados.observacoesInternas ? normalizeText(dados.observacoesInternas) : null;
      if (dados.moduloId !== undefined || dados.moduleId !== undefined) payload.modulo_id = dados.moduloId || dados.moduleId || null;

      const { data, error } = await supabase.from("materiais").update(payload).eq("id", id).select().single();
      if (error) {
        return {
          success: false,
          error: `Erro ao atualizar material no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToMaterial(data as MaterialDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao atualizar material: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async arquivar(id: string): Promise<OperationResult<Material>> {
    return this.atualizar(id, { status: "arquivado" });
  },

  async restaurar(id: string): Promise<OperationResult<Material>> {
    return this.atualizar(id, { status: "publicado" });
  },

  async contarPublicados(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("materiais")
      .select("*", { count: "exact", head: true })
      .eq("status", "publicado");
    if (error) {
      throw new Error(`[Supabase Materiais] Erro ao contar materiais publicados: ${error.message}`);
    }
    return count ?? 0;
  },

  async contarAgendados(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("materiais")
      .select("*", { count: "exact", head: true })
      .eq("status", "agendado");
    if (error) {
      throw new Error(`[Supabase Materiais] Erro ao contar materiais agendados: ${error.message}`);
    }
    return count ?? 0;
  },
};
