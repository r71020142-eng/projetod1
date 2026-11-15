import { AvaliacaoAula, OperationResult } from "@/types";
import { getAcademicAgendaDataSource } from "./repositoryFactory";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

interface AvaliacaoDbRow {
  id: string;
  aula_id: string;
  aluno_id: string;
  professor_id: string | null;
  nota_aula: number;
  opiniao_aula: string | null;
  nota_professor: number;
  opiniao_professor: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = "mtd_avaliacoes_aulas_v1";

function mapRowToAvaliacao(row: AvaliacaoDbRow): AvaliacaoAula {
  return {
    id: row.id,
    aulaId: row.aula_id,
    alunoId: row.aluno_id,
    professorId: row.professor_id || undefined,
    notaAula: row.nota_aula,
    opiniaoAula: row.opiniao_aula || undefined,
    notaProfessor: row.nota_professor,
    opiniaoProfessor: row.opiniao_professor || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadFromLocalStorage(): AvaliacaoAula[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AvaliacaoAula[];
  } catch {
    return [];
  }
}

function saveToLocalStorage(list: AvaliacaoAula[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("mtd_avaliacoes_aulas_updated", { detail: { count: list.length } })
    );
  } catch (err) {
    console.error("Erro ao salvar avaliação de aula no localStorage:", err);
  }
}

function notifyMutation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mtd_avaliacoes_aulas_updated"));
  }
}

