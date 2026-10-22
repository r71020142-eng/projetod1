/**
 * Repositório Supabase para Agenda e Aulas (Etapa 10.3B1).
 *
 * Implementa a camada de dados no Supabase PostgreSQL remoto com RLS,
 * conversão estrita de fuso horário UTC (America/Sao_Paulo) e
 * chamada a stored procedures transacionais (RPCs).
 */

import {
  Aula,
  AulaFilters,
  OperationResult,
  ConflitoHorario,
  RegistroPresencaItem,
  FrequenciaCalculada,
  StatusAula,
} from "@/types";
import { IAulaRepository } from "./contracts/repositoryContracts";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { localToUtc, utcToLocal, calculateDurationMinutes, addMinutesToUtc } from "@/lib/dateUtils";

interface AulaDbRow {
  id: string;
  turma_id: string;
  serie_id: string | null;
  professor_id: string;
  inicio_em: string;
  fim_em: string;
  status: string;
  titulo: string;
  meeting_url: string | null;
  topicos_trabalhados: string | null;
  observacoes: string | null;
  motivo_cancelamento: string | null;
  concluida_em: string | null;
  concluida_por: string | null;
  pendencias_presenca_confirmadas_em: string | null;
  pendencias_presenca_confirmadas_por: string | null;
  created_at: string;
  updated_at: string;
  presencas_aulas?: PresencaDbRow[];
}

interface PresencaDbRow {
  id: string;
  aula_id: string;
  aluno_id: string;
  matricula_id: string;
  status: string;
  justificativa: string | null;
  observacao_pedagogica: string | null;
  registrado_em: string | null;
  registrado_por: string | null;
}

interface ViewAlunoAulaDbRow {
  id: string;
  turma_id: string;
  professor_id: string;
  serie_id: string | null;
  inicio_em: string;
  fim_em: string;
  titulo: string;
  meeting_url: string | null;
  topicos_trabalhados: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Agenda] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToAula(row: AulaDbRow): Aula {
  const { date, time } = utcToLocal(row.inicio_em);
  const duracaoMinutos = calculateDurationMinutes(row.inicio_em, row.fim_em);

  const presencasMap: Record<string, RegistroPresencaItem> = {};
  if (row.presencas_aulas && Array.isArray(row.presencas_aulas)) {
    for (const p of row.presencas_aulas) {
      presencasMap[p.aluno_id] = {
        status: p.status as import("@/types").StatusPresenca,
        justificativa: p.justificativa || undefined,
        observacao: p.observacao_pedagogica || undefined,
        alunoId: p.aluno_id,
        registradoEm: p.registrado_em || undefined,
      };
    }
  }

  return {
    id: row.id,
    turmaId: row.turma_id,
    professorId: row.professor_id,
    titulo: row.titulo,
    data: date,
    horario: time,
    duracaoMinutos,
    meetingUrl: row.meeting_url || undefined,
    linkZoom: row.meeting_url || undefined,
    topicoTrabalhado: row.topicos_trabalhados || undefined,
    status: row.status as StatusAula,
    observacoes: row.observacoes || undefined,
    presencas: presencasMap,
    dataCadastro: row.created_at,
  };
}

function notifyMutation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mtd_academic_agenda_updated", { detail: { entity: "aulas" } })
    );
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "aulas" } })
    );
  }
}

