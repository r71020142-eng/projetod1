import {
  ExercicioInterativo,
  ExercicioFilters,
  OperationResult,
} from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { validarQuestaoExercicioInterativo } from "./pedagogicoCalculos";

interface ExercicioDbRow {
  id: string;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  tipo: string;
  nivel: string;
  categoria: string | null;
  texto_conteudo: string | null;
  audio_url: string | null;
  audio_nome: string | null;
  audio_duracao_segundos: number | null;
  questoes: unknown;
  baralho_vocabulario_id: string | null;
  destino_tipo: string;
  destino_turma_id: string | null;
  destino_aluno_id: string | null;
  professor_id: string;
  professor_nome: string | null;
  status: string;
  nota_maxima: number;
  nota_minima_aprovacao: number | null;
  politica_gabarito: string;
  tempo_estimado_minutos: number | null;
  versao: number;
  created_at: string;
  updated_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(val: string | null | undefined): boolean {
  return typeof val === "string" && UUID_REGEX.test(val);
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Exercícios] Cliente Supabase não pôde ser inicializado."
    );
  }
  return client;
}

function mapRowToExercicio(row: ExercicioDbRow): ExercicioInterativo {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao || "",
    instrucoes: row.instrucoes || "",
    tipo: row.tipo as ExercicioInterativo["tipo"],
    nivel: row.nivel as ExercicioInterativo["nivel"],
    categoria: row.categoria || "Geral",
    textoConteudo: row.texto_conteudo || undefined,
    audioUrl: row.audio_url || undefined,
    audioNome: row.audio_nome || undefined,
    audioDuracaoSegundos: row.audio_duracao_segundos !== null ? Number(row.audio_duracao_segundos) : undefined,
    questoes: Array.isArray(row.questoes) ? row.questoes : [],
    baralhoVocabularioId: row.baralho_vocabulario_id || undefined,
    destinoTipo: row.destino_tipo as ExercicioInterativo["destinoTipo"],
    destinoTurmaId: row.destino_turma_id || undefined,
    destinoAlunoId: row.destino_aluno_id || undefined,
    professorId: row.professor_id,
    professorNome: row.professor_nome || undefined,
    status: row.status as ExercicioInterativo["status"],
    notaMaxima: Number(row.nota_maxima || 10),
    notaMinimaAprovacao: row.nota_minima_aprovacao !== null ? Number(row.nota_minima_aprovacao) : 7.0,
    politicaGabarito: (row.politica_gabarito as ExercicioInterativo["politicaGabarito"]) || "apos_tentativa",
    tempoEstimadoMinutos: row.tempo_estimado_minutos !== null ? Number(row.tempo_estimado_minutos) : undefined,
    versao: row.versao || 1,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export const exercicioSupabaseRepository = {
  async listar(filters?: ExercicioFilters): Promise<ExercicioInterativo[]> {
    const supabase = getSupabase();
    let query = supabase.from("exercicios_interativos").select("*");

    if (filters?.tipo && filters.tipo !== "todos") query = query.eq("tipo", filters.tipo);
    if (filters?.nivel && filters.nivel !== "todos") query = query.eq("nivel", filters.nivel);
    if (filters?.status && filters.status !== "todos") query = query.eq("status", filters.status);
    if (filters?.categoria && filters.categoria !== "todas") query = query.eq("categoria", filters.categoria);
    if (filters?.professorId) {
      if (isUuid(filters.professorId)) {
        query = query.eq("professor_id", filters.professorId);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      throw new Error(`[Supabase Exercícios] Erro ao listar: ${error.message}`);
    }

    let rows = ((data || []) as unknown[]).map((r) => mapRowToExercicio(r as ExercicioDbRow));

    if (filters?.busca) {
      const q = filters.busca.toLowerCase().trim();
      rows = rows.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.descricao.toLowerCase().includes(q) ||
          e.categoria.toLowerCase().includes(q)
      );
    }

    return rows;
  },

  async listarParaAluno(
    alunoId: string,
    nivelAluno?: string,
    turmaIds: string[] = []
  ): Promise<ExercicioInterativo[]> {
    const supabase = getSupabase();
    // Usa view com security barrier ou consulta filtrada
    const { data, error } = await supabase
      .from("exercicios_interativos")
      .select("*")
      .eq("status", "publicado")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Exercícios] Erro ao listar para aluno: ${error.message}`);
    }

    const rows = ((data || []) as unknown[]).map((r) => mapRowToExercicio(r as ExercicioDbRow));

    return rows.filter((e) => {
      if (e.destinoTipo === "geral") return true;
      if (e.destinoTipo === "aluno") return e.destinoAlunoId === alunoId;
      if (e.destinoTipo === "turma") {
        return e.destinoTurmaId && turmaIds.includes(e.destinoTurmaId);
      }
      return false;
    });
  },

  async obterPorId(id: string): Promise<ExercicioInterativo | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("exercicios_interativos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Exercícios] Erro ao obter: ${error.message}`);
    }
    if (!data) return null;

    return mapRowToExercicio(data as ExercicioDbRow);
  },

  async criar(
    dados: Omit<ExercicioInterativo, "id" | "criadoEm" | "atualizadoEm" | "versao">
  ): Promise<OperationResult<ExercicioInterativo>> {
    try {
      if (!dados.titulo || dados.titulo.trim().length < 3) {
        return { success: false, error: "O título do exercício deve ter pelo menos 3 caracteres." };
      }
      if (!dados.questoes || dados.questoes.length === 0) {
        return { success: false, error: "O exercício deve possuir pelo menos uma questão." };
      }

      for (let i = 0; i < dados.questoes.length; i++) {
        const q = dados.questoes[i];
        const val = validarQuestaoExercicioInterativo(q);
        if (!val.isValid) {
          return {
            success: false,
            error: `Erro na Questão ${i + 1}: ${val.errors.join("; ")}`,
          };
        }
      }

      const supabase = getSupabase();
      const payload = {
        titulo: dados.titulo,
        descricao: dados.descricao,
        instrucoes: dados.instrucoes,
        tipo: dados.tipo,
        nivel: dados.nivel,
        categoria: dados.categoria,
        texto_conteudo: dados.textoConteudo || null,
        audio_url: dados.audioUrl || null,
        audio_nome: dados.audioNome || null,
        audio_duracao_segundos: dados.audioDuracaoSegundos || null,
        questoes: dados.questoes,
        baralho_vocabulario_id: dados.baralhoVocabularioId || null,
        destino_tipo: dados.destinoTipo,
        destino_turma_id: isUuid(dados.destinoTurmaId) ? dados.destinoTurmaId : null,
        destino_aluno_id: isUuid(dados.destinoAlunoId) ? dados.destinoAlunoId : null,
        professor_id: isUuid(dados.professorId) ? dados.professorId : dados.professorId,
        professor_nome: dados.professorNome || null,
        status: dados.status,
        nota_maxima: dados.notaMaxima || 10,
        nota_minima_aprovacao: dados.notaMinimaAprovacao || 7.0,
        politica_gabarito: dados.politicaGabarito,
        tempo_estimado_minutos: dados.tempoEstimadoMinutos || null,
        versao: 1,
      };

      const { data, error } = await supabase
        .from("exercicios_interativos")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: mapRowToExercicio(data as ExercicioDbRow) };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao criar exercício." };
    }
  },

  async atualizar(
    id: string,
    dados: Partial<ExercicioInterativo>
  ): Promise<OperationResult<ExercicioInterativo>> {
    try {
      const supabase = getSupabase();
      const atual = await this.obterPorId(id);
      if (!atual) {
        return { success: false, error: "Exercício não encontrado." };
      }

      const novaVersao = (atual.versao || 1) + 1;
      const payload: Record<string, unknown> = {
        versao: novaVersao,
        updated_at: new Date().toISOString(),
      };

      if (dados.titulo !== undefined) payload.titulo = dados.titulo;
      if (dados.descricao !== undefined) payload.descricao = dados.descricao;
      if (dados.instrucoes !== undefined) payload.instrucoes = dados.instrucoes;
      if (dados.tipo !== undefined) payload.tipo = dados.tipo;
      if (dados.nivel !== undefined) payload.nivel = dados.nivel;
      if (dados.categoria !== undefined) payload.categoria = dados.categoria;
      if (dados.textoConteudo !== undefined) payload.texto_conteudo = dados.textoConteudo;
      if (dados.audioUrl !== undefined) payload.audio_url = dados.audioUrl;
      if (dados.audioNome !== undefined) payload.audio_nome = dados.audioNome;
      if (dados.audioDuracaoSegundos !== undefined) payload.audio_duracao_segundos = dados.audioDuracaoSegundos;
      if (dados.questoes !== undefined) payload.questoes = dados.questoes;
      if (dados.baralhoVocabularioId !== undefined) payload.baralho_vocabulario_id = dados.baralhoVocabularioId;
      if (dados.destinoTipo !== undefined) payload.destino_tipo = dados.destinoTipo;
      if (dados.destinoTurmaId !== undefined) payload.destino_turma_id = isUuid(dados.destinoTurmaId) ? dados.destinoTurmaId : null;
      if (dados.destinoAlunoId !== undefined) payload.destino_aluno_id = isUuid(dados.destinoAlunoId) ? dados.destinoAlunoId : null;
      if (dados.status !== undefined) payload.status = dados.status;
      if (dados.notaMaxima !== undefined) payload.nota_maxima = dados.notaMaxima;
      if (dados.notaMinimaAprovacao !== undefined) payload.nota_minima_aprovacao = dados.notaMinimaAprovacao;
      if (dados.politicaGabarito !== undefined) payload.politica_gabarito = dados.politicaGabarito;
      if (dados.tempoEstimadoMinutos !== undefined) payload.tempo_estimado_minutos = dados.tempoEstimadoMinutos;

      const { data, error } = await supabase
        .from("exercicios_interativos")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: mapRowToExercicio(data as ExercicioDbRow) };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao atualizar exercício." };
    }
  },

  async excluir(id: string): Promise<OperationResult<boolean>> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("exercicios_interativos").delete().eq("id", id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao excluir exercício." };
    }
  },

  async duplicar(
    id: string,
    novoProfessorId?: string
  ): Promise<OperationResult<ExercicioInterativo>> {
    try {
      const original = await this.obterPorId(id);
      if (!original) {
        return { success: false, error: "Exercício original não encontrado." };
      }

      const res = await this.criar({
        titulo: `${original.titulo} (Cópia)`,
        descricao: original.descricao,
        instrucoes: original.instrucoes,
        tipo: original.tipo,
        nivel: original.nivel,
        categoria: original.categoria,
        textoConteudo: original.textoConteudo,
        audioUrl: original.audioUrl,
        audioNome: original.audioNome,
        audioDuracaoSegundos: original.audioDuracaoSegundos,
        questoes: original.questoes,
        baralhoVocabularioId: original.baralhoVocabularioId,
        destinoTipo: original.destinoTipo,
        destinoTurmaId: original.destinoTurmaId,
        destinoAlunoId: original.destinoAlunoId,
        professorId: novoProfessorId || original.professorId,
        professorNome: original.professorNome,
        status: "rascunho",
        notaMaxima: original.notaMaxima,
        notaMinimaAprovacao: original.notaMinimaAprovacao,
        politicaGabarito: original.politicaGabarito,
        tempoEstimadoMinutos: original.tempoEstimadoMinutos,
      });

      return res;
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Erro ao duplicar exercício." };
    }
  },
};
