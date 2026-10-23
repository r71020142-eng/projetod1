import { Cartao, CartaoProgressoAluno, RespostaSRS } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { type FilaEstudoBaralhoResultado } from "./progressoCartaoLocalStorageRepository";
import { inicializarProgressoCartao, processarRespostaSRS } from "./srsAlgorithm";
import { SupabaseClient } from "@supabase/supabase-js";

interface ProgressoDbRow {
  id: string;
  aluno_id: string;
  cartao_id: string;
  baralho_id: string;
  estado: string;
  total_revisoes: number;
  total_lapsos: number;
  fator_facilidade: number;
  intervalo_dias: number;
  intervalo_minutos: number | null;
  proxima_revisao: string;
  ultima_revisao: string | null;
  ultima_resposta: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToProgresso(row: ProgressoDbRow): CartaoProgressoAluno {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    cartaoId: row.cartao_id,
    baralhoId: row.baralho_id,
    estado: row.estado as CartaoProgressoAluno["estado"],
    totalRevisoes: row.total_revisoes,
    totalLapsos: row.total_lapsos,
    fatorFacilidade: Number(row.fator_facilidade),
    intervaloDias: row.intervalo_dias,
    intervaloMinutos: row.intervalo_minutos || undefined,
    proximaRevisao: row.proxima_revisao,
    ultimaRevisao: row.ultima_revisao || undefined,
    ultimaResposta: (row.ultima_resposta as RespostaSRS) || undefined,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function getSupabase(clientOverride?: SupabaseClient) {
  return clientOverride || (createBrowserSupabaseClient() as unknown as SupabaseClient);
}

export const progressoCartaoSupabaseRepository = {
  async obterProgresso(alunoId: string, cartaoId: string, clientOverride?: SupabaseClient): Promise<CartaoProgressoAluno | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("progresso_cartoes_alunos")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("cartao_id", cartaoId)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase SRS] Erro ao obter progresso do cartão ${cartaoId}: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return mapRowToProgresso(data as ProgressoDbRow);
  },

  obterOuCriarProgresso(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    dataReferencia: Date = new Date()
  ): CartaoProgressoAluno {
    return inicializarProgressoCartao(alunoId, cartaoId, baralhoId, dataReferencia);
  },

