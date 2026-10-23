import {
  TentativaAvaliacao,
  ResultadoAvaliacao,
  OperationResult,
  TentativaFilters,
  RespostaQuestaoObjetiva,
  RespostaAvaliacaoPratica,
  CorrecaoItemRubrica,
  FeedbackAvaliacao,
  AutorizacaoTentativaExtra,
  PoliticaExibicaoGabarito,
} from "../types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { tentativaAvaliacaoLocalStorageRepository, sanitizarTentativaParaAluno } from "./tentativaAvaliacaoLocalStorageRepository";
import { avaliacaoRepository } from "./avaliacaoRepository";
import {
  corrigirQuestaoObjetiva,
  calcularNotaAvaliacaoObjetiva,
  calcularNotaAvaliacaoPratica,
} from "./pedagogicoCalculos";

interface TentativaDbRow {
  id: string;
  avaliacao_id: string;
  versao_avaliacao: number;
  aluno_id: string;
  aluno_nome: string | null;
  numero_tentativa: number;
  iniciada_em: string;
  enviada_em: string | null;
  status: string;
  respostas_objetivas: unknown;
  resposta_pratica: unknown;
  nota: number | null;
  nota_maxima: number | null;
  resultado: string | null;
  feedback: unknown;
  atrasada: boolean;
  politica_gabarito_utilizada: string | null;
  autorizacao_tentativa_extra: unknown;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Tentativas] Cliente Supabase não pôde ser inicializado."
    );
  }
  return client;
}

