import {
  Avaliacao,
  StatusAvaliacao,
  OperationResult,
  AvaliacaoFilters,
  ConfigFeedbackAvaliacao,
} from "../types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { avaliacaoLocalStorageRepository } from "./avaliacaoLocalStorageRepository";
import { validarQuestaoObjetiva, validarRubricaPratica } from "./pedagogicoCalculos";

interface AvaliacaoDbRow {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  programa_id: string | null;
  etapa_id: string | null;
  modulo_id: string | null;
  professor_id: string;
  professor_nome: string | null;
  destino_tipo: string;
  destino_turma_id: string | null;
  destino_aluno_id: string | null;
  status: string;
  data_publicacao: string | null;
  prazo: string | null;
  max_tentativas: number;
  nota_maxima: number;
  nota_minima_aprovacao: number | null;
  permitir_envio_atrasado: boolean;
  instrucoes: string;
  versao: number;
  politica_gabarito: string;
  config_feedback: unknown;
  questoes: unknown;
  rubrica: unknown;
  permitir_texto: boolean;
  permitir_link: boolean;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Avaliações] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToAvaliacao(row: AvaliacaoDbRow): Avaliacao {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao || "",
    tipo: row.tipo as Avaliacao["tipo"],
    programaId: row.programa_id || "",
    etapaId: row.etapa_id || "",
    moduloId: row.modulo_id || "",
    professorId: row.professor_id,
    professorNome: row.professor_nome || undefined,
    destinoTipo: row.destino_tipo as Avaliacao["destinoTipo"],
    destinoTurmaId: row.destino_turma_id || undefined,
    destinoAlunoId: row.destino_aluno_id || undefined,
    status: row.status as Avaliacao["status"],
    dataPublicacao: row.data_publicacao || undefined,
    prazo: row.prazo || undefined,
    maxTentativas: row.max_tentativas || 1,
    notaMaxima: Number(row.nota_maxima || 100),
    notaMinimaAprovacao: row.nota_minima_aprovacao !== null ? Number(row.nota_minima_aprovacao) : undefined,
    permitirEnvioAtrasado: row.permitir_envio_atrasado ?? true,
    instrucoes: row.instrucoes || "",
    versao: row.versao || 1,
    politicaGabarito: (row.politica_gabarito as Avaliacao["politicaGabarito"]) || "gabarito_imediato",
    configFeedback: (row.config_feedback as ConfigFeedbackAvaliacao) || undefined,
    questoes: Array.isArray(row.questoes) ? row.questoes : undefined,
    rubrica: Array.isArray(row.rubrica) ? row.rubrica : undefined,
    permitirTexto: row.permitir_texto ?? true,
    permitirLink: row.permitir_link ?? true,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export const avaliacaoSupabaseRepository = {
  async listar(filters?: AvaliacaoFilters): Promise<Avaliacao[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("avaliacoes").select("*");

      if (filters?.tipo && filters.tipo !== "todos") query = query.eq("tipo", filters.tipo);
      if (filters?.status && filters.status !== "todos") query = query.eq("status", filters.status);
      if (filters?.moduloId) query = query.eq("modulo_id", filters.moduloId);
      if (filters?.professorId) query = query.eq("professor_id", filters.professorId);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        console.warn("[Supabase Avaliações] Erro ao listar, fallback local:", error.message);
        return avaliacaoLocalStorageRepository.listar(filters);
      }

      let result = (data as AvaliacaoDbRow[]).map(mapRowToAvaliacao);
      if (filters?.busca) {
        const q = filters.busca.toLowerCase().trim();
        result = result.filter(
          (a) =>
            a.titulo.toLowerCase().includes(q) ||
            a.descricao.toLowerCase().includes(q) ||
            (a.professorNome && a.professorNome.toLowerCase().includes(q))
        );
      }
      return result;
    } catch {
      return avaliacaoLocalStorageRepository.listar(filters);
    }
  },

  async listarParaAluno(alunoId: string, turmaIds: string[] = []): Promise<Avaliacao[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("vw_aluno_avaliacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return (data as AvaliacaoDbRow[]).map(mapRowToAvaliacao);
      }

      const { data: directData, error: directErr } = await supabase
        .from("avaliacoes")
        .select("*")
        .in("status", ["publicada", "encerrada"]);

      if (!directErr && directData) {
        return (directData as AvaliacaoDbRow[])
          .map(mapRowToAvaliacao)
          .filter((a) => {
            if (a.destinoTipo === "geral") return true;
            if (a.destinoTipo === "aluno" && a.destinoAlunoId === alunoId) return true;
            if (a.destinoTipo === "turma" && a.destinoTurmaId && turmaIds.includes(a.destinoTurmaId)) return true;
            return false;
          });
      }

      return avaliacaoLocalStorageRepository.listarParaAluno(alunoId, turmaIds);
    } catch {
      return avaliacaoLocalStorageRepository.listarParaAluno(alunoId, turmaIds);
    }
  },

  async obterPorId(id: string): Promise<Avaliacao | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("avaliacoes").select("*").eq("id", id).maybeSingle();
      if (error || !data) return avaliacaoLocalStorageRepository.obterPorId(id);
      return mapRowToAvaliacao(data as AvaliacaoDbRow);
    } catch {
      return avaliacaoLocalStorageRepository.obterPorId(id);
    }
  },

  async salvar(
    dados: Omit<Avaliacao, "id" | "criadoEm" | "atualizadoEm"> & { id?: string },
    possuiTentativas = false
  ): Promise<OperationResult<Avaliacao>> {
    if (!dados.titulo || dados.titulo.trim().length < 3) {
      return { success: false, error: "O título da avaliação deve ter ao menos 3 caracteres." };
    }
    if (!dados.moduloId) {
      return { success: false, error: "A avaliação deve ser vinculada a um módulo pedagógico." };
    }

    if (dados.tipo === "objetiva") {
      const questoes = dados.questoes || [];
      if (questoes.length === 0) {
        return { success: false, error: "A avaliação objetiva deve possuir ao menos 1 questão." };
      }
      for (const q of questoes) {
        const val = validarQuestaoObjetiva(q);
        if (!val.isValid) return { success: false, error: val.errors[0] };
      }
    } else if (dados.tipo === "pratica") {
      const rubrica = dados.rubrica || [];
      const val = validarRubricaPratica(rubrica);
      if (!val.isValid) return { success: false, error: val.errors[0] };
    }

    if (dados.id && possuiTentativas) {
      const anterior = await this.obterPorId(dados.id);
      if (anterior) {
        if (dados.tipo === "objetiva" && JSON.stringify(anterior.questoes) !== JSON.stringify(dados.questoes)) {
          return {
            success: false,
            error: "Esta avaliação já possui tentativas enviadas. As questões não podem ser modificadas nesta versão; duplique-a como nova versão para fazer alterações.",
          };
        }
        if (dados.tipo === "pratica" && JSON.stringify(anterior.rubrica) !== JSON.stringify(dados.rubrica)) {
          return {
            success: false,
            error: "Esta avaliação já possui tentativas enviadas. A rubrica não pode ser alterada nesta versão; duplique-a como nova versão.",
          };
        }
      }
    }

    try {
      const supabase = getSupabase();
      const payload = {
        titulo: dados.titulo.trim(),
        descricao: dados.descricao || null,
        tipo: dados.tipo,
        programa_id: dados.programaId || null,
        etapa_id: dados.etapaId || null,
        modulo_id: dados.moduloId,
        professor_id: dados.professorId,
        professor_nome: dados.professorNome || null,
        destino_tipo: dados.destinoTipo || "geral",
        destino_turma_id: dados.destinoTurmaId || null,
        destino_aluno_id: dados.destinoAlunoId || null,
        status: dados.status || "rascunho",
        data_publicacao: dados.dataPublicacao || null,
        prazo: dados.prazo || null,
        max_tentativas: dados.maxTentativas || 1,
        nota_maxima: dados.notaMaxima || 100,
        nota_minima_aprovacao: dados.notaMinimaAprovacao || 70,
        permitir_envio_atrasado: dados.permitirEnvioAtrasado ?? true,
        instrucoes: dados.instrucoes || "",
        versao: dados.versao || 1,
        politica_gabarito: dados.politicaGabarito || "gabarito_imediato",
        config_feedback: dados.configFeedback || null,
        questoes: dados.questoes ? JSON.parse(JSON.stringify(dados.questoes)) : null,
        rubrica: dados.rubrica ? JSON.parse(JSON.stringify(dados.rubrica)) : null,
        permitir_texto: dados.permitirTexto ?? true,
        permitir_link: dados.permitirLink ?? true,
      };

      if (dados.id) {
        const { data, error } = await supabase.from("avaliacoes").update(payload).eq("id", dados.id).select().single();
        if (error) {
          return {
            success: false,
            error: `Erro ao atualizar avaliação no Supabase: ${error.message}`,
          };
        }
        return { success: true, data: mapRowToAvaliacao(data as AvaliacaoDbRow) };
      }

      const { data, error } = await supabase.from("avaliacoes").insert(payload).select().single();
      if (error) {
        return {
          success: false,
          error: `Erro ao criar avaliação no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: mapRowToAvaliacao(data as AvaliacaoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao salvar avaliação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async duplicarComoNovaVersao(avaliacaoId: string): Promise<OperationResult<Avaliacao>> {
    const original = await this.obterPorId(avaliacaoId);
    if (!original) return { success: false, error: "Avaliação original não encontrada." };

    const novaVersaoNum = (original.versao || 1) + 1;

    return this.salvar({
      titulo: `${original.titulo} (v${novaVersaoNum})`,
      descricao: original.descricao,
      tipo: original.tipo,
      programaId: original.programaId,
      etapaId: original.etapaId,
      moduloId: original.moduloId,
      professorId: original.professorId,
      professorNome: original.professorNome,
      destinoTipo: original.destinoTipo,
      destinoTurmaId: original.destinoTurmaId,
      destinoAlunoId: original.destinoAlunoId,
      status: "rascunho",
      dataPublicacao: original.dataPublicacao,
      prazo: original.prazo,
      maxTentativas: original.maxTentativas,
      notaMaxima: original.notaMaxima,
      notaMinimaAprovacao: original.notaMinimaAprovacao,
      permitirEnvioAtrasado: original.permitirEnvioAtrasado,
      instrucoes: original.instrucoes,
      versao: novaVersaoNum,
      politicaGabarito: original.politicaGabarito,
      configFeedback: original.configFeedback,
      questoes: original.questoes,
      rubrica: original.rubrica,
      permitirTexto: original.permitirTexto,
      permitirLink: original.permitirLink,
    });
  },

  async alterarStatus(id: string, status: StatusAvaliacao): Promise<OperationResult<Avaliacao>> {
    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = { status };
      if (status === "publicada") {
        payload.data_publicacao = new Date().toISOString();
      }
      const { data, error } = await supabase.from("avaliacoes").update(payload).eq("id", id).select().single();
      if (error) {
        return {
          success: false,
          error: `Erro ao alterar status da avaliação no Supabase: ${error.message}`,
        };
      }
      return { success: true, data: mapRowToAvaliacao(data as AvaliacaoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao alterar status: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
