import { SessaoEstudoResumo } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

interface SessaoDbRow {
  id: string;
  aluno_id: string;
  baralho_id: string;
  iniciada_em: string;
  concluida_em: string;
  total_estudado: number;
  erros: number;
  dificeis: number;
  bons: number;
  faceis: number;
  tempo_segundos: number;
  revisoes_reagendadas: number;
  proxima_revisao_prevista: string | null;
  created_at: string;
}

function mapRowToSessao(row: SessaoDbRow): SessaoEstudoResumo {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    baralhoId: row.baralho_id,
    iniciadaEm: row.iniciada_em,
    concluidaEm: row.concluida_em,
    totalEstudado: row.total_estudado,
    erros: row.erros,
    dificeis: row.dificeis,
    bons: row.bons,
    faceis: row.faceis,
    tempoSegundos: row.tempo_segundos,
    revisoesReagendadas: row.revisoes_reagendadas,
    proximaRevisaoPrevista: row.proxima_revisao_prevista || undefined,
  };
}

function getSupabase(clientOverride?: SupabaseClient) {
  return clientOverride || (createBrowserSupabaseClient() as unknown as SupabaseClient);
}

export const sessaoEstudoSupabaseRepository = {
  async salvarSessaoEstudo(
    dados: Omit<SessaoEstudoResumo, "id">,
    clientOverride?: SupabaseClient
  ): Promise<SessaoEstudoResumo> {
    const supabase = getSupabase(clientOverride);
    const id = `sessao-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const payload = {
      id,
      aluno_id: dados.alunoId,
      baralho_id: dados.baralhoId,
      iniciada_em: dados.iniciadaEm,
      concluida_em: dados.concluidaEm,
      total_estudado: dados.totalEstudado,
      erros: dados.erros,
      dificeis: dados.dificeis,
      bons: dados.bons,
      faceis: dados.faceis,
      tempo_segundos: dados.tempoSegundos,
      revisoes_reagendadas: dados.revisoesReagendadas,
      proxima_revisao_prevista: dados.proximaRevisaoPrevista || null,
      created_at: nowIso,
    };

    const { data, error } = await supabase
      .from("sessoes_estudo_srs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(
        `[Supabase SRS] Erro ao salvar sessão de estudo: ${error.message}`
      );
    }

    return mapRowToSessao(data as SessaoDbRow);
  },

  async obterSessoesPorAluno(
    alunoId: string,
    baralhoId?: string,
    clientOverride?: SupabaseClient
  ): Promise<SessaoEstudoResumo[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase
      .from("sessoes_estudo_srs")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("concluida_em", { ascending: false });

    if (baralhoId) {
      query = query.eq("baralho_id", baralhoId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(
        `[Supabase SRS] Erro ao obter sessões de estudo para o aluno ${alunoId}: ${error.message}`
      );
    }

    return ((data || []) as unknown as SessaoDbRow[]).map(mapRowToSessao);
  },
};
