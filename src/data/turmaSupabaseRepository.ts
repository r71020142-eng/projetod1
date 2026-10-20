import {
  Turma,
  TurmaFilters,
  OperationResult,
  ModalidadeTurma,
  NivelTurma,
  StatusTurma,
} from "@/types";
import { ITurmaRepository } from "./contracts/repositoryContracts";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { professorRepository } from "./professorRepository";
import { alunoRepository } from "./alunoRepository";
import { validateTurmaInput, normalizeText } from "./validators";

interface TurmaDbRow {
  id: string;
  nome: string;
  modalidade: string;
  nivel: string;
  objetivo_principal: string;
  professor_id: string;
  capacidade: number;
  status: string;
  data_inicio: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  matriculas_turmas?: {
    aluno_id: string;
    status: string;
  }[];
}

function getSupabase() {
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Turmas] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client;
}

function mapRowToTurma(row: TurmaDbRow): Turma {
  const activeAlunoIds: string[] = [];

  if (row.matriculas_turmas && Array.isArray(row.matriculas_turmas)) {
    for (const m of row.matriculas_turmas) {
      if (m.status === "ativa" && m.aluno_id) {
        activeAlunoIds.push(m.aluno_id);
      }
    }
  }

  return {
    id: row.id,
    nome: row.nome,
    modalidade: row.modalidade as ModalidadeTurma,
    nivel: (row.nivel || "nao_definido") as NivelTurma,
    objetivoPrincipal: row.objetivo_principal || "Geral",
    professorId: row.professor_id,
    alunoIds: activeAlunoIds,
    capacidade: row.capacidade,
    status: (row.status || "formacao") as StatusTurma,
    dataInicio: row.data_inicio || row.created_at.slice(0, 10),
    observacoes: row.observacoes || undefined,
    dataCadastro: row.created_at,
  };
}

function notifyMutation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mtd_academic_core_updated", { detail: { entity: "turmas" } })
    );
    // Compatibilidade com listeners legados
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "turmas" } })
    );
  }
}

