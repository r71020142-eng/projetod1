import { Cartao, OperationResult, StatusCartao } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { validateCartaoInput } from "./validators";

interface CartaoDbRow {
  id: string;
  baralho_id: string;
  frente: string;
  verso: string;
  exemplo: string | null;
  traducao: string | null;
  dica: string | null;
  pronuncia: string | null;
  link_audio: string | null;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRowToCartao(row: CartaoDbRow): Cartao {
  return {
    id: row.id,
    baralhoId: row.baralho_id,
    frente: row.frente,
    verso: row.verso,
    exemplo: row.exemplo || undefined,
    traducao: row.traducao || undefined,
    dica: row.dica || undefined,
    pronuncia: row.pronuncia || undefined,
    linkAudio: row.link_audio || undefined,
    tags: row.tags || [],
    status: row.status as StatusCartao,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function getSupabase() {
  return createBrowserSupabaseClient();
}

export const cartaoSupabaseRepository = {
  async getCartoesPorBaralho(baralhoId: string, apenasAtivos = false): Promise<Cartao[]> {
    const supabase = getSupabase();
    let query = supabase.from("cartoes").select("*").eq("baralho_id", baralhoId);
    if (apenasAtivos) {
      query = query.eq("status", "ativo");
    }
    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;
    if (error) {
      throw new Error(`[Supabase Cartoes] Erro ao listar cartões do baralho ${baralhoId}: ${error.message}`);
    }
    return ((data || []) as unknown as CartaoDbRow[]).map(mapRowToCartao);
  },

  async getCartaoById(id: string): Promise<Cartao | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("cartoes").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new Error(`[Supabase Cartoes] Erro ao buscar cartão ${id}: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return mapRowToCartao(data as CartaoDbRow);
  },

  async salvarCartao(dados: Partial<Cartao>): Promise<OperationResult<Cartao>> {
    const validation = validateCartaoInput(dados);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || "Dados do cartão inválidos.";
      return { success: false, error: firstError };
    }

    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {
        baralho_id: dados.baralhoId,
        frente: dados.frente!.trim(),
        verso: dados.verso!.trim(),
        exemplo: dados.exemplo?.trim() || null,
        traducao: dados.traducao?.trim() || null,
        dica: dados.dica?.trim() || null,
        pronuncia: dados.pronuncia?.trim() || null,
        link_audio: dados.linkAudio?.trim() || null,
        tags: dados.tags || [],
        status: dados.status || "ativo",
        updated_at: new Date().toISOString(),
      };

      if (dados.id) {
        const { data, error } = await supabase
          .from("cartoes")
          .update(payload)
          .eq("id", dados.id)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Erro ao atualizar cartão no Supabase: ${error.message}`,
          };
        }
        return { success: true, data: mapRowToCartao(data as CartaoDbRow) };
      } else {
        payload.id = `card-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        payload.created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("cartoes")
          .insert(payload)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Erro ao criar cartão no Supabase: ${error.message}`,
          };
        }
        return { success: true, data: mapRowToCartao(data as CartaoDbRow) };
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao salvar cartão: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async atualizarStatusCartao(id: string, novoStatus: StatusCartao): Promise<OperationResult<Cartao>> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("cartoes")
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao atualizar status do cartão no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: mapRowToCartao(data as CartaoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao atualizar status: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async excluirCartao(id: string): Promise<OperationResult<boolean>> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("cartoes").delete().eq("id", id);
      if (error) {
        return {
          success: false,
          error: `Erro ao excluir cartão no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao excluir cartão: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async importarCartoesCSV(
    baralhoId: string,
    itensValidos: Array<{
      frente: string;
      verso: string;
      exemplo?: string;
      traducao?: string;
      dica?: string;
      pronuncia?: string;
      tags?: string[];
    }>
  ): Promise<OperationResult<Cartao[]>> {
    if (!baralhoId) return { success: false, error: "BaralhoId não fornecido para importação." };
    if (!itensValidos || itensValidos.length === 0) return { success: false, error: "Nenhum item válido para importar." };

    try {
      const supabase = getSupabase();
      const nowIso = new Date().toISOString();
      const rows = itensValidos.map((item, idx) => ({
        id: `card-${Date.now().toString().slice(-6)}-${idx + 1}`,
        baralho_id: baralhoId,
        frente: item.frente.trim(),
        verso: item.verso.trim(),
        exemplo: item.exemplo?.trim() || null,
        traducao: item.traducao?.trim() || null,
        dica: item.dica?.trim() || null,
        pronuncia: item.pronuncia?.trim() || null,
        tags: item.tags || [],
        status: "ativo",
        created_at: nowIso,
        updated_at: nowIso,
      }));

      const { data, error } = await supabase.from("cartoes").insert(rows).select();
      if (error) {
        return {
          success: false,
          error: `Erro ao importar cartões via CSV no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: ((data || []) as unknown as CartaoDbRow[]).map(mapRowToCartao) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao importar CSV: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