  async obterFilaEstudoBaralho(
    alunoId: string,
    baralhoId: string,
    limiteDiarioNovos = 20,
    dataReferencia: Date = new Date(),
    clientOverride?: SupabaseClient
  ): Promise<FilaEstudoBaralhoResultado> {
    const supabase = getSupabase(clientOverride);
    const queryCartoes = supabase.from("cartoes").select("*").eq("baralho_id", baralhoId).eq("status", "ativo").order("created_at", { ascending: true });
    const { data: cartoesData, error: cartoesError } = await queryCartoes;
    if (cartoesError) {
      throw new Error(`[Supabase SRS] Erro ao listar cartões para fila de estudo: ${cartoesError.message}`);
    }
    const cartoesAtivos = (cartoesData || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      baralhoId: String(row.baralho_id),
      frente: String(row.frente),
      verso: String(row.verso),
      exemplo: row.exemplo ? String(row.exemplo) : undefined,
      traducao: row.traducao ? String(row.traducao) : undefined,
      dica: row.dica ? String(row.dica) : undefined,
      pronuncia: row.pronuncia ? String(row.pronuncia) : undefined,
      linkAudio: row.link_audio ? String(row.link_audio) : undefined,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      status: String(row.status) as Cartao["status"],
      criadoEm: String(row.created_at),
      atualizadoEm: String(row.updated_at),
    }));

    const { data, error } = await supabase
      .from("progresso_cartoes_alunos")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("baralho_id", baralhoId);

    if (error) {
      throw new Error(`[Supabase SRS] Erro ao carregar fila de estudo para baralho ${baralhoId}: ${error.message}`);
    }

    const progressosMap: Record<string, CartaoProgressoAluno> = {};
    const rows = ((data || []) as unknown as ProgressoDbRow[]).map(mapRowToProgresso);
    for (const p of rows) {
      progressosMap[p.cartaoId] = p;
    }

    for (const c of cartoesAtivos) {
      if (!progressosMap[c.id]) {
        progressosMap[c.id] = inicializarProgressoCartao(alunoId, c.id, baralhoId, dataReferencia);
      }
    }

    const agoraTime = dataReferencia.getTime();
    const vencidosRevisao: Cartao[] = [];
    const vencidosAprendendo: Cartao[] = [];
    const novosDisponiveis: Cartao[] = [];

    for (const c of cartoesAtivos) {
      const prog = progressosMap[c.id];
      if (prog.estado === "suspenso") continue;

      if (prog.estado === "revisao") {
        if (new Date(prog.proximaRevisao).getTime() <= agoraTime) {
          vencidosRevisao.push(c);
        }
      } else if (prog.estado === "aprendendo") {
        if (new Date(prog.proximaRevisao).getTime() <= agoraTime) {
          vencidosAprendendo.push(c);
        }
      } else if (prog.estado === "novo") {
        novosDisponiveis.push(c);
      }
    }

    vencidosRevisao.sort((a, b) => {
      const tA = new Date(progressosMap[a.id].proximaRevisao).getTime();
      const tB = new Date(progressosMap[b.id].proximaRevisao).getTime();
      return tA - tB;
    });

    vencidosAprendendo.sort((a, b) => {
      const tA = new Date(progressosMap[a.id].proximaRevisao).getTime();
      const tB = new Date(progressosMap[b.id].proximaRevisao).getTime();
      return tA - tB;
    });

    const novosSelecionados = novosDisponiveis.slice(0, Math.max(0, limiteDiarioNovos));

    const fila: Cartao[] = [
      ...vencidosRevisao,
      ...vencidosAprendendo,
      ...novosSelecionados,
    ];

    return {
      fila,
      cartoes: cartoesAtivos,
      progressos: progressosMap,
      totalVencidos: vencidosRevisao.length,
      totalAprendendo: vencidosAprendendo.length,
      totalNovos: novosSelecionados.length,
    };
  },

  async registrarRespostaEstudo(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    resposta: RespostaSRS,
    dataReferencia: Date = new Date(),
    clientOverride?: SupabaseClient
  ): Promise<{
    progresso: CartaoProgressoAluno;
    historicoId: string;
    reagendadoParaRevisao: boolean;
    reagendadoMinutos?: number;
    reagendadoMesmaSessao: boolean;
  }> {
    const progressoAtual =
      (await this.obterProgresso(alunoId, cartaoId, clientOverride)) ||
      inicializarProgressoCartao(alunoId, cartaoId, baralhoId, dataReferencia);

    const resultado = processarRespostaSRS(progressoAtual, resposta, dataReferencia);
    const supabase = getSupabase(clientOverride);

    // Upsert no progresso
    const payloadProgresso = {
      id: resultado.novoProgresso.id,
      aluno_id: alunoId,
      cartao_id: cartaoId,
      baralho_id: baralhoId,
      estado: resultado.novoProgresso.estado,
      total_revisoes: resultado.novoProgresso.totalRevisoes,
      total_lapsos: resultado.novoProgresso.totalLapsos,
      fator_facilidade: resultado.novoProgresso.fatorFacilidade,
      intervalo_dias: resultado.novoProgresso.intervaloDias,
      intervalo_minutos: resultado.novoProgresso.intervaloMinutos || null,
      proxima_revisao: resultado.novoProgresso.proximaRevisao,
      ultima_revisao: resultado.novoProgresso.ultimaRevisao || new Date().toISOString(),
      ultima_resposta: resposta,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("progresso_cartoes_alunos")
      .upsert(payloadProgresso, { onConflict: "aluno_id, cartao_id" });

    if (upsertError) {
      throw new Error(`Erro ao salvar progresso do cartão no Supabase: ${upsertError.message}`);
    }

    // Inserção no histórico
    const histId = `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payloadHist = {
      id: histId,
      aluno_id: alunoId,
      cartao_id: cartaoId,
      baralho_id: baralhoId,
      data_hora: resultado.registroHistorico.dataHora,
      resposta: resultado.registroHistorico.resposta,
      estado_anterior: resultado.registroHistorico.estadoAnterior,
      intervalo_anterior: resultado.registroHistorico.intervaloAnterior,
      novo_estado: resultado.registroHistorico.novoEstado,
      novo_intervalo: resultado.registroHistorico.novoIntervalo,
      tempo_resposta_ms: null,
    };

    const { error: histError } = await supabase.from("historico_revisoes_srs").insert(payloadHist);
    if (histError) {
      throw new Error(`Erro ao registrar histórico de revisão no Supabase: ${histError.message}`);
    }

    return {
      progresso: resultado.novoProgresso,
      historicoId: histId,
      reagendadoParaRevisao: resultado.reagendadoParaRevisao,
      reagendadoMinutos: resultado.reagendadoMinutos,
      reagendadoMesmaSessao: resultado.reagendadoMesmaSessao,
    };
  },
};
