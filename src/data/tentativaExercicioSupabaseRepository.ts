import {
  TentativaExercicio,
  RespostaItemExercicio,
  OperationResult,
} from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { exercicioSupabaseRepository } from "./exercicioSupabaseRepository";
import {
  corrigirQuestaoObjetiva,
  calcularNotaAvaliacaoObjetiva,
} from "./pedagogicoCalculos";

interface TentativaDbRow {
  id: string;
  exercicio_id: string;
  exercicio_titulo: string;
  exercicio_tipo: string;
  exercicio_nivel: string;
  versao_exercicio: number;
  aluno_id: string;
  aluno_nome: string | null;
  numero_tentativa: number;
  iniciada_em: string;
  concluida_em: string | null;
  tempo_gasto_segundos: number;
  status: string;
  respostas: unknown;
  questoes_snapshot: unknown;
  total_questoes: number;
  total_acertos: number;
  total_erros: number;
  pontos_obtidos: number;
  pontos_totais: number;
  nota_final: number;
  percentual_aproveitamento: number;
  aprovado: boolean;
  politica_gabarito: string;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Tentativas Exercícios] Cliente Supabase não pôde ser inicializado."
    );
  }
  return client;
}

function mapRowToTentativa(row: TentativaDbRow): TentativaExercicio {
  return {
    id: row.id,
    exercicioId: row.exercicio_id,
    exercicioTitulo: row.exercicio_titulo,
    exercicioTipo: row.exercicio_tipo as TentativaExercicio["exercicioTipo"],
    exercicioNivel: row.exercicio_nivel as TentativaExercicio["exercicioNivel"],
    versaoExercicio: row.versao_exercicio || 1,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome || undefined,
    numeroTentativa: row.numero_tentativa || 1,
    iniciadaEm: row.iniciada_em || row.created_at,
    concluidaEm: row.concluida_em || undefined,
    tempoGastoSegundos: Number(row.tempo_gasto_segundos || 0),
    status: row.status as TentativaExercicio["status"],
    respostas: Array.isArray(row.respostas) ? row.respostas : [],
    questoesSnapshot: Array.isArray(row.questoes_snapshot) ? row.questoes_snapshot : [],
    totalQuestoes: Number(row.total_questoes || 0),
    totalAcertos: Number(row.total_acertos || 0),
    totalErros: Number(row.total_erros || 0),
    pontosObtidos: Number(row.pontos_obtidos || 0),
    pontosTotais: Number(row.pontos_totais || 10),
    notaFinal: Number(row.nota_final || 0),
    percentualAproveitamento: Number(row.percentual_aproveitamento || 0),
    aprovado: Boolean(row.aprovado),
    politicaGabarito: (row.politica_gabarito as TentativaExercicio["politicaGabarito"]) || "apos_tentativa",
  };
}

