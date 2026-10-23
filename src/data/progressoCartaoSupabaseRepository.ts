import { Cartao, CartaoProgressoAluno, RespostaSRS } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  progressoCartaoLocalStorageRepository,
  FilaEstudoBaralhoResultado,
} from "./progressoCartaoLocalStorageRepository";
import { inicializarProgressoCartao, processarRespostaSRS } from "./srsAlgorithm";
import { cartaoRepository } from "./cartaoRepository";

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

function getSupabase() {
  return createBrowserSupabaseClient();
}

export const progressoCartaoSupabaseRepository = {
  async obterProgresso(alunoId: string, cartaoId: string): Promise<CartaoProgressoAluno | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("progresso_cartoes_alunos")
        .select("*")
        .eq("aluno_id", alunoId)
        .eq("cartao_id", cartaoId)
        .maybeSingle();

      if (error || !data) {
        return progressoCartaoLocalStorageRepository.obterProgresso(alunoId, cartaoId);
      }
      return mapRowToProgresso(data as ProgressoDbRow);
    } catch {
      return progressoCartaoLocalStorageRepository.obterProgresso(alunoId, cartaoId);
    }
  },

  obterOuCriarProgresso(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    dataReferencia: Date = new Date()
  ): CartaoProgressoAluno {
    return progressoCartaoLocalStorageRepository.obterOuCriarProgresso(
      alunoId,
      cartaoId,
      baralhoId,
      dataReferencia
    );
  },

  async obterFilaEstudoBaralho(
    alunoId: string,
    baralhoId: string,
    limiteDiarioNovos = 20,
    dataReferencia: Date = new Date()
  ): Promise<FilaEstudoBaralhoResultado> {
    try {
      const cartoesAtivos = await cartaoRepository.getCartoesPorBaralho(baralhoId, true);
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from("progresso_cartoes_alunos")
        .select("*")
        .eq("aluno_id", alunoId)
        .eq("baralho_id", baralhoId);

      if (error) {
        console.warn("[Supabase SRS] Erro ao carregar fila, fallback local:", error.message);
        return progressoCartaoLocalStorageRepository.obterFilaEstudoBaralho(
          alunoId,
          baralhoId,
          limiteDiarioNovos,
          dataReferencia
        );
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
    } catch {
      return progressoCartaoLocalStorageRepository.obterFilaEstudoBaralho(
        alunoId,
        baralhoId,
        limiteDiarioNovos,
        dataReferencia
      );
    }
  },

  async registrarRespostaEstudo(
    alunoId: string,
    cartaoId: string,
    baralhoId: string,
    resposta: RespostaSRS,
    dataReferencia: Date = new Date()
  ): Promise<{
    progresso: CartaoProgressoAluno;
    historicoId: string;
    reagendadoParaRevisao: boolean;
    reagendadoMinutos?: number;
    reagendadoMesmaSessao: boolean;
  }> {
    try {
      const progressoAtual =
        (await this.obterProgresso(alunoId, cartaoId)) ||
        inicializarProgressoCartao(alunoId, cartaoId, baralhoId, dataReferencia);

      const resultado = processarRespostaSRS(progressoAtual, resposta, dataReferencia);
      const supabase = getSupabase();

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
        .upsert(payloadProgresso);

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
        console.warn("[Supabase SRS] Aviso ao inserir histórico de revisão:", histError.message);
      }

      // Sincroniza em cache local sem engolir erro de banco
      progressoCartaoLocalStorageRepository.registrarRespostaEstudo(
        alunoId,
        cartaoId,
        baralhoId,
        resposta,
        dataReferencia
      ).catch(() => {});

      return {
        progresso: resultado.novoProgresso,
        historicoId: histId,
        reagendadoParaRevisao: resultado.reagendadoParaRevisao,
        reagendadoMinutos: resultado.reagendadoMinutos,
        reagendadoMesmaSessao: resultado.reagendadoMesmaSessao,
      };
    } catch (err: unknown) {
      if (err instanceof Error) throw err;
      throw new Error(`Falha de conexão com o Supabase ao registrar resposta de estudo: ${String(err)}`);
    }
  },
};