function mapRowToTentativa(row: TentativaDbRow): TentativaAvaliacao {
  return {
    id: row.id,
    avaliacaoId: row.avaliacao_id,
    versaoAvaliacao: row.versao_avaliacao,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome || undefined,
    numeroTentativa: row.numero_tentativa,
    iniciadaEm: row.iniciada_em,
    enviadaEm: row.enviada_em || undefined,
    status: row.status as TentativaAvaliacao["status"],
    respostasObjetivas: Array.isArray(row.respostas_objetivas) ? row.respostas_objetivas : undefined,
    respostaPratica: (row.resposta_pratica as RespostaAvaliacaoPratica) || undefined,
    nota: row.nota !== null ? Number(row.nota) : undefined,
    notaMaxima: row.nota_maxima !== null ? Number(row.nota_maxima) : undefined,
    resultado: (row.resultado as ResultadoAvaliacao) || undefined,
    feedback: (row.feedback as FeedbackAvaliacao) || undefined,
    atrasada: row.atrasada ?? false,
    politicaGabaritoUtilizada: (row.politica_gabarito_utilizada as PoliticaExibicaoGabarito) || undefined,
    autorizacaoTentativaExtra: (row.autorizacao_tentativa_extra as AutorizacaoTentativaExtra) || undefined,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export const tentativaAvaliacaoSupabaseRepository = {
  async listar(filters?: TentativaFilters): Promise<TentativaAvaliacao[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("tentativas_avaliacoes").select("*");

      if (filters?.avaliacaoId) query = query.eq("avaliacao_id", filters.avaliacaoId);
      if (filters?.alunoId) query = query.eq("aluno_id", filters.alunoId);
      if (filters?.status && filters.status !== "todos") query = query.eq("status", filters.status);
      if (filters?.resultado && filters.resultado !== "todos") query = query.eq("resultado", filters.resultado);

      const { data, error } = await query.order("iniciada_em", { ascending: false });
      if (error) {
        console.warn("[Supabase Tentativas] Erro ao listar, fallback local:", error.message);
        return tentativaAvaliacaoLocalStorageRepository.listar(filters);
      }
      return (data as TentativaDbRow[]).map(mapRowToTentativa);
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.listar(filters);
    }
  },

  async listarPorAluno(alunoId: string): Promise<TentativaAvaliacao[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("tentativas_avaliacoes")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("iniciada_em", { ascending: false });

      if (error) {
        return tentativaAvaliacaoLocalStorageRepository.listarPorAluno(alunoId);
      }
      return (data as TentativaDbRow[]).map(mapRowToTentativa).map((t) => sanitizarTentativaParaAluno(t));
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.listarPorAluno(alunoId);
    }
  },

  async obterPorId(id: string, paraAluno = false): Promise<TentativaAvaliacao | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("tentativas_avaliacoes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return tentativaAvaliacaoLocalStorageRepository.obterPorId(id, paraAluno);
      }
      const tent = mapRowToTentativa(data as TentativaDbRow);
      if (paraAluno) {
        return sanitizarTentativaParaAluno(tent);
      }
      return tent;
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.obterPorId(id, paraAluno);
    }
  },

  async iniciarTentativa(
    avaliacaoId: string,
    alunoId: string,
    alunoNome: string
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const avaliacao = await avaliacaoRepository.obterPorId(avaliacaoId);
    if (!avaliacao) {
      return { success: false, error: "Avaliação não encontrada." };
    }
    if (avaliacao.status !== "publicada") {
      return { success: false, error: "Esta avaliação não está disponível para tentativas no momento." };
    }

    try {
      const supabase = getSupabase();
      const { data: tentativasAluno, error: tErr } = await supabase
        .from("tentativas_avaliacoes")
        .select("*")
        .eq("avaliacao_id", avaliacaoId)
        .eq("aluno_id", alunoId);

      if (tErr) {
        return tentativaAvaliacaoLocalStorageRepository.iniciarTentativa(avaliacaoId, alunoId, alunoNome);
      }

      const rows = (tentativasAluno as TentativaDbRow[]).map(mapRowToTentativa);
      const emAndamento = rows.find((t) => t.status === "em_andamento");
      if (emAndamento) {
        return { success: true, data: sanitizarTentativaParaAluno(emAndamento) };
      }

      const concluidas = rows.filter(
        (t) => t.status === "enviada" || t.status === "corrigida" || t.status === "aguardando_correcao"
      );
      const possuiExtra = rows.some((t) => t.autorizacaoTentativaExtra);

      if (concluidas.length >= avaliacao.maxTentativas && !possuiExtra) {
        return {
          success: false,
          error: `Você já utilizou o limite máximo de ${avaliacao.maxTentativas} tentativa(s) permitida(s) para esta avaliação.`,
        };
      }

      const agora = new Date().toISOString();
      const novoNum = rows.length + 1;

      const payload = {
        avaliacao_id: avaliacaoId,
        versao_avaliacao: avaliacao.versao,
        aluno_id: alunoId,
        aluno_nome: alunoNome,
        numero_tentativa: novoNum,
        iniciada_em: agora,
        status: "em_andamento",
        nota_maxima: avaliacao.notaMaxima,
        atrasada: avaliacao.prazo ? new Date().getTime() > new Date(avaliacao.prazo).getTime() : false,
        politica_gabarito_utilizada: avaliacao.politicaGabarito,
      };

      const { data, error } = await supabase.from("tentativas_avaliacoes").insert(payload).select().single();
      if (error) {
        console.warn("[Supabase Tentativas] Erro ao iniciar, fallback local:", error.message);
        return tentativaAvaliacaoLocalStorageRepository.iniciarTentativa(avaliacaoId, alunoId, alunoNome);
      }

      return { success: true, data: sanitizarTentativaParaAluno(mapRowToTentativa(data as TentativaDbRow)) };
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.iniciarTentativa(avaliacaoId, alunoId, alunoNome);
    }
  },

  async salvarRascunho(
    tentativaId: string,
    alunoId: string,
    dadosEnvio?:
      | {
          respostasObjetivasMap?: Record<string, string>;
          respostaPratica?: RespostaAvaliacaoPratica;
        }
      | RespostaQuestaoObjetiva[],
    respostaPraticaExtra?: RespostaAvaliacaoPratica
  ): Promise<OperationResult<TentativaAvaliacao>> {
    try {
      const supabase = getSupabase();
      let respostasArr: RespostaQuestaoObjetiva[] | null = null;
      let respostaPratica: RespostaAvaliacaoPratica | undefined = respostaPraticaExtra;

      if (Array.isArray(dadosEnvio)) {
        respostasArr = dadosEnvio;
      } else if (dadosEnvio) {
        if (dadosEnvio.respostasObjetivasMap) {
          respostasArr = Object.entries(dadosEnvio.respostasObjetivasMap).map(
            ([questaoId, alternativaEscolhidaId]) => ({
              questaoId,
              alternativaEscolhidaId,
              respondidaEm: new Date().toISOString(),
            })
          );
        }
        if (!respostaPratica && dadosEnvio.respostaPratica) {
          respostaPratica = dadosEnvio.respostaPratica;
        }
      }

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (respostasArr) payload.respostas_objetivas = respostasArr;
      if (respostaPratica) payload.resposta_pratica = respostaPratica;

      const { data, error } = await supabase
        .from("tentativas_avaliacoes")
        .update(payload)
        .eq("id", tentativaId)
        .eq("aluno_id", alunoId)
        .select()
        .single();

      if (error) {
        return tentativaAvaliacaoLocalStorageRepository.salvarRascunho(
          tentativaId,
          alunoId,
          dadosEnvio,
          respostaPraticaExtra
        );
      }
      return { success: true, data: sanitizarTentativaParaAluno(mapRowToTentativa(data as TentativaDbRow)) };
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.salvarRascunho(
        tentativaId,
        alunoId,
        dadosEnvio,
        respostaPraticaExtra
      );
    }
  },

  async enviarTentativa(
    tentativaId: string,
    alunoId: string,
    dadosEnvio: {
      respostasObjetivasMap?: Record<string, string>;
      respostaPratica?: RespostaAvaliacaoPratica;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const tent = await this.obterPorId(tentativaId);
    if (!tent || tent.alunoId !== alunoId) {
      return { success: false, error: "Tentativa não encontrada." };
    }
    if (tent.status !== "em_andamento") {
      return { success: false, error: "Esta tentativa já foi enviada." };
    }

    const avaliacao = await avaliacaoRepository.obterPorId(tent.avaliacaoId);
    if (!avaliacao) {
      return { success: false, error: "Avaliação vinculada não encontrada." };
    }

    const agora = new Date().toISOString();
    const atrasada = avaliacao.prazo ? new Date().getTime() > new Date(avaliacao.prazo).getTime() : false;
    const politicaGabarito = tent.politicaGabaritoUtilizada || avaliacao.politicaGabarito || "gabarito_imediato";

    let payload: Record<string, unknown>;

    if (avaliacao.tipo === "objetiva") {
      const questoes = avaliacao.questoes || [];
      const mapaRespostas = dadosEnvio.respostasObjetivasMap || {};

      const respostasCorrigidas: RespostaQuestaoObjetiva[] = questoes.map((q) => {
        const altEscolhida = mapaRespostas[q.id];
        return corrigirQuestaoObjetiva(q, altEscolhida);
      });

      const { notaFinal } = calcularNotaAvaliacaoObjetiva(questoes, respostasCorrigidas, avaliacao.notaMaxima);
      const notaCorte = avaliacao.notaMinimaAprovacao ?? avaliacao.notaMaxima * 0.7;
      const resultado = notaFinal >= notaCorte ? "aprovado" : "precisa_reforco";

      payload = {
        enviada_em: agora,
        updated_at: agora,
        atrasada,
        politica_gabarito_utilizada: politicaGabarito,
        respostas_objetivas: respostasCorrigidas,
        nota: notaFinal,
        status: "corrigida",
        resultado,
      };
    } else {
      payload = {
        enviada_em: agora,
        updated_at: agora,
        atrasada,
        politica_gabarito_utilizada: politicaGabarito,
        resposta_pratica: dadosEnvio.respostaPratica || null,
        status: "aguardando_correcao",
      };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("tentativas_avaliacoes")
        .update(payload)
        .eq("id", tentativaId)
        .select()
        .single();

      if (error) {
        console.warn("[Supabase Tentativas] Erro ao enviar tentativa, fallback local:", error.message);
        return tentativaAvaliacaoLocalStorageRepository.enviarTentativa(tentativaId, alunoId, dadosEnvio);
      }

      return { success: true, data: sanitizarTentativaParaAluno(mapRowToTentativa(data as TentativaDbRow)) };
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.enviarTentativa(tentativaId, alunoId, dadosEnvio);
    }
  },

  async corrigirTentativaPratica(
    tentativaId: string,
    professorId: string,
    professorNome: string,
    dadosCorrecao: {
      itensRubrica: CorrecaoItemRubrica[];
      pontosFortes: string;
      pontosADesenvolver: string;
      orientacoes: string;
      observacoesInternas?: string;
      resultado?: ResultadoAvaliacao;
    }
  ): Promise<OperationResult<TentativaAvaliacao>> {
    const tent = await this.obterPorId(tentativaId);
    if (!tent) return { success: false, error: "Tentativa não encontrada." };

    const avaliacao = await avaliacaoRepository.obterPorId(tent.avaliacaoId);
    if (!avaliacao || avaliacao.tipo !== "pratica") {
      return { success: false, error: "Esta tentativa não pertence a uma avaliação prática." };
    }

    const { notaFinal } = calcularNotaAvaliacaoPratica(
      avaliacao.rubrica || [],
      dadosCorrecao.itensRubrica,
      avaliacao.notaMaxima
    );

    const notaCorte = avaliacao.notaMinimaAprovacao ?? (avaliacao.notaMaxima * 0.7);
    const resultadoCalculado: ResultadoAvaliacao =
      dadosCorrecao.resultado || (notaFinal >= notaCorte ? "aprovado" : "precisa_reforco");

    const agora = new Date().toISOString();
    const feedback: FeedbackAvaliacao = {
      corrigidoPorProfessorId: professorId,
      corrigidoPorProfessorNome: professorNome,
      corrigidoEm: agora,
      itensRubrica: dadosCorrecao.itensRubrica,
      pontosFortes: dadosCorrecao.pontosFortes.trim(),
      pontosADesenvolver: dadosCorrecao.pontosADesenvolver.trim(),
      orientacoes: dadosCorrecao.orientacoes.trim(),
      observacoesInternas: dadosCorrecao.observacoesInternas?.trim() || undefined,
      resultado: resultadoCalculado,
    };

    try {
      const supabase = getSupabase();
      const payload = {
        nota: notaFinal,
        resultado: resultadoCalculado,
        feedback,
        status: "corrigida",
        updated_at: agora,
      };

      const { data, error } = await supabase
        .from("tentativas_avaliacoes")
        .update(payload)
        .eq("id", tentativaId)
        .select()
        .single();

      if (error) {
        console.warn("[Supabase Tentativas] Erro ao corrigir prática, fallback local:", error.message);
        return tentativaAvaliacaoLocalStorageRepository.corrigirTentativaPratica(
          tentativaId,
          professorId,
          professorNome,
          dadosCorrecao
        );
      }

      return { success: true, data: mapRowToTentativa(data as TentativaDbRow) };
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.corrigirTentativaPratica(
        tentativaId,
        professorId,
        professorNome,
        dadosCorrecao
      );
    }
  },

  async autorizarTentativaExtra(
    avaliacaoId: string,
    alunoId: string,
    professorId: string,
    professorNome: string,
    justificativa: string
  ): Promise<OperationResult<AutorizacaoTentativaExtra>> {
    if (!justificativa || justificativa.trim().length < 5) {
      return { success: false, error: "A justificativa para tentativa extra deve ter ao menos 5 caracteres." };
    }

    try {
      const supabase = getSupabase();
      const autorizacao: AutorizacaoTentativaExtra = {
        professorId,
        professorNome,
        justificativa: justificativa.trim(),
        autorizadoEm: new Date().toISOString(),
      };

      const { data: tentativas, error: tErr } = await supabase
        .from("tentativas_avaliacoes")
        .select("id")
        .eq("avaliacao_id", avaliacaoId)
        .eq("aluno_id", alunoId)
        .order("numero_tentativa", { ascending: false })
        .limit(1);

      if (tErr || !tentativas || tentativas.length === 0) {
        return tentativaAvaliacaoLocalStorageRepository.autorizarTentativaExtra(
          avaliacaoId,
          alunoId,
          professorId,
          professorNome,
          justificativa
        );
      }

      await supabase
        .from("tentativas_avaliacoes")
        .update({ autorizacao_tentativa_extra: autorizacao })
        .eq("id", tentativas[0].id);

      return { success: true, data: autorizacao };
    } catch {
      return tentativaAvaliacaoLocalStorageRepository.autorizarTentativaExtra(
        avaliacaoId,
        alunoId,
        professorId,
        professorNome,
        justificativa
      );
    }
  },
};