export const tentativaExercicioSupabaseRepository = {
  async iniciarTentativa(dados: {
    exercicioId: string;
    alunoId: string;
    alunoNome?: string;
  }): Promise<OperationResult<TentativaExercicio>> {
    try {
      const exercicio = await exercicioSupabaseRepository.obterPorId(dados.exercicioId);
      if (!exercicio) {
        return { success: false, error: "Exercício não encontrado." };
      }

      const supabase = getSupabase();

      // Checa se já existe tentativa em andamento
      const { data: emAndamento } = await supabase
        .from("tentativas_exercicios")
        .select("*")
        .eq("exercicio_id", dados.exercicioId)
        .eq("aluno_id", dados.alunoId)
        .eq("status", "em_andamento")
        .maybeSingle();

      if (emAndamento) {
        return { success: true, data: mapRowToTentativa(emAndamento as TentativaDbRow) };
      }

      // Conta quantas tentativas já foram realizadas
      const { count } = await supabase
        .from("tentativas_exercicios")
        .select("*", { count: "exact", head: true })
        .eq("exercicio_id", dados.exercicioId)
        .eq("aluno_id", dados.alunoId);

      const proximoNumero = (count || 0) + 1;
      const agora = new Date().toISOString();

      const payload = {
        exercicio_id: exercicio.id,
        exercicio_titulo: exercicio.titulo,
        exercicio_tipo: exercicio.tipo,
        exercicio_nivel: exercicio.nivel,
        versao_exercicio: exercicio.versao || 1,
        aluno_id: dados.alunoId,
        aluno_nome: dados.alunoNome || "Aluno",
        numero_tentativa: proximoNumero,
        iniciada_em: agora,
        tempo_gasto_segundos: 0,
        status: "em_andamento",
        respostas: [],
        questoes_snapshot: exercicio.questoes,
        total_questoes: exercicio.questoes.length,
        total_acertos: 0,
        total_erros: 0,
        pontos_obtidos: 0,
        pontos_totais: exercicio.notaMaxima || 10,
        nota_final: 0,
        percentual_aproveitamento: 0,
        aprovado: false,
        politica_gabarito: exercicio.politicaGabarito,
      };

      const { data: nova, error } = await supabase
        .from("tentativas_exercicios")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: mapRowToTentativa(nova as TentativaDbRow) };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao iniciar tentativa." };
    }
  },

  async concluirTentativa(dados: {
    tentativaId: string;
    respostas: { questaoId: string; alternativaEscolhidaId?: string }[];
    tempoGastoSegundos: number;
  }): Promise<OperationResult<TentativaExercicio>> {
    try {
      const supabase = getSupabase();
      const { data: raw, error: fetchErr } = await supabase
        .from("tentativas_exercicios")
        .select("*")
        .eq("id", dados.tentativaId)
        .single();

      if (fetchErr || !raw) {
        return { success: false, error: "Tentativa não encontrada." };
      }

      const tentativa = mapRowToTentativa(raw as TentativaDbRow);
      const questoes = tentativa.questoesSnapshot || [];
      const agora = new Date().toISOString();

      const mapaRespostasEntrada = new Map<string, string | undefined>();
      dados.respostas.forEach((r) => mapaRespostasEntrada.set(r.questaoId, r.alternativaEscolhidaId));

      const respostasProcessadas: RespostaItemExercicio[] = [];
      let totalAcertos = 0;
      let totalErros = 0;

      for (const q of questoes) {
        const altEscolhida = mapaRespostasEntrada.get(q.id);
        const res = corrigirQuestaoObjetiva(q, altEscolhida);
        if (res.correta) {
          totalAcertos++;
        } else {
          totalErros++;
        }
        respostasProcessadas.push({
          questaoId: q.id,
          alternativaEscolhidaId: altEscolhida,
          correta: res.correta,
          pontosObtidos: res.pontosObtidos,
          respondidaEm: agora,
        });
      }

      const calculo = calcularNotaAvaliacaoObjetiva(
        questoes,
        respostasProcessadas.map((r) => ({
          questaoId: r.questaoId,
          alternativaEscolhidaId: r.alternativaEscolhidaId,
          correta: r.correta,
          pontosObtidos: r.pontosObtidos || 0,
        })),
        tentativa.pontosTotais || 10
      );

      const percentual =
        questoes.length > 0 ? Math.round((totalAcertos / questoes.length) * 100) : 0;
      const aprovado = calculo.notaFinal >= 7.0;

      const payload = {
        status: "concluida",
        concluida_em: agora,
        tempo_gasto_segundos: dados.tempoGastoSegundos || 0,
        respostas: respostasProcessadas,
        total_acertos: totalAcertos,
        total_erros: totalErros,
        pontos_obtidos: calculo.somaPontosObtidos,
        nota_final: calculo.notaFinal,
        percentual_aproveitamento: percentual,
        aprovado,
        updated_at: agora,
      };

      const { data: updated, error: updateErr } = await supabase
        .from("tentativas_exercicios")
        .update(payload)
        .eq("id", dados.tentativaId)
        .select("*")
        .single();

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      return { success: true, data: mapRowToTentativa(updated as TentativaDbRow) };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao concluir tentativa." };
    }
  },

  async obterPorId(id: string): Promise<TentativaExercicio | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tentativas_exercicios")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToTentativa(data as TentativaDbRow);
  },

  async listarPorAluno(
    alunoId: string,
    exercicioId?: string
  ): Promise<TentativaExercicio[]> {
    const supabase = getSupabase();
    let query = supabase
      .from("tentativas_exercicios")
      .select("*")
      .eq("aluno_id", alunoId);

    if (exercicioId) {
      query = query.eq("exercicio_id", exercicioId);
    }

    const { data, error } = await query.order("iniciada_em", { ascending: false });
    if (error) {
      throw new Error(`[Supabase Tentativas] Erro ao listar: ${error.message}`);
    }

    return ((data || []) as unknown[]).map((r) => mapRowToTentativa(r as TentativaDbRow));
  },

  async listarPorExercicio(exercicioId: string): Promise<TentativaExercicio[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tentativas_exercicios")
      .select("*")
      .eq("exercicio_id", exercicioId)
      .order("iniciada_em", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Tentativas] Erro ao listar: ${error.message}`);
    }

    return ((data || []) as unknown[]).map((r) => mapRowToTentativa(r as TentativaDbRow));
  },

  async obterUltimaTentativa(
    alunoId: string,
    exercicioId: string
  ): Promise<TentativaExercicio | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tentativas_exercicios")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("exercicio_id", exercicioId)
      .order("iniciada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToTentativa(data as TentativaDbRow);
  },

  async obterResumoDesempenho(alunoId: string): Promise<{
    totalConcluidos: number;
    mediaNotas: number;
    totalAcertos: number;
    totalQuestoes: number;
    percentualGeral: number;
  }> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tentativas_exercicios")
      .select("nota_final, total_acertos, total_questoes")
      .eq("aluno_id", alunoId)
      .eq("status", "concluida");

    if (error || !data || data.length === 0) {
      return {
        totalConcluidos: 0,
        mediaNotas: 0,
        totalAcertos: 0,
        totalQuestoes: 0,
        percentualGeral: 0,
      };
    }

    const dataRows = data as Array<{ nota_final?: number; total_acertos?: number; total_questoes?: number }>;
    const totalConcluidos = dataRows.length;
    const somaNotas = dataRows.reduce((acc, r) => acc + Number(r.nota_final || 0), 0);
    const mediaNotas = Number((somaNotas / totalConcluidos).toFixed(1));
    const totalAcertos = dataRows.reduce((acc, r) => acc + Number(r.total_acertos || 0), 0);
    const totalQuestoes = dataRows.reduce((acc, r) => acc + Number(r.total_questoes || 0), 0);
    const percentualGeral =
      totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    return {
      totalConcluidos,
      mediaNotas,
      totalAcertos,
      totalQuestoes,
      percentualGeral,
    };
  },
};