export const turmaSupabaseRepository: ITurmaRepository = {
  async listar(filters?: TurmaFilters): Promise<Turma[]> {
    const supabase = getSupabase();

    let query = supabase
      .from("turmas")
      .select("*, matriculas_turmas(aluno_id, status)")
      .order("created_at", { ascending: false });

    if (filters) {
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
      }

      if (filters.nivel && filters.nivel !== "todos") {
        query = query.eq("nivel", filters.nivel);
      }

      if (filters.modalidade && filters.modalidade !== "todos") {
        query = query.eq("modalidade", filters.modalidade);
      }

      if (filters.busca && filters.busca.trim()) {
        const q = filters.busca.trim();
        query = query.ilike("nome", `%${q}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase Turmas] Erro ao listar turmas:", error);
      throw new Error(`Erro ao listar turmas do banco: ${error.message}`);
    }

    let turmas = (data as TurmaDbRow[]).map(mapRowToTurma);

    // Se o filtro de busca contiver nome do professor, enriquecemos no cliente
    if (filters?.busca && filters.busca.trim()) {
      const q = filters.busca.trim().toLowerCase();
      try {
        const todosProfs = await professorRepository.listar();
        const profMap = new Map(todosProfs.map((p) => [p.id, p.nomeCompleto.toLowerCase()]));

        turmas = turmas.filter((t) => {
          const matchesName = t.nome.toLowerCase().includes(q);
          const profNome = profMap.get(t.professorId) || "";
          const matchesProf = profNome.includes(q);
          return matchesName || matchesProf;
        });
      } catch {
        // Se a busca por professor falhar, mantém apenas pelo nome da turma
      }
    }

    return turmas;
  },

  async obterPorId(id: string): Promise<Turma | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("turmas")
      .select("*, matriculas_turmas(aluno_id, status)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[Supabase Turmas] Erro ao buscar turma ${id}:`, error);
      throw new Error(`Erro ao buscar turma do banco: ${error.message}`);
    }

    if (!data) return null;
    return mapRowToTurma(data as TurmaDbRow);
  },

  async listarPorAluno(alunoId: string): Promise<Turma[]> {
    const supabase = getSupabase();

    // 1. Busca IDs de turmas com matrícula ativa do aluno
    const { data: matriculas, error: matriculasError } = await supabase
      .from("matriculas_turmas")
      .select("turma_id")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa");

    if (matriculasError) {
      console.error("[Supabase Turmas] Erro ao buscar matrículas do aluno:", matriculasError);
      throw new Error(`Erro ao listar turmas do aluno: ${matriculasError.message}`);
    }

    if (!matriculas || matriculas.length === 0) {
      return [];
    }

    const turmaIds = (matriculas as { turma_id: string }[]).map(
      (m) => m.turma_id
    );

    // 2. Busca as turmas correspondentes
    const { data: turmasData, error: turmasError } = await supabase
      .from("turmas")
      .select("*, matriculas_turmas(aluno_id, status)")
      .in("id", turmaIds)
      .order("created_at", { ascending: false });

    if (turmasError) {
      console.error("[Supabase Turmas] Erro ao buscar turmas do aluno:", turmasError);
      throw new Error(`Erro ao buscar turmas: ${turmasError.message}`);
    }

    return (turmasData as TurmaDbRow[]).map(mapRowToTurma);
  },

  async listarPorProfessor(professorId: string): Promise<Turma[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("turmas")
      .select("*, matriculas_turmas(aluno_id, status)")
      .eq("professor_id", professorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase Turmas] Erro ao listar turmas do professor:", error);
      throw new Error(`Erro ao listar turmas do professor: ${error.message}`);
    }

    return (data as TurmaDbRow[]).map(mapRowToTurma);
  },

  async contarAtivas(): Promise<number> {
    const supabase = getSupabase();

    const { count, error } = await supabase
      .from("turmas")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativa");

    if (error) {
      console.error("[Supabase Turmas] Erro ao contar turmas ativas:", error);
      return 0;
    }

    return count ?? 0;
  },

  async criar(dados: Omit<Turma, "id" | "dataCadastro">): Promise<OperationResult<Turma>> {
    const supabase = getSupabase();

    // 1. Validação de dados de entrada
    const [professores, alunos] = await Promise.all([
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    const validation = validateTurmaInput(dados, professores, alunos, null);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados informados para a turma.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const capacidadeFinal =
      dados.modalidade === "individual" ? 1 : Number(dados.capacidade) || 6;

    // 2. Inserção na tabela public.turmas
    const payload = {
      nome: normalizeText(dados.nome),
      modalidade: dados.modalidade,
      nivel: dados.nivel || "nao_definido",
      objetivo_principal: normalizeText(dados.objetivoPrincipal || "Geral"),
      professor_id: dados.professorId,
      capacidade: capacidadeFinal,
      status: dados.status || "formacao",
      data_inicio: dados.dataInicio || new Date().toISOString().slice(0, 10),
      observacoes: dados.observacoes ? normalizeText(dados.observacoes) : null,
    };

    const { data, error } = await supabase
      .from("turmas")
      .insert(payload)
      .select("*, matriculas_turmas(aluno_id, status)")
      .single();

    if (error) {
      console.error("[Supabase Turmas] Erro ao criar turma:", error);
      return {
        success: false,
        error: `Não foi possível criar a turma no banco: ${error.message}`,
      };
    }

    const novaTurma = mapRowToTurma(data as TurmaDbRow);

    // 3. Se houver alunos iniciais informados, realiza as matrículas via RPC segura
    if (dados.alunoIds && dados.alunoIds.length > 0) {
      for (const alunoId of dados.alunoIds) {
        try {
          await supabase.rpc("matricular_aluno_turma", {
            p_turma_id: novaTurma.id,
            p_aluno_id: alunoId,
            p_motivo: "Matrícula inicial na criação da turma",
          });
        } catch (mErr) {
          console.warn(`[Supabase Turmas] Aviso ao matricular aluno ${alunoId} na criação:`, mErr);
        }
      }

      // Recarrega turma com matrículas atualizadas
      const turmaRecarregada = await this.obterPorId(novaTurma.id);
      notifyMutation();
      return { success: true, data: turmaRecarregada || novaTurma };
    }

    notifyMutation();
    return { success: true, data: novaTurma };
  },

  async atualizar(
    id: string,
    dados: Partial<Omit<Turma, "id" | "dataCadastro">>
  ): Promise<OperationResult<Turma>> {
    const supabase = getSupabase();

    // 1. Busca dados atuais
    const atual = await this.obterPorId(id);
    if (!atual) {
      return { success: false, error: "Turma não encontrada." };
    }

    const merged = { ...atual, ...dados };
    const [professores, alunos] = await Promise.all([
      professorRepository.listar(),
      alunoRepository.listar(),
    ]);

    const validation = validateTurmaInput(merged, professores, alunos, atual);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Verifique os dados da turma antes de salvar.",
        fieldErrors: validation.errors as Record<string, string>,
      };
    }

    const capacidadeFinal =
      merged.modalidade === "individual" ? 1 : Number(merged.capacidade);

    // 2. Se a capacidade foi alterada, valida via RPC ou atualiza direto se compatível
    if (dados.capacidade !== undefined && dados.capacidade !== atual.capacidade) {
      const { error: capError } = await supabase.rpc("alterar_capacidade_turma", {
        p_turma_id: id,
        p_nova_capacidade: capacidadeFinal,
      });

      if (capError) {
        return {
          success: false,
          error: capError.message,
        };
      }
    }

    // 3. Se o professor foi alterado, atualiza via RPC para validação de status ativo
    if (dados.professorId && dados.professorId !== atual.professorId) {
      const { error: profError } = await supabase.rpc("trocar_professor_turma", {
        p_turma_id: id,
        p_novo_professor_id: dados.professorId,
      });

      if (profError) {
        return {
          success: false,
          error: profError.message,
        };
      }
    }

    // 4. Atualiza os demais campos textuais da turma
    const updatePayload: Record<string, string | number | null> = {
      nome: normalizeText(merged.nome),
      modalidade: merged.modalidade,
      nivel: merged.nivel,
      objetivo_principal: normalizeText(merged.objetivoPrincipal),
      status: merged.status,
      data_inicio: merged.dataInicio,
      observacoes: merged.observacoes ? normalizeText(merged.observacoes) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("turmas")
      .update(updatePayload)
      .eq("id", id)
      .select("*, matriculas_turmas(aluno_id, status)")
      .single();

    if (error) {
      console.error(`[Supabase Turmas] Erro ao atualizar turma ${id}:`, error);
      return {
        success: false,
        error: `Não foi possível atualizar a turma: ${error.message}`,
      };
    }

    const turmaAtualizada = mapRowToTurma(data as TurmaDbRow);
    notifyMutation();
    return { success: true, data: turmaAtualizada };
  },

  async matricularAluno(
    turmaId: string,
    alunoId: string,
    motivo?: string
  ): Promise<OperationResult<Turma>> {
    const supabase = getSupabase();

    const { error } = await supabase.rpc("matricular_aluno_turma", {
      p_turma_id: turmaId,
      p_aluno_id: alunoId,
      p_motivo: motivo || "Matrícula realizada pela administração",
    });

    if (error) {
      console.error("[Supabase Turmas] Erro na RPC matricular_aluno_turma:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    const turmaAtualizada = await this.obterPorId(turmaId);
    if (!turmaAtualizada) {
      return {
        success: false,
        error: "Matrícula realizada, mas falha ao recarregar turma.",
      };
    }

    notifyMutation();
    return { success: true, data: turmaAtualizada };
  },

  async desmatricularAluno(
    turmaId: string,
    alunoId: string,
    motivo?: string
  ): Promise<OperationResult<Turma>> {
    const supabase = getSupabase();

    const { error } = await supabase.rpc("encerrar_matricula_aluno", {
      p_turma_id: turmaId,
      p_aluno_id: alunoId,
      p_motivo: motivo || "Desmatrícula realizada pela administração",
    });

    if (error) {
      console.error("[Supabase Turmas] Erro na RPC encerrar_matricula_aluno:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    const turmaAtualizada = await this.obterPorId(turmaId);
    if (!turmaAtualizada) {
      return {
        success: false,
        error: "Matrícula encerrada, mas falha ao recarregar turma.",
      };
    }

    notifyMutation();
    return { success: true, data: turmaAtualizada };
  },

  async alterarStatus(
    turmaId: string,
    novoStatus: Turma["status"]
  ): Promise<OperationResult<Turma>> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("turmas")
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq("id", turmaId)
      .select("*, matriculas_turmas(aluno_id, status)")
      .single();

    if (error) {
      console.error(`[Supabase Turmas] Erro ao alterar status da turma ${turmaId}:`, error);
      return {
        success: false,
        error: `Não foi possível alterar o status da turma: ${error.message}`,
      };
    }

    const turmaAtualizada = mapRowToTurma(data as TurmaDbRow);
    notifyMutation();
    return { success: true, data: turmaAtualizada };
  },
};