export const avaliacaoAulaRepository = {
  async obterPorAulaEAluno(aulaId: string, alunoId: string): Promise<AvaliacaoAula | null> {
    const dataSource = getAcademicAgendaDataSource();

    if (dataSource === "local") {
      const list = loadFromLocalStorage();
      return list.find((a) => a.aulaId === aulaId && a.alunoId === alunoId) || null;
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) {
        const list = loadFromLocalStorage();
        return list.find((a) => a.aulaId === aulaId && a.alunoId === alunoId) || null;
      }

      const { data, error } = await client
        .from("avaliacoes_aulas")
        .select("*")
        .eq("aula_id", aulaId)
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (error || !data) return null;
      return mapRowToAvaliacao(data as AvaliacaoDbRow);
    } catch {
      return null;
    }
  },

  async listarPorAula(aulaId: string): Promise<AvaliacaoAula[]> {
    const dataSource = getAcademicAgendaDataSource();

    if (dataSource === "local") {
      const list = loadFromLocalStorage();
      return list.filter((a) => a.aulaId === aulaId);
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) {
        const list = loadFromLocalStorage();
        return list.filter((a) => a.aulaId === aulaId);
      }

      const { data, error } = await client
        .from("avaliacoes_aulas")
        .select("*")
        .eq("aula_id", aulaId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((row: AvaliacaoDbRow) => mapRowToAvaliacao(row));
    } catch {
      return [];
    }
  },

  async listarPorProfessor(professorId: string): Promise<AvaliacaoAula[]> {
    const dataSource = getAcademicAgendaDataSource();

    if (dataSource === "local") {
      const list = loadFromLocalStorage();
      return list.filter((a) => a.professorId === professorId);
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) {
        const list = loadFromLocalStorage();
        return list.filter((a) => a.professorId === professorId);
      }

      const { data, error } = await client
        .from("avaliacoes_aulas")
        .select("*")
        .eq("professor_id", professorId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((row: AvaliacaoDbRow) => mapRowToAvaliacao(row));
    } catch {
      return [];
    }
  },

  async listarPorAluno(alunoId: string): Promise<AvaliacaoAula[]> {
    const dataSource = getAcademicAgendaDataSource();

    if (dataSource === "local") {
      const list = loadFromLocalStorage();
      return list.filter((a) => a.alunoId === alunoId);
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) {
        const list = loadFromLocalStorage();
        return list.filter((a) => a.alunoId === alunoId);
      }

      const { data, error } = await client
        .from("avaliacoes_aulas")
        .select("*")
        .eq("aluno_id", alunoId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((row: AvaliacaoDbRow) => mapRowToAvaliacao(row));
    } catch {
      return [];
    }
  },

  async salvar(
    dados: Omit<AvaliacaoAula, "id" | "createdAt">
  ): Promise<OperationResult<AvaliacaoAula>> {
    if (dados.notaAula < 0 || dados.notaAula > 10) {
      return { success: false, error: "A nota da aula deve ser entre 0 e 10." };
    }
    if (dados.notaProfessor < 0 || dados.notaProfessor > 10) {
      return { success: false, error: "A nota do professor deve ser entre 0 e 10." };
    }

    const dataSource = getAcademicAgendaDataSource();

    if (dataSource === "local") {
      const list = loadFromLocalStorage();
      const existingIndex = list.findIndex(
        (a) => a.aulaId === dados.aulaId && a.alunoId === dados.alunoId
      );

      const nova: AvaliacaoAula = {
        id: existingIndex >= 0 ? list[existingIndex].id : `aval-${Date.now()}`,
        aulaId: dados.aulaId,
        alunoId: dados.alunoId,
        professorId: dados.professorId,
        notaAula: dados.notaAula,
        opiniaoAula: dados.opiniaoAula?.trim() || undefined,
        notaProfessor: dados.notaProfessor,
        opiniaoProfessor: dados.opiniaoProfessor?.trim() || undefined,
        createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        list[existingIndex] = nova;
      } else {
        list.unshift(nova);
      }

      saveToLocalStorage(list);
      notifyMutation();
      return { success: true, data: nova };
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) {
        throw new Error("Cliente Supabase não disponível");
      }

      const payload = {
        aula_id: dados.aulaId,
        aluno_id: dados.alunoId,
        professor_id: dados.professorId || null,
        nota_aula: dados.notaAula,
        opiniao_aula: dados.opiniaoAula?.trim() || null,
        nota_professor: dados.notaProfessor,
        opiniao_professor: dados.opiniaoProfessor?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from("avaliacoes_aulas")
        .upsert(payload, { onConflict: "aula_id, aluno_id" })
        .select()
        .single();

      if (error) {
        console.error("[avaliacaoAulaRepository] Erro ao salvar avaliação:", error);
        return { success: false, error: `Falha ao salvar avaliação: ${error.message}` };
      }

      notifyMutation();
      return { success: true, data: mapRowToAvaliacao(data as AvaliacaoDbRow) };
    } catch (err: unknown) {
      console.warn("[avaliacaoAulaRepository] Fallback para localStorage:", err);
      // Fallback gracioso para localStorage
      const list = loadFromLocalStorage();
      const existingIndex = list.findIndex(
        (a) => a.aulaId === dados.aulaId && a.alunoId === dados.alunoId
      );

      const nova: AvaliacaoAula = {
        id: existingIndex >= 0 ? list[existingIndex].id : `aval-${Date.now()}`,
        aulaId: dados.aulaId,
        alunoId: dados.alunoId,
        professorId: dados.professorId,
        notaAula: dados.notaAula,
        opiniaoAula: dados.opiniaoAula?.trim() || undefined,
        notaProfessor: dados.notaProfessor,
        opiniaoProfessor: dados.opiniaoProfessor?.trim() || undefined,
        createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        list[existingIndex] = nova;
      } else {
        list.unshift(nova);
      }

      saveToLocalStorage(list);
      notifyMutation();
      return { success: true, data: nova };
    }
  },

  async calcularMediaProfessor(professorId: string): Promise<{
    mediaAula: number;
    mediaProfessor: number;
    totalAvaliacoes: number;
  }> {
    const list = await this.listarPorProfessor(professorId);
    if (list.length === 0) {
      return { mediaAula: 0, mediaProfessor: 0, totalAvaliacoes: 0 };
    }

    const somaAula = list.reduce((acc, a) => acc + a.notaAula, 0);
    const somaProf = list.reduce((acc, a) => acc + a.notaProfessor, 0);

    return {
      mediaAula: Number((somaAula / list.length).toFixed(1)),
      mediaProfessor: Number((somaProf / list.length).toFixed(1)),
      totalAvaliacoes: list.length,
    };
  },
};