export const aulaSupabaseRepository: IAulaRepository = {
  async listar(filters?: AulaFilters): Promise<Aula[]> {
    const supabase = getSupabase();
    let query = supabase
      .from("aulas")
      .select("*, presencas_aulas(*)")
      .order("inicio_em", { ascending: true });

    if (filters?.turmaId) {
      query = query.eq("turma_id", filters.turmaId);
    }

    if (filters?.professorId) {
      query = query.eq("professor_id", filters.professorId);
    }

    if (filters?.status && filters.status !== "todos") {
      query = query.eq("status", filters.status);
    }

    if (filters?.data) {
      const inicioDiaUtc = localToUtc(filters.data, "00:00");
      const fimDiaUtc = localToUtc(filters.data, "23:59");
      query = query.gte("inicio_em", inicioDiaUtc).lte("inicio_em", fimDiaUtc);
    }

    if (filters?.dataInicio) {
      const inicioUtc = localToUtc(filters.dataInicio, "00:00");
      query = query.gte("inicio_em", inicioUtc);
    }

    if (filters?.dataFim) {
      const fimUtc = localToUtc(filters.dataFim, "23:59");
      query = query.lte("inicio_em", fimUtc);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[aulaSupabaseRepository.listar] Erro:", error.message);
      throw new Error(`Erro ao listar aulas no Supabase: ${error.message}`);
    }

    let items = (data as AulaDbRow[]).map(mapRowToAula);

    if (filters?.busca) {
      const termo = filters.busca.toLowerCase();
      items = items.filter(
        (a) =>
          a.titulo.toLowerCase().includes(termo) ||
          (a.topicoTrabalhado && a.topicoTrabalhado.toLowerCase().includes(termo))
      );
    }

    return items;
  },

  async obterPorId(id: string): Promise<Aula | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("aulas")
      .select("*, presencas_aulas(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[aulaSupabaseRepository.obterPorId] Erro:", error.message);
      return null;
    }

    if (!data) return null;
    return mapRowToAula(data as AulaDbRow);
  },

  async listarPorTurma(turmaId: string): Promise<Aula[]> {
    return this.listar({ turmaId });
  },

  async listarPorAluno(alunoId: string): Promise<Aula[]> {
    const supabase = getSupabase();

    // 1. Busca matrículas do discente para identificar as turmas associadas
    const { data: matriculas } = await supabase
      .from("matriculas_turmas")
      .select("turma_id")
      .eq("aluno_id", alunoId);

    // 2. Consulta a view segura de aulas (vw_aluno_aulas) com security_barrier
    // Essa view filtra rigorosamente pelo papel:
    // - Para aluno: restrito a aluno_can_view_aula(a.id)
    // - Para professor: restrito às aulas do professor
    // - Para admin: permite visualização irrestrita
    let query = supabase
      .from("vw_aluno_aulas")
      .select("*")
      .order("inicio_em", { ascending: true });

    if (matriculas && matriculas.length > 0) {
      const turmaIds = (matriculas as Array<{ turma_id: string }>).map((m) => m.turma_id);
      query = query.in("turma_id", turmaIds);
    }

    const [aulasRes, presencasRes] = await Promise.all([
      query,
      supabase
        .from("vw_aluno_presencas")
        .select("*")
        .eq("aluno_id", alunoId),
    ]);

    if (aulasRes.error) {
      console.error("[aulaSupabaseRepository.listarPorAluno] Erro ao consultar vw_aluno_aulas:", aulasRes.error.message);
      return [];
    }

    const presencasMapByAula: Record<string, PresencaDbRow[]> = {};
    if (presencasRes.data && Array.isArray(presencasRes.data)) {
      for (const p of presencasRes.data as Array<{
        id: string;
        aula_id: string;
        aluno_id: string;
        matricula_id: string;
        status: string;
        justificativa: string | null;
        created_at: string;
      }>) {
        if (!presencasMapByAula[p.aula_id]) {
          presencasMapByAula[p.aula_id] = [];
        }
        presencasMapByAula[p.aula_id].push({
          id: p.id,
          aula_id: p.aula_id,
          aluno_id: p.aluno_id,
          matricula_id: p.matricula_id,
          status: p.status,
          justificativa: p.justificativa,
          observacao_pedagogica: null,
          registrado_em: p.created_at,
          registrado_por: null,
        });
      }
    }

    const rowsWithPresencas: AulaDbRow[] = (aulasRes.data as ViewAlunoAulaDbRow[]).map((row) => ({
      ...row,
      observacoes: null,
      motivo_cancelamento: null,
      concluida_em: null,
      concluida_por: null,
      pendencias_presenca_confirmadas_em: null,
      pendencias_presenca_confirmadas_por: null,
      presencas_aulas: presencasMapByAula[row.id] || [],
    }));

    return rowsWithPresencas.map(mapRowToAula);
  },

  async listarPorProfessor(professorId: string): Promise<Aula[]> {
    return this.listar({ professorId });
  },

  async obterProximaAulaAluno(alunoId: string): Promise<Aula | null> {
    const aulas = await this.listarPorAluno(alunoId);
    const agoraUtc = new Date().toISOString();

    const agendadas = aulas.filter(
      (a) => a.status === "agendada" && localToUtc(a.data, a.horario) >= agoraUtc
    );

    return agendadas[0] || null;
  },

  async listarProximas(limite = 5): Promise<Aula[]> {
    const supabase = getSupabase();
    const agoraUtc = new Date().toISOString();

    const { data, error } = await supabase
      .from("aulas")
      .select("*, presencas_aulas(*)")
      .eq("status", "agendada")
      .gte("inicio_em", agoraUtc)
      .order("inicio_em", { ascending: true })
      .limit(limite);

    if (error) {
      console.error("[aulaSupabaseRepository.listarProximas] Erro:", error.message);
      return [];
    }

    return (data as AulaDbRow[]).map(mapRowToAula);
  },

  async contarAgendadas(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("aulas")
      .select("id", { count: "exact", head: true })
      .eq("status", "agendada");

    if (error) {
      console.error("[aulaSupabaseRepository.contarAgendadas] Erro:", error.message);
      return 0;
    }
    return count || 0;
  },

  async criar(
    dados: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas"> & {
      professorId?: string;
      presencas?: Record<string, RegistroPresencaItem>;
    }
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }> {
    const supabase = getSupabase();

    let professorId = dados.professorId;
    if (!professorId) {
      const { data: turmaData } = await supabase
        .from("turmas")
        .select("professor_id")
        .eq("id", dados.turmaId)
        .single();
      if (!turmaData) {
        return { success: false, error: "Turma vinculada não encontrada." };
      }
      professorId = turmaData.professor_id;
    }

    const duracao = dados.duracaoMinutos || 50;
    const inicioUtc = localToUtc(dados.data, dados.horario);
    const fimUtc = addMinutesToUtc(inicioUtc, duracao);
    const meetingUrl = dados.linkZoom || dados.meetingUrl || null;

    const { data: aulaId, error } = await supabase.rpc("agendar_aula", {
      p_turma_id: dados.turmaId,
      p_professor_id: professorId,
      p_titulo: dados.titulo,
      p_inicio_em: inicioUtc,
      p_fim_em: fimUtc,
      p_meeting_url: meetingUrl,
      p_observacoes: dados.observacoes || null,
      p_serie_id: null,
    });

    if (error) {
      const msg = error.message;
      if (msg.includes("CONFLITO_HORARIO_PROFESSOR") || msg.includes("CONFLITO_HORARIO_ALUNO")) {
        return {
          success: false,
          error: msg,
          conflitos: [
            {
              tipo: msg.includes("CONFLITO_HORARIO_PROFESSOR") ? "professor" : "aluno",
              pessoaId: professorId || "",
              pessoaNome: "Envolvido",
              mensagem: msg,
              aulaConflitante: {
                id: "",
                titulo: "Conflito detectado",
                turmaNome: "",
                data: dados.data,
                horario: dados.horario,
                duracaoMinutos: duracao,
              },
            },
          ],
        };
      }
      return { success: false, error: msg };
    }

    const criada = await this.obterPorId(aulaId);
    if (!criada) {
      return { success: false, error: "Aula criada mas falha ao recuperar registro." };
    }

    notifyMutation();
    return { success: true, data: criada };
  },

  async criarSequenciaSemanal(
    dadosBase: Omit<Aula, "id" | "dataCadastro" | "professorId" | "presencas">,
    quantidadeEncontros: number
  ): Promise<OperationResult<Aula[]> & { conflitos?: ConflitoHorario[] }> {
    const supabase = getSupabase();

    const { data: turmaData } = await supabase
      .from("turmas")
      .select("professor_id")
      .eq("id", dadosBase.turmaId)
      .single();

    if (!turmaData) {
      return { success: false, error: "Turma vinculada não encontrada." };
    }

    const duracao = dadosBase.duracaoMinutos || 50;
    const meetingUrl = dadosBase.linkZoom || dadosBase.meetingUrl || null;
    const baseDate = new Date(`${dadosBase.data}T00:00:00`);
    const diaSemana = baseDate.getDay();

    const { data: serieId, error } = await supabase.rpc("agendar_serie_aulas", {
      p_turma_id: dadosBase.turmaId,
      p_professor_id: turmaData.professor_id,
      p_titulo_base: dadosBase.titulo,
      p_dia_semana: diaSemana,
      p_horario_local: `${dadosBase.horario}:00`,
      p_duracao_minutos: duracao,
      p_quantidade_encontros: quantidadeEncontros,
      p_data_inicio: dadosBase.data,
      p_meeting_url: meetingUrl,
      p_observacoes: dadosBase.observacoes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: aulasData, error: listError } = await supabase
      .from("aulas")
      .select("*, presencas_aulas(*)")
      .eq("serie_id", serieId)
      .order("inicio_em", { ascending: true });

    if (listError || !aulasData) {
      return { success: false, error: "Série gerada mas falha ao listar aulas." };
    }

    notifyMutation();
    return { success: true, data: (aulasData as AulaDbRow[]).map(mapRowToAula) };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Aula, "id" | "dataCadastro">>
  ): Promise<OperationResult<Aula> & { conflitos?: ConflitoHorario[] }> {
    const supabase = getSupabase();
    const atual = await this.obterPorId(id);
    if (!atual) {
      return { success: false, error: "Aula não encontrada." };
    }

    // Se houve mudança de horário/data, chama RPC de reagendamento
    if (
      (dados.data && dados.data !== atual.data) ||
      (dados.horario && dados.horario !== atual.horario) ||
      (dados.duracaoMinutos && dados.duracaoMinutos !== atual.duracaoMinutos)
    ) {
      const novaData = dados.data || atual.data;
      const novoHorario = dados.horario || atual.horario;
      const novaDuracao = dados.duracaoMinutos || atual.duracaoMinutos;

      const novoInicioUtc = localToUtc(novaData, novoHorario);
      const novoFimUtc = addMinutesToUtc(novoInicioUtc, novaDuracao);

      const { error: reagError } = await supabase.rpc("reagendar_aula", {
        p_aula_id: id,
        p_novo_inicio: novoInicioUtc,
        p_novo_fim: novoFimUtc,
        p_motivo: dados.observacoes || null,
      });

      if (reagError) {
        return { success: false, error: reagError.message };
      }
    }

    // Atualização de campos secundários
    const updates: Record<string, string | null> = {};
    if (dados.titulo) updates.titulo = dados.titulo;
    if (dados.topicoTrabalhado !== undefined) updates.topicos_trabalhados = dados.topicoTrabalhado || null;
    if (dados.meetingUrl !== undefined || dados.linkZoom !== undefined) {
      updates.meeting_url = dados.linkZoom || dados.meetingUrl || null;
    }
    if (dados.observacoes !== undefined) updates.observacoes = dados.observacoes || null;

    if (Object.keys(updates).length > 0) {
      const { error: updError } = await supabase.from("aulas").update(updates).eq("id", id);
      if (updError) {
        return { success: false, error: updError.message };
      }
    }

    const atualizada = await this.obterPorId(id);
    if (!atualizada) {
      return { success: false, error: "Falha ao recarregar aula atualizada." };
    }

    notifyMutation();
    return { success: true, data: atualizada };
  },

  async cancelar(id: string, motivo?: string): Promise<OperationResult<Aula>> {
    const supabase = getSupabase();
    const { error } = await supabase.rpc("cancelar_aula", {
      p_aula_id: id,
      p_motivo: motivo || "Cancelamento solicitado pelo docente/administrador",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const atualizada = await this.obterPorId(id);
    if (!atualizada) {
      return { success: false, error: "Falha ao recarregar aula cancelada." };
    }

    notifyMutation();
    return { success: true, data: atualizada };
  },

  async concluir(id: string, confirmarPendencias = false): Promise<OperationResult<Aula>> {
    const supabase = getSupabase();
    const { error } = await supabase.rpc("concluir_aula", {
      p_aula_id: id,
      p_confirmar_pendencias: confirmarPendencias,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const atualizada = await this.obterPorId(id);
    if (!atualizada) {
      return { success: false, error: "Falha ao recarregar aula concluída." };
    }

    notifyMutation();
    return { success: true, data: atualizada };
  },

  async registrarPresencas(
    id: string,
    presencas: Record<string, RegistroPresencaItem>,
    topicoTrabalhadoOuConcluir?: string | boolean,
    observacoes?: string
  ): Promise<OperationResult<Aula>> {
    const supabase = getSupabase();

    const presencasPayload = Object.entries(presencas).map(([alunoId, item]) => ({
      aluno_id: alunoId,
      status: item.status,
      justificativa: item.justificativa || null,
      observacao_pedagogica: item.observacao || null,
    }));

    const topico = typeof topicoTrabalhadoOuConcluir === "string" ? topicoTrabalhadoOuConcluir : null;
    const { error } = await supabase.rpc("salvar_chamada_aula", {
      p_aula_id: id,
      p_presencas: presencasPayload,
      p_topico_trabalhado: topico,
      p_observacoes: observacoes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Se solicitado conclusão concomitante
    if (topicoTrabalhadoOuConcluir === true) {
      const concluirRes = await this.concluir(id, true);
      if (!concluirRes.success) {
        return concluirRes;
      }
    }

    const atualizada = await this.obterPorId(id);
    if (!atualizada) {
      return { success: false, error: "Falha ao recarregar aula após registro de presença." };
    }

    notifyMutation();
    return { success: true, data: atualizada };
  },

  async calcularFrequenciaAluno(alunoId: string, turmaId?: string): Promise<FrequenciaCalculada> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("calcular_frequencia_aluno", {
      p_aluno_id: alunoId,
      p_turma_id: turmaId || null,
    });

    if (error) {
      console.error("[aulaSupabaseRepository.calcularFrequenciaAluno] Erro:", error.message);
      return {
        totalAulasConcluidas: 0,
        presentes: 0,
        totalPresentes: 0,
        ausentes: 0,
        totalAusentes: 0,
        justificados: 0,
        totalJustificados: 0,
        naoRegistrados: 0,
        porcentagem: null,
        formulaExplicativa: "Frequência indisponível.",
      };
    }

    return data as FrequenciaCalculada;
  },

  async calcularFrequenciaTurma(turmaId: string): Promise<FrequenciaCalculada> {
    const supabase = getSupabase();
    const { data: aulas, error: aulasError } = await supabase
      .from("aulas")
      .select("id")
      .eq("turma_id", turmaId)
      .eq("status", "concluida");

    if (aulasError || !aulas || aulas.length === 0) {
      return {
        totalAulasConcluidas: 0,
        presentes: 0,
        totalPresentes: 0,
        ausentes: 0,
        totalAusentes: 0,
        justificados: 0,
        totalJustificados: 0,
        naoRegistrados: 0,
        porcentagem: null,
        formulaExplicativa: "Sem aulas concluídas.",
      };
    }

    const aulaIds = (aulas as Array<{ id: string }>).map((a) => a.id);
    const { data: presencas, error: presError } = await supabase
      .from("presencas_aulas")
      .select("status")
      .in("aula_id", aulaIds);

    if (presError || !presencas) {
      return {
        totalAulasConcluidas: aulas.length,
        presentes: 0,
        totalPresentes: 0,
        ausentes: 0,
        totalAusentes: 0,
        justificados: 0,
        totalJustificados: 0,
        naoRegistrados: 0,
        porcentagem: null,
        formulaExplicativa: "Erro ao processar presenças da turma.",
      };
    }

    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;
    let naoRegistrados = 0;

    for (const p of presencas) {
      if (p.status === "presente") presentes++;
      else if (p.status === "ausente") ausentes++;
      else if (p.status === "justificado") justificados++;
      else if (p.status === "nao_registrado") naoRegistrados++;
    }

    const base = presentes + ausentes;
    const porcentagem = base > 0 ? Math.round((presentes / base) * 100) : null;

    return {
      totalAulasConcluidas: aulas.length,
      presentes,
      totalPresentes: presentes,
      ausentes,
      totalAusentes: ausentes,
      justificados,
      totalJustificados: justificados,
      naoRegistrados,
      porcentagem,
      formulaExplicativa:
        "(Presentes / (Presentes + Ausentes)) * 100 (Faltas justificadas e nao registrados nao penalizam)",
    };
  },

  async calcularFrequenciaGeral(): Promise<{
    porcentagem: number | null;
    totalAulas: number;
    presentes: number;
    ausentes: number;
    justificados: number;
  }> {
    const supabase = getSupabase();
    const { data: concluidas, error: aulasError } = await supabase
      .from("aulas")
      .select("id")
      .eq("status", "concluida");

    if (aulasError || !concluidas || concluidas.length === 0) {
      return {
        porcentagem: null,
        totalAulas: 0,
        presentes: 0,
        ausentes: 0,
        justificados: 0,
      };
    }

    const aulaIds = (concluidas as Array<{ id: string }>).map((a) => a.id);
    const { data: presencas } = await supabase
      .from("presencas_aulas")
      .select("status")
      .in("aula_id", aulaIds);

    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;

    if (presencas) {
      for (const p of presencas) {
        if (p.status === "presente") presentes++;
        else if (p.status === "ausente") ausentes++;
        else if (p.status === "justificado") justificados++;
      }
    }

    const base = presentes + ausentes;
    const porcentagem = base > 0 ? Math.round((presentes / base) * 100) : null;

    return {
      porcentagem,
      totalAulas: concluidas.length,
      presentes,
      ausentes,
      justificados,
    };
  },

  async verificarConflitos(aulaCandidate: {
    id?: string;
    turmaId: string;
    professorId: string;
    data: string;
    horario: string;
    duracaoMinutos: number;
    status: Aula["status"];
  }): Promise<ConflitoHorario[]> {
    const { turmaRepository } = await import("./turmaRepository");
    const { professorRepository } = await import("./professorRepository");
    const { alunoRepository } = await import("./alunoRepository");
    const { checkConflitosHorario } = await import("./validators");

    const [todasAulas, todasTurmas, todosProfessores, todosAlunos] = await Promise.all([
      this.listar(),
      turmaRepository.listar(),
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    return checkConflitosHorario(
      aulaCandidate,
      todasAulas,
      todasTurmas,
      todosProfessores,
      todosAlunos
    );
  },
};
