import { Baralho, BaralhoFilters, OperationResult, StatusBaralho } from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { baralhoLocalStorageRepository } from "./baralhoLocalStorageRepository";
import { validateBaralhoInput } from "./validators";

interface BaralhoDbRow {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  nivel_recomendado: string;
  idioma_origem: string;
  idioma_destino: string;
  professor_id: string;
  professor_nome: string;
  destino_tipo: string;
  destino_id: string | null;
  status: string;
  limite_diario_novos: number;
  tags: string[];
  material_id: string | null;
  atividade_id: string | null;
  aula_id: string | null;
  modulo_id: string | null;
  total_cartoes?: number;
  created_at: string;
  updated_at: string;
}

interface BaralhoWithCountRow extends Omit<BaralhoDbRow, "total_cartoes"> {
  total_cartoes?: Array<{ count: number }> | number;
}

function mapRowToBaralho(row: BaralhoDbRow): Baralho {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || "",
    categoria: row.categoria || "Geral",
    nivelRecomendado: row.nivel_recomendado as Baralho["nivelRecomendado"],
    idiomaOrigem: row.idioma_origem || "Inglês",
    idiomaDestino: row.idioma_destino || "Português",
    professorId: row.professor_id,
    professorNome: row.professor_nome || "Professor MTD",
    destinoTipo: row.destino_tipo as Baralho["destinoTipo"],
    destinoId: row.destino_id || undefined,
    status: row.status as StatusBaralho,
    limiteDiarioNovos: row.limite_diario_novos ?? 20,
    tags: row.tags || [],
    materialId: row.material_id || undefined,
    atividadeId: row.atividade_id || undefined,
    aulaId: row.aula_id || undefined,
    moduloId: row.modulo_id || undefined,
    totalCartoes: row.total_cartoes ?? 0,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function getSupabase() {
  return createBrowserSupabaseClient();
}

export const baralhoSupabaseRepository = {
  async getBaralhos(filtros?: BaralhoFilters): Promise<Baralho[]> {
    try {
      const supabase = getSupabase();
      let query = supabase.from("baralhos").select("*, total_cartoes:cartoes(count)");

      if (filtros) {
        if (filtros.status && filtros.status !== "todos") {
          query = query.eq("status", filtros.status);
        }
        if (filtros.nivel && filtros.nivel !== "todos") {
          query = query.or(`nivel_recomendado.eq.${filtros.nivel},nivel_recomendado.eq.todos`);
        }
        if (filtros.destinoTipo && filtros.destinoTipo !== "todos") {
          query = query.eq("destino_tipo", filtros.destinoTipo);
        }
        if (filtros.professorId) {
          query = query.eq("professor_id", filtros.professorId);
        }
        if (filtros.categoria && filtros.categoria !== "todas") {
          query = query.ilike("categoria", filtros.categoria);
        }
        if (filtros.busca) {
          query = query.or(`nome.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
        }
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.warn("[Supabase Baralhos] Erro ao listar, fallback local:", error.message);
        return baralhoLocalStorageRepository.getBaralhos(filtros);
      }

      return ((data || []) as unknown as BaralhoWithCountRow[]).map((row) => {
        const total = Array.isArray(row.total_cartoes) && row.total_cartoes[0]
          ? row.total_cartoes[0].count
          : typeof row.total_cartoes === "number"
          ? row.total_cartoes
          : 0;
        return mapRowToBaralho({ ...row, total_cartoes: total });
      });
    } catch {
      return baralhoLocalStorageRepository.getBaralhos(filtros);
    }
  },

  async getBaralhosAluno(
    alunoId: string,
    turmasIdsAluno: string[] = []
  ): Promise<Baralho[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("vw_aluno_baralhos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Supabase Baralhos] Erro na view do aluno, fallback local:", error.message);
        return baralhoLocalStorageRepository.getBaralhosAluno(alunoId, turmasIdsAluno);
      }

      return ((data || []) as unknown as BaralhoDbRow[]).map((row) => mapRowToBaralho(row));
    } catch {
      return baralhoLocalStorageRepository.getBaralhosAluno(alunoId, turmasIdsAluno);
    }
  },

  async getBaralhoById(id: string): Promise<Baralho | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("baralhos")
        .select("*, total_cartoes:cartoes(count)")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return baralhoLocalStorageRepository.getBaralhoById(id);
      }

      const typedData = data as unknown as BaralhoWithCountRow;
      const total = Array.isArray(typedData.total_cartoes) && typedData.total_cartoes[0]
        ? typedData.total_cartoes[0].count
        : typeof typedData.total_cartoes === "number"
        ? typedData.total_cartoes
        : 0;

      return mapRowToBaralho({ ...typedData, total_cartoes: total });
    } catch {
      return baralhoLocalStorageRepository.getBaralhoById(id);
    }
  },

  async salvarBaralho(dados: Partial<Baralho>): Promise<OperationResult<Baralho>> {
    const validation = validateBaralhoInput(dados);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0] || "Dados do baralho inválidos.";
      return { success: false, error: firstError };
    }

    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {
        nome: dados.nome!.trim(),
        descricao: dados.descricao?.trim() || "",
        categoria: dados.categoria?.trim() || "Geral",
        nivel_recomendado: dados.nivelRecomendado || "todos",
        idioma_origem: dados.idiomaOrigem || "Inglês",
        idioma_destino: dados.idiomaDestino || "Português",
        professor_id: dados.professorId,
        professor_nome: dados.professorNome || "Professor MTD",
        destino_tipo: dados.destinoTipo || "geral",
        destino_id: dados.destinoTipo === "geral" ? null : dados.destinoId || null,
        status: dados.status || "publicado",
        limite_diario_novos: dados.limiteDiarioNovos ? Number(dados.limiteDiarioNovos) : 20,
        tags: dados.tags || ["método-paulo"],
        material_id: dados.materialId || null,
        atividade_id: dados.atividadeId || null,
        aula_id: dados.aulaId || null,
        modulo_id: dados.moduloId || null,
        updated_at: new Date().toISOString(),
      };

      if (dados.id) {
        // Edição
        const { data, error } = await supabase
          .from("baralhos")
          .update(payload)
          .eq("id", dados.id)
          .select()
          .single();

        if (error) {
          console.warn("[Supabase Baralhos] Erro ao atualizar, fallback local:", error.message);
          return baralhoLocalStorageRepository.salvarBaralho(dados);
        }
        return { success: true, data: mapRowToBaralho(data as BaralhoDbRow) };
      } else {
        // Criação com ID gerado
        const localList = await baralhoLocalStorageRepository.getBaralhos();
        const nextId = `baralho-${String(localList.length + 1).padStart(3, "0")}`;
        payload.id = nextId;
        payload.created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from("baralhos")
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.warn("[Supabase Baralhos] Erro ao criar, fallback local:", error.message);
          return baralhoLocalStorageRepository.salvarBaralho(dados);
        }
        return { success: true, data: mapRowToBaralho(data as BaralhoDbRow) };
      }
    } catch {
      return baralhoLocalStorageRepository.salvarBaralho(dados);
    }
  },

  async atualizarStatusBaralho(id: string, novoStatus: StatusBaralho): Promise<OperationResult<Baralho>> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("baralhos")
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return baralhoLocalStorageRepository.atualizarStatusBaralho(id, novoStatus);
      }
      return { success: true, data: mapRowToBaralho(data as BaralhoDbRow) };
    } catch {
      return baralhoLocalStorageRepository.atualizarStatusBaralho(id, novoStatus);
    }
  },

  async excluirBaralho(id: string): Promise<OperationResult<boolean>> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("baralhos").delete().eq("id", id);
      if (error) {
        return baralhoLocalStorageRepository.excluirBaralho(id);
      }
      return { success: true, data: true };
    } catch {
      return baralhoLocalStorageRepository.excluirBaralho(id);
    }
  },

  sincronizarContagemCartoes(baralhoId: string, total: number): void {
    baralhoLocalStorageRepository.sincronizarContagemCartoes(baralhoId, total);
  },
};
